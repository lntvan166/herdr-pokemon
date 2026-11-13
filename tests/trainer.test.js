import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LEGENDARY, isLegendary, isLocked, wildPick, catchChance, throwBall, ballFor, NATURES, natureMul, caughtPick,
  loadDex, withSeen, withCaught, shinyUnlocked, dueGoals, nextGoal, dexByRegion, DEX_TOTAL, trainerEntries, openEntries,
  rollTasks, loadDaily, progress, recap, recapText, taskText, taskPay, dayOf, BALLS,
} from "../mods/pokemon-herd/trainer.js";
import { loadPicks, raised } from "../mods/pokemon-herd/picks.js";
import { ITEMS, PRICE, itemAbout } from "../mods/pokemon-herd/items.js";

test("legendaries: Mewtwo and Rayquaza are, Pikachu isn't; locked until caught or opened", () => {
  assert.ok(isLegendary(150) && isLegendary(384));
  assert.ok(!isLegendary(25));
  assert.ok(LEGENDARY.size > 50);
  const d = loadDex(null);
  assert.equal(isLocked(150, d), true);
  assert.equal(isLocked(150, d, true), false);
  assert.equal(isLocked(25, d), false);
  assert.equal(isLocked(150, withCaught(d, { dex: 150 })), false);
  assert.ok(!openEntries(d).some((e) => e.dex === 150));
  assert.ok(openEntries(d, true).some((e) => e.dex === 150));
});

test("wildPick: legendary only when asked or very rarely", () => {
  let n = 0;
  for (let i = 0; i < 300; i++) if (wildPick(new Set(), () => (i + 0.5) / 300).legend) n++;
  assert.ok(n <= 3, String(n));
  const l = wildPick(new Set(), Math.random, { legend: true });
  assert.ok(isLegendary(l.dex) && l.legend);
});

test("catching: the Master Ball never fails; legendaries are much harder", () => {
  assert.equal(catchChance("master-ball", { dex: 150 }), 1);
  assert.equal(catchChance("poke-ball", { dex: 25 }), catchChance("poke-ball", { dex: 25, shiny: true })); // as in GO
  assert.ok(catchChance("ultra-ball", { dex: 150 }) < 0.3);
  assert.ok(catchChance("great-ball", { dex: 25 }) > catchChance("poke-ball", { dex: 25 }));
  assert.equal(catchChance("berry", { dex: 25 }), 0);
  assert.deepEqual(throwBall("master-ball", { dex: 150 }, () => 0.99), { caught: true, shakes: 3, fled: false });
  const miss = throwBall("poke-ball", { dex: 25 }, () => 0.99);
  assert.equal(miss.caught, false);
  assert.ok(miss.shakes < 3);
  assert.equal(miss.fled, false);
  assert.equal(throwBall("poke-ball", { dex: 25 }, () => 0.05).caught, true);
});

test("ballFor: cheapest first; the best for a shiny; the Master Ball only for a legendary", () => {
  const all = { "poke-ball": 1, "great-ball": 1, "ultra-ball": 1, "master-ball": 1 };
  assert.equal(ballFor(all, { dex: 25 }), "poke-ball");
  assert.equal(ballFor(all, { dex: 25, shiny: true }), "ultra-ball");
  assert.equal(ballFor(all, { dex: 150 }), "master-ball");
  assert.equal(ballFor({ "master-ball": 3 }, { dex: 25 }), null);
  assert.equal(ballFor({}, { dex: 25 }), null);
});

test("a caught Pokémon: ♥1, a nature, raised (it shows in the Box), kept when loaded", () => {
  const p = caughtPick({ dex: 25, shiny: true, mega: "off" }, 1234, () => 0);
  assert.equal(p.hearts, 1);
  assert.equal(p.caught, 1234);
  assert.ok(NATURES[p.nature]);
  assert.ok(raised({ dex: 25, mega: "auto", caught: 5 }));
  const back = loadPicks({ v: 2, panes: { "box-1-25": p } }).panes["box-1-25"];
  assert.equal(back.nature, p.nature);
  assert.equal(back.caught, 1234);
  assert.equal(loadPicks({ v: 2, panes: { a: { dex: 25, nature: "grumpy" } } }).panes.a.nature, undefined);
  assert.equal(natureMul({ nature: "hasty" }, "speed"), 1.35);
  assert.equal(natureMul({}, "speed"), 1);
});

test("the Pokédex: seen, caught, shiny unlocked, goals, regions", () => {
  let d = loadDex({ v: 1, seen: [1, 1, 99999, "x"], caught: [4], shiny: [4, 7], goals: [5, 7] });
  assert.deepEqual(d.seen, [1, 4]);
  assert.deepEqual(d.shiny, [4]);
  assert.deepEqual(d.goals, [5]);
  assert.equal(withSeen(d, [1, 4]), null);
  assert.deepEqual(withSeen(d, [25]).seen, [1, 4, 25]);
  d = withCaught(d, { dex: 25, shiny: true });
  assert.ok(shinyUnlocked(d, 25) && d.caught.includes(25) && d.seen.includes(25));
  assert.deepEqual(dueGoals(d), []);
  for (const x of [1, 7, 10]) d = withCaught(d, { dex: x });
  assert.deepEqual(dueGoals({ ...d, goals: [] }).map((g) => g.n), [5]);
  assert.equal(nextGoal(d).n, 15);
  const kanto = dexByRegion(d).find((r) => r.region === "Kanto");
  assert.equal(kanto.caught, 5);
  assert.equal(dexByRegion(d).reduce((t, r) => t + r.total, 0), DEX_TOTAL);
});

test("Trainer mode: the starters and what was caught", () => {
  const d = withCaught(loadDex(null), { dex: 25 });
  assert.deepEqual(trainerEntries(d).map((e) => e.dex), [1, 4, 7, 25]);
});

test("Research: three tasks a day, the same for every window, one about jobs", () => {
  const a = rollTasks("2026-11-12", { wild: true, types: ["fire"] });
  assert.deepEqual(a, rollTasks("2026-11-12", { wild: true, types: ["fire"] }));
  assert.equal(a.length, 3);
  assert.ok(["job", "type"].includes(a[0].id));
  assert.equal(new Set(a.map((t) => t.id)).size, 3);
  for (let i = 1; i <= 28; i++) {
    const t = rollTasks(`2026-02-${String(i).padStart(2, "0")}`, { wild: false, types: [] });
    assert.ok(t.every((x) => !["catch", "gift", "type"].includes(x.id)), JSON.stringify(t));
    for (const x of t) assert.ok(taskText(x).length > 5);
  }
});

test("Research: progress, rewards once, the bonus once; a new day sums up yesterday", () => {
  const now = new Date(2026, 10, 12, 10).getTime();
  let d = loadDaily(null, now);
  d = { ...d, tasks: [{ id: "job", goal: 2, n: 0 }, { id: "type", goal: 1, n: 0, type: "electric" }, { id: "pet", goal: 1, n: 0 }] };
  let r = progress(d, "job", 1, 25); // Pikachu: a job, and electric
  assert.deepEqual(r.done.map((t) => t.id), ["type"]);
  r = progress(r.daily, "job", 1, 4);
  assert.deepEqual(r.done.map((t) => t.id), ["job"]);
  assert.equal(r.bonus, false);
  r = progress(r.daily, "pet");
  assert.equal(r.bonus, true);
  assert.equal(progress(r.daily, "pet").bonus, false);
  assert.equal(r.daily.count.top[25], 1);
  assert.deepEqual(taskPay({ id: "job", goal: 10 }), { money: 300 });
  const kept = loadDaily(JSON.parse(JSON.stringify(r.daily)), now);
  assert.equal(kept.bonus, true);
  const next = loadDaily(r.daily, now + 24 * 3600000);
  assert.equal(next.day, dayOf(now + 24 * 3600000));
  assert.equal(next.bonus, false);
  assert.deepEqual(next.yesterday, recap(r.daily));
  assert.equal(next.yesterday.jobs, 2);
  assert.equal(next.yesterday.done, 3);
  assert.match(recapText(next.yesterday), /^Yesterday: 2 jobs · Research 3\/3 · busiest (Pikachu|Charmander)$/);
});

test("the balls are items: sold, described", () => {
  for (const id of BALLS) {
    assert.ok(ITEMS[id], id);
    assert.equal(ITEMS[id].kind, "ball");
    assert.ok(PRICE[id] > 0, id);
    assert.ok(itemAbout(id).length > 10, id);
  }
});

import { BAIT } from "../mods/pokemon-herd/trainer.js";
import { useItem } from "../mods/pokemon-herd/picks.js";
test("berries: Sitrus is half a heart; Razz and Golden Razz make a catch likelier; Pinap doubles the gift", () => {
  assert.equal(useItem({ dex: 4, friend: 0 }, "p", "sitrus-berry").pick.friend, 10);
  const p = { dex: 25 };
  assert.ok(catchChance("poke-ball", p, "razz-berry") > catchChance("poke-ball", p));
  assert.ok(catchChance("poke-ball", { dex: 150 }, "golden-razz-berry") > 2 * catchChance("poke-ball", { dex: 150 }));
  assert.equal(catchChance("poke-ball", p, "pinap-berry"), catchChance("poke-ball", p));
  assert.ok(catchChance("ultra-ball", p, "golden-razz-berry") <= 0.97);
  for (const id of Object.keys(BAIT)) { assert.equal(ITEMS[id].kind, "bait"); assert.ok(PRICE[id] > 0); }
});

import { LEGEND_THROWS } from "../mods/pokemon-herd/trainer.js";
test("a legendary: about 15 balls, and it may get away", () => {
  const over = (ball, bait) => 1 - (1 - catchChance(ball, { dex: 150 }, bait)) ** LEGEND_THROWS;
  assert.equal(LEGEND_THROWS, 15);
  assert.ok(over("poke-ball") > 0.3 && over("poke-ball") < 0.5, String(over("poke-ball")));
  assert.ok(over("ultra-ball") > 0.55 && over("ultra-ball") < 0.7, String(over("ultra-ball")));
  assert.ok(over("ultra-ball", "golden-razz-berry") > 0.85 && over("ultra-ball", "golden-razz-berry") < 0.97);
  assert.equal(PRICE["azure-flute"], 1000);
});

import { purse } from "../mods/pokemon-herd/trainer.js";
test("a visitor's purse: ₽10–30 mostly, ₽60–100 now and then, more for a shiny or a legendary", () => {
  assert.equal(purse({ dex: 150 }), 400);
  assert.equal(purse({ dex: 25, shiny: true }), 150);
  assert.equal(purse({ dex: 25 }, () => 0.5), 20);
  assert.equal(purse({ dex: 25 }, () => 0.05), 62);
  let total = 0;
  for (let i = 0; i < 1000; i++) total += purse({ dex: 25 }, Math.random);
  assert.ok(total / 1000 > 20 && total / 1000 < 32);
});

test("ballFor: the ball chosen in the Bag, while there are some", () => {
  const items = { "poke-ball": 2, "ultra-ball": 1, "master-ball": 1 };
  assert.equal(ballFor(items, { dex: 25 }, "ultra-ball"), "ultra-ball");
  assert.equal(ballFor(items, { dex: 25 }, "master-ball"), "master-ball");
  assert.equal(ballFor(items, { dex: 25 }, "great-ball"), "poke-ball"); // none: as if not chosen
  assert.equal(ballFor(items, { dex: 25 }, "berry"), "poke-ball");
});

import { allowance, DAY_CAP } from "../mods/pokemon-herd/trainer.js";
test("purses and tips stop at the day's cap", () => {
  const d = { count: { top: {}, purse: DAY_CAP.purse - 10 } };
  assert.equal(allowance(d, "purse", 25), 10);
  assert.equal(allowance({ count: { top: {}, purse: DAY_CAP.purse } }, "purse", 25), 0);
  assert.equal(allowance({ count: { top: {} } }, "tip", 10), 10);
  assert.equal(progress({ ...loadDaily(null, 0), tasks: [] }, "tip", 10).daily.count.tip, 10);
});

import { PURSE_CHANCE } from "../mods/pokemon-herd/trainer.js";
test("purses by the visitors' pace: fewer when they come often", () => {
  let n = 0;
  for (let i = 0; i < 3000; i++) if (purse({ dex: 25 }, Math.random, PURSE_CHANCE.lots)) n++;
  assert.ok(n > 800 && n < 1200, String(n));
  assert.equal(purse({ dex: 150 }, () => 0.99, PURSE_CHANCE.lots), 400);
  assert.equal(purse({ dex: 25, shiny: true }, () => 0.99, PURSE_CHANCE.lots), 150);
  assert.ok(purse({ dex: 25 }, () => 0.99, PURSE_CHANCE.rare) > 0);
});

test("a legendary called over carries ₽100; one that just walks by ₽400", () => {
  const called = wildPick(new Set(), Math.random, { legend: true });
  assert.equal(called.called, true);
  assert.equal(purse(called), 100);
  assert.equal(purse({ dex: 150, legend: true }), 400);
});

test("a caught Pokémon remembers its ball", () => {
  const p = caughtPick({ dex: 480 }, 5, () => 0, "master-ball");
  assert.equal(p.ball, "master-ball");
  assert.equal(loadPicks({ v: 2, panes: { b: p } }).panes.b.ball, "master-ball");
  assert.equal(loadPicks({ v: 2, panes: { b: { ...p, ball: "berry" } } }).panes.b.ball, undefined);
});

import { baseRate, FLEE } from "../mods/pokemon-herd/trainer.js";
test("catch rates as in Pokémon GO: base by stage, the ball and Berry as a power", () => {
  assert.equal(baseRate(1), 0.45); // Bulbasaur, a first stage
  assert.equal(baseRate(2), 0.3); // Ivysaur
  assert.equal(baseRate(3), 0.2); // Venusaur
  assert.equal(baseRate(128), 0.35); // Tauros, on its own
  assert.equal(baseRate(150), 0.03);
  assert.ok(Math.abs(catchChance("poke-ball", { dex: 1 }) - 0.45) < 1e-9);
  assert.ok(Math.abs(catchChance("ultra-ball", { dex: 1 }) - (1 - 0.55 ** 2)) < 1e-9);
  assert.ok(Math.abs(catchChance("great-ball", { dex: 3 }, "razz-berry") - (1 - 0.8 ** 2.25)) < 1e-9);
  // A wild one that isn't legendary sometimes flees after a miss; a legendary doesn't (it has 15 balls).
  const seq = (...xs) => () => xs.shift();
  assert.equal(throwBall("poke-ball", { dex: 3 }, seq(0.9, 0.5, 0.02)).fled, true); // missed, then fled
  assert.equal(throwBall("poke-ball", { dex: 3 }, seq(0.9, 0.5, 0.5)).fled, false);
  assert.equal(throwBall("poke-ball", { dex: 150 }, seq(0.9, 0.5, 0.02)).fled, false);
  assert.equal(FLEE, 0.05);
});

import { ALPHA_ODDS, ALPHA_PURSE } from "../mods/pokemon-herd/trainer.js";
test("Alphas: now and then a wild one, harder to catch, a fatter purse; caught, an Alpha with two hearts", () => {
  let n = 0;
  for (let i = 0; i < 4000; i++) if (wildPick(new Set(), Math.random).alpha) n++;
  assert.ok(n > 4000 / ALPHA_ODDS / 2 && n < 4000 / ALPHA_ODDS * 2, String(n));
  assert.ok(!wildPick(new Set(), () => 0, { legend: true }).alpha); // a legendary is never one
  assert.ok(Math.abs(catchChance("poke-ball", { dex: 1, alpha: true }) - 0.225) < 1e-9);
  assert.equal(purse({ dex: 1, alpha: true }), ALPHA_PURSE);
  const p = caughtPick({ dex: 1, alpha: true }, 5, () => 0);
  assert.equal(p.alpha, true);
  assert.equal(p.hearts, 2);
  assert.equal(loadPicks({ v: 2, panes: { b: p } }).panes.b.alpha, true);
  assert.equal(loadPicks({ v: 2, panes: { b: { dex: 1, alpha: true } } }).panes.b.alpha, undefined); // only a caught one
  const d = withCaught(loadDex(null), p);
  assert.deepEqual(loadDex(d).alpha, [1]);
});

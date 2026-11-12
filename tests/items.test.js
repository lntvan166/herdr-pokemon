import { test } from "node:test";
import assert from "node:assert/strict";
import { ITEMS, loadBag, addItem, mark, pickup, badges, BADGES, shinyOdds, MAX_ITEM } from "../mods/pokemon-herd/items.js";
import { coatOf, waysOf } from "../mods/pokemon-herd/dex.js";

test("loadBag tolerates junk and keeps known items", () => {
  for (const junk of [null, 5, "x", { v: 2 }, { v: 1, items: 3 }]) assert.deepEqual(loadBag(junk), { v: 1, items: {}, money: 0, marks: { evolutions: 0, nightJob: false, fullHearts: false, seen: [] } });
  const b = loadBag({ v: 1, items: { berry: 3, "fire-stone": 1, junk: 4, "rare-candy": -1 }, marks: { evolutions: 2, nightJob: true } });
  assert.deepEqual(b.items, { berry: 3, "fire-stone": 1 });
  assert.equal(b.marks.evolutions, 2);
});

test("addItem counts up and down within limits", () => {
  let b = loadBag(null);
  b = addItem(b, "berry", 2);
  assert.equal(b.items.berry, 2);
  b = addItem(b, "berry", -5);
  assert.equal(b.items.berry, undefined);
  assert.equal(addItem(b, "berry", 500).items.berry, MAX_ITEM);
  assert.equal(mark(b, { nightJob: true }).marks.nightJob, true);
});

test("pickup always finds a real item, mostly berries", () => {
  assert.equal(pickup(() => 0), "berry");
  assert.equal(pickup(() => 0.9999), "exp-share"); // the last, and among the rarest
  const seen = new Set(Array.from({ length: 2000 }, (_, i) => pickup(() => (i + 0.5) / 2000)));
  for (const id of seen) assert.ok(ITEMS[id], id);
  assert.ok(seen.has("thunder-stone"));
});

test("badges", () => {
  const none = badges({ jobs: 0, ms: 0, longest: 0 }, loadBag(null).marks);
  assert.equal(none.length, 8);
  assert.ok(none.every((b) => !b.earned));
  const some = badges({ jobs: 120, ms: 0, longest: 2 * 3600000 }, { evolutions: 1, nightJob: false, fullHearts: false });
  assert.deepEqual(some.filter((b) => b.earned).map((b) => b.id), ["boulder", "cascade", "thunder", "volcano"]);
  assert.equal(new Set(BADGES.map((b) => b.id)).size, 8);
});

test("Shiny Charm at 500 jobs", () => {
  assert.equal(shinyOdds(499), 64);
  assert.equal(shinyOdds(500), 32);
});

test("seasonal coats and evolution ways", () => {
  assert.equal(coatOf(585, 0), null);
  assert.equal(coatOf(585, 3).form, "0003");
  assert.equal(coatOf(25, 2), null);
  assert.deepEqual(waysOf(5), ["jobs"]);
  assert.deepEqual(waysOf(26), ["stone:thunder"]);
});

import { itemAbout, takersOf, stoneTakers } from "../mods/pokemon-herd/items.js";
test("itemAbout and stoneTakers", () => {
  assert.ok(stoneTakers("thunder").includes("Pikachu") && stoneTakers("thunder").includes("Eevee"));
  assert.match(itemAbout("thunder-stone"), /^Evolves .*Pikachu/);
  assert.match(itemAbout("berry"), /heart/);
  for (const id of Object.keys(ITEMS)) assert.ok(itemAbout(id).length > 10, id);
});

test("takersOf: who an item would help now, and into what", () => {
  const herd = [
    { slot: "a", tag: "api", pick: { dex: 25, mega: "auto" } },
    { slot: "b", tag: "web", pick: { dex: 4, mega: "auto", hearts: 5 } },
    { slot: "c", tag: "db", pick: { dex: 133, mega: "auto", stay: true } },
  ];
  const t = takersOf("thunder-stone", herd);
  assert.deepEqual(t.map((x) => [x.tag, x.use, x.after.dex]), [["api", "evolve", 26]]);
  assert.deepEqual(takersOf("berry", herd).map((x) => x.tag), ["api", "db"]);
  assert.deepEqual(takersOf("rare-candy", herd).map((x) => [x.tag, x.after.dex]), [["web", 5]]);
});

import { badgeGifts, HELD } from "../mods/pokemon-herd/items.js";
test("a held item for each badge newly earned, once", () => {
  const marks = loadBag(null).marks;
  const s = { jobs: 120, ms: 0, longest: 0 };
  const g = badgeGifts(s, marks);
  assert.deepEqual(g.seen, ["boulder", "cascade"]);
  assert.equal(g.gifts.length, 2);
  assert.ok(g.gifts.every((id) => HELD.includes(id)));
  assert.deepEqual(badgeGifts(s, { ...marks, seen: g.seen }).gifts, []);
  assert.deepEqual(loadBag({ v: 1, items: {}, marks: { seen: ["boulder", "junk"] } }).marks.seen, ["boulder"]);
  assert.ok(ITEMS["lucky-egg"] && ITEMS["lucky-egg"].kind === "held");
});

import { badgeProgress, nextBadge } from "../mods/pokemon-herd/items.js";
test("badgeProgress: how much is left for each, and the nearest", () => {
  const marks = { evolutions: 0, nightJob: false, fullHearts: false, seen: [] };
  const p = badgeProgress({ jobs: 73, ms: 5 * 3600000, longest: 32 * 60000 }, marks, { best: 3, evolve: 0.2 });
  const by = Object.fromEntries(p.map((b) => [b.id, b]));
  assert.equal(by.boulder.earned, true);
  assert.equal(by.boulder.left, "");
  assert.equal(by.cascade.left, "27 jobs to go");
  assert.ok(Math.abs(by.cascade.fraction - 0.73) < 1e-9);
  assert.equal(by.rainbow.left, "19h of work to go");
  assert.equal(by.soul.left, "best now is ♥3: 2 to go");
  assert.equal(by.volcano.left, "longest job 32m: 28m to go");
  assert.equal(by.thunder.fraction, 0.2); // the Pokémon on screen closest to evolving
  assert.equal(by.earth.left, "927 jobs to go");
  assert.equal(nextBadge(p).id, "cascade");
  assert.equal(nextBadge(p.map((b) => ({ ...b, earned: true }))), null);
});

test("badgeProgress: a Pokémon at full hearts earns the Soul Badge even before its mark; times round the right way", () => {
  const marks = { evolutions: 0, nightJob: false, fullHearts: false, seen: [] };
  const p = Object.fromEntries(badgeProgress({ jobs: 0, ms: 0, longest: 59.5 * 60000 }, marks, { best: 5 }).map((b) => [b.id, b]));
  assert.equal(p.soul.earned, true);
  assert.equal(p.volcano.left, "longest job 59m: 1m to go"); // not "1h: 1m to go"
  // Every badge has both what earns it and its progress: the Bag never meets a missing one.
  for (const b of BADGES) {
    assert.equal(typeof b.got, "function", b.id);
    assert.equal(typeof b.progress, "function", b.id);
  }
});

import { expShareTarget } from "../mods/pokemon-herd/picks.js";
test("new items: Leftovers and Exp. Share to hold, Honey to use", () => {
  assert.equal(ITEMS.leftovers.kind, "held");
  assert.equal(ITEMS["exp-share"].kind, "held");
  assert.equal(ITEMS.honey.kind, "use");
  for (const id of ["leftovers", "exp-share", "honey"]) assert.ok(itemAbout(id).length > 10, id);
  const seen = new Set(Array.from({ length: 4000 }, (_, i) => pickup(() => (i + 0.5) / 4000)));
  assert.ok(seen.has("honey") && seen.has("leftovers") && seen.has("exp-share"));
});

test("expShareTarget: another Pokémon on screen that evolves by jobs, the furthest from it", () => {
  const picks = {
    giver: { dex: 4, jobs: 2, held: "exp-share" },
    near: { dex: 1, jobs: 8 },
    far: { dex: 7, jobs: 1 },
    done: { dex: 6, jobs: 0 }, // nothing to become
    stone: { dex: 25, jobs: 0 }, // a stone, not jobs
    stay: { dex: 152, jobs: 0, stay: true }, // an Everstone
  };
  assert.equal(expShareTarget(picks, "giver"), "far");
  assert.equal(expShareTarget({ giver: picks.giver, done: picks.done }, "giver"), null);
});

import { PRICE, jobPay, addMoney, buy, loadBoosts, withBoost, BOOST_MS, BOOST_MAX, money, MAX_MONEY } from "../mods/pokemon-herd/items.js";
test("jobPay: ₽5 and ₽2 a minute, ₽150 at most, twice with an Amulet Coin", () => {
  assert.equal(jobPay(30000), 5);
  assert.equal(jobPay(10 * 60000), 25);
  assert.equal(jobPay(10 * 60000, true), 50);
  assert.equal(jobPay(5 * 3600000), 150);
  assert.equal(jobPay(undefined), 5);
});
test("money in the Bag: kept, capped, never negative", () => {
  assert.equal(loadBag({ v: 1, items: {}, money: 1234 }).money, 1234);
  assert.equal(loadBag({ v: 1, items: {}, money: -5 }).money, 0);
  assert.equal(loadBag({ v: 1, items: {}, money: "lots" }).money, 0);
  assert.equal(loadBag(null).money, 0);
  assert.equal(addMoney({ money: MAX_MONEY - 1 }, 10).money, MAX_MONEY);
  assert.equal(money(1234), "₽1,234");
});
test("buy: costs its price, needs the money, 99 at most; every item is for sale", () => {
  const b = { v: 1, items: {}, money: 250, marks: {} };
  const after = buy(b, "x-speed");
  assert.equal(after.money, 50);
  assert.equal(after.items["x-speed"], 1);
  assert.equal(buy(after, "x-speed"), null); // ₽50 left
  assert.equal(buy({ ...b, money: 9999, items: { berry: 99 } }, "berry"), null);
  assert.deepEqual(Object.keys(ITEMS).filter((id) => !PRICE[id]), []);
});
test("boosts: 10 min each, stacking up to an hour ahead; only boosts, only live ones", () => {
  const now = 1000;
  let bs = withBoost({}, "x-speed", now);
  assert.equal(bs["x-speed"], now + BOOST_MS);
  bs = withBoost(bs, "x-speed", now);
  assert.equal(bs["x-speed"], now + 2 * BOOST_MS);
  for (let i = 0; i < 10; i++) bs = withBoost(bs, "x-speed", now);
  assert.equal(bs["x-speed"], now + BOOST_MAX);
  assert.deepEqual(loadBoosts({ "x-speed": 5000, honey: 9999, "soda-pop": 10 }, now), { "x-speed": 5000 });
  assert.deepEqual(loadBoosts(null, now), {});
});
import { backPay } from "../mods/pokemon-herd/items.js";
test("backPay: the jobs done before Pokédollars, as they would have paid", () => {
  assert.equal(backPay({ jobs: 237, ms: 252 * 60000 }), 5 * 237 + 2 * 252);
  assert.equal(backPay({ jobs: 1, ms: 10 * 3600000 }), 150);
  assert.equal(backPay({ jobs: 0, ms: 0 }), 0);
  assert.equal(money(1500), "₽1,500");
  assert.equal(money(999999), "₽999,999");
});

import test from "node:test";
import assert from "node:assert/strict";
import { outbreakPace, outbreakOfDay, outbreakAt, outbreakPick, OUTBREAK_MS, OUTBREAK_SHARE, newRaid, loadRaid, raidPhase, laysEgg, raidHit, cooldownLeft, RAID_COOLDOWN, WORKING_HIT, raidReward, bossPick, RAID_WORK, MAX_EGGS, RAID_HP, RAID_HP_PER, EGG_MS, RAID_MS, RAID_CHIP, COUNTER_MS } from "../mods/pokemon-herd/events.js";
import { isLegendary } from "../mods/pokemon-herd/trainer.js";
import { EVOLVES_FROM } from "../mods/pokemon-herd/species.js";

test("one outbreak a day, between 9:30 and 17:00, 20 minutes, a first stage; the same everywhere", () => {
  const o = outbreakOfDay("2026-11-16");
  assert.deepEqual(outbreakOfDay("2026-11-16"), o);
  assert.ok(o.from >= 9.5 * 3600000 && o.until <= 17.5 * 3600000);
  assert.equal(o.until - o.from, OUTBREAK_MS);
  assert.equal(EVOLVES_FROM[o.dex], undefined);
  assert.ok(!isLegendary(o.dex));
  const days = new Set(Array.from({ length: 30 }, (_, i) => outbreakOfDay(`2026-12-${String(i + 1).padStart(2, "0")}`).dex));
  assert.ok(days.size > 15); // a different one most days
  // On only inside its window.
  const midnight = new Date(2026, 10, 16).getTime();
  assert.equal(outbreakAt(midnight + o.from - 1), null);
  assert.equal(outbreakAt(midnight + o.from + 1000).dex, o.dex);
  assert.equal(outbreakAt(midnight + o.until), null);
  // One called (dev, a lure) on top of it.
  const called = { dex: 129, from: 1000, until: 5000 };
  assert.equal(outbreakAt(2000, called), called);
});

test("an outbreak's pace: its own, or the one set if faster", () => {
  assert.deepEqual(outbreakPace([3, 8]), [2, 3]);
  assert.deepEqual(outbreakPace([1, 3]), [1, 3]);
  assert.deepEqual(outbreakPace([10, 25]), [2, 3]);
});

test("during an outbreak most visitors are its species, a legendary stays itself", () => {
  const o = { dex: 129 };
  let n = 0;
  for (let i = 0; i < 1000; i++) if (outbreakPick({ dex: 16, shiny: false }, o, () => (i + 0.5) / 1000).dex === 129) n++;
  assert.ok(Math.abs(n / 1000 - OUTBREAK_SHARE) < 0.05);
  assert.equal(outbreakPick({ dex: 150, legend: true }, o, () => 0).dex, 150);
  assert.equal(outbreakPick({ dex: 16 }, o, () => 0).shiny, true); // 1 in 16 hit
});

test("raids: an egg every 2½ hours of all agents' work together (2 a day at most), it hatches, then 30 minutes", () => {
  assert.equal(laysEgg(RAID_WORK - 10, RAID_WORK + 5, null), true); // 2½ hours in all, however many agents are open
  assert.equal(laysEgg(RAID_WORK + 5, RAID_WORK + 50, null), false); // not again till 8
  assert.equal(laysEgg(2 * RAID_WORK - 1, 2 * RAID_WORK, "gone"), true);
  assert.equal(laysEgg(0, RAID_WORK - 1, null), false);
  assert.equal(laysEgg(RAID_WORK - 1, RAID_WORK, "battle"), false); // one at a time
  assert.equal(laysEgg(MAX_EGGS * RAID_WORK + 1, (MAX_EGGS + 1) * RAID_WORK, null), false); // enough for a day
  // A boss as sturdy as the agents hitting it.
  assert.equal(newRaid(0, () => 0.5).bulk, RAID_HP);
  assert.equal(newRaid(0, () => 0.5, { agents: 5 }).bulk, RAID_HP + 4 * RAID_HP_PER);
  const r = newRaid(1000, () => 0.5);
  assert.equal(raidPhase(r, 1000), "egg");
  assert.equal(raidPhase(r, 1000 + EGG_MS), "battle");
  assert.equal(raidPhase(r, 1000 + EGG_MS + RAID_MS), "gone");
  assert.equal(raidPhase(r, 1000 + EGG_MS + RAID_MS + 60000), null);
  assert.equal(raidPhase(null, 0), null);
  assert.deepEqual(loadRaid(JSON.parse(JSON.stringify(r))), r);
  assert.equal(loadRaid({ v: 1 }), null);
});

test("a raid's boss: an Alpha at its last stage, or now and then a legendary not caught yet", () => {
  const alpha = newRaid(0, () => 0.5).boss;
  assert.equal(alpha.alpha, true);
  assert.notEqual(EVOLVES_FROM[alpha.dex], undefined);
  const legend = newRaid(0, () => 0.1, { caught: new Set() }).boss;
  assert.equal(legend.legend, true);
  assert.ok(isLegendary(legend.dex));
});

test("a hit: its damage over the boss's bulk (at least a chip); the boss answers unless beaten", () => {
  const r = newRaid(0, () => 0.5);
  const { raid, hit } = raidHit(r, "6mX", "p1", "fire", 10, () => 0.5, { hearts: 3 });
  assert.ok(hit.dmg >= RAID_CHIP && raid.hp < 1);
  assert.ok(raidHit({ ...r, bulk: 4 }, "6mX", "p1", "fire", 10, () => 0.5).hit.dmg < hit.dmg); // sturdier with more agents
  assert.ok(hit.back && hit.back.dmg > 0 && hit.back.type);
  assert.equal(raid.hits.length, 1);
  // A hit on nearly nothing left beats it: no answer.
  const end = raidHit({ ...r, hp: 0.01 }, "6mX", "p1", "fire", 20, () => 0.5);
  assert.equal(end.raid.hp, 0);
  assert.equal(end.raid.beaten, 20);
  assert.equal(end.hit.back, undefined);
  assert.equal(raidPhase(end.raid, 30), "beaten");
  assert.equal(raidPhase(end.raid, 20 + 91000), null); // its note gone once the boss has walked off
  assert.equal(raidPhase({ ...end.raid, caught: 1000 }, 9500), null); // caught: a moment, then gone
  assert.equal(raidPhase({ ...end.raid, caught: 1000 }, 5000), "beaten");
  // Each hits once a minute: then how long to wait; another one, at once.
  const d = raidHit(r, 25, "p2", "electric", 10, () => 0.5, { drop: true }).raid;
  assert.equal(cooldownLeft(d, "p2", 10 + 20000), RAID_COOLDOWN - 20000);
  assert.equal(cooldownLeft(d, "p2", 10 + RAID_COOLDOWN), 0);
  assert.equal(cooldownLeft(d, "p1", 10), 0);
  // One whose agent is working hits harder.
  const lazy = raidHit(r, "6mX", "p1", "fire", 10, () => 0.5).hit.dmg;
  const busy = raidHit(r, "6mX", "p1", "fire", 10, () => 0.5, { working: true }).hit.dmg;
  assert.ok(Math.abs(busy / lazy - WORKING_HIT) < 1e-9);
  assert.ok(COUNTER_MS > 450); // it answers after the hit lands
});

test("beaten: a reward, and the boss to catch, weakened", () => {
  assert.deepEqual(raidReward({ dex: 248, alpha: true }), { money: 300, item: "ultra-ball", count: 3 });
  assert.equal(raidReward({ dex: 150, legend: true }).money, 600);
  const p = bossPick({ dex: 248, alpha: true });
  assert.equal(p.hp, 0.05);
  assert.equal(p.alpha, true);
  assert.equal(p.raid, true);
});

test("a raid move that misses does nothing to the boss", async () => {
  const { pickMove } = await import("../mods/pokemon-herd/moves.js");
  const r = newRaid(0, () => 0.5);
  const move = { ...pickMove(6, r.boss.dex, () => 0.9), miss: true, mul: 0 };
  const { raid, hit } = raidHit(r, 6, "p1", "fire", 10, () => 0.5, { move });
  assert.equal(hit.dmg, 0);
  assert.equal(hit.miss, true);
  assert.equal(raid.hp, 1);
});

test("2 eggs a day, however the number of agents changes; every pane's cooldown kept; junk raids cleaned", async () => {
  const { eggsOn } = await import("../mods/pokemon-herd/events.js");
  // One agent, then two, three, four through the day: the multiples move, the count doesn't.
  let r = null, laid = 0;
  const steps = [[0, 160, 1], [160, 310, 2], [310, 460, 3], [460, 610, 4]];
  for (const [b, a, n] of steps) {
    if (laysEgg(b, a, null, eggsOn(r, 100))) { r = newRaid(0, () => 0.5, { day: 100, eggs: eggsOn(r, 100) }); laid++; }
  }
  assert.equal(laid, MAX_EGGS);
  assert.equal(eggsOn(r, 101), 0); // a new day
  // 13 panes hit: the first one's cooldown is still on.
  let raid = { ...newRaid(0, () => 0.5), hatch: 0, until: 1e9 };
  for (let i = 0; i < 13; i++) raid = raidHit(raid, 6, `p${i}`, "fire", 1000 + i, () => 0.5).raid;
  assert.ok(cooldownLeft(loadRaid(raid), "p0", 2000) > 50000);
  // A broken hit or a bad bulk can't break it.
  const junk = loadRaid({ ...raid, hits: [null, { at: "x" }, ...raid.hits], bulk: -1 });
  assert.ok(junk.hits.every((h) => h && Number.isFinite(h.at)));
  assert.equal(junk.bulk, RAID_HP);
});

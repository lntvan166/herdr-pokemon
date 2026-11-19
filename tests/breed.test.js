import test from "node:test";
import assert from "node:assert/strict";
import { canBreed, whyNot, firstStage, hatchMinutes, layEgg, loadCare, careWork, hatchPick, motherOf, LAY_MIN } from "../mods/pokemon-herd/breed.js";
import { learnableOf } from "../mods/pokemon-herd/moves.js";
import { loadPicks } from "../mods/pokemon-herd/picks.js";

const m = (dex, gender, more = {}) => ({ dex, gender, ...more });
const names = (dex) => learnableOf(dex).map((x) => x.name);

test("who can breed: a ♂ and a ♀ sharing an egg group, or anything with a Ditto; no legendary or baby", () => {
  assert.equal(canBreed(m(4, "m"), m(4, "f")), "same"); // Charmander ×2
  assert.equal(canBreed(m(6, "m"), m(1, "f")), "other"); // Charizard (Monster, Dragon) with Bulbasaur (Monster)
  assert.equal(canBreed(m(4, "m"), m(4, "m")), null); // the same gender
  assert.match(whyNot(m(4, "m"), m(4, "m")), /same gender/);
  assert.equal(canBreed(m(4, "m"), m(7, "f")), "other"); // Charmander (Monster, Dragon), Squirtle (Monster, Water 1)
  assert.equal(canBreed(m(25, "m"), m(7, "f")), null); // Pikachu (Field, Fairy), Squirtle: nothing shared
  assert.match(whyNot(m(25, "m"), m(7, "f")), /egg group/);
  assert.equal(canBreed(m(81), m(132)), "other"); // Magnemite (genderless) with Ditto
  assert.equal(canBreed(m(81), m(81)), null);
  assert.equal(canBreed(m(132), m(132)), null); // two Ditto
  assert.equal(canBreed(m(150), m(132)), null); // Mewtwo: no eggs
  assert.equal(canBreed(m(172, "m"), m(25, "f")), null); // Pichu: a baby, no eggs
});

test("the egg: its mother's line at its first stage, moves passed on, hatching by its egg cycles", () => {
  assert.equal(firstStage(6), 4); // Charizard → Charmander
  assert.equal(firstStage(26), 172); // Raichu → Pichu
  assert.equal(firstStage(448), 447); // Lucario → Riolu
  assert.equal(firstStage(143), 143); // Snorlax: Munchlax needs an Incense
  assert.equal(firstStage(31), 29); // Nidoqueen → Nidoran ♀ (though Nidoqueen has no eggs)
  assert.equal(firstStage(4), 4);
  assert.equal(motherOf(m(6, "m"), m(1, "f")).dex, 1);
  assert.equal(motherOf(m(132), m(6, "m")).dex, 6); // with a Ditto: the other one, either gender
  assert.equal(layEgg(m(6, "m"), m(3, "f"), 0).dex, 1); // a Venusaur mother: a Bulbasaur
  // Nidoran ♀ (Nidorina and Nidoqueen have no eggs, as in the games): a ♀ or a ♂.
  const kids = new Set([0.1, 0.9].map((r) => layEgg(m(29, "f"), m(32, "m"), 0, () => r).dex));
  assert.deepEqual([...kids].sort(), [29, 32]);
  // Its parents' chosen moves it can learn, four at most.
  const dad = m(6, "m", { moves: ["Flamethrower", "Air Slash", "Dragon Pulse"] });
  const egg = layEgg(dad, m(4, "f"), 0, () => 0.5, names);
  assert.ok(egg.moves.length > 0 && egg.moves.every((n) => names(4).includes(n)), String(egg.moves));
  // Most an hour of work; a Magikarp 15 min; a Dratini two; never over four.
  assert.equal(hatchMinutes(4), 60);
  assert.equal(hatchMinutes(129), 15);
  assert.equal(hatchMinutes(147), 120);
  assert.equal(hatchMinutes(150), 240);
});

test("the Day Care runs on work: tries every 15 minutes, one egg at a time, hatched after its minutes", () => {
  const picks = { "box-1-4": m(4, "m"), "box-2-4": m(4, "f"), p0: m(6, "f") };
  let care = loadCare({ v: 1, pair: ["box-1-4", "box-2-4"] });
  // 10 minutes: not yet a try.
  let r = careWork(care, picks, 10, 0, () => 0);
  assert.ok(!r.laid && r.care.left === 10);
  // 5 more: a try, and (the same species, 50%) an egg.
  r = careWork(r.care, picks, 5, 1, () => 0.3);
  assert.equal(r.laid.dex, 4);
  care = r.care;
  assert.equal(care.egg.need, 60);
  // No other egg while it's there; it hatches after its hour.
  r = careWork(care, picks, 59, 2, () => 0);
  assert.ok(!r.hatched && r.care.egg.done === 59);
  r = careWork(r.care, picks, 3, 3, () => 0);
  assert.equal(r.hatched.dex, 4);
  assert.equal(r.care.egg, null);
  assert.equal(r.care.hatched, 1);
  assert.equal(r.care.left, 2); // the minutes over it go on
  // Unlucky tries: nothing; a pair not in the Box (one on an agent) or that can't: nothing.
  r = careWork(loadCare({ v: 1, pair: ["box-1-4", "box-2-4"] }), picks, LAY_MIN * 3, 0, () => 0.9);
  assert.ok(!r.laid && r.care.left === 0);
  assert.ok(!careWork(loadCare({ v: 1, pair: ["box-1-4", "p0"] }), picks, 60, 0, () => 0).laid);
  assert.ok(!careWork(loadCare({ v: 1, pair: ["box-1-4"] }), picks, 60, 0, () => 0).laid);
  // An egg hatches even if its parents were taken out meanwhile.
  r = careWork(loadCare({ v: 1, pair: [], egg: { dex: 4, need: 60, done: 50, at: 0 } }), {}, 20, 0);
  assert.equal(r.hatched.dex, 4);
  // A different species: 20% a try.
  let eggs = 0;
  const pk = { a: m(6, "m"), b: m(1, "f") };
  for (let i = 0; i < 4000; i++) if (careWork(loadCare({ v: 1, pair: ["box-a", "box-b"] }), { "box-a": pk.a, "box-b": pk.b }, LAY_MIN, 0).laid) eggs++;
  assert.ok(Math.abs(eggs / 4000 - 0.2) < 0.03, String(eggs));
});

test("what hatches: a Box Pokémon with two hearts, its moves, marked hatched", () => {
  const p = hatchPick({ dex: 4, moves: ["Ember"], need: 60, done: 60, at: 0 }, 5, { shiny: true, gender: "f", size: 1.1, nature: "calm" });
  assert.deepEqual([p.dex, p.shiny, p.hearts, p.gender, p.size, p.nature, p.hatched, p.caught], [4, true, 2, "f", 1.1, "calm", true, 5]);
  assert.deepEqual(p.moves, ["Ember"]);
  assert.deepEqual(loadCare(null), { v: 1, pair: [], left: 0, egg: null, hatched: 0, born: [] });
  const kept = loadPicks({ v: 2, panes: { "box-5-4": p } }).panes["box-5-4"];
  assert.deepEqual([kept.hatched, kept.moves, kept.gender, kept.nature], [true, ["Ember"], "f", "calm"]);
});

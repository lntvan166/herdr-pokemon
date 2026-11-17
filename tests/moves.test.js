import test from "node:test";
import assert from "node:assert/strict";
import { MOVES, pickMove, movesetOf, powerOf, ULTIMATE, CRIT, CRIT_HIT, MISS, MISS_ULTIMATE } from "../mods/pokemon-herd/moves.js";
import { TYPES } from "../mods/pokemon-herd/types.js";
import { blowWord } from "../mods/pokemon-herd/fx.js";

test("every type has a physical, a special and a signature move, each with its power", () => {
  for (const t of TYPES) assert.equal(MOVES[t]?.length, 3, t);
  assert.equal(new Set(Object.values(MOVES).flat()).size, TYPES.length * 3); // all different
  assert.equal(powerOf("Blast Burn"), 150);
  assert.equal(powerOf("Flamethrower"), 90);
});

test("it knows four moves it really learns, levelling up first: two of its own types, two for coverage", () => {
  assert.deepEqual(movesetOf(6).map((m) => m.name), ["Flamethrower", "Air Slash", "Dragon Claw", "Crunch"]); // Charizard
  assert.deepEqual(movesetOf(1).map((m) => m.name), ["Solar Beam", "Vine Whip", "Double-Edge", "Tackle"]); // Bulbasaur: no Outrage from a tutor
  assert.deepEqual(movesetOf(10).map((m) => m.name), ["Bug Bite", "Tackle"]); // Caterpie knows two
  assert.deepEqual(movesetOf("6mX").slice(0, 2).map((m) => m.name), ["Dragon Claw", "Flamethrower"]); // Mega X
  assert.ok(movesetOf(132).length >= 1); // Ditto learns none of these: one stands in
  assert.deepEqual(movesetOf("479f0002").slice(0, 2).map((m) => m.name), ["Thunder Shock", "Hydro Pump"]); // Rotom Wash: its Hydro Pump
});

test("each turn: mostly its strongest move, now and then another; a signature move 1 in 8; crits", () => {
  const seen = {};
  for (let i = 0; i < 600; i++) { const m = pickMove(6, 3); seen[m.name] = (seen[m.name] ?? 0) + 1; }
  const top = Object.entries(seen).sort((a, b) => b[1] - a[1])[0];
  assert.equal(top[0], "Flamethrower"); // 90 power, its own type (STAB), Venusaur weak to Fire
  assert.ok(Object.keys(seen).length >= 3); // but not only that
  const zam = {};
  for (let i = 0; i < 600; i++) { const m = pickMove(65, 68); zam[m.name] = (zam[m.name] ?? 0) + 1; }
  assert.ok((zam.Psychic ?? 0) > (zam["Zen Headbutt"] ?? 0) * 3); // Alakazam: its special side
  const seq = (...xs) => { let i = 0; return () => xs[i++]; };
  const big = pickMove(6, 3, seq(0, 0, 0, 0.9)); // its first move (Flamethrower), a signature move, a crit
  assert.deepEqual([big.name, big.power, big.physical, big.ultimate, big.stab], ["Blast Burn", 150, false, true, true]);
  assert.equal(big.mul, CRIT_HIT * 1.5); // the crit, and STAB
  assert.ok(ULTIMATE < 0.2 && CRIT < 0.1);
  assert.deepEqual(blowWord(2, true), ["A critical hit!", "#ff8a3c"]);
});

test("a move can miss: 1 in 20, a signature move 1 in 5; a miss does nothing", () => {
  const seq = (...xs) => { let i = 0; return () => xs[i++]; };
  assert.deepEqual([pickMove(6, 3, seq(0, 0.9, 0.9, 0)).miss, pickMove(6, 3, seq(0, 0.9, 0.9, 0)).mul], [true, 0]);
  assert.equal(pickMove(6, 3, seq(0, 0.9, 0.9, MISS + 0.01)).miss, false);
  assert.equal(pickMove(6, 3, seq(0, 0, 0.9, MISS + 0.01)).miss, true); // a signature move misses more
  assert.ok(MISS < MISS_ULTIMATE && MISS_ULTIMATE <= 0.2);
});

test("a move's power and side reach the damage", async () => {
  const { damage, hitWild } = await import("../mods/pokemon-herd/trainer.js");
  const weak = damage(6, 3, () => 0.5, { type: "fire", power: 75, physical: true }).dmg;
  const strong = damage(6, 3, () => 0.5, { type: "fire", power: 150, physical: false }).dmg;
  assert.ok(strong > weak * 2);
  assert.ok(hitWild({ dex: 3, hp: 1 }, 6, () => 0.5, false, false, false, 1, "fire", { power: 150, physical: false }).dmg
    > hitWild({ dex: 3, hp: 1 }, 6, () => 0.5, false, false, false, 1, "fire", { power: 75, physical: true }).dmg);
});

test("a physical blow leaves claw marks; a dash trails streaks", async () => {
  const { slashParts, speedLines, MOVE, MISS_WORD, MISS_KNOCK } = await import("../mods/pokemon-herd/fx.js");
  const r = slashParts(MOVE.fire, 1, 0.6), l = slashParts(MOVE.fire, -1, 0.6);
  assert.ok(r.length >= 15 && r.every((p) => p.color && p.w > 0));
  assert.deepEqual(l.map((p) => -p.x), r.map((p) => p.x)); // mirrored
  assert.ok(slashParts(MOVE.fire, 1, 1).length > r.length); // longer when it hits harder
  assert.ok(speedLines(MOVE.fire, 1).every((p) => p.x < 0)); // behind it, running right
  assert.ok(speedLines(MOVE.fire, -1).every((p) => p.x > 0));
  assert.equal(MISS_WORD[0], "Missed!");
  assert.equal(MISS_KNOCK.shake, false);
});

test("each of the more moves has its own look, well formed, and its power from the games", async () => {
  const { MORE_MOVES, powerOf } = await import("../mods/pokemon-herd/moves.js");
  const { physicalParts, specialParts, physicalTimes, specialTimes } = await import("../mods/pokemon-herd/fx.js");
  const { PHYSICAL, SPECIAL } = await import("../mods/pokemon-herd/fx-moves.js");
  const { MOVE_POWER } = await import("../mods/pokemon-herd/base-stats.js");
  for (const [type, list] of Object.entries(MORE_MOVES)) for (const [name, physical] of list) {
    assert.ok((physical ? PHYSICAL : SPECIAL)[name], name);
    assert.ok(MOVE_POWER[name] > 0 && powerOf(name) === MOVE_POWER[name], name);
    const parts = physical ? physicalParts(type, 50, 40, 56, 1, 7, null, name) : specialParts(type, 0, 100, 40, 7, null, name);
    assert.ok(parts.length > 0, name);
    for (const p of parts) assert.ok(p.color && [p.at, p.ms, p.a.x, p.a.y, p.a.w, p.a.h, p.b.x, p.b.y, p.b.w, p.b.h].every(Number.isFinite), name);
    assert.ok((physical ? physicalTimes(type, name) : specialTimes(type, name)).length > 0);
  }
});

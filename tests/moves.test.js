import test from "node:test";
import assert from "node:assert/strict";
import { MOVES, pickMove, isPhysical, ULTIMATE, CRIT, ULTIMATE_HIT, CRIT_HIT } from "../mods/pokemon-herd/moves.js";
import { TYPES } from "../mods/pokemon-herd/types.js";
import { blowWord } from "../mods/pokemon-herd/fx.js";

test("every type has a physical, a special and a signature move", () => {
  for (const t of TYPES) assert.equal(MOVES[t]?.length, 3, t);
  assert.equal(new Set(Object.values(MOVES).flat()).size, TYPES.length * 3); // all different
});

test("physical or special by its stats; its best type; now and then a signature move or a crit", () => {
  assert.equal(isPhysical(68), true); // Machamp
  assert.equal(isPhysical(65), false); // Alakazam
  assert.equal(isPhysical("6mX"), true); // Mega Charizard X: Attack 130
  const seq = (...xs) => { let i = 0; return () => xs[i++]; };
  const machamp = pickMove(68, 143, seq(0.9, 0.9, 0.9, 0.1)); // its stronger side // on Snorlax
  assert.deepEqual([machamp.type, machamp.name, machamp.physical, machamp.mul], ["fighting", "Brick Break", true, 1]);
  const zam = pickMove(65, 68, seq(0.9, 0.9, 0.9, 0.1)); // Alakazam on Machamp
  assert.deepEqual([zam.type, zam.name, zam.physical], ["psychic", "Psychic", false]);
  // Now and then the other side: Machamp fires, Alakazam rushes in.
  assert.equal(pickMove(68, 143, seq(0.9, 0.9, 0.9, 0.95)).name, "Aura Sphere");
  assert.equal(pickMove(65, 68, seq(0.9, 0.9, 0.9, 0.95)).physical, true);
  const big = pickMove(6, 3, seq(0, 0, 0.9, 0.1)); // a signature move, a crit
  assert.equal(big.name, "Blast Burn");
  assert.equal(big.physical, false); // a signature move fires
  assert.equal(big.mul, ULTIMATE_HIT * CRIT_HIT);
  assert.ok(ULTIMATE < 0.2 && CRIT < 0.1);
  assert.deepEqual(blowWord(2, true), ["A critical hit!", "#ff8a3c"]);
  assert.equal(blowWord(2, false)[0], "Super effective!");
});

test("a move's multiplier reaches the damage", async () => {
  const { damage, hitWild } = await import("../mods/pokemon-herd/trainer.js");
  const plain = damage(6, 3, () => 0.5).dmg;
  assert.ok(Math.abs(damage(6, 3, () => 0.5, { mul: 1.5 }).dmg / plain - 1.5) < 1e-9);
  assert.ok(hitWild({ dex: 3, hp: 1 }, 6, () => 0.5, false, false, false, 1.5).dmg > hitWild({ dex: 3, hp: 1 }, 6, () => 0.5).dmg);
});

test("its own type even when resisted; a miss does nothing", async () => {
  const { MISS, MISS_ULTIMATE } = await import("../mods/pokemon-herd/moves.js");
  const seq = (...xs) => { let i = 0; return () => xs[i++]; };
  const pika = pickMove(25, 74, seq(0.9, 0.9, 0.9)); // Pikachu on Geodude: still Electric, no effect
  assert.deepEqual([pika.type, pika.eff, pika.mul], ["electric", 0, 1]);
  const miss = pickMove(6, 3, seq(0.9, 0.9, 0)); // missed
  assert.deepEqual([miss.miss, miss.mul], [true, 0]);
  assert.equal(pickMove(6, 3, seq(0.9, 0.9, MISS + 0.01)).miss, false);
  assert.equal(pickMove(6, 3, seq(0, 0.9, MISS + 0.01)).miss, true); // a signature move misses more
  assert.ok(MISS < MISS_ULTIMATE && MISS_ULTIMATE <= 0.2);
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

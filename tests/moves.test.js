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
  const machamp = pickMove(68, 143, seq(0.9, 0.9)); // on Snorlax
  assert.deepEqual([machamp.type, machamp.name, machamp.physical, machamp.mul], ["fighting", "Brick Break", true, 1]);
  const zam = pickMove(65, 68, seq(0.9, 0.9)); // Alakazam on Machamp
  assert.deepEqual([zam.type, zam.name, zam.physical], ["psychic", "Psychic", false]);
  const big = pickMove(6, 3, seq(0, 0)); // a signature move, a crit
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

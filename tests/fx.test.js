import test from "node:test";
import assert from "node:assert/strict";
import { MOVE, BLUE_FIRE, moveStyle, shotParts, power, burstParts, knockOf, effectWord, wildSpot, wobbling, throwEnd, SHAKE_FROM, SHAKE_EVERY, WOBBLE } from "../mods/pokemon-herd/fx.js";
import { TYPES } from "../mods/pokemon-herd/types.js";

test("every type has a move style; Mega Charizard X's fire is blue", () => {
  for (const t of TYPES) assert.ok(MOVE[t]?.core, t);
  assert.equal(moveStyle("fire", true), BLUE_FIRE);
  assert.equal(moveStyle("fire"), MOVE.fire);
  assert.equal(moveStyle("water", true), MOVE.water); // only fire turns blue
  assert.equal(moveStyle("nonsense"), MOVE.normal);
});

test("a shot's tail trails behind it", () => {
  for (const t of TYPES) {
    for (const dir of [1, -1]) {
      const parts = shotParts(MOVE[t], dir);
      assert.ok(parts.length >= 5, t);
      for (const p of parts) assert.ok(p.w > 0 && p.h > 0 && p.color, t);
      for (const p of parts) assert.ok(!p.flicker || p.flicker >= 100, `${t}: GPUI loops need at least 100 ms`);
      // Nothing much ahead of it; the tail behind.
      assert.ok(parts.every((p) => p.x * dir <= 3), `${t} ${dir}`);
      assert.ok(parts.some((p) => p.x * dir < -8), `${t} ${dir}`);
    }
  }
  const big = shotParts(MOVE.fire, 1, 2);
  assert.equal(big.at(-1).w, shotParts(MOVE.fire, 1)[shotParts(MOVE.fire, 1).length - 1].w * 2);
});

test("harder hits: more power, a bigger burst, further knocked back, a shake", () => {
  assert.ok(power(4) > power(2) && power(2) > power(1) && power(1) > power(0.5) && power(0.5) > power(0));
  assert.ok(power(1, false) < power(1));
  const soft = burstParts(MOVE.fire, power(0.5), 7), hard = burstParts(MOVE.fire, power(2), 7);
  assert.ok(hard.sparks.length > soft.sparks.length);
  assert.ok(hard.flash.to > soft.flash.to);
  const far = (b) => Math.max(...b.sparks.map((s) => Math.hypot(s.dx, s.dy)));
  assert.ok(far(hard) > far(soft));
  assert.deepEqual(burstParts(MOVE.fire, 0.6, 3), burstParts(MOVE.fire, 0.6, 3)); // seeded: the same every frame
  assert.ok(knockOf(power(2)).px > knockOf(power(1)).px);
  assert.equal(knockOf(power(2)).shake, true);
  assert.equal(knockOf(power(1)).shake, false);
  assert.equal(knockOf(power(1, false)).shake, false);
});

test("the word over the target", () => {
  assert.equal(effectWord(2)[0], "Super effective!");
  assert.equal(effectWord(4)[0], "Extremely effective!");
  assert.equal(effectWord(0.5)[0], "Not very effective…");
  assert.equal(effectWord(0.25)[0], "Not very effective…");
  assert.equal(effectWord(0)[0], "No effect…");
  assert.equal(effectWord(1), null);
});

test("yours stands apart from the wild one, on its own side", () => {
  assert.equal(wildSpot(100, 300, 28, 900, 80), 220); // came from the left
  assert.equal(wildSpot(500, 300, 28, 900, 80), 380); // from the right
  assert.equal(wildSpot(10, 60, 28, 900, 80), 140); // no room on the left: the other side
  assert.equal(wildSpot(10, 60, 28, 100, 80), 28); // no room either side: as far as it goes
});

test("a ball wobbles once per shake, then rests; done after its shakes", () => {
  assert.equal(wobbling(SHAKE_FROM - 1, 3), false);
  assert.equal(wobbling(SHAKE_FROM + 10, 3), true);
  assert.equal(wobbling(SHAKE_FROM + WOBBLE + 10, 3), false); // resting between shakes
  assert.equal(wobbling(SHAKE_FROM + 2 * SHAKE_EVERY + 10, 3), true); // the third
  assert.equal(wobbling(SHAKE_FROM + 3 * SHAKE_EVERY + 10, 3), false); // no fourth
  assert.equal(wobbling(SHAKE_FROM + SHAKE_EVERY + 10, 1), false);
  assert.equal(throwEnd(3), SHAKE_FROM + 3 * SHAKE_EVERY);
  assert.equal(throwEnd(0), SHAKE_FROM + SHAKE_EVERY); // breaks out at once: still a beat
});

import { CHARGE_MS, BEAMS, travelOf, chargeParts, damageText, SOUNDS, launchSound, hitSound } from "../mods/pokemon-herd/fx.js";
import { existsSync } from "node:fs";
test("a move gathers, then flies as a shot or a beam", () => {
  assert.ok(CHARGE_MS >= 200 && CHARGE_MS <= 500);
  assert.equal(travelOf("ice"), "beam");
  assert.equal(travelOf("electric"), "beam");
  assert.equal(travelOf("fire"), "orb");
  assert.equal(travelOf(undefined), "orb");
  for (const t of BEAMS) assert.ok(TYPES.includes(t));
  const c = chargeParts(MOVE.fire, 3);
  assert.equal(c.length, 8);
  assert.deepEqual(chargeParts(MOVE.fire, 3), c); // seeded
  for (const p of c) assert.ok(Math.hypot(p.dx, p.dy) > 10 && p.size > 0);
});
test("the damage floats up as a percentage, coloured by how it went", () => {
  assert.deepEqual(damageText(0.234, 2), ["-23%", "#ffd23f"]);
  assert.equal(damageText(0.001)[0], "-1%"); // never -0%
  assert.equal(damageText(0.1, 0.5)[1], "#c8ccd4");
  assert.equal(damageText(0.1, 1, true)[1], "#ff8a80"); // yours hurt
});
test("every battle sound is shipped", () => {
  for (const s of SOUNDS) assert.ok(existsSync(new URL(`../mods/pokemon-herd/sfx/${s}.mp3`, import.meta.url)), s);
  assert.equal(launchSound("ice"), "zap");
  assert.equal(launchSound("fire"), "whoosh");
  assert.equal(hitSound(0.85), "bighit");
  assert.equal(hitSound(0.3), "hit");
});

import { TRAVEL, VOLLEY, dashAt, DASH_SHORT } from "../mods/pokemon-herd/fx.js";
test("each type travels its own way", () => {
  assert.equal(travelOf("rock"), "arc");
  assert.equal(travelOf("grass"), "volley");
  assert.equal(travelOf("fighting"), "orb"); // a special fighting move (Aura Sphere) flies
  assert.equal(travelOf("fire", true), "dash"); // a physical one rushes in, whatever its type
  assert.equal(travelOf("fire"), "orb");
  for (const t of Object.keys(TRAVEL)) assert.ok(TYPES.includes(t), t);
  assert.equal(VOLLEY.length, 3);
});
test("a dash rushes in short of the target and comes back", () => {
  assert.equal(dashAt(100, 200, 1000, 1300, 900), null); // not yet
  assert.deepEqual(dashAt(100, 200, 1000, 1300, 1100), { px: 100 - DASH_SHORT, ms: 200 });
  assert.deepEqual(dashAt(300, 200, 1000, 1300, 1000), { px: -(100 - DASH_SHORT), ms: 300 }); // leftward
  assert.deepEqual(dashAt(100, 200, 1000, 1300, 1400), { px: 0, ms: 260 }); // back
  assert.equal(dashAt(100, 200, 1000, 1300, 1600), null);
});
test("debris by its look: embers rise, drops and rocks fall", () => {
  const avg = (b) => b.sparks.reduce((s, x) => s + x.dy, 0) / b.sparks.length;
  assert.ok(avg(burstParts(MOVE.fire, 0.8, 4)) < avg(burstParts(MOVE.water, 0.8, 4)));
  assert.ok(avg(burstParts(MOVE.rock, 0.8, 4)) > 0);
  const spark = burstParts(MOVE.electric, 0.8, 4).sparks[0];
  assert.ok(spark.w > spark.h); // a streak
});

import { RESIDUE, residueOf, RESIDUE_MS, RESIDUE_FADE } from "../mods/pokemon-herd/fx.js";
test("every type leaves something on its target for a moment", () => {
  for (const t of TYPES) assert.ok(residueOf(t), t);
  assert.equal(residueOf("fire"), "burn");
  assert.equal(residueOf("ice"), "freeze");
  assert.equal(residueOf(undefined), null); // a plain strike leaves nothing
  assert.ok(RESIDUE_FADE < RESIDUE_MS);
  assert.ok(new Set(Object.values(RESIDUE)).size >= 8);
});

test("every signature move has its own look, landing as it hits", async () => {
  const { signatureParts, signatureTimes, MOVE } = await import("../mods/pokemon-herd/fx.js");
  const seen = new Set();
  for (const t of Object.keys(MOVE)) {
    const p = signatureParts(t, 20, 140, 40, 7);
    assert.ok(p.length >= 3, t);
    assert.ok(p.every((x) => x.ms >= 100 && x.at >= -420 && x.at <= 300 && x.color && x.a && x.b), t);
    assert.deepEqual(signatureParts(t, 20, 140, 40, 7), p); // the same on every frame
    assert.ok(signatureTimes(t).length > 0);
    seen.add(JSON.stringify(p.map((x) => [x.at, x.ms, x.a.w, x.b.h])));
  }
  assert.equal(seen.size, Object.keys(MOVE).length); // all different
  // Mirrored going left: Thunder still strikes the target.
  const l = signatureParts("electric", 140, 20, 40);
  assert.ok(l.some((x) => Math.abs(x.b.x - 20) < 8));
});

test("every physical move leaves its own mark; heavy blows hold a moment", async () => {
  const { physicalParts, physicalTimes, MOVE, stopOf, stopOfMove, HITSTOP, dashAt } = await import("../mods/pokemon-herd/fx.js");
  const seen = new Set();
  for (const t of Object.keys(MOVE)) {
    const p = physicalParts(t, 60, 40, 56, 1, 3);
    assert.ok(p.length >= 2 && p.every((x) => x.ms >= 90 && x.at >= -150 && Number.isFinite(x.a.x + x.a.y + x.b.x + x.b.y)), t);
    assert.ok(physicalTimes(t).length > 0);
    seen.add(JSON.stringify(p.map((x) => [x.at, x.ms, x.a.w, x.b.h])));
  }
  assert.equal(seen.size, Object.keys(MOVE).length);
  assert.equal(stopOf({ p: 0.85 }), HITSTOP);
  assert.equal(stopOf({ p: 0.6 }), 0);
  assert.equal(stopOf({ p: 1, miss: true }), 0);
  assert.equal(stopOfMove({ crit: true }), HITSTOP);
  assert.equal(stopOfMove({ eff: 1 }), 0);
  // The one rushing in holds where it struck through the hitstop, then goes back.
  assert.deepEqual(dashAt(0, 100, 0, 300, 350, HITSTOP), { px: 70, ms: 1 });
  assert.deepEqual(dashAt(0, 100, 0, 300, 400, HITSTOP), { px: 0, ms: 260 });
});

test("every special move flies its own way", async () => {
  const { specialParts, specialTimes, MOVE, FLY } = await import("../mods/pokemon-herd/fx.js");
  const seen = new Set();
  for (const t of Object.keys(MOVE)) {
    const p = specialParts(t, 20, 140, 40, 5);
    assert.ok(p.length >= 4 && p.every((x) => x.ms > 0 && x.at >= -FLY && Number.isFinite(x.a.x + x.a.y + x.b.x + x.b.y)), t);
    assert.ok(specialTimes(t).length > 0);
    seen.add(JSON.stringify(p.map((x) => [x.at, x.ms, x.a.w, x.b.h])));
  }
  assert.equal(seen.size, Object.keys(MOVE).length);
});

test("two battle far enough apart for their moves, by their sizes", async () => {
  const { fightGap, FIGHT_ROOM, MIN_GAP, MAX_GAP } = await import("../mods/pokemon-herd/fx.js");
  const { battleSpots } = await import("../mods/pokemon-herd/react.js");
  assert.equal(fightGap(60, 80), 70 + FIGHT_ROOM);
  assert.equal(fightGap(10, 10), MIN_GAP); // small ones still have room
  assert.equal(fightGap(200, 200), MAX_GAP); // big ones don't take the strip
  assert.equal(fightGap(undefined, 40), MIN_GAP);
  assert.deepEqual(battleSpots(200, 240, 28, 800, 120), { ax: 160, bx: 280 });
});

test("a move that can't touch it: no critical hit, no number", async () => {
  const { blowWord, damageText } = await import("../mods/pokemon-herd/fx.js");
  assert.notEqual(blowWord(0, true)[0], "A critical hit!");
  assert.equal(damageText(0.01, 0), null);
  assert.equal(damageText(0, 1), null);
  assert.equal(damageText(0.2, 1)[0], "-20%");
});

test("Mega Evolution: in full (beams, cocoon, the symbol, the burst), or short; within its time", async () => {
  const { megaParts, megaTiming, megaTimes, MEGA_FULL, MEGA_SHORT } = await import("../mods/pokemon-herd/fx.js");
  for (const full of [true, false]) {
    const T = megaTiming(full), p = megaParts(full, 64, 40, 30);
    assert.ok(p.every((x) => x.ms > 0 && x.at >= 0 && x.at + x.ms <= T.total && Number.isFinite(x.a.x + x.b.y)));
    assert.ok(megaTimes(full).includes(T.burst));
  }
  assert.ok(megaParts(true, 64, 40, 30).length > megaParts(false, 64, 40, 30).length); // beams only in full
  assert.ok(MEGA_FULL.total <= 2500 && MEGA_SHORT.total <= 1250);
});

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

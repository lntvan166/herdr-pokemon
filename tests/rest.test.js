import { test } from "node:test";
import assert from "node:assert/strict";
import { restSpot, roomAt } from "../mods/pokemon-herd/rest.js";

const inRange = (v, lo, hi) => Number.isFinite(v) && v >= lo && v <= hi;

test("alone", () => assert.equal(restSpot(100, [], 64, 296), 100));
test("already spaced", () => assert.equal(restSpot(100, [250], 64, 296), 100));
test("nudged to the nearest free spot", () => assert.equal(restSpot(100, [120], 64, 296), 216));
test("no room: the roomiest spot, finite and in range", () => {
  const v = restSpot(100, [80, 150, 220], 64, 296);
  assert.ok(inRange(v, 64, 296));
  assert.ok(roomAt(v, [80, 150, 220]) > roomAt(100, [80, 150, 220]));
});
test("degenerate", () => {
  assert.equal(restSpot(64, [64], 64, 64), 64);
  assert.ok(Number.isFinite(restSpot(100, [100, 100], 64, 296)));
});
// Place them one by one, as the tick does: each sees the others' spots.
function settle(n, x, lo, hi, gap) {
  const xs = Array(n).fill(x);
  for (let i = 0; i < n; i++) xs[i] = restSpot(xs[i], xs.filter((_, j) => j !== i), lo, hi, gap);
  const sorted = [...xs].sort((a, b) => a - b);
  return Math.min(...sorted.slice(1).map((v, i) => v - sorted[i]));
}
test("real sidebar: three on a 28..215 track get full spacing", () => assert.ok(settle(3, 120, 28, 215, 60) >= 60 - 1e-9));
test("real sidebar: four on a 28..215 track still spread", () => assert.ok(settle(4, 120, 28, 215, 60) >= 30));
test("roomAt", () => {
  assert.equal(roomAt(100, []), Infinity);
  assert.equal(roomAt(100, [90, 130]), 10);
});

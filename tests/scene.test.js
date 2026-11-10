import { test } from "node:test";
import assert from "node:assert/strict";
import { nightness, mix, palette, skyBands, features } from "../mods/pokemon-herd/scene.js";

test("nightness: day 6:30–17:30, night 18:30–5:30, an hour's blend at dawn and dusk", () => {
  assert.equal(nightness(12), 0);
  assert.equal(nightness(0), 1);
  assert.equal(nightness(23.5), 1);
  assert.equal(nightness(6), 0.5);
  assert.equal(nightness(18), 0.5);
  assert.equal(nightness(5.5), 1);
  assert.equal(nightness(6.5), 0);
  assert.equal(nightness(17.5), 0);
});

test("mix blends hex colours", () => {
  assert.equal(mix("#000000", "#ffffff", 0.5), "#808080");
  assert.equal(mix("#64aef2", "#0d1430", 0), "#64aef2");
  assert.equal(mix("#64aef2", "#0d1430", 1), "#0d1430");
});

test("palette: day at 0, night at 1", () => {
  assert.equal(palette(0).skyTop, "#64aef2");
  assert.equal(palette(1).skyTop, "#0d1430");
  assert.equal(palette(0).stars, 0);
  assert.equal(palette(1).clouds, 0);
});

test("skyBands: top to horizon, as many as asked", () => {
  const b = skyBands(palette(0), 8);
  assert.equal(b.length, 8);
  assert.equal(b[0], "#64aef2");
  assert.equal(b[7], "#cdeaff");
});

test("features: the same for a row every time, inside the row, scaled to its width", () => {
  const a = features(243, 72, 0);
  assert.deepEqual(a, features(243, 72, 0));
  assert.notDeepEqual(a, features(243, 72, 1)); // each row its own scene
  assert.equal(a.tufts.length, Math.ceil(243 / 3));
  for (const s of a.stars) assert.ok(s.x >= 0 && s.x < 243 && s.y >= 0 && s.y < 72 - 24);
  for (const c of a.clouds) assert.ok(c.x >= 0 && c.x + c.w <= 243);
  assert.ok(features(1600, 72, 0).stars.length > a.stars.length);
  assert.ok(a.hills.length >= 2);
});

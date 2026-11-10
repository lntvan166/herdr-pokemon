import { test } from "node:test";
import assert from "node:assert/strict";
import { nightness, mix, palette, features, isLight } from "../mods/pokemon-herd/scene.js";

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
  assert.equal(mix("#22383c", "#141b2c", 0), "#22383c");
  assert.equal(mix("#22383c", "#141b2c", 1), "#141b2c");
});

test("palette: day at 0, night at 1; muted, dark enough to sit in a dark app", () => {
  assert.equal(palette(0).sky, "#22383c");
  assert.equal(palette(1).sky, "#141b2c");
  const lum = (c) => [1, 3, 5].reduce((a, i) => a + parseInt(c.slice(i, i + 2), 16), 0) / 3;
  for (const n of [0, 0.5, 1]) assert.ok(lum(palette(n).sky) < 64, `sky at ${n} too bright`);
  assert.equal(palette(0).stars, 0);
  assert.equal(palette(1).clouds, 0);
});

test("features: the same for a row every time, inside the row, scaled to its width", () => {
  const a = features(243, 72, 0);
  assert.deepEqual(a, features(243, 72, 0));
  assert.notDeepEqual(a, features(243, 72, 1)); // each row its own scene
  assert.ok(a.tufts.length < 243 / 5, "tufts are sparse"); // not a comb along the whole ground
  for (const u of a.tufts) assert.ok(u.x >= 0 && u.x < 243 && u.h >= 1 && u.h <= 3);
  assert.ok(features(1200, 72, 0).clouds.length <= 3, "a cloud or few, not a row of them");
  for (const s of a.stars) assert.ok(s.x >= 0 && s.x < 243 && s.y >= 0 && s.y < 72 - 24);
  for (const c of a.clouds) assert.ok(c.x >= 0 && c.x + c.w <= 243);
  assert.ok(features(1600, 72, 0).stars.length > a.stars.length);
  assert.ok(features(1600, 72, 0).stars.length <= 1600 / 30, "stars stay sparse");
  assert.ok(a.hills.length >= 2);
});

test("isLight: by the colour's brightness", () => {
  assert.equal(isLight("#ffffff"), true);
  assert.equal(isLight("#f3f1ec"), true);
  assert.equal(isLight("#16171b"), false);
  assert.equal(isLight("#2b2d34"), false);
});

test("palette for a light theme: pale and soft, day and night, still a step from white", () => {
  const lum = (c) => [1, 3, 5].reduce((a, i) => a + parseInt(c.slice(i, i + 2), 16), 0) / 3;
  for (const n of [0, 0.5, 1]) {
    const p = palette(n, true);
    assert.ok(lum(p.sky) > 180 && lum(p.sky) < 240, `light sky at ${n}: ${p.sky}`);
    assert.ok(lum(p.grass) < lum(p.sky), "grass darker than the sky");
  }
  assert.notEqual(palette(0, true).sky, palette(1, true).sky);
  assert.equal(palette(0).sky, palette(0, false).sky);
});

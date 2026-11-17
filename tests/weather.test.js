import test from "node:test";
import assert from "node:assert/strict";
import { weatherNow, boosts, boostedMon, WEATHER_HIT, rollSize, sizeClass, drawSize, withRecord, sizeText, validSize, SIZES } from "../mods/pokemon-herd/weather.js";
import { TYPES } from "../mods/pokemon-herd/types.js";

test("the weather from the strip's sky: rain, night, then the season; every type has its turn", () => {
  assert.equal(weatherNow("rain").id, "rain");
  assert.equal(weatherNow("storm", null, 1).id, "storm"); // rain over night
  assert.equal(weatherNow("clear", { a: 1, b: 2, t: 0 }, 1).id, "night");
  assert.equal(weatherNow("clear", { a: 1, b: 2, t: 0 }, 0).id, "sunny");
  assert.equal(weatherNow("clear", { a: 1, b: 2, t: 1 }, 0).id, "windy"); // turning to autumn
  assert.equal(weatherNow("clear", { a: 3, b: 0, t: 0 }, 0).id, "snow");
  const all = new Set(["rain", "night", 0, 1, 2, 3].flatMap((k) => (typeof k === "string" ? weatherNow(k === "rain" ? "rain" : "clear", null, k === "night" ? 1 : 0) : weatherNow("clear", { a: k, b: k, t: 0 }, 0)).types));
  assert.deepEqual([...all].sort(), [...TYPES].sort());
  assert.ok(boosts(weatherNow("rain"), "water") && !boosts(weatherNow("rain"), "fire"));
  assert.ok(boostedMon(weatherNow("rain"), 7)); // Squirtle in the rain
  assert.ok(WEATHER_HIT > 1 && WEATHER_HIT < 1.5);
});

test("sizes: mostly average, now and then XS/XL, rarely XXS/XXL; records kept", () => {
  const seq = (...xs) => { let i = 0; return () => xs[i++]; };
  assert.equal(sizeClass(rollSize(seq(0.001, 0.5))), "XXS");
  assert.equal(sizeClass(rollSize(seq(0.1, 0.5))), "XS");
  assert.equal(sizeClass(rollSize(seq(0.5, 0.5))), null);
  assert.equal(sizeClass(rollSize(seq(0.9, 0.5))), "XL");
  assert.equal(sizeClass(rollSize(seq(0.999, 0.5))), "XXL");
  let n = 0;
  for (let i = 0; i < 4000; i++) if (sizeClass(rollSize()) === "XXL") n++;
  assert.ok(n > 40 && n < 180, String(n)); // about 1 in 40
  assert.ok(SIZES.every((s) => s.from < s.to));
  assert.equal(drawSize(1.5), 1.15); // only a little bigger: never taken for an Alpha
  assert.equal(drawSize(undefined), 1);
  assert.equal(validSize(9), undefined);
  const r1 = withRecord({}, { dex: 25, size: 1.4 });
  assert.deepEqual(r1, { 25: [1.4, 1.4] });
  assert.equal(withRecord(r1, { dex: 25, size: 1.4 }), null);
  assert.deepEqual(withRecord(r1, { dex: 25, size: 0.6 }), { 25: [0.6, 1.4] });
  assert.equal(sizeText(1.4, [0.6, 1.4]), "XXL · 1.40× size · biggest caught");
  assert.equal(sizeText(1.0), "1.00× size");
});

test("the weather brings its types; a size is kept when caught, in the Box and the Pokédex", async () => {
  const { wildPick, caughtPick, loadDex, typesOf } = await import("../mods/pokemon-herd/trainer.js");
  const { loadPicks } = await import("../mods/pokemon-herd/picks.js");
  let water = 0;
  for (let i = 0; i < 300; i++) if (typesOf(wildPick(new Set(), Math.random, { boost: ["water"], share: 1 }).dex).includes("water")) water++;
  assert.ok(water > 250, String(water)); // all of them, but the odd legendary
  const caught = caughtPick({ dex: 25, size: 1.42 }, 1000, () => 0.5);
  assert.equal(caught.size, 1.42);
  assert.equal(loadPicks({ panes: { "box-1": { ...caught } } }).panes["box-1"].size, 1.42);
  assert.equal(loadPicks({ panes: { "box-1": { ...caught, size: 7 } } }).panes["box-1"].size, undefined);
  const d = loadDex({ v: 1, caught: [25], sizes: { 25: [0.6, 1.42], 999: [1, 1], 26: "x" } });
  assert.deepEqual(d.sizes, { 25: [0.6, 1.42] });
});

test("a size is feel, not strength: small ones dodge, big ones are heavy", async () => {
  const { sizeMiss, knockMul } = await import("../mods/pokemon-herd/weather.js");
  const { pickMove, MISS } = await import("../mods/pokemon-herd/moves.js");
  assert.equal(sizeMiss(0.55), 1 / 8);
  assert.equal(sizeMiss(0.8), 1 / 12);
  assert.equal(sizeMiss(1.4), null);
  const seq = (...xs) => { let i = 0; return () => xs[i++]; };
  const F = { moves: ["Flamethrower"] }; // 100% accurate: only its size makes it miss
  assert.equal(pickMove(6, 3, seq(0.9, 0.9, 0.1, 0.1), F).miss, false);
  assert.equal(pickMove(6, 3, seq(0.9, 0.9, 0.1, 0.1), { ...F, targetSize: 0.55 }).miss, true); // an XXS dodges it
  assert.equal(pickMove(6, 3, seq(0.9, 0.9, 0.1, 0.1), { ...F, targetSize: 0.55 }).mul, 0);
  assert.ok(MISS < 1 / 8);
  assert.equal(knockMul(1.5, 1), 1.5); // an XXL hits it further
  assert.ok(knockMul(1, 1.5) < 0.7); // an XXL is knocked back less
  assert.equal(knockMul(undefined, undefined), 1);
  assert.equal(knockMul(1.5, 0.5), 1.6);
});

test("a size is said only when it is a record: an XXL biggest yet, an XXS smallest yet", async () => {
  const { recordSize } = await import("../mods/pokemon-herd/weather.js");
  assert.equal(recordSize({}, { dex: 25, size: 1.0 }), null); // average: never
  assert.equal(recordSize({}, { dex: 25, size: 1.2 }), null); // XL: never
  assert.equal(recordSize({}, { dex: 25, size: 1.4 }), "XXL"); // the first one caught
  assert.equal(recordSize({ 25: [0.9, 1.45] }, { dex: 25, size: 1.4 }), null); // not the biggest
  assert.equal(recordSize({ 25: [0.9, 1.35] }, { dex: 25, size: 1.4 }), "XXL");
  assert.equal(recordSize({ 25: [0.6, 1.2] }, { dex: 25, size: 0.55 }), "XXS");
});

import test from "node:test";
import assert from "node:assert/strict";
import { rateOf, rollGender, genderFrom, validGender, genderMark, femaleSprite, evolvesAs, genderless } from "../mods/pokemon-herd/gender.js";
import { loadPicks, evolveTarget } from "../mods/pokemon-herd/picks.js";
import { caughtPick, loadDex, withCaught, withEvolved } from "../mods/pokemon-herd/trainer.js";

test("each species' genders, as in the games", () => {
  assert.equal(rateOf(25), 4); // Pikachu: half and half
  assert.equal(rateOf(113), 8); // Chansey: all female
  assert.equal(rateOf(128), 0); // Tauros: all male
  assert.ok(genderless(81) && genderless(150)); // Magnemite, Mewtwo
  assert.equal(rollGender(113, () => 0.99), "f");
  assert.equal(rollGender(128, () => 0), "m");
  assert.equal(rollGender(81), null);
  assert.equal(rollGender(1, () => 0.2), "m"); // Bulbasaur: 1 in 8 female
  assert.equal(rollGender(1, () => 0.1), "f");
  assert.ok(validGender(25, "f") && !validGender(113, "m") && validGender(81, null) && !validGender(81, "m"));
  assert.equal(genderFrom(25, 13), genderFrom(25, 13)); // the same every time
  assert.equal(genderMark("f"), "♀");
  assert.ok(femaleSprite(25) && femaleSprite(3) && !femaleSprite(4));
});

test("a saved one keeps its gender; one from before is given one by its slot, for good", () => {
  const a = loadPicks({ panes: { p1: { dex: 25, shiny: false, mega: "off" } } }).panes.p1.gender;
  assert.ok(a === "m" || a === "f");
  assert.equal(loadPicks({ panes: { p1: { dex: 25, shiny: false, mega: "off" } } }).panes.p1.gender, a);
  assert.equal(loadPicks({ panes: { p1: { dex: 25, gender: "f" } } }).panes.p1.gender, "f");
  assert.equal(loadPicks({ panes: { p1: { dex: 113, gender: "m" } } }).panes.p1.gender, "f"); // a Chansey can't be male
  assert.equal(loadPicks({ panes: { p1: { dex: 81, gender: "m" } } }).panes.p1.gender, undefined);
  assert.equal(caughtPick({ dex: 25, gender: "f" }, 1, () => 0.5).gender, "f");
});

test("evolutions by gender: Kirlia ♂ to Gallade, Snorunt ♀ to Froslass, only a female Combee", () => {
  assert.ok(evolvesAs(475, "m") && !evolvesAs(475, "f") && evolvesAs(282, "f"));
  assert.equal(evolveTarget({ dex: 281, gender: "f" }, "s", { stone: "dawn" }), null);
  assert.equal(evolveTarget({ dex: 281, gender: "m" }, "s", { stone: "dawn" }), 475);
  assert.equal(evolveTarget({ dex: 361, gender: "f" }, "s", { stone: "dawn" }), 478);
  assert.equal(evolveTarget({ dex: 415, gender: "m", jobs: 99 }, "s", {}), null); // a male Combee never evolves
  assert.equal(evolveTarget({ dex: 415, gender: "f", jobs: 99 }, "s", {}), 416);
});

test("the Pokédex keeps both genders caught", () => {
  let d = loadDex({ v: 1 });
  d = withCaught(d, { dex: 25, gender: "m" });
  d = withCaught(d, { dex: 25, gender: "f" });
  assert.deepEqual([d.male, d.female], [[25], [25]]);
  assert.deepEqual(loadDex(d).female, [25]);
  const e = withEvolved(loadDex({ v: 1, caught: [25], seen: [25] }), [{ dex: 25, caught: 1, caughtAs: 25, gender: "f" }]);
  assert.deepEqual(e.female, [25]); // ones from before registered
});

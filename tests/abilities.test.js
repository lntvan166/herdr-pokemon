import test from "node:test";
import assert from "node:assert/strict";
import { abilityOf, abilSlot, abilityName, abilityText, rollAbil, eggAbil, works, newSide, meet, speedMul, immuneTo, onHit, afterHit, endTurn, sturdyHolds, stageMul, isHidden } from "../mods/pokemon-herd/abilities.js";

test("each one's ability: its slot, kept as it evolves; one saved before, one by its save slot", () => {
  assert.equal(abilityOf({ dex: 6, abil: 0 }), "blaze");
  assert.equal(abilityOf({ dex: 6, abil: 2 }), "solar-power");
  assert.equal(abilityOf({ dex: 4, abil: 2 }), "solar-power"); // Charmander's hidden one is Charizard's too
  assert.equal(abilityOf({ dex: 6, abil: 1 }), "blaze"); // no second one: its first
  assert.equal(abilityOf({ dex: 130, abil: 2 }), "moxie");
  assert.equal(abilityName("levitate"), "Levitate");
  assert.match(abilityText("blaze"), /Fire-type/);
  // None saved: one of its two by its slot, the same every time.
  const a = abilityOf({ dex: 1 }, "p123"), b = abilityOf({ dex: 1 }, "p123");
  assert.equal(a, b);
  assert.ok(["overgrow"].includes(a));
  const two = new Set(Array.from({ length: 40 }, (_, i) => abilityOf({ dex: 130 }, `s${i}`)));
  assert.deepEqual([...two], ["intimidate"]); // Gyarados: one normal, the hidden never by chance
  const kang = new Set(Array.from({ length: 40 }, (_, i) => abilityOf({ dex: 115 }, `s${i}`))); // Kangaskhan: Early Bird, Scrappy
  assert.equal(kang.size, 2);
  assert.ok(!isHidden({ dex: 115 }, "x"));
  assert.ok(works("levitate") && !works("cursed-body"));
});

test("how one gets its ability: one of two caught, the hidden one from a raid; an egg its mother's", () => {
  assert.equal(rollAbil(6, () => 0.9), 0); // Charizard: one only
  assert.equal(rollAbil(115, () => 0.9), 0);
  assert.equal(rollAbil(115, () => 0.1), 1);
  assert.equal(rollAbil(6, () => 0.9, true), 2);
  assert.equal(rollAbil(94, () => 0.9, true), 0); // Gengar: no hidden one
  assert.equal(eggAbil(115, 1, () => 0.5), 1); // her slot, 4 in 5
  assert.equal(eggAbil(115, 1, () => 0.9), 0);
  assert.equal(eggAbil(4, 2, () => 0.5), 2); // her hidden one, 3 in 5
  assert.notEqual(eggAbil(4, 2, () => 0.7), 2);
});

const mv = (type, more = {}) => ({ type, name: more.name ?? "X", physical: more.physical ?? false, stab: !!more.stab, eff: more.eff ?? 1, crit: !!more.crit, miss: !!more.miss, mul: more.mul ?? (more.miss ? 0 : 1), power: more.power ?? 80 });

test("in battle: immune to a type, a pinch, Intimidate, weather speed, Sturdy, stages", () => {
  // Levitate: a Ground move does nothing, and the attacker knows to pick another.
  const rotom = newSide("levitate");
  assert.ok(immuneTo(rotom, mv("ground")));
  const r = onHit(newSide(""), rotom, mv("ground", { physical: true, name: "Earthquake" }));
  assert.equal(r.mul, 0); assert.deepEqual(r.said.def, ["levitate"]);
  // Water Absorb: a quarter back.
  assert.equal(onHit(newSide(""), newSide("water-absorb"), mv("water")).heal, 0.25);
  // Wonder Guard: only a super-effective hit.
  assert.equal(onHit(newSide(""), newSide("wonder-guard"), mv("fire", { eff: 1 })).mul, 0);
  assert.equal(onHit(newSide(""), newSide("wonder-guard"), mv("fire", { eff: 2 })).mul, 1);
  // Blaze: its fire ×1.5 at a third of its health or less.
  assert.equal(onHit(newSide("blaze", 0.3), newSide(""), mv("fire")).mul, 1.5);
  assert.equal(onHit(newSide("blaze", 0.5), newSide(""), mv("fire")).mul, 1);
  // Huge Power: physical ×2, as in the games.
  assert.equal(onHit(newSide("huge-power"), newSide(""), mv("water", { physical: true })).mul, 2);
  // Iron Fist on a punch (its flag from PokeAPI).
  assert.equal(onHit(newSide("iron-fist"), newSide(""), mv("fire", { physical: true, name: "Fire Punch" })).mul, 1.2);
  assert.equal(onHit(newSide("iron-fist"), newSide(""), mv("fire", { name: "Flamethrower" })).mul, 1);
  // Thick Fat: fire and ice ×½; Multiscale at full health ×½.
  assert.equal(onHit(newSide(""), newSide("thick-fat"), mv("ice")).mul, 0.5);
  assert.equal(onHit(newSide(""), newSide("multiscale", 1), mv("ice")).mul, 0.5);
  assert.equal(onHit(newSide(""), newSide("multiscale", 0.8), mv("ice")).mul, 1);
  // Intimidate: their Attack a stage down for the battle (physical hits ×2/3); Inner Focus shrugs it off.
  const gyara = newSide("intimidate"), ursa = newSide("guts");
  assert.deepEqual(meet(gyara, ursa).a, ["intimidate"]);
  assert.equal(ursa.st.atk, -1);
  assert.ok(Math.abs(onHit(ursa, gyara, mv("ground", { physical: true })).mul - 2 / 3) < 1e-9);
  assert.equal(onHit(ursa, gyara, mv("ground")).mul, 1); // special: untouched
  const calm = newSide("inner-focus"); meet(newSide("intimidate"), calm); assert.equal(calm.st.atk, 0);
  const proud = newSide("defiant"); meet(newSide("intimidate"), proud); assert.equal(proud.st.atk, 1);
  // Swift Swim: ×2 in the rain.
  assert.equal(speedMul(newSide("swift-swim"), "rain"), 2);
  assert.equal(speedMul(newSide("swift-swim"), "sunny"), 1);
  // Moxie: a stage up for each it knocks out; Speed Boost each turn; Justified on a Dark hit.
  const mox = newSide("moxie");
  afterHit(mox, newSide(""), mv("dark"), { fainted: true, mul: 1 });
  assert.equal(mox.st.atk, 1);
  const sb = newSide("speed-boost"); endTurn(sb); endTurn(sb); assert.equal(speedMul(sb, "clear"), 2);
  const just = newSide("justified"); afterHit(newSide(""), just, mv("dark"), { fainted: false, mul: 1 }); assert.equal(just.st.atk, 1);
  assert.equal(stageMul(-1), 2 / 3); assert.equal(stageMul(2), 2);
  // Sturdy: from full health, it hangs on.
  assert.ok(sturdyHolds(newSide("sturdy"), 1) && !sturdyHolds(newSide("sturdy"), 0.9));
  // No Guard: a miss is a hit.
  assert.ok(!onHit(newSide("no-guard"), newSide(""), mv("fire", { miss: true })).miss);
  // A crit through Shell Armor: none.
  assert.equal(onHit(newSide(""), newSide("shell-armor"), mv("fire", { crit: true, mul: 1.5 })).crit, false);
});

import { itemUse, useItem, loadPicks } from "../mods/pokemon-herd/picks.js";
import { layEgg } from "../mods/pokemon-herd/breed.js";
import { towerPay } from "../mods/pokemon-herd/trainers.js";
test("an Ability Capsule swaps its two, an Ability Patch gives the hidden one; kept as saved; an egg's from its mother", () => {
  const kang = { dex: 115, abil: 0 };
  assert.equal(itemUse(kang, "p1", "ability-capsule"), "ability");
  assert.equal(useItem(kang, "p1", "ability-capsule").pick.abil, 1);
  assert.equal(itemUse({ dex: 6, abil: 0 }, "p1", "ability-capsule"), null); // Charizard: one only
  assert.equal(useItem({ dex: 6, abil: 0 }, "p1", "ability-patch").pick.abil, 2);
  assert.equal(itemUse({ dex: 6, abil: 2 }, "p1", "ability-patch"), null);
  assert.equal(itemUse({ dex: 94 }, "p1", "ability-patch"), null); // Gengar: none hidden
  assert.equal(loadPicks({ v: 2, panes: { p: { dex: 6, abil: 2 } } }).panes.p.abil, 2);
  // An egg: its mother's slot 4 in 5 (her hidden one 3 in 5).
  const egg = layEgg({ dex: 4, gender: "f", abil: 2 }, { dex: 4, gender: "m" }, 0, () => 0.1, null, ["box-a", "box-b"]);
  assert.equal(egg.abil, 2);
  assert.ok(towerPay(28).items.some(([id]) => id === "ability-patch"));
});

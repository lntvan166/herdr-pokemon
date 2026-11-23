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
  assert.equal(useItem({ dex: 6, abil: 2 }, "p1", "ability-patch").pick.abil, 0); // (and back, as Scarlet and Violet's)
  assert.equal(itemUse({ dex: 94 }, "p1", "ability-patch"), null); // Gengar: none hidden
  assert.equal(loadPicks({ v: 2, panes: { p: { dex: 6, abil: 2 } } }).panes.p.abil, 2);
  // An egg: its mother's slot 4 in 5 (her hidden one 3 in 5).
  const egg = layEgg({ dex: 4, gender: "f", abil: 2 }, { dex: 4, gender: "m" }, 0, () => 0.1, null, ["box-a", "box-b"]);
  assert.equal(egg.abil, 2);
  assert.ok(towerPay(28).items.some(([id]) => id === "ability-patch"));
});

import { sparTurns } from "../mods/pokemon-herd/spar.js";
test("in a spar too: Intimidate as they meet, Sturdy hangs on, each said once", () => {
  let seed = 5; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const r = sparTurns({ key: "130", ab: "intimidate" }, { key: "68", ab: "guts" }, rnd);
  assert.deepEqual(r.entry.a, ["intimidate"]);
  // Mewtwo at a Magikarp with Sturdy: its first blow leaves a sliver.
  for (let i = 0; i < 20; i++) {
    const s = sparTurns({ key: "150", ab: "pressure" }, { key: "129", ab: "sturdy" }, rnd);
    const first = s.turns.find((t) => t.by === "a" && t.move && !t.move.miss);
    if (!first) continue;
    assert.ok(first.hp >= 0.01, `left ${first.hp}`);
    assert.ok(first.abil?.includes("sturdy"));
    const again = s.turns.filter((t) => t.abil?.includes("sturdy"));
    assert.equal(again.length, 1, "said once");
  }
});

test("its ability stays as it moves between the strip and the Box (its slot written in on load)", () => {
  const loaded = loadPicks({ v: 2, panes: { "w1:p2": { dex: 16 } } }).panes["w1:p2"];
  assert.ok([0, 1].includes(loaded.abil));
  for (const key of ["box-1-16", "box-2-16", "p9"]) assert.equal(abilityOf(loaded, key), abilityOf(loaded, "w1:p2"), key);
});

test("Fluffy: a contact Fire move ×1 (½ × 2); Compound Eyes: hits acc × 1.3 of the time", () => {
  assert.equal(onHit(newSide(""), newSide("fluffy"), mv("fire", { physical: true, name: "Fire Punch" })).mul, 1);
  assert.equal(onHit(newSide(""), newSide("fluffy"), mv("fire", { name: "Flamethrower" })).mul, 2);
  assert.equal(onHit(newSide(""), newSide("fluffy"), mv("normal", { physical: true, name: "Body Slam" })).mul, 0.5);
  // Thunder, 70%: 91% with Compound Eyes.
  let seed = 4; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let hits = 0; const N = 20000;
  for (let i = 0; i < N; i++) { const miss = rnd() < 0.3; if (!onHit(newSide("compound-eyes"), newSide(""), mv("electric", { miss }), { missRate: 0.3 }, rnd).miss) hits++; }
  assert.ok(Math.abs(hits / N - 0.91) < 0.015, String(hits / N));
});

test("both with the same ability: said for each side (a spar)", () => {
  let seed = 8; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const r = sparTurns({ key: "130", ab: "intimidate" }, { key: "130", ab: "intimidate" }, rnd);
  assert.deepEqual([r.entry.a, r.entry.b], [["intimidate"], ["intimidate"]]);
  // Mewtwo at two Sturdy Magikarp in turn: each said once for its side.
  const s = sparTurns({ key: "150", ab: "pressure" }, { key: "129", ab: "sturdy" }, rnd);
  assert.ok(s.turns.filter((t) => t.abil?.includes("sturdy")).length <= 1);
});

// A move's stages on its own user (move-stages.js, the games'): Close Combat's Def and SpD down even
// as the other faints, Power-Up Punch's Attack up; none on a miss. Sacred Sword ignores the target's.
test("moves' stages: Close Combat, Power-Up Punch, Sacred Sword", async () => {
  const A = await import("../mods/pokemon-herd/abilities.js");
  const a = A.newSide(""), d = A.newSide("");
  const cc = { name: "Close Combat", type: "fighting", physical: true, mul: 1.5, eff: 1 };
  const r = A.afterHit(a, d, cc, { mul: 1.5, fainted: true });
  assert.deepEqual([a.st.def, a.st.spd], [-1, -1]);
  assert.deepEqual(r.stages.att, [["def", -1], ["spd", -1]]);
  assert.equal(A.stageWords(r.stages.att), "Def↓ SpD↓");
  A.afterHit(a, d, cc, { mul: 0, miss: true });
  assert.equal(a.st.def, -1, "a miss: nothing");
  const b = A.newSide("");
  A.afterHit(b, d, { name: "Power-Up Punch", type: "fighting", physical: true }, { mul: 1 });
  assert.equal(b.st.atk, 1);
  const up = A.newSide(""); up.st.def = 2;
  const plain = A.onHit(A.newSide(""), up, { name: "Brick Break", type: "fighting", physical: true, mul: 1, eff: 1 }).mul;
  const sword = A.onHit(A.newSide(""), up, { name: "Sacred Sword", type: "fighting", physical: true, mul: 1, eff: 1 }).mul;
  assert.ok(Math.abs(sword / plain - 2) < 1e-9, "its +2 Defense counted for nothing");
});

// Recoil and crash, as the games' (selfHurt): Brave Bird a third of what it dealt; High Jump Kick
// missed, half its health; Rock Head no recoil, Magic Guard neither; one risen (1 in 8), none.
test("recoil and crash", async () => {
  const A = await import("../mods/pokemon-herd/abilities.js");
  const bb = { name: "Brave Bird", type: "flying", physical: true };
  assert.ok(Math.abs(A.selfHurt(A.newSide(""), bb, { mul: 1 }, 0.6).hurt - 0.198) < 1e-9);
  assert.equal(A.selfHurt(A.newSide(""), bb, { mul: 1 }, 0.6).word, "Recoil!");
  assert.equal(A.selfHurt(A.newSide("rock-head"), bb, { mul: 1 }, 0.6).hurt, 0);
  assert.equal(A.selfHurt(A.newSide(""), { ...bb, risen: true }, { mul: 1 }, 0.6).hurt, 0);
  const hjk = { name: "High Jump Kick", type: "fighting", physical: true };
  assert.equal(A.selfHurt(A.newSide(""), hjk, { mul: 0, miss: true }, 0).hurt, 0.5);
  assert.equal(A.selfHurt(A.newSide("rock-head"), hjk, { mul: 0, miss: true }, 0).hurt, 0.5, "Rock Head: recoil only");
  assert.equal(A.selfHurt(A.newSide("magic-guard"), hjk, { mul: 0, miss: true }, 0).hurt, 0);
  assert.equal(A.selfHurt(A.newSide(""), hjk, { mul: 1 }, 0.5).hurt, 0, "it hit: no crash");
});

// Items held in battle, as the games'.
test("battle items: damage, speed, Focus Sash, Air Balloon, Weakness Policy, costs, Choice lock", async () => {
  const A = await import("../mods/pokemon-herd/abilities.js");
  const { pickMove } = await import("../mods/pokemon-herd/moves.js");
  const hit = (att, def, m) => A.onHit(att, def, { type: "normal", physical: true, mul: 1, eff: 1, ...m }).mul;
  const plain = hit(A.newSide(""), A.newSide(""), { name: "Tackle" });
  const w = (item, m = {}, defItem = "", nfe = false) => hit(A.newSide("", 1, { item }), A.newSide("", 1, { item: defItem, nfe }), { name: "Tackle", ...m }) / plain;
  assert.ok(Math.abs(w("life-orb") - 1.3) < 1e-9);
  assert.ok(Math.abs(w("choice-band") - 1.5) < 1e-9);
  assert.ok(Math.abs(w("choice-specs") - 1) < 1e-9, "Specs: not a physical move");
  assert.ok(Math.abs(w("expert-belt", { eff: 2 }) - 1.2) < 1e-9);
  assert.ok(Math.abs(w("", { physical: false }, "assault-vest") - 1 / 1.5) < 1e-9);
  assert.ok(Math.abs(w("", {}, "eviolite", true) - 1 / 1.5) < 1e-9);
  assert.equal(w("", {}, "eviolite", false), 1, "fully evolved: nothing");
  assert.equal(A.speedMul(A.newSide("", 1, { item: "choice-scarf" }), "clear"), 1.5);
  // Focus Sash: once.
  const sash = A.newSide("", 1, { item: "focus-sash" });
  assert.equal(A.sturdyHolds(sash, 1), "focus-sash");
  assert.equal(A.sturdyHolds(sash, 1), "", "used up");
  // Air Balloon: Ground misses till a hit pops it.
  const bal = A.newSide("", 1, { item: "air-balloon" });
  assert.equal(hit(A.newSide(""), bal, { name: "Earthquake", type: "ground" }), 0);
  A.afterHit(A.newSide(""), bal, { name: "Tackle", type: "normal" }, { mul: 1 });
  assert.ok(hit(A.newSide(""), bal, { name: "Earthquake", type: "ground" }) > 0, "popped");
  // Weakness Policy: +2 Atk and SpA, once.
  const wp = A.newSide("", 1, { item: "weakness-policy" });
  A.afterHit(A.newSide(""), wp, { name: "Tackle" }, { mul: 1, eff: 2 });
  assert.deepEqual([wp.st.atk, wp.st.spa], [2, 2]);
  // Costs: Life Orb a tenth; Rocky Helmet a sixth (a move that touches); Shell Bell an eighth back.
  assert.ok(Math.abs(A.selfHurt(A.newSide("", 1, { item: "life-orb" }), { name: "Surf" }, { mul: 1 }, 0.4).hurt - 0.1) < 1e-9);
  assert.ok(Math.abs(A.selfHurt(A.newSide(""), { name: "Tackle" }, { mul: 1 }, 0.4, 1, A.newSide("", 1, { item: "rocky-helmet" })).hurt - 1 / 6) < 1e-9);
  assert.equal(A.selfHurt(A.newSide(""), { name: "Surf" }, { mul: 1 }, 0.4, 1, A.newSide("", 1, { item: "rocky-helmet" })).hurt, 0, "Surf doesn't touch");
  assert.ok(Math.abs(A.selfHurt(A.newSide("", 1, { item: "shell-bell" }), { name: "Surf" }, { mul: 1 }, 0.4).hurt + 0.05) < 1e-9);
  assert.equal(A.selfHurt(A.newSide("magic-guard", 1, { item: "life-orb" }), { name: "Surf" }, { mul: 1 }, 0.4).hurt, 0);
  // Choice: locked into its first move.
  const ch = A.newSide("", 1, { item: "choice-band" });
  A.afterHit(ch, A.newSide(""), { name: "Iron Head" }, { mul: 1 });
  assert.equal(A.lockOf(ch), "Iron Head");
  for (let i = 0; i < 50; i++) { const m = pickMove("983", "94", Math.random, { lock: A.lockOf(ch) }); assert.equal(m.base ?? m.name, "Iron Head"); }
  // Leftovers: a sixteenth.
  assert.equal(A.leftovers({ ...A.newSide("", 0.5, { item: "leftovers" }) }), 1 / 16);
});

// A Mega's own ability, as the games': Mega Charizard X Tough Claws, Y Drought; none for others.
test("Mega abilities", async () => {
  const A = await import("../mods/pokemon-herd/abilities.js");
  assert.equal(A.megaAbility("6mX"), "tough-claws");
  assert.equal(A.megaAbility("6mY"), "drought");
  assert.equal(A.megaAbility("94m"), "shadow-tag");
  assert.equal(A.megaAbility("6"), null);
  // Tough Claws works: a contact move ×1.3.
  const plain = A.onHit(A.newSide(""), A.newSide(""), { name: "Dragon Claw", type: "dragon", physical: true, mul: 1, eff: 1 }).mul;
  const claws = A.onHit(A.newSide(A.megaAbility("6mX")), A.newSide(""), { name: "Dragon Claw", type: "dragon", physical: true, mul: 1, eff: 1 }).mul;
  assert.ok(Math.abs(claws / plain - 1.3) < 1e-9);
});

// Mega Evolving: in with its own ability first (Gyarados' Intimidate), then its Mega's; a Mega's
// own Intimidate works as it evolves (Mega Manectric).
test("Mega Evolving: its own ability first, then its Mega's", async () => {
  const A = await import("../mods/pokemon-herd/abilities.js");
  const gy = A.newSide("intimidate"), foe = A.newSide("");
  A.meet(gy, foe);
  assert.equal(foe.st.atk, -1);
  const m = A.megaEvolve(gy, foe, "mold-breaker");
  assert.equal(gy.ab, "mold-breaker");
  assert.deepEqual(m.a, ["mold-breaker"]);
  assert.equal(foe.st.atk, -1, "no second drop");
  const man = A.newSide("static"), foe2 = A.newSide("");
  A.meet(man, foe2);
  A.megaEvolve(man, foe2, "intimidate");
  assert.equal(foe2.st.atk, -1, "its Mega's Intimidate as it evolves");
});

// Sucker Punch fails on one not about to attack (a setup move, or it moved first); Supreme Overlord
// ×1.1 for each fallen, five at most.
test("Sucker Punch fails; Supreme Overlord", async () => {
  const A = await import("../mods/pokemon-herd/abilities.js");
  const sp = { name: "Sucker Punch" };
  assert.equal(A.suckerFails(sp, { name: "Swords Dance", status: true }, false), true);
  assert.equal(A.suckerFails(sp, { name: "Shadow Ball" }, true), true, "it moved first");
  assert.equal(A.suckerFails(sp, { name: "Shadow Ball" }, false), false);
  assert.equal(A.suckerFails(sp, null, false), true, "an item, a switch");
  assert.equal(A.suckerFails({ name: "Kowtow Cleave" }, { status: true }, false), false);
  const m = { name: "Kowtow Cleave", type: "dark", physical: true, mul: 1, eff: 1 };
  const base = A.onHit(A.newSide("supreme-overlord"), A.newSide(""), m).mul;
  const two = A.onHit({ ...A.newSide("supreme-overlord"), fallen: 2 }, A.newSide(""), m).mul;
  const nine = A.onHit({ ...A.newSide("supreme-overlord"), fallen: 9 }, A.newSide(""), m).mul;
  assert.ok(Math.abs(two / base - 1.2) < 1e-9);
  assert.ok(Math.abs(nine / base - 1.5) < 1e-9, "five at most");
});

// A regional form's own abilities: Hisuian Arcanine Rock Head (hidden), not Justified.
test("regional forms' own abilities", async () => {
  const A = await import("../mods/pokemon-herd/abilities.js");
  assert.equal(A.abilityOf({ dex: 59, form: "0001", abil: 2 }), "rock-head");
  assert.equal(A.abilityOf({ dex: 59, abil: 2 }), "justified");
  assert.equal(A.abilityOf({ dex: 59, form: "0001", abil: 0 }), "intimidate");
});

// What the AI may count on, as a player would: an ability's immunity once it's shown, or when its
// kind has only the one; an Air Balloon always (in plain sight).
test("known immunities: shown, or the only one", async () => {
  const A = await import("../mods/pokemon-herd/abilities.js");
  const eq = { name: "Earthquake", type: "ground", physical: true, mul: 1, eff: 1 };
  const two = [26, 30, 0]; // (a kind with Levitate or another)
  const lev = A.newSide("levitate");
  assert.equal(A.knownImmune(lev, eq, two), false, "not shown yet (it may have the other)");
  A.onHit(A.newSide(""), lev, eq);
  assert.equal(A.knownImmune(lev, eq, two), true, "shown: Earthquake missed it");
  assert.equal(A.knownImmune(A.newSide("levitate"), eq, [26, 0, 0]), true, "its kind's only one");
  assert.equal(A.knownImmune(A.newSide("", 1, { item: "air-balloon" }), eq, two), true);
});

// An Ability Patch both ways (Scarlet and Violet's): to its hidden one, and back to its first.
test("Ability Patch: to its hidden one and back", async () => {
  const P = await import("../mods/pokemon-herd/picks.js");
  const A = await import("../mods/pokemon-herd/abilities.js");
  const k = { dex: 983, abil: 0 };
  const hidden = P.useItem(k, "s", "ability-patch", {}).pick;
  assert.equal(A.abilityOf(hidden, "s"), "pressure");
  assert.equal(P.itemUse(hidden, "s", "ability-capsule"), null, "a Capsule: not on a hidden one");
  const back = P.useItem(hidden, "s", "ability-patch", {}).pick;
  assert.equal(A.abilityOf(back, "s"), "defiant");
});

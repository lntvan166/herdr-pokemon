import test from "node:test";
import assert from "node:assert/strict";
import { MOVES, pickMove, movesetOf, powerOf, ULTIMATE, CRIT, CRIT_HIT, missOf } from "../mods/pokemon-herd/moves.js";
import { TYPES } from "../mods/pokemon-herd/types.js";
import { blowWord } from "../mods/pokemon-herd/fx.js";

test("every type has a physical, a special and a signature move, each with its power", () => {
  for (const t of TYPES) assert.equal(MOVES[t]?.length, 3, t);
  assert.equal(new Set(Object.values(MOVES).flat()).size, TYPES.length * 3); // all different
  assert.equal(powerOf("Blast Burn"), 150);
  assert.equal(powerOf("Flamethrower"), 90);
});

test("it knows four moves it really learns: levelling up first, never a weak one if it has others", () => {
  assert.deepEqual(movesetOf(6).map((m) => m.name), ["Overheat", "Air Slash", "Solar Beam", "Double-Edge"]); // Charizard: the games' Overheat now among its moves
  assert.deepEqual(movesetOf(3).map((m) => m.name), ["Solar Beam", "Sludge Wave", "Double-Edge", "Outrage"]); // Venusaur: no Tackle
  assert.deepEqual(movesetOf(10).map((m) => m.name), ["Bug Bite", "Electroweb", "Tackle"]); // Caterpie knows only these (Electroweb: the games' others)
  assert.deepEqual(movesetOf(475).slice(0, 2).map((m) => m.type).sort(), ["fighting", "psychic"]); // Gallade: one of each of its types
  assert.ok(movesetOf(132).length >= 1); // Ditto learns none of these: one stands in
  assert.ok(movesetOf("479f0002").some((m) => m.name === "Hydro Pump")); // Rotom Wash: its Hydro Pump
});

test("moves chosen: only ones it can really learn (weak and signature ones too), four at most", async () => {
  const { learnableOf, chosenOf, MAX_MOVES } = await import("../mods/pokemon-herd/moves.js");
  const zard = learnableOf(6).map((m) => m.name);
  assert.ok(zard.includes("Blast Burn") && zard.includes("Ember") && !zard.includes("Hydro Pump"));
  assert.ok(learnableOf(475).some((m) => m.name === "Close Combat" && m.sig)); // Gallade can be taught Close Combat
  assert.deepEqual(chosenOf(6, ["Ember", "Hydro Pump", "Blast Burn"]).map((m) => m.name), ["Ember", "Blast Burn"]);
  assert.equal(chosenOf(6, ["Hydro Pump"]), null);
  assert.equal(chosenOf(6, ["Ember", "Flamethrower", "Fire Blast", "Air Slash", "Dragon Claw"]).length, MAX_MOVES);
  assert.deepEqual(movesetOf(6, ["Ember"]).map((m) => m.name), ["Ember"]);
  // Used as chosen: always one of them; a signature move as one (it fires).
  for (let i = 0; i < 50; i++) assert.equal(pickMove(6, 3, Math.random, { moves: ["Ember"] }).type, "fire");
  const bb = pickMove(6, 3, () => 0.99, { moves: ["Blast Burn"] });
  assert.equal(bb.name, "Blast Burn");
  assert.equal(bb.ultimate, true);
});

test("each turn: mostly its strongest move, now and then another; a signature move 1 in 8; crits", () => {
  const seen = {};
  for (let i = 0; i < 600; i++) { const m = pickMove(6, 3); seen[m.name] = (seen[m.name] ?? 0) + 1; }
  const top = Object.entries(seen).sort((a, b) => b[1] - a[1])[0];
  assert.equal(top[0], "Overheat"); // 130 power, its own type (STAB), Venusaur weak to Fire
  assert.ok(Object.keys(seen).length >= 3); // but not only that
  const zam = {};
  for (let i = 0; i < 600; i++) { const m = pickMove(65, 68); zam[m.name] = (zam[m.name] ?? 0) + 1; }
  assert.ok((zam.Psychic ?? 0) > (zam["Zen Headbutt"] ?? 0) * 3); // Alakazam: its special side
  const seq = (...xs) => { let i = 0; return () => xs[i++]; };
  const big = pickMove(6, 3, seq(0, 0, 0, 0.9)); // its first move (Flamethrower), a signature move, a crit
  assert.deepEqual([big.name, big.power, big.physical, big.ultimate, big.stab], ["Blast Burn", 150, false, true, true]);
  assert.equal(big.mul, CRIT_HIT * 1.5); // the crit, and STAB
  assert.ok(ULTIMATE < 0.2 && CRIT < 0.1);
  assert.deepEqual(blowWord(2, true), ["A critical hit!", "#ff8a3c"]);
});

test("a move misses as its accuracy in the games says; a miss does nothing", () => {
  const seq = (...xs) => { let i = 0; return () => xs[i++]; };
  assert.equal(missOf("Flamethrower"), 0); // 100%
  assert.ok(Math.abs(missOf("Fire Blast") - 0.15) < 1e-9); // 85%
  assert.ok(Math.abs(missOf("Thunder") - 0.3) < 1e-9); // 70%
  assert.equal(missOf("Swift"), 0); // never misses
  assert.equal(missOf("Flower Trick"), 0);
  // [which move, signature?, crit?, miss?]: Fire Blast misses under 15 in 100, not over.
  const blast = (r) => pickMove(6, 3, seq(0, 0.9, 0.9, r), { moves: ["Fire Blast"] });
  assert.deepEqual([blast(0.14).miss, blast(0.14).mul], [true, 0]);
  assert.equal(blast(0.16).miss, false);
  assert.equal(pickMove(6, 3, seq(0, 0.9, 0.9, 0), { moves: ["Flamethrower"] }).miss, false); // 100%: never
});

test("a move's power and side reach the damage", async () => {
  const { damage, hitWild } = await import("../mods/pokemon-herd/trainer.js");
  const weak = damage(6, 3, () => 0.5, { type: "fire", power: 75, physical: true }).dmg;
  const strong = damage(6, 3, () => 0.5, { type: "fire", power: 150, physical: false }).dmg;
  assert.ok(strong > weak * 2);
  assert.ok(hitWild({ dex: 3, hp: 1 }, 6, () => 0.5, false, false, false, 1, "fire", { power: 150, physical: false }).dmg
    > hitWild({ dex: 3, hp: 1 }, 6, () => 0.5, false, false, false, 1, "fire", { power: 75, physical: true }).dmg);
});

test("a physical blow leaves claw marks; a dash trails streaks", async () => {
  const { slashParts, speedLines, MOVE, MISS_WORD, MISS_KNOCK } = await import("../mods/pokemon-herd/fx.js");
  const r = slashParts(MOVE.fire, 1, 0.6), l = slashParts(MOVE.fire, -1, 0.6);
  assert.ok(r.length >= 15 && r.every((p) => p.color && p.w > 0));
  assert.deepEqual(l.map((p) => -p.x), r.map((p) => p.x)); // mirrored
  assert.ok(slashParts(MOVE.fire, 1, 1).length > r.length); // longer when it hits harder
  assert.ok(speedLines(MOVE.fire, 1).every((p) => p.x < 0)); // behind it, running right
  assert.ok(speedLines(MOVE.fire, -1).every((p) => p.x > 0));
  assert.equal(MISS_WORD[0], "Missed!");
  assert.equal(MISS_KNOCK.shake, false);
});

test("each of the more moves has its own look, well formed, and its power from the games", async () => {
  const { MORE_MOVES, MORE_OWN, powerOf } = await import("../mods/pokemon-herd/moves.js");
  const own = new Set(Object.values(MORE_OWN).flat().map(([n]) => n));
  const { physicalParts, specialParts, physicalTimes, specialTimes } = await import("../mods/pokemon-herd/fx.js");
  const { PHYSICAL, SPECIAL } = await import("../mods/pokemon-herd/fx-moves.js");
  const { MOVE_POWER } = await import("../mods/pokemon-herd/base-stats.js");
  for (const [type, list] of Object.entries(MORE_MOVES)) for (const [name, physical] of list) {
    if (own.has(name)) assert.ok((physical ? PHYSICAL : SPECIAL)[name], name); // (the games' others: drawn as their type's)
    assert.ok(MOVE_POWER[name] > 0 && powerOf(name) >= MOVE_POWER[name], name); // (a multi-hit one: all its hits)
    const parts = physical ? physicalParts(type, 50, 40, 56, 1, 7, null, name) : specialParts(type, 0, 100, 40, 7, null, name);
    assert.ok(parts.length > 0, name);
    for (const p of parts) assert.ok(p.color && [p.at, p.ms, p.a.x, p.a.y, p.a.w, p.a.h, p.b.x, p.b.y, p.b.w, p.b.h].every(Number.isFinite), name);
    assert.ok((physical ? physicalTimes(type, name) : specialTimes(type, name)).length > 0);
  }
});

test("a Pokémon's own move (EXCLUSIVE): always among its four; Judgment takes the type that does most", async () => {
  const { EXCLUSIVE, exclusiveOf, judgedType, learnableOf } = await import("../mods/pokemon-herd/moves.js");
  assert.equal(movesetOf(493)[0].name, "Judgment");
  assert.equal(movesetOf(150)[0].name, "Psystrike");
  assert.equal(movesetOf(25)[0].name, "Volt Tackle");
  assert.equal(movesetOf(26).some((m) => m.name === "Volt Tackle"), false); // Raichu doesn't
  assert.ok(movesetOf(493).length <= 4);
  assert.ok(learnableOf(493).some((m) => m.name === "Judgment" && m.exclusive));
  for (const [name, m] of Object.entries(EXCLUSIVE)) assert.ok(m.type && m.power > 0 && m.dex.length && exclusiveOf(m.keys ? m.keys[0] : m.form ? `${m.dex[0]}${m.form}` : m.dex[0]).some((x) => x.name === name), name);
  // Judgment: ×4 on Charizard (Rock), Dragonite (Ice), Tyranitar (Fighting); ×2 on Gengar (Ground).
  assert.equal(judgedType(6), "rock");
  assert.equal(judgedType(149), "ice");
  assert.equal(judgedType(248), "fighting");
  const j = pickMove(493, 6, () => 0.01, { moves: ["Judgment"] });
  assert.deepEqual([j.name, j.type, j.eff, j.stab, j.exclusive], ["Judgment", "rock", 4, true, true]);
  // Flower Trick always lands a critical hit; Thousand Arrows hits a Flying type.
  assert.equal(pickMove(908, 3, () => 0.99, { moves: ["Flower Trick"] }).crit, true);
  assert.equal(pickMove(718, 6, () => 0.99, { moves: ["Thousand Arrows"] }).eff, 1);
});

test("the weather, as the main games have it: Thunder sure in rain, unsure in sun; Blizzard sure in snow; Solar Beam weak in rain", async () => {
  const { weatherMiss, weatherPower, missOf } = await import("../mods/pokemon-herd/moves.js");
  assert.equal(weatherMiss("Thunder", "rain"), 0);
  assert.equal(weatherMiss("Hurricane", "storm"), 0);
  assert.equal(weatherMiss("Thunder", "sunny"), 0.5);
  assert.equal(weatherMiss("Thunder", "night"), missOf("Thunder"));
  assert.equal(weatherMiss("Blizzard", "snow"), 0);
  assert.equal(weatherPower("Solar Beam", "rain"), 0.5);
  assert.equal(weatherPower("Solar Beam", "sunny"), 1);
  assert.equal(weatherPower("Flamethrower", "rain"), 1);
  // Used: a Thunder in the rain lands on a roll that would miss it otherwise.
  const seq = (...xs) => { let i = 0; return () => xs[i++]; };
  const thunder = (w) => pickMove(25, 7, seq(0, 0.9, 0.9, 0.2), { moves: ["Thunder"], weather: w });
  assert.equal(thunder(null).miss, true);
  assert.equal(thunder("rain").miss, false);
  const solar = (w) => pickMove(3, 7, seq(0, 0.9, 0.9, 0.5), { moves: ["Solar Beam"], weather: w });
  assert.ok(Math.abs(solar("rain").mul - solar("sunny").mul / 2) < 1e-9);
});

test("every Pokémon's own move has a scene of its own, drawn in finite boxes", async () => {
  const { EXCLUSIVE } = await import("../mods/pokemon-herd/moves.js");
  const { SIGNATURE } = await import("../mods/pokemon-herd/fx-moves.js");
  const { signatureParts, signatureTimes } = await import("../mods/pokemon-herd/fx.js");
  for (const [name, m] of Object.entries(EXCLUSIVE)) {
    assert.equal(typeof SIGNATURE[name], "function", name);
    const parts = signatureParts(m.type, 0, 120, 40, 7, null, name);
    assert.ok(parts.length > 0, name);
    for (const p of parts) {
      assert.ok(p.color, name);
      for (const v of [p.at, p.ms, p.a.x, p.a.y, p.a.w, p.a.h, p.b.x, p.b.y, p.b.w, p.b.h]) assert.ok(Number.isFinite(v), `${name}: ${JSON.stringify(p)}`);
    }
    assert.ok(signatureTimes(m.type, name).length > 0, name);
  }
});

test("a type's signature move keeps the kind of the move it rose from (a physical one hits with Attack)", () => {
  // Fire Punch (physical) risen to Blast Burn: physical, as the move it was.
  for (let i = 0; i < 400; i++) {
    const m = pickMove("6mX", 3, Math.random, { moves: ["Fire Punch"] });
    if (m.ultimate) { assert.equal(m.physical, true, m.name); return; }
  }
  assert.fail("no signature move in 400");
});

test("picking as the games' trainers (scores): a finisher, a quick one when slower, the strongest; wild ones at random", () => {
  const set = { moves: ["Kowtow Cleave", "Sucker Punch", "Iron Head", "Stone Edge"] };
  const D = { "Kowtow Cleave": 0.6, "Sucker Punch": 0.5, "Iron Head": 0.35, "Stone Edge": 0.4 };
  const ai = (more) => ({ ...set, ai: true, dmgOf: (m) => D[m.name] ?? 0.3, ...more });
  // Both finish it (40% left): the quick one scores +6 over +4.
  // (Both super-effective on Gengar: a tie now and then, as the games' rolls go.)
  const quick = (more) => { let n = 0; for (let i = 0; i < 200; i++) if (pickMove("983", "94", Math.random, ai(more)).name === "Sucker Punch") n++; return n; };
  assert.ok(quick({ targetHp: 0.4 }) > 140);
  // Nothing finishes it (full): the strongest (the rest −1; Sucker Punch −2 most often).
  const seen = {};
  for (let i = 0; i < 300; i++) { const n = pickMove("983", "94", Math.random, ai({ targetHp: 1 })).name; seen[n] = (seen[n] ?? 0) + 1; }
  assert.ok((seen["Kowtow Cleave"] ?? 0) > 250, JSON.stringify(seen));
  // Slower and about to go down: the quick one, a hit in first.
  assert.ok(quick({ targetHp: 1, slower: true, threatened: true }) > 140);
  // Slower, Sucker Punch's best roll finishing it (its average just short): it, before Gengar strikes.
  assert.ok(quick({ targetHp: (D["Sucker Punch"] ?? 0.3) * 1.05, slower: true }) > 140);
  // Catching (yours on a wild one): no finishing bonus; one that would knock it out −10, the
  // strongest that leaves it standing instead.
  const cat = {}; for (let i = 0; i < 200; i++) { const n = pickMove("983", "94", Math.random, ai({ targetHp: 0.5, catching: true, koAt: (D["Kowtow Cleave"] ?? 0.3) - 0.01 })).name; cat[n] = (cat[n] ?? 0) + 1; }
  assert.equal(cat["Kowtow Cleave"] ?? 0, 0, JSON.stringify(cat));
  // A wild one: any of its moves.
  const wild = new Set();
  for (let i = 0; i < 400; i++) wild.add(pickMove("983", "94", Math.random, { ...set, random: true }).name);
  assert.ok(wild.size >= 3, [...wild].join(","));
});

// The 1 in 8 rise: to its type's strongest move in the games (TOP_MOVE), sure to hit, its own cost
// unpaid. Zap Cannon chosen hits half the time, as the games'; risen to, never misses.
test("the rise to a type's strongest move: sure to hit, and free", async () => {
  const A = await import("../mods/pokemon-herd/abilities.js");
  const { TOP_MOVE } = await import("../mods/pokemon-herd/moves.js");
  assert.equal(TOP_MOVE.electric, "Zap Cannon");
  assert.equal(TOP_MOVE.fighting, "High Jump Kick");
  let rose = 0, plainMiss = 0, plain = 0, risen = null;
  for (let i = 0; i < 800; i++) {
    const z = pickMove("25", "1", Math.random, { moves: ["Zap Cannon"] });
    if (z.risen || z.ultimate) { assert.equal(z.miss, false); assert.equal(z.missRate, 0); }
    else { plain++; if (z.miss) plainMiss++; }
    const t = pickMove("149", "1", Math.random, { moves: ["Dragon Claw"] });
    if (t.name === "Draco Meteor") { rose++; risen = t; assert.ok(t.risen && !t.miss); }
  }
  assert.ok(plainMiss / plain > 0.35 && plainMiss / plain < 0.65, `${plainMiss}/${plain}`);
  assert.ok(rose > 40 && risen.physical, "Dragon Claw risen: physical still");
  const s = A.newSide("");
  A.afterHit(s, A.newSide(""), risen, { mul: 1 });
  assert.equal(s.st.spa, 0, "a risen Draco Meteor: no Sp. Atk lost");
});

// One risen rushes in if its move touches (Brave Bird, Foul Play), else fires from afar.
test("a risen move dashes in by its own contact", async () => {
  const { risenDash } = await import("../mods/pokemon-herd/moves.js");
  assert.equal(risenDash("Brave Bird"), true);
  assert.equal(risenDash("Head Smash"), true);
  assert.equal(risenDash("Foul Play"), true);
  assert.equal(risenDash("Zap Cannon"), false);
  for (let i = 0; i < 400; i++) { const m = pickMove("6", "1", Math.random, { moves: ["Air Slash"] }); if (m.risen) { assert.equal(m.name, "Brave Bird"); assert.equal(m.dash, true); assert.equal(m.physical, false); return; } }
  assert.fail("no rise in 400");
});

// Setup moves, as the games' trainer AI: Swords Dance on the first turn at full health (mostly),
// never when the other can knock it out now, when catching, at +6, or low.
test("setup moves: the AI's Swords Dance", async () => {
  const { learnableOf, isSetup } = await import("../mods/pokemon-herd/moves.js");
  assert.ok(isSetup("Swords Dance"));
  assert.ok(learnableOf("983").some((m) => m.name === "Swords Dance" && m.status));
  const moves = ["Kowtow Cleave", "Iron Head", "Sucker Punch", "Swords Dance"];
  const ai = (more) => ({ moves, ai: true, dmgOf: (m) => (m.name === "Kowtow Cleave" ? 0.4 : 0.25), targetHp: 1, stages: {}, selfHp: 1, first: true, ...more });
  const count = (more) => { let n = 0; for (let i = 0; i < 300; i++) if (pickMove("983", "94", Math.random, ai(more)).name === "Swords Dance") n++; return n; };
  assert.ok(count({}) > 180, "first turn, full health: mostly");
  assert.equal(count({ threatened: true }), 0, "it'd be knocked out: never");
  assert.equal(count({ catching: true }), 0);
  assert.equal(count({ stages: { atk: 6 } }), 0, "at +6: never");
  assert.ok(count({ selfHp: 0.3, first: false }) < 10, "low: hardly");
  assert.equal(count({ targetHp: 0.3 }), 0, "it can finish it: it does");
  const m = pickMove("983", "94", () => 0.99, ai({}));
  assert.equal(m.name, "Swords Dance");
  assert.ok(m.status && m.stages.some(([s, n]) => s === "atk" && n === 2));
  // Not the AI's (a wild one by damage): never a setup move.
  for (let i = 0; i < 100; i++) assert.notEqual(pickMove("983", "94", Math.random, { moves }).name, "Swords Dance");
});

// The AI knows its target's ability makes nothing of a move (Levitate on a Ground move): it picks
// another, as the games' trainers do (it kept on with Earthquake).
test("the AI doesn't use Ground moves on Levitate", async () => {
  const A = await import("../mods/pokemon-herd/abilities.js");
  const lev = A.newSide("levitate");
  const how = { moves: ["Earthquake", "Stone Edge"], ai: true, dmgOf: (m) => (m.name === "Earthquake" ? 0.6 : 0.3), targetHp: 1, immune: (m) => A.immuneTo(lev, m) };
  for (let i = 0; i < 100; i++) { const m = pickMove("445", "94", Math.random, how); assert.equal(m.base ?? m.name, "Stone Edge"); } // (risen 1 in 8: Head Smash)
});

// Nothing it knows can touch it: Struggle (the games'), typeless, 50, a quarter of its health back.
test("Struggle: nothing it knows can touch it", async () => {
  const A = await import("../mods/pokemon-herd/abilities.js");
  const m = pickMove("27", "6", Math.random, { moves: ["Earthquake"] }); // Sandshrew's only move, at a flying Charizard
  assert.equal(m.name, "Struggle");
  assert.equal(m.eff, 1);
  assert.equal(A.selfHurt(A.newSide(""), m, { mul: 1 }, 0.2).hurt, 0.25);
  assert.notEqual(pickMove("27", "6", Math.random, { moves: ["Earthquake", "Swords Dance"], stages: { atk: 0 } }).name, "Struggle", "a setup move left of use: not yet");
});

// Urshifu's own move by its style: Single Strike's Wicked Blow, Rapid Strike's Surging Strikes;
// among its four, taught once (not twice: Wicked Blow was a dark move it learns too).
test("Urshifu: Wicked Blow or Surging Strikes, by its style", async () => {
  const { movesetOf, learnableOf, EXCLUSIVE } = await import("../mods/pokemon-herd/moves.js");
  assert.equal(movesetOf("892")[0].name, "Wicked Blow");
  assert.equal(movesetOf("892f0001")[0].name, "Surging Strikes");
  assert.equal(learnableOf("892").filter((m) => m.name === "Wicked Blow").length, 1);
  assert.ok(!learnableOf("892").some((m) => m.name === "Surging Strikes"));
  assert.ok(!learnableOf("892f0001").some((m) => m.name === "Wicked Blow"));
  assert.equal(EXCLUSIVE["Surging Strikes"].crit, "always");
});

test("priority moves, as the games': Aqua Jet, Mach Punch +1; Extreme Speed +2", async () => {
  const { PRIORITY } = await import("../mods/pokemon-herd/moves.js");
  assert.equal(PRIORITY["Aqua Jet"], 1);
  assert.equal(PRIORITY["Mach Punch"], 1);
  assert.equal(PRIORITY["Extreme Speed"], 2);
});

// The newer ones (sig-moves.js): each form its own (Black Kyurem's Freeze Shock, Kyurem's Glaciate),
// their rules as the games'.
test("signature moves of Gen 5-9: by form, with their rules", async () => {
  const { movesetOf, learnableOf, missOf, weatherPower, PRIORITY, DRAIN, pickMove } = await import("../mods/pokemon-herd/moves.js");
  const names = (k) => learnableOf(k).map((m) => m.name);
  assert.ok(names("646f0001").includes("Freeze Shock") && names("646f0001").includes("Fusion Bolt"));
  assert.ok(!names("646f0001").includes("Glaciate") && names("646").includes("Glaciate") && !names("646").includes("Fusion Bolt"));
  assert.ok(names("644").includes("Fusion Bolt"));
  assert.equal(movesetOf("901f0001")[0].name, "Blood Moon");
  assert.ok(!names("901").includes("Blood Moon"));
  assert.equal(movesetOf(1000)[0].name, "Make It Rain");
  assert.equal(missOf("False Surrender"), 0);
  assert.ok(Math.abs(missOf("Magma Storm") - 0.25) < 1e-9);
  assert.equal(weatherPower("Hydro Steam", "sunny"), 1.5);
  assert.equal(PRIORITY.Thunderclap, 1);
  assert.equal(DRAIN["Bitter Blade"], 0.5);
  // Collision Course: a third stronger when super effective (on Tyranitar, Rock/Dark: ×4).
  const cc = pickMove(1007, 248, () => 0.5, { moves: ["Collision Course"] });
  const plain = pickMove(1007, 6, () => 0.5, { moves: ["Collision Course"] });
  assert.ok(Math.abs(cc.mul / plain.mul - 4 / 3) < 1e-9, `${cc.mul} ${plain.mul}`);
});

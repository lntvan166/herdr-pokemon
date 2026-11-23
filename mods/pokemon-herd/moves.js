// The moves a Pokémon uses in a battle, as the games name them. Each type has three: a physical
// move (it rushes in and strikes), a special one (it fires from where it stands) and a signature
// move, stronger and rarer. A Pokémon knows four (base-stats.js MOVESET, from what it really
// learns in the games: two of its own types, two others for coverage); each turn it picks one,
// likelier the more it would do (power, its Attack or Sp. Atk against the other's Defense or Sp.
// Def, the type's effect, ×1.5 for its own type, STAB: trainer.js gameDamage), so mostly its best
// and now and then another; 1 time in 8 it's that type's signature move instead. A critical hit 1 time in 16 (×1.5). A move misses
// as often as its accuracy in the games says (missOf: Thunder 3 in 10, Swift never). Pure.
import { EXTRA_MOVES, MULTI_POWER } from "./more-moves.js";
import { MOVE_POWER, MOVE_LIST, MOVESET, LEARNS, SIG_FROM, MOVE_ACC } from "./base-stats.js";
import { effectOn, typesOf, gameDamage, isPhysicalKey, statsFull } from "./trainer.js";
import { sizeMiss } from "./weather.js";
import { MOVE_FLAGS } from "./ability-data.js";
import { SETUP, SETUP_NAMES, SETUP_LEARNS, STATUS_MOVES, STATUS_NAMES, STATUS_LEARNS } from "./move-stages.js";
import { canStatus } from "./abilities.js";

export const MOVES = {
  normal: ["Body Slam", "Hyper Voice", "Giga Impact"],
  fire: ["Fire Punch", "Flamethrower", "Blast Burn"],
  water: ["Waterfall", "Surf", "Hydro Cannon"],
  grass: ["Leaf Blade", "Energy Ball", "Frenzy Plant"],
  electric: ["Thunder Punch", "Thunderbolt", "Thunder"],
  ice: ["Ice Punch", "Ice Beam", "Blizzard"],
  fighting: ["Brick Break", "Aura Sphere", "Close Combat"],
  poison: ["Poison Jab", "Sludge Bomb", "Gunk Shot"],
  ground: ["Earthquake", "Earth Power", "Precipice Blades"],
  flying: ["Brave Bird", "Air Slash", "Hurricane"],
  psychic: ["Zen Headbutt", "Psychic", "Psystrike"],
  bug: ["X-Scissor", "Bug Buzz", "Megahorn"],
  rock: ["Stone Edge", "Power Gem", "Head Smash"],
  ghost: ["Shadow Claw", "Shadow Ball", "Shadow Force"],
  dragon: ["Dragon Claw", "Dragon Pulse", "Draco Meteor"],
  dark: ["Crunch", "Dark Pulse", "Night Daze"],
  steel: ["Iron Head", "Flash Cannon", "Meteor Mash"],
  fairy: ["Play Rough", "Moonblast", "Light of Ruin"],
};
// More each type has, as the games' learnsets: a weaker one young Pokémon know, and stronger or
// commoner ones ([name, physical]). Each draws its own (fx-moves.js). MORE_OWN: these, picked by
// hand; MORE_MOVES: with the games' other ordinary damaging moves (more-moves.js EXTRA_MOVES, from
// PokeAPI), drawn as their type's.
export const MORE_OWN = {
  normal: [["Tackle", true], ["Swift", false], ["Double-Edge", true]],
  fire: [["Ember", false], ["Flame Wheel", true], ["Fire Blast", false], ["Flare Blitz", true]],
  water: [["Water Gun", false], ["Aqua Tail", true], ["Hydro Pump", false]],
  grass: [["Vine Whip", true], ["Giga Drain", false], ["Solar Beam", false]],
  electric: [["Thunder Shock", false], ["Spark", true], ["Wild Charge", true]],
  ice: [["Powder Snow", false], ["Ice Shard", true], ["Icicle Crash", true]],
  fighting: [["Rock Smash", true], ["Drain Punch", true], ["Focus Blast", false]],
  poison: [["Acid", false], ["Cross Poison", true], ["Sludge Wave", false]],
  ground: [["Mud Shot", false], ["Bulldoze", true], ["Drill Run", true]],
  flying: [["Peck", true], ["Gust", false], ["Drill Peck", true]],
  psychic: [["Confusion", false], ["Psybeam", false], ["Psycho Cut", true]],
  bug: [["Bug Bite", true], ["Struggle Bug", false], ["U-turn", true]],
  rock: [["Rock Throw", true], ["Ancient Power", false], ["Rock Slide", true]],
  ghost: [["Lick", true], ["Hex", false], ["Phantom Force", true]],
  dragon: [["Twister", false], ["Dragon Breath", false], ["Outrage", true]],
  dark: [["Bite", true], ["Snarl", false], ["Knock Off", true], ["Night Slash", true], ["Sucker Punch", true]],
  steel: [["Metal Claw", true], ["Mirror Shot", false], ["Iron Tail", true]],
  fairy: [["Fairy Wind", false], ["Draining Kiss", false], ["Dazzling Gleam", false]],
};
export const MORE_MOVES = Object.fromEntries(Object.keys(MOVES).map((t) => [t, [...(MORE_OWN[t] ?? []), ...(EXTRA_MOVES[t] ?? [])]]));
// Moves only one Pokémon (or its line) knows, as in the games: its own, always among its four
// (movesetOf), drawn as a signature move. { type, power, physical, dex: [who knows it], and its
// rule as the games have it: judgment (Arceus: its plate's type, so the type that does most to
// the other), crit: "high" (1 in 8) | "always", flying (hits a Flying type, neutral) }.
export const EXCLUSIVE = {
  "Judgment": { type: "normal", power: 100, physical: false, dex: [493], judgment: true },
  "Kowtow Cleave": { type: "dark", power: 85, physical: true, dex: [983] }, // Kingambit's: never misses (the games')
  "Psystrike": { type: "psychic", power: 100, physical: false, dex: [150] },
  "Roar of Time": { type: "dragon", power: 150, physical: false, dex: [483] },
  "Spacial Rend": { type: "dragon", power: 100, physical: false, dex: [484], crit: "high" },
  "Shadow Force": { type: "ghost", power: 120, physical: true, dex: [487] },
  "Origin Pulse": { type: "water", power: 110, physical: false, dex: [382] },
  "Precipice Blades": { type: "ground", power: 120, physical: true, dex: [383] },
  "Dragon Ascent": { type: "flying", power: 120, physical: true, dex: [384] },
  "Aeroblast": { type: "flying", power: 100, physical: false, dex: [249], crit: "high" },
  "Sacred Fire": { type: "fire", power: 100, physical: true, dex: [250] },
  "Blue Flare": { type: "fire", power: 130, physical: false, dex: [643] },
  "Bolt Strike": { type: "electric", power: 130, physical: true, dex: [644] },
  "Oblivion Wing": { type: "flying", power: 80, physical: false, dex: [717] },
  "Thousand Arrows": { type: "ground", power: 90, physical: true, dex: [718], flying: true },
  "Sunsteel Strike": { type: "steel", power: 100, physical: true, dex: [791] },
  "Moongeist Beam": { type: "ghost", power: 100, physical: false, dex: [792] },
  "Photon Geyser": { type: "psychic", power: 100, physical: false, dex: [800] },
  "Behemoth Blade": { type: "steel", power: 100, physical: true, dex: [888] },
  "Behemoth Bash": { type: "steel", power: 100, physical: true, dex: [889] },
  "Dynamax Cannon": { type: "dragon", power: 100, physical: false, dex: [890] },
  "Astral Barrage": { type: "ghost", power: 120, physical: false, dex: [898] },
  "Doom Desire": { type: "steel", power: 140, physical: false, dex: [385] },
  "Psycho Boost": { type: "psychic", power: 140, physical: false, dex: [386] },
  "Seed Flare": { type: "grass", power: 120, physical: false, dex: [492] },
  "V-create": { type: "fire", power: 180, physical: true, dex: [494] },
  "Secret Sword": { type: "fighting", power: 85, physical: false, dex: [647] },
  "Relic Song": { type: "normal", power: 75, physical: false, dex: [648] },
  "Techno Blast": { type: "normal", power: 120, physical: false, dex: [649] },
  "Hyperspace Hole": { type: "psychic", power: 80, physical: false, dex: [720] },
  "Steam Eruption": { type: "water", power: 110, physical: false, dex: [721] },
  "Spectral Thief": { type: "ghost", power: 90, physical: true, dex: [802] },
  "Volt Tackle": { type: "electric", power: 120, physical: true, dex: [25] },
  "Night Daze": { type: "dark", power: 85, physical: false, dex: [570, 571] },
  "Spirit Shackle": { type: "ghost", power: 80, physical: true, dex: [724] },
  "Darkest Lariat": { type: "dark", power: 85, physical: true, dex: [727] },
  "Sparkling Aria": { type: "water", power: 90, physical: false, dex: [730] },
  "Drum Beating": { type: "grass", power: 80, physical: true, dex: [812] },
  "Pyro Ball": { type: "fire", power: 120, physical: true, dex: [815] },
  "Snipe Shot": { type: "water", power: 80, physical: false, dex: [818], crit: "high" },
  "Flower Trick": { type: "grass", power: 70, physical: true, dex: [908], crit: "always" },
  "Torch Song": { type: "fire", power: 80, physical: false, dex: [911] },
  "Aqua Step": { type: "water", power: 80, physical: true, dex: [914] },
  "Headlong Rush": { type: "ground", power: 120, physical: true, dex: [901] },
  "Stone Axe": { type: "rock", power: 65, physical: true, dex: [900] },
  // Urshifu's, by its style (`form`: its form's key part, "" its own): Single Strike's Wicked Blow,
  // Rapid Strike's Surging Strikes (three hits of 25), both always a critical hit, as the games'.
  "Wicked Blow": { type: "dark", power: 75, physical: true, dex: [892], form: "", crit: "always" },
  "Surging Strikes": { type: "water", power: 75, physical: true, dex: [892], form: "f0001", crit: "always" },
};
// Its own move(s), if it has one: [{ type, name, physical, exclusive }].
export const exclusiveOf = (attacker) => {
  const dex = parseInt(attacker, 10), form = String(attacker).match(/f\d+/)?.[0] ?? "";
  return Object.entries(EXCLUSIVE).filter(([, m]) => m.dex.includes(dex) && (m.form == null || m.form === form)).map(([name, m]) => ({ type: m.type, name, physical: m.physical, exclusive: true }));
};
// Moving first whatever the Speed (+1, as the games' Ice Shard); healing by part of the damage done.
// The games' priority: +1 Quick Attack, Mach Punch, Aqua Jet…; +2 Extreme Speed (first even before
// those). (Grassy Glide: only in Grassy Terrain, which there isn't here.)
export const PRIORITY = { "Ice Shard": 1, "Sucker Punch": 1, "Quick Attack": 1, "Mach Punch": 1, "Bullet Punch": 1, "Aqua Jet": 1, "Shadow Sneak": 1,
  "Vacuum Wave": 1, "Accelerock": 1, "Water Shuriken": 1, "Extreme Speed": 2 }; // (first whatever the Speed)
export const DRAIN = { "Giga Drain": 0.5, "Drain Punch": 0.5, "Draining Kiss": 0.75, "Oblivion Wing": 0.75 };
export const ULTIMATE = 1 / 8;
export const MAX_MOVES = 4; // a signature move (its power: Blast Burn 150)
export const CRIT = 1 / 16; // a critical hit, ×1.5
export const CRIT_HIT = 1.5;
// A move misses as in the games: 1 − its accuracy (base-stats.js MOVE_ACC: Thunder 70%, Hydro Pump
// 80%, Fire Blast 85%; Swift and Aura Sphere never miss). One without a known accuracy: MISS.
export const MISS = 0.05;
export const missOf = (name) => { if (SETUP[name]) return 0; if (STATUS_MOVES[name]) return 1 - STATUS_MOVES[name][2] / 100; const a = MOVE_ACC[name]; return a === null ? 0 : Number.isFinite(a) ? Math.max(0, 1 - a / 100) : MISS; };
// The weather, as the main games have it (main.js boostNow().id: "rain", "storm", "sunny",
// "snow"…): in rain Thunder and Hurricane never miss, in the sun they hit half the time; in snow
// Blizzard never misses; Solar Beam is half as strong in rain or snow.
const RAINY = new Set(["rain", "storm"]);
export function weatherMiss(name, weather) {
  if ((name === "Thunder" || name === "Hurricane") && RAINY.has(weather)) return 0;
  if ((name === "Thunder" || name === "Hurricane") && weather === "sunny") return 0.5;
  if (name === "Blizzard" && weather === "snow") return 0;
  return missOf(name);
}
export const weatherPower = (name, weather) => (name === "Solar Beam" && (RAINY.has(weather) || weather === "snow") ? 0.5 : 1);
export const PICK_SHARP = 3; // how strongly it favours its best move: chance ∝ damage^PICK_SHARP
export const STAB = 1.5; // a move of its own type (same-type attack bonus)

export const powerOf = (name) => name === "Struggle" ? 50 : SETUP[name] || STATUS_MOVES[name] ? 0 : EXCLUSIVE[name]?.power ?? MULTI_POWER[name] ?? MOVE_POWER[name] ?? 80; // (a multi-hit one: all its hits)
// Each type's strongest move by its power in the games (MOVES and MORE_MOVES; a tie, its own list's
// first): what a move rises to, 1 in 8 (pickMove), sure to hit. Zap Cannon, High Jump Kick, Brave
// Bird, Foul Play, Double Iron Bash where those beat the type's own (Thunder, Close Combat…).
export const TOP_MOVE = Object.fromEntries(Object.keys(MOVES).map((t) => [t,
  [...MOVES[t].slice().reverse(), ...(MORE_MOVES[t] ?? []).map(([n]) => n)].reduce((best, n) => (powerOf(n) > powerOf(best) ? n : best))]));
export const isPhysical = isPhysicalKey; // its stronger side (Attack ≥ Sp. Atk)
// The moves it knows (not the signature ones): [{ type, name, physical }]: its four (MOVESET:
// the key, else its species'), or, with none (Ditto), its types' as before.
// Every move it can be taught (base-stats.js LEARNS: what it really learns among MOVE_LIST, its
// types' signature moves too if it learns them): [{ type, name, physical, sig }].
const entryOf = (i) => ({ type: MOVE_LIST[i][0], name: MOVE_LIST[i][1], physical: MOVE_LIST[i][2], ...(i >= SIG_FROM ? { sig: true } : {}) });
export function learnableOf(attacker) {
  const l = LEARNS[attacker] ?? LEARNS[String(parseInt(attacker, 10))];
  const own = exclusiveOf(attacker), mine = new Set(own.map((m) => m.name));
  return [...own, ...(l ? l.map(entryOf) : movesetOf(attacker).filter((m) => !m.exclusive)).filter((m) => !mine.has(m.name)), ...setupOf(attacker)];
}
// Setup moves (move-stages.js SETUP: Swords Dance, Dragon Dance…): no damage, its own stats up, kept
// while it stays in. Those its species learns, as entries ({ status: true, stages }); one taught
// only (never in its own four: you choose it, or a Tower or Rival trainer gives it one).
export const isSetup = (name) => !!SETUP[name];
const setupEntry = (name) => ({ type: SETUP[name][0], name, physical: false, status: true, stages: SETUP[name][1] });
export const setupOf = (attacker) => [...(SETUP_LEARNS[parseInt(attacker, 10)] ?? []).map((i) => setupEntry(SETUP_NAMES[i])), ...(STATUS_LEARNS[parseInt(attacker, 10)] ?? []).map((i) => statusEntry(STATUS_NAMES[i]))];
// Status moves that give the other a status (Will-O-Wisp, Thunder Wave, Toxic: move-stages.js
// STATUS_MOVES), as entries ({ status: true, inflict }); taught, as setup moves are.
const statusEntry = (name) => ({ type: STATUS_MOVES[name][0], name, physical: false, status: true, inflict: STATUS_MOVES[name][1], stages: [] });
// The moves chosen for it (a pick's `moves`: names), kept to those it can really learn, at most
// four; null when none of them is (it then knows its own four).
export function chosenOf(attacker, names) {
  if (!Array.isArray(names) || !names.length) return null;
  const can = learnableOf(attacker);
  const set = [...new Set(names)].map((n) => can.find((m) => m.name === n)).filter(Boolean).slice(0, MAX_MOVES);
  return set.length ? set : null;
}
// `chosen`: the names chosen for it (chosenOf), else its own four.
export function movesetOf(attacker, chosen = null) {
  const picked = chosen && chosenOf(attacker, chosen);
  if (picked) return picked;
  const set = MOVESET[attacker] ?? MOVESET[String(parseInt(attacker, 10))];
  const mine = exclusiveOf(attacker); // its own move first, in place of its last one (a coverage move)
  if (set?.length) return [...mine, ...set.map((i) => ({ type: MOVE_LIST[i][0], name: MOVE_LIST[i][1], physical: MOVE_LIST[i][2] }))].slice(0, Math.max(MAX_MOVES, mine.length));
  const own = typesOf(attacker).filter((t) => MOVES[t]);
  const types = own.length > 1 ? own.slice(0, 2) : [...own, ...(own[0] === "normal" ? [] : ["normal"])];
  return types.flatMap((t) => [{ type: t, name: MOVES[t][0], physical: true }, { type: t, name: MOVES[t][1], physical: false }]);
}

// Judgment's type against `target`: the one that does most (the first of TYPE_ORDER on a tie).
const TYPE_ORDER = Object.keys(MOVES);
export const judgedType = (target) => TYPE_ORDER.reduce((best, t) => (effectOn(t, target) > effectOn(best, target) ? t : best), "normal");
// One move by `attacker` at `target` (fighter keys): { type, name, physical, ultimate, crit, miss,
// power, mul, eff }. `mul`: what it does to the damage besides its power (0 when it misses).
// `how.targetSize`: a small target is harder to hit (weather.js sizeMiss).
// `how.weather`: the weather's id (weatherMiss, weatherPower). `how.moves`: the names chosen for it (a pick's `moves`). A signature move chosen is used as one
// (its own look).
// One risen rushes in to strike if its move touches (the games' contact flag: Brave Bird, Head
// Smash, Foul Play, High Jump Kick), else fires from where it stands, whatever it rose from (its
// damage still its own kind's). `dash` on the move: fx.js travelOf.
export const risenDash = (name) => (MOVE_FLAGS[name] ?? "").includes("c");
// A status move's score (Will-O-Wisp, Thunder Wave, Toxic), as the games' trainer AI: never (80)
// on one that has a status already or can't have this one (its type: a Fire type burns not), or
// when it can finish it now; from 100, Will-O-Wisp +2 on one that hits physically, Thunder Wave
// +2 on one faster (or a wild one to be caught: easier, paralysed), Toxic +1 on one well, −2 when
// it's low itself. `how.targetStatus`: the other's status now.
function inflictScore(m, how, target, rnd, canKO) {
  if (canKO || !canStatus({ status: how.targetStatus ?? null, ab: "" }, m.inflict, typesOf(target))) return 80;
  if (how.catching && m.inflict !== "par") return 80;
  let sc = 100;
  const st = statsFull(target);
  if (m.inflict === "brn" && st[1] > st[3]) sc += 2;
  if (m.inflict === "par" && (how.slower || how.catching)) sc += 2;
  if (m.inflict === "psn" && (how.targetHp ?? 1) > 0.5) sc += 1;
  if ((how.selfHp ?? 1) < 0.4) sc -= 2;
  return sc;
}
// A setup move's score, as the games' trainer AI (pokeemerald's AI_CV_AttackUp and the like,
// AI_SetupFirstTurn; pokeemerald-expansion's checks): from 100; a stat it raises already +3 or more
// −1 (61%); at full health +2 (50%); between 40% and 70% −2 (84%), under 40% −2; its first turn
// facing this one +2 (69%); Dragon Dance and the like (Speed) +1 when the other is faster (50%).
// Never (−10): all it raises at +6, the other able to knock it out this turn (`how.threatened`) or
// it able to knock the other out now,
// catching a wild one (`how.catching`), an Attack or Sp. Atk rise with no move of that kind to use
// it (Swords Dance on a special one). `how.stages` its stages now, `how.selfHp` its health,
// `how.first` its first turn facing this one, `how.slower` the other faster.
function setupScore(m, how, set, rnd, canKO = false) {
  const st = how.stages ?? {}, hp = how.selfHp ?? 1;
  const ups = m.stages.filter(([, n]) => n > 0);
  // (`how.foeBest`: the other's strongest hit on it: two of them would knock it out, no time to use it.)
  if (canKO || how.catching || how.threatened || (how.foeBest ?? 0) * 2 >= hp || ups.every(([s]) => (st[s] ?? 0) >= 6)) return 80;
  const hits = set.filter((x) => !x.status);
  const useful = ups.some(([s]) => (s === "atk" ? hits.some((x) => x.physical) : s === "spa" ? hits.some((x) => !x.physical) : true));
  if (!useful) return 80;
  let sc = 100;
  if (ups.some(([s]) => (st[s] ?? 0) >= 3)) { if (rnd() >= 100 / 256) sc -= 1; }
  else if (hp >= 0.999 && rnd() >= 0.5) sc += 2;
  if (hp < 0.4) sc -= 2;
  else if (hp <= 0.7 && rnd() >= 40 / 256) sc -= 2;
  if (how.first && rnd() >= 80 / 256) sc += 2;
  if (ups.some(([s]) => s === "spe") && how.slower && rnd() >= 0.5) sc += 1;
  return sc;
}
// A best damage roll against the average (trainer.js gameDamage: 0.85–1.0, 0.925 on average).
const BEST_ROLL = 1 / 0.925;
export function pickMove(attacker, target, rnd = Math.random, how = {}) {
  // A Choice item: only the move it chose first (`how.lock`) while it stays in.
  const all = movesetOf(attacker, how.moves), locked = how.lock ? all.filter((m) => m.name === how.lock) : [];
  const set = locked.length ? locked : all;
  const own = typesOf(attacker);
  const stabOf = (t) => (own.includes(t) ? STAB : 1);
  // What each would do (its own move as its rule makes it: Judgment's type, Arrows on a flier).
  const typeOf = (m) => (EXCLUSIVE[m.name]?.judgment ? judgedType(target) : m.type);
  const effOf = (m) => { const e = effectOn(typeOf(m), target); return e === 0 && EXCLUSIVE[m.name]?.flying && typesOf(target).includes("flying") ? 1 : e; };
  // How it picks: `how.ai` (a trainer's, yours against one, a spar): as the games' trainers score
  // (Gen 4's trainer AI; pokeemerald-expansion's TRY_TO_FAINT): each move from 100, −10 if it does
  // nothing to it, +4 if it knocks it out now (+6 a quick one), −1 if not its strongest, a
  // super-effective one +1 (61%), a ×4 one +2 (31%), a resisted one −1 (75%), Sucker Punch −2
  // (80%: it fails on a foe that doesn't attack) unless it finishes; slower and about to be knocked
  // out itself (`how.threatened`), a quick move +5 (a hit in before it goes down); the highest
  // scored, a tie at random. `how.dmgOf(m)`: its average damage, a share of the target's health
  // (`how.targetHp` left). `how.random`: a wild one's, any of its moves (the games' wild Pokémon
  // have no AI). None of these: by damage (×^PICK_SHARP), mostly the strongest, now and then another.
  // A quick one when slower: a knock-out if its best roll does it (a chance to finish it before it
  // strikes beats a sure one after its blow: Kingambit's Sucker Punch on a worn Gengar, not Kowtow
  // Cleave and a Shadow Ball first). `how.catching` (yours on a wild one, to be caught): no finishing
  // bonus, and a move that would knock it out (`how.koAt`: the overkill it takes) −10.
  // Nothing it knows can touch it (every damaging move made nothing of, by its type or an ability
  // shown: `how.immune`; any setup move of no more use): Struggle, as the games' last resort,
  // typeless (it hits anything), 50, a quarter of its own health back on it (abilities.js
  // selfHurt). (Two such, neither able to hurt the other, fought on for ever.)
  const touches = (m) => !m.status && effOf(m) > 0 && !how.immune?.({ ...m, eff: effOf(m) });
  const setupLeft = (m) => m.status && (m.inflict ? canStatus({ status: how.targetStatus ?? null, ab: "" }, m.inflict, typesOf(target)) : m.stages.some(([st, n]) => n > 0 && (how.stages?.[st] ?? 0) < 6));
  if (set.length && !set.some(touches) && !set.some(setupLeft)) {
    const crit = rnd() < CRIT;
    return { type: "typeless", name: "Struggle", physical: true, ultimate: false, crit, miss: false, stab: false, power: 50, mul: crit ? CRIT_HIT : 1, eff: 1, missRate: 0, struggle: true };
  }
  const exp = (m) => gameDamage(attacker, target, powerOf(m.name), m.physical, effOf(m), 0.5) * (EXCLUSIVE[m.name]?.judgment ? STAB : stabOf(typeOf(m))) * (EXCLUSIVE[m.name]?.crit === "always" ? CRIT_HIT : 1) * (1 - weatherMiss(m.name, how.weather)) * weatherPower(m.name, how.weather);
  let weights;
  if (how.ai && how.dmgOf) {
    const dmg = set.map((m) => (m.status ? 0 : how.dmgOf(m) * (1 - weatherMiss(m.name, how.weather))));
    const over = (m) => !!how.catching && how.dmgOf(m) >= (how.koAt ?? Infinity);
    const best = Math.max(...dmg.filter((d, i) => !over(set[i])), 0); // (catching: the strongest that leaves it standing)
    const keep = [];
    const canKO = set.some((m) => !m.status && effOf(m) > 0 && how.dmgOf(m) >= (how.targetHp ?? 1)); // (then no setting up: expansion's)
    const score = set.map((m, i) => {
      if (m.status) { keep[i] = true; return m.inflict ? inflictScore(m, how, target, rnd, canKO) : setupScore(m, how, set, rnd, canKO); }
      // Its target's ability making nothing of it (Levitate on a Ground move, Water Absorb…:
      // `how.immune`): as the games' AI (pokeemerald's AI_CheckBadMove), −10 like a type immunity.
      const e = how.immune?.({ ...m, eff: effOf(m) }) ? 0 : effOf(m), quick = (PRIORITY[m.name] ?? 0) > 0;
      const ko = e > 0 && how.dmgOf(m) * (quick && how.slower ? BEST_ROLL : 1) >= (how.targetHp ?? 1);
      keep[i] = ko || quick; // (one to finish it, or a quick one: kept as it is, not turned signature)
      let sc = 100;
      if (e === 0) return sc - 10;
      if (how.catching) { keep[i] = quick; if (over(m)) sc -= 10; }
      else if (ko) sc += quick ? 6 : 4;
      if (dmg[i] < best) sc -= 1;
      if (e >= 4) { if (rnd() < 0.3125) sc += 2; } else if (e > 1 && rnd() < 0.61) sc += 1;
      if (e < 1 && rnd() < 0.75) sc -= 1;
      if (m.name === "Sucker Punch" && !ko && rnd() < 0.8) sc -= 2;
      if (quick && how.slower && how.threatened) sc += 5;
      return sc;
    });
    const top = Math.max(...score);
    weights = score.map((sc) => (sc === top ? 1 : 0));
    how = { ...how, keep };
  } else if (how.random) weights = set.map(() => 1);
  else weights = set.map((m) => (m.status ? 0 : exp(m) ** PICK_SHARP)); // what it'd do, times how sure it is to hit (no setup: that's the AI's)
  const total = weights.reduce((x, y) => x + y, 0);
  let r = rnd() * total, k = 0;
  if (total > 0) { while (k < set.length - 1 && r >= weights[k]) { r -= weights[k]; k++; } } else k = 0;
  const base = set[k];
  // A setup move: no damage, its stats up (main.js, spar.js).
  if (base.status) {
    const missRate = base.inflict ? missOf(base.name) : 0;
    return { type: base.type, name: base.name, status: true, stages: base.stages, ...(base.inflict ? { inflict: base.inflict } : {}), physical: false, ultimate: false, crit: false, miss: !!missRate && rnd() < missRate, stab: false, power: 0, mul: 0, eff: 1, missRate };
  }
  const ex = base.exclusive ? EXCLUSIVE[base.name] : null;
  const roll = rnd();
  // Its own move: itself (drawn as a signature move, but as sure to hit as any, and as physical as
  // it is); else 1 in 8 its type's signature move.
  // Risen (1 in 8): its type's strongest move (TOP_MOVE), sure to hit, a gift: Zap Cannon chosen
  // hits half the time, as the games'; an Electric move risen to it never misses.
  const rises = !ex && !base.sig && !how.keep?.[k] && roll < ULTIMATE;
  const ultimate = !!ex || rises || !!base.sig; // (not one picked to finish it: Sucker Punch stays quick)
  const crit = ex?.crit === "always" || rnd() < (ex?.crit === "high" ? 1 / 8 : CRIT);
  const name = rises ? TOP_MOVE[base.type] : base.name;
  // Its accuracy, and a small target's dodging (weather.js sizeMiss): it hits only if both let it.
  const missRate = rises ? 0 : weatherMiss(name, how.weather);
  const miss = !rises && rnd() < 1 - (1 - missRate) * (1 - (sizeMiss(how.targetSize) ?? 0));
  // Its kind: its own move's (the games'); a type's signature move as the move it rose from (a
  // Fire Punch risen to Blast Burn hits with its Attack: drawn special, it fell to its weaker side).
  const physical = ex ? ex.physical : base.physical;
  // Judgment: the type that does most to it (its plate's; Arceus is that type: STAB).
  const type = ex?.judgment ? judgedType(target) : base.type;
  let eff = effectOn(type, target);
  if (ex?.flying && eff === 0 && typesOf(target).includes("flying")) eff = 1; // Thousand Arrows: a Flying type no shield
  const stab = own.includes(type) || !!ex?.judgment;
  return { type, name, physical, ultimate, ...(ex ? { exclusive: true } : {}), ...(name !== base.name ? { risen: true, base: base.name } : {}), ...(rises ? { dash: risenDash(name) } : {}), missRate, crit, miss, stab, power: powerOf(name), mul: miss ? 0 : (crit ? CRIT_HIT : 1) * (stab ? STAB : 1) * weatherPower(name, how.weather), eff };
}

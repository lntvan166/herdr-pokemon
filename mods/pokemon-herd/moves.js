// The moves a Pokémon uses in a battle, as the games name them. Each type has three: a physical
// move (it rushes in and strikes), a special one (it fires from where it stands) and a signature
// move, stronger and rarer. A Pokémon knows four (base-stats.js MOVESET, from what it really
// learns in the games: two of its own types, two others for coverage); each turn it picks one,
// likelier the more it would do (power, its Attack or Sp. Atk against the other's Defense or Sp.
// Def, the type's effect, ×1.5 for its own type, STAB: trainer.js gameDamage), so mostly its best
// and now and then another; 1 time in 8 it's that type's signature move instead. A critical hit 1 time in 16 (×1.5). A move can miss: 1 in 20,
// a signature move 1 in 5 (Thunder, Blizzard...). Pure.
import { MOVE_POWER, MOVE_LIST, MOVESET } from "./base-stats.js";
import { effectOn, typesOf, gameDamage, isPhysicalKey } from "./trainer.js";
import { sizeMiss } from "./weather.js";

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
// commoner ones ([name, physical]). Each draws its own (fx-moves.js).
export const MORE_MOVES = {
  normal: [["Tackle", true], ["Swift", false], ["Double-Edge", true]],
  fire: [["Ember", false], ["Flame Wheel", true], ["Fire Blast", false]],
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
  dark: [["Bite", true], ["Snarl", false], ["Knock Off", true]],
  steel: [["Metal Claw", true], ["Mirror Shot", false], ["Iron Tail", true]],
  fairy: [["Fairy Wind", false], ["Draining Kiss", false], ["Dazzling Gleam", false]],
};
// Moving first whatever the Speed (+1, as the games' Ice Shard); healing by part of the damage done.
export const PRIORITY = { "Ice Shard": 1 };
export const DRAIN = { "Giga Drain": 0.5, "Drain Punch": 0.5, "Draining Kiss": 0.75 };
export const ULTIMATE = 1 / 8; // a signature move (its power: Blast Burn 150)
export const CRIT = 1 / 16; // a critical hit, ×1.5
export const CRIT_HIT = 1.5;
export const MISS = 0.05, MISS_ULTIMATE = 0.2;
export const PICK_SHARP = 3; // how strongly it favours its best move: chance ∝ damage^PICK_SHARP
export const STAB = 1.5; // a move of its own type (same-type attack bonus)

export const powerOf = (name) => MOVE_POWER[name] ?? 80;
export const isPhysical = isPhysicalKey; // its stronger side (Attack ≥ Sp. Atk)
// The moves it knows (not the signature ones): [{ type, name, physical }]: its four (MOVESET:
// the key, else its species'), or, with none (Ditto), its types' as before.
export function movesetOf(attacker) {
  const set = MOVESET[attacker] ?? MOVESET[String(parseInt(attacker, 10))];
  if (set?.length) return set.map((i) => ({ type: MOVE_LIST[i][0], name: MOVE_LIST[i][1], physical: MOVE_LIST[i][2] }));
  const own = typesOf(attacker).filter((t) => MOVES[t]);
  const types = own.length > 1 ? own.slice(0, 2) : [...own, ...(own[0] === "normal" ? [] : ["normal"])];
  return types.flatMap((t) => [{ type: t, name: MOVES[t][0], physical: true }, { type: t, name: MOVES[t][1], physical: false }]);
}

// One move by `attacker` at `target` (fighter keys): { type, name, physical, ultimate, crit, miss,
// power, mul, eff }. `mul`: what it does to the damage besides its power (0 when it misses).
// `how.targetSize`: a small target is harder to hit (weather.js sizeMiss).
export function pickMove(attacker, target, rnd = Math.random, how = {}) {
  const set = movesetOf(attacker);
  const own = typesOf(attacker);
  const stabOf = (t) => (own.includes(t) ? STAB : 1);
  const weights = set.map((m) => (gameDamage(attacker, target, powerOf(m.name), m.physical, effectOn(m.type, target), 0.5) * stabOf(m.type)) ** PICK_SHARP);
  const total = weights.reduce((x, y) => x + y, 0);
  let r = rnd() * total, k = 0;
  if (total > 0) { while (k < set.length - 1 && r >= weights[k]) { r -= weights[k]; k++; } } else k = 0;
  const base = set[k];
  const ultimate = rnd() < ULTIMATE;
  const crit = rnd() < CRIT;
  const miss = rnd() < Math.max(ultimate ? MISS_ULTIMATE : MISS, sizeMiss(how.targetSize) ?? 0);
  const name = ultimate ? MOVES[base.type][2] : base.name;
  const physical = ultimate ? false : base.physical; // a signature move fires (Blast Burn, Hydro Cannon…)
  const stab = own.includes(base.type);
  return { type: base.type, name, physical, ultimate, crit, miss, stab, power: powerOf(name), mul: miss ? 0 : (crit ? CRIT_HIT : 1) * (stab ? STAB : 1), eff: effectOn(base.type, target) };
}

// The moves a Pokémon uses in a battle, as the games name them: for each type a physical move
// (it rushes in and strikes), a special one (it fires from where it stands) and, now and then, a
// signature move of that type, stronger. Which: the type that does most to the other (trainer.js
// bestType); physical or special at random, leaning on its base stats (base-stats.js PHYSICAL:
// Attack ≥ Sp. Atk): its stronger side LEAN of the time.
// A critical hit 1 time in 16. Always a move of its own type, resisted or not ("Not very
// effective…" is part of the fun). A move can miss: 1 in 20, a signature move 1 in 5 (Thunder,
// Blizzard...). Pure.
import { PHYSICAL } from "./base-stats.js";
import { bestType, effectOn } from "./trainer.js";

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
export const ULTIMATE = 1 / 8; // a signature move, ×1.5
export const CRIT = 1 / 16; // a critical hit, ×1.5
export const ULTIMATE_HIT = 1.5, CRIT_HIT = 1.5;
export const MISS = 0.05, MISS_ULTIMATE = 0.2;
export const LEAN = 0.7; // how often it uses its stronger side, physical or special

const PHYS = new Set(PHYSICAL);
export const isPhysical = (key) => PHYS.has(String(key));

// One move by `attacker` at `target` (fighter keys): { type, name, physical, ultimate, crit, miss,
// mul, eff }. `mul`: what it does to the damage (0 when it misses).
export function pickMove(attacker, target, rnd = Math.random) {
  const type = bestType(attacker, target);
  const ultimate = rnd() < ULTIMATE;
  const crit = rnd() < CRIT;
  const miss = rnd() < (ultimate ? MISS_ULTIMATE : MISS);
  const lean = rnd() < LEAN;
  const physical = !ultimate && (isPhysical(attacker) ? lean : !lean);
  const names = MOVES[type] ?? MOVES.normal;
  return {
    type, name: ultimate ? names[2] : physical ? names[0] : names[1], physical, ultimate, crit, miss,
    mul: miss ? 0 : (ultimate ? ULTIMATE_HIT : 1) * (crit ? CRIT_HIT : 1), eff: effectOn(type, target),
  };
}

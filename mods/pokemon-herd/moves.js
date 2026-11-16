// The moves a Pokémon uses in a battle, as the games name them: for each type a physical move
// (it rushes in and strikes), a special one (it fires from where it stands) and, now and then, a
// signature move of that type, stronger. Which: the type that does most to the other (trainer.js
// bestType); physical or special by its base stats (base-stats.js PHYSICAL: Attack ≥ Sp. Atk).
// A critical hit 1 time in 16. Pure.
import { PHYSICAL } from "./base-stats.js";
import { bestType, bestEffect } from "./trainer.js";

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

const PHYS = new Set(PHYSICAL);
export const isPhysical = (key) => PHYS.has(String(key));

// One move by `attacker` at `target` (fighter keys): { type, name, physical, ultimate, crit, mul, eff }.
export function pickMove(attacker, target, rnd = Math.random) {
  const type = bestType(attacker, target);
  const ultimate = rnd() < ULTIMATE;
  const physical = !ultimate && isPhysical(attacker);
  const crit = rnd() < CRIT;
  const names = MOVES[type] ?? MOVES.normal;
  return {
    type, name: ultimate ? names[2] : physical ? names[0] : names[1], physical, ultimate, crit,
    mul: (ultimate ? ULTIMATE_HIT : 1) * (crit ? CRIT_HIT : 1), eff: bestEffect(attacker, target),
  };
}

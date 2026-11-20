// Regenerates mods/pokemon-herd/more-moves.js from PokeAPI: the games' ordinary damaging moves the
// mod draws besides its own lists (moves.js MOVES, MORE_MOVES), so each Pokémon learns about as
// many as in the games. Kept: a fixed power of 40 or more, damage alone or with a side effect, a
// stat change, a drain (move_meta categories 0, 4, 6, 7, 8), learned by some species. Left out:
// status moves (a battle here is one blow each way: no turn to set up), one-hit KOs, fixed or
// varying damage (no fixed power), self-KOs, Z-moves and Max moves. A multi-hit move's power is
// all its hits together (its average count): MULTI_POWER. Run: node scripts/gen-moves.mjs, then
// node scripts/gen-stats.mjs and node scripts/gen-abilities.mjs.
import { writeFileSync } from "node:fs";

const BASE = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/";
const csv = async (name) => {
  const r = await fetch(BASE + name);
  if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
  const [head, ...lines] = (await r.text()).trim().split("\n");
  const cols = head.split(",");
  return lines.map((l) => Object.fromEntries(l.split(",").map((v, i) => [cols[i], v])));
};
const TYPES = [null, "normal", "fighting", "flying", "poison", "ground", "rock", "bug", "ghost", "steel", "fire", "water", "grass", "electric", "psychic", "ice", "dragon", "dark", "fairy"];
const { MOVES, MORE_OWN, EXCLUSIVE } = await import("../mods/pokemon-herd/moves.js");
const have = new Set([...Object.values(MOVES).flat(), ...Object.values(MORE_OWN).flat().map(([n]) => n), ...Object.keys(EXCLUSIVE)]);
const names = Object.fromEntries((await csv("move_names.csv")).filter((r) => r.local_language_id === "9").map((r) => [r.move_id, r.name]));
const meta = Object.fromEntries((await csv("move_meta.csv")).map((r) => [r.move_id, r]));
const learned = new Set((await csv("pokemon_moves.csv")).filter((r) => Number(r.pokemon_id) <= 1025).map((r) => r.move_id));
const SELF_KO = new Set(["explosion", "self-destruct", "misty-explosion", "memento", "final-gambit", "healing-wish", "lunar-dance"]);
// Moves that work only some of the time, or cost their user dearly, as the games have them: with
// one blow each way and no next turn, they'd be free (Hyper Beam's rest, Steel Beam's half its
// health) or always work (Dream Eater on one awake). Left out with those that need a charge turn
// or a rest after (move_flag_map: 2 charge, 3 recharge).
const ODD = new Set(["eruption", "water-spout", "dragon-energy", "steel-beam", "mind-blown", "chloroblast", "focus-punch", "dream-eater", "last-resort", "belch", "fake-out", "first-impression",
  "synchronoise", "spit-up", "natural-gift", "hidden-power", "burn-up", "double-shock", "shell-trap", "future-sight", "doom-desire", "sky-drop",
  "steel-roller", "ice-ball", "rollout", "fling", "pay-day", "snore", "sucker-punch", "upper-hand", "poltergeist", "gigaton-hammer", "blood-moon", "make-it-rain",
  "self-destruct", "struggle", "head-charge", "light-of-ruin", "head-smash", "volt-tackle", "flare-blitz", "brave-bird", "double-edge"]); // (the last: already the mod's own)
const flagged = new Set((await csv("move_flag_map.csv")).filter((r) => r.move_flag_id === "2" || r.move_flag_id === "3").map((r) => r.move_id));
const KEEP = new Set(["0", "4", "6", "7", "8"]); // damage; + ailment; + lower; + raise; + heal (drain)
// Their side effects, as spar.js SIDE_EFFECTS has them: [what, chance]: a status (move_meta
// ailment: 1 par, 3 frz, 4 brn, 5 psn), a flinch, or a stat of the other's falling a stage
// (move_meta_stat_changes, category 6: damage + lower).
const AILMENT = { 1: "par", 3: "frz", 4: "brn", 5: "psn" };
const STAT = { 2: "atk", 3: "def", 4: "spa", 5: "spd", 6: "spe" };
const drops = {};
for (const r of await csv("move_meta_stat_changes.csv")) if (Number(r.change) < 0 && STAT[r.stat_id]) drops[r.move_id] ??= STAT[r.stat_id];
const out = {}, multi = {}, side = {};
let n = 0;
for (const m of await csv("moves.csv")) {
  const id = m.id, power = Number(m.power), name = names[id];
  if (Number(id) > 10000 || !name || have.has(name) || !learned.has(id)) continue;
  if (name.toLowerCase().replace(/ /g, "-") !== m.identifier) continue; // (gen-stats finds a move by its name as an id: "Vise Grip" is vice-grip, "Land’s Wrath" curly)
  if (!(power > 0) || !["2", "3"].includes(m.damage_class_id) || SELF_KO.has(m.identifier) || ODD.has(m.identifier) || flagged.has(id)) continue;
  if (m.identifier.includes("--") || /^(g-)?max-/.test(m.identifier)) continue; // Z-moves, Max moves
  const mt = meta[id];
  if (!mt || !KEEP.has(mt.meta_category_id)) continue;
  const type = TYPES[Number(m.type_id)];
  if (!type) continue;
  const lo = Number(mt.min_hits) || 0, hi = Number(mt.max_hits) || 0;
  const total = hi > 1 ? Math.round(power * (lo === 2 && hi === 5 ? 3 : (lo + hi) / 2)) : power; // 2–5: 3 on average, as the games' odds
  if (total < 40) continue; // (40 at least: all its hits together, for a multi-hit one)
  if (hi > 1) multi[name] = total;
  const pct = (v) => (Number(v) || 100) / 100;
  if (AILMENT[mt.meta_ailment_id] && Number(mt.ailment_chance) > 0) side[name] = [AILMENT[mt.meta_ailment_id], pct(mt.ailment_chance)];
  else if (Number(mt.flinch_chance) > 0) side[name] = ["flinch", pct(mt.flinch_chance)];
  else if (mt.meta_category_id === "6" && drops[id]) side[name] = [drops[id], pct(mt.stat_chance)];
  (out[type] ??= []).push([name, m.damage_class_id === "2"]);
  n++;
}
for (const t of Object.keys(out)) out[t].sort((a, b) => a[0].localeCompare(b[0]));
writeFileSync(new URL("../mods/pokemon-herd/more-moves.js", import.meta.url), `// Generated by scripts/gen-moves.mjs from PokeAPI: the games' ordinary damaging moves besides the
// mod's own lists ([name, physical] by type), and multi-hit moves' power, all hits together.
export const EXTRA_MOVES = ${JSON.stringify(out)};
export const MULTI_POWER = ${JSON.stringify(multi)};
export const EXTRA_SIDE = ${JSON.stringify(side)};
`);
console.log(`side effects ${Object.keys(side).length}: Fire Fang ${side["Fire Fang"]}, Crunch-like ${side["Liquidation"]}`);
console.log(`${n} more moves; by type: ${Object.entries(out).map(([t, l]) => `${t} ${l.length}`).join(", ")}; multi-hit ${Object.keys(multi).length}`);

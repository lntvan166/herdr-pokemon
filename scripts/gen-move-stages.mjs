// Regenerates mods/pokemon-herd/move-stages.js from PokeAPI: its recoil (RECOIL), and the stat
// stages a damaging move changes on its own user, as the games have them (move_meta category 7, "damage + raise": Close
// Combat's Defense and Sp. Def −1, Overheat's Sp. Atk −2, Power-Up Punch's Attack +1, Ancient
// Power's all +1 one time in 10). Only the moves the mod knows. Run: node scripts/gen-move-stages.mjs
import { writeFileSync } from "node:fs";

const BASE = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/";
const csv = async (name) => {
  const r = await fetch(BASE + name);
  if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
  const [head, ...lines] = (await r.text()).trim().split("\n");
  const cols = head.split(",");
  return lines.map((l) => Object.fromEntries(l.split(",").map((v, i) => [cols[i], v])));
};
const { MOVES, MORE_MOVES, EXCLUSIVE } = await import("../mods/pokemon-herd/moves.js");
const known = new Set([...Object.values(MOVES).flat(), ...Object.values(MORE_MOVES).flat().map(([n]) => n), ...Object.keys(EXCLUSIVE)]);
const names = Object.fromEntries((await csv("move_names.csv")).filter((r) => r.local_language_id === "9").map((r) => [r.move_id, r.name]));
const meta = Object.fromEntries((await csv("move_meta.csv")).map((r) => [r.move_id, r]));
const STAT = { 2: "atk", 3: "def", 4: "spa", 5: "spd", 6: "spe" };
const out = {};
for (const r of await csv("move_meta_stat_changes.csv")) {
  const name = names[r.move_id], mt = meta[r.move_id];
  if (!name || !known.has(name) || mt?.meta_category_id !== "7" || !STAT[r.stat_id]) continue;
  const e = (out[name] ??= [(Number(mt.stat_chance) || 100) / 100, []]);
  e[1].push([STAT[r.stat_id], Number(r.change)]);
}
// Recoil: a share of the damage it dealt comes back to its user (move_meta drain below 0: Brave
// Bird a third, Head Smash half).
const recoil = {};
for (const [id, mt] of Object.entries(meta)) if (Number(mt.drain) < 0 && known.has(names[id])) recoil[names[id]] = -Number(mt.drain) / 100;
const recoilSorted = Object.fromEntries(Object.entries(recoil).sort((a, b) => a[0].localeCompare(b[0])));
// A rest after (PokeAPI's "recharge" flag, 3: Hyper Beam, Giga Impact, Blast Burn, Prismatic Laser):
// its next turn lost.
const recharge = [...new Set((await csv("move_flag_map.csv")).filter((r) => r.move_flag_id === "3" && known.has(names[r.move_id])).map((r) => names[r.move_id]))].sort();
// Setup moves (status moves that raise its own stats: Swords Dance, Dragon Dance…), as the games'
// trainers use them on their first turn: [type, [[stat, stages]…]] by name, and which species learn
// each (SETUP_LEARNS: dex → indices into SETUP_NAMES), any way (level, TM, tutor, egg). Left out:
// those with a cost the mod has no way to pay (Belly Drum, Clangorous Soul, No Retreat), a charge
// (Geomancy), a Z-move, a Berry (Stuff Cheeks).
const SETUP_NAMES = ["Swords Dance", "Nasty Plot", "Tail Glow", "Dragon Dance", "Calm Mind", "Bulk Up", "Quiver Dance", "Shift Gear", "Work Up", "Growth",
  "Coil", "Shell Smash", "Victory Dance", "Tidy Up", "Agility", "Rock Polish", "Autotomize", "Iron Defense", "Barrier", "Acid Armor", "Cotton Guard", "Amnesia", "Cosmic Power", "Defend Order"];
const movesCsv = await csv("moves.csv");
const TYPES = [null, "normal", "fighting", "flying", "poison", "ground", "rock", "bug", "ghost", "steel", "fire", "water", "grass", "electric", "psychic", "ice", "dragon", "dark", "fairy"];
const idOf = Object.fromEntries(Object.entries(names).map(([id, n]) => [n, id]));
const changes = {};
for (const r of await csv("move_meta_stat_changes.csv")) if (STAT[r.stat_id]) (changes[r.move_id] ??= []).push([STAT[r.stat_id], Number(r.change)]);
const setup = {};
for (const n of SETUP_NAMES) {
  const id = idOf[n], m = movesCsv.find((x) => x.id === id);
  // (PokeAPI has no stat changes for the newest: as the games have them.)
  const HAND = { "Victory Dance": [["atk", 1], ["def", 1], ["spe", 1]], "Tidy Up": [["atk", 1], ["spe", 1]] };
  if (!m || !(changes[id] ?? HAND[n])) throw new Error(`setup move ${n}: not in PokeAPI`);
  setup[n] = [TYPES[Number(m.type_id)], changes[id] ?? HAND[n]];
}
const setupIdx = new Map(SETUP_NAMES.map((n, i) => [idOf[n], i]));
const setupLearns = {};
for (const r of await csv("pokemon_moves.csv")) {
  const i = setupIdx.get(r.move_id), dex = Number(r.pokemon_id);
  if (i === undefined || dex > 1025) continue;
  (setupLearns[dex] ??= new Set()).add(i);
}
// Status moves that give the other a status, as the games' (no damage): [type, status, accuracy]
// by name, and which species learn each (STATUS_LEARNS: dex → indices into STATUS_NAMES).
const STATUS_NAMES = ["Will-O-Wisp", "Thunder Wave", "Toxic"];
const STATUS_OF = { "Will-O-Wisp": "brn", "Thunder Wave": "par", Toxic: "psn" };
const statusMoves = {};
for (const n of STATUS_NAMES) {
  const id = idOf[n], m = movesCsv.find((x) => x.id === id);
  if (!m) throw new Error(`status move ${n}: not in PokeAPI`);
  statusMoves[n] = [TYPES[Number(m.type_id)], STATUS_OF[n], Number(m.accuracy) || 100];
}
const statusIdx = new Map(STATUS_NAMES.map((n, i) => [idOf[n], i]));
const statusLearns = {};
for (const r of await csv("pokemon_moves.csv")) {
  const i = statusIdx.get(r.move_id), dex = Number(r.pokemon_id);
  if (i === undefined || dex > 1025) continue;
  (statusLearns[dex] ??= new Set()).add(i);
}
const statusOut = Object.fromEntries(Object.entries(statusLearns).map(([d, set]) => [d, [...set].sort((x, y) => x - y)]));
const learnsOut = Object.fromEntries(Object.entries(setupLearns).map(([d, set]) => [d, [...set].sort((x, y) => x - y)]));
const sorted = Object.fromEntries(Object.entries(out).sort((a, b) => a[0].localeCompare(b[0])));
writeFileSync(new URL("../mods/pokemon-herd/move-stages.js", import.meta.url), `// Generated by scripts/gen-move-stages.mjs from PokeAPI: the stat stages a damaging move changes on
// its own user, [chance, [[stat, stages]…]] by name (Close Combat: [1, [["def", -1], ["spd", -1]]]).
export const SELF_STAGES = ${JSON.stringify(sorted)};
// The share of the damage it dealt its user takes back (recoil): Brave Bird 0.33, Head Smash 0.5.
export const RECOIL = ${JSON.stringify(recoilSorted)};
// Its next turn lost, resting (the games' recharge): Hyper Beam, Giga Impact, Blast Burn.
export const RECHARGE = ${JSON.stringify(recharge)};
// Setup moves: [type, [[stat, stages]…]] (Swords Dance: ["normal", [["atk", 2]]]); which species learn
// each (dex → indices into SETUP_NAMES).
export const SETUP = ${JSON.stringify(setup)};
export const SETUP_NAMES = ${JSON.stringify(SETUP_NAMES)};
export const SETUP_LEARNS = ${JSON.stringify(learnsOut)};
// Status moves (Will-O-Wisp, Thunder Wave, Toxic): [type, status, accuracy]; which species learn each.
export const STATUS_MOVES = ${JSON.stringify(statusMoves)};
export const STATUS_NAMES = ${JSON.stringify(STATUS_NAMES)};
export const STATUS_LEARNS = ${JSON.stringify(statusOut)};
`);
console.log("status moves:", JSON.stringify(statusMoves), "learned by", Object.keys(statusOut).length);
console.log("setup:", Object.keys(setup).length, "learned by", Object.keys(learnsOut).length, "species; Kingambit", learnsOut[983]?.map((i) => SETUP_NAMES[i]));
console.log("recoil:", JSON.stringify(recoilSorted));
console.log(`${Object.keys(sorted).length} moves:`, Object.entries(sorted).map(([n, [c, l]]) => `${n} ${l.map(([s, x]) => `${s}${x > 0 ? "+" : ""}${x}`).join(" ")}${c < 1 ? ` (${c * 100}%)` : ""}`).join("; "));

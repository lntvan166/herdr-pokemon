// Regenerates mods/pokemon-herd/base-stats.js: for each species the mod has, its strongest attack
// (Attack or Sp. Atk), its sturdiest defence (Defense or Sp. Def) and its types, from PokeAPI's
// pokemon_stats.csv and pokemon_types.csv (the species' default form); and the same for its Megas
// (FORM_BASE "<dex>m<X|Y|>") and regional forms (FORM_BASE "<dex>f<form folder>"), from
// pokemon.csv's other forms. Run: node scripts/gen-stats.mjs
import { writeFileSync } from "node:fs";
import { WALKABLE } from "../mods/pokemon-herd/dex.js";
import { REGIONAL, EVOLVES_FROM } from "../mods/pokemon-herd/species.js";

const STATS = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_stats.csv";
const TYPES_CSV = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_types.csv";
// PokeAPI's type ids, in order from 1.
const TYPE_NAMES = ["normal", "fighting", "flying", "poison", "ground", "rock", "bug", "ghost", "steel", "fire", "water", "grass", "electric", "psychic", "ice", "dragon", "dark", "fairy"];
const types = new Map(); // dex -> [first, second?]
for (const line of (await (await fetch(TYPES_CSV)).text()).trim().split("\n").slice(1)) {
  const [id, type, slot] = line.split(",").map(Number);
  if (!TYPE_NAMES[type - 1]) continue;
  if (!types.has(id)) types.set(id, []);
  types.get(id)[slot - 1] = TYPE_NAMES[type - 1];
}
const text = await (await fetch(STATS)).text();
const by = new Map(); // dex -> { 1: hp, 2: atk, 3: def, 4: spa, 5: spd, 6: speed }
for (const line of text.trim().split("\n").slice(1)) {
  const [id, stat, base] = line.split(",").map(Number);
  if (stat < 1 || stat > 6) continue;
  if (!by.has(id)) by.set(id, {});
  by.get(id)[stat] = base;
}
const POKEMON = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon.csv";
const row = (id) => { const s = by.get(id); return s && [Math.max(s[2], s[4]), Math.max(s[3], s[5]), ...(types.get(id) ?? []).filter(Boolean)]; };
const physical = []; // keys whose Attack is at least their Sp. Atk: they rush in and strike
const full = {}; // key -> [HP, Attack, Defense, Sp. Atk, Sp. Def, Speed]: the damage as the games reckon it, and who moves first
const pokeId = {}; // key -> its PokeAPI pokemon id (its learnset's)
const phys = (key, id) => { const s = by.get(id); if (s && s[2] >= s[4]) physical.push(key); if (s) full[key] = [s[1], s[2], s[3], s[4], s[5], s[6]]; pokeId[key] = id; };
const out = {};
for (const dex of WALKABLE) {
  const r = row(dex);
  if (r) out[dex] = r;
  phys(dex, dex);
}
// Other forms: pokemon.csv's id,identifier,species_id,...,is_default.
const forms = new Map(); // dex -> [[identifier, id]]
for (const line of (await (await fetch(POKEMON)).text()).trim().split("\n").slice(1)) {
  const f = line.split(",");
  if (f[7] !== "0" || /-(gmax|totem)/.test(f[1])) continue;
  const dex = Number(f[2]);
  if (!forms.has(dex)) forms.set(dex, []);
  forms.get(dex).push([f[1], Number(f[0])]);
}
const formBase = {};
for (const [dex, list] of forms) {
  if (!out[dex]) continue;
  for (const [ident, id] of list) {
    const m = /-mega(?:-([xy]))?$/.exec(ident);
    if (m && row(id)) { formBase[`${dex}m${(m[1] ?? "").toUpperCase()}`] = row(id); phys(`${dex}m${(m[1] ?? "").toUpperCase()}`, id); }
  }
}
// A regional form: the shortest other form of its species with every word of its label
// ("Paldea Blaze" -> tauros-paldea-blaze-breed; "Paldea" -> wooper-paldea, tauros-paldea-combat-breed).
for (const [dex, form, label] of REGIONAL) {
  const words = label.toLowerCase().split(/\s+/);
  const hit = (forms.get(dex) ?? []).filter(([ident]) => words.every((w) => ident.split("-").includes(w)) && !ident.includes("-mega"))
    .sort((a, b) => a[0].length - b[0].length)[0];
  if (hit && row(hit[1])) { formBase[`${dex}f${form}`] = row(hit[1]); phys(`${dex}f${form}`, hit[1]); }
  else console.warn(`no PokeAPI form for ${dex} ${label}`);
}
// The moves' power (moves.js MOVES), from moves.csv: id,identifier,generation_id,type_id,power,…
const { MOVES, MORE_MOVES } = await import("../mods/pokemon-herd/moves.js");
const moveRows = (await (await fetch("https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/moves.csv")).text())
  .trim().split("\n").slice(1).map((l) => l.split(","));
const powers = new Map(moveRows.map((c) => [c[1], Number(c[4]) || 0]));
const isPhysicalMove = new Map(moveRows.map((c) => [c[1], c[9] === "2"])); // damage_class_id 2: physical
const movePower = {};
for (const name of [...Object.values(MOVES).flat(), ...Object.values(MORE_MOVES).flat().map(([n]) => n)]) {
  const p = powers.get(name.toLowerCase().replace(/ /g, "-"));
  if (p) movePower[name] = p; else console.warn(`no power for ${name}`);
}
// Each one's four moves (MOVESET): among the moves the mod draws (MOVES' physical and special, not
// the signature ones) those it really learns in any game (pokemon_moves.csv: level, TM, tutor,
// egg; levelling up first): its two best of its own types and its two best of others (coverage), best by power, ×1.3
// on its stronger side, ×1.5 its own type. A Mega knows its species'; a form, its own if PokeAPI
// keeps one. Indices into MOVE_LIST.
const moveIds = new Map((await (await fetch("https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/moves.csv")).text())
  .trim().split("\n").slice(1).map((l) => l.split(",")).map((c) => [c[1], Number(c[0])]));
// [type, name, physical]: the 90 moves a Pokémon knows by default, then (from SIG_FROM) the 18
// signature moves, which it can be taught (LEARNS) but never knows by default.
const ident = (n) => n.toLowerCase().replace(/ /g, "-");
const MOVE_LIST = [...Object.entries(MOVES).flatMap(([t, n]) => [[t, n[0], true], [t, n[1], false]]), ...Object.entries(MORE_MOVES).flatMap(([t, l]) => l.map(([n, ph]) => [t, n, ph]))];
const SIG_FROM = MOVE_LIST.length;
MOVE_LIST.push(...Object.entries(MOVES).map(([t, n]) => [t, n[2], isPhysicalMove.get(ident(n[2])) ?? false]));
const listIndex = new Map(MOVE_LIST.map(([, n], i) => [moveIds.get(n.toLowerCase().replace(/ /g, "-")), i]));
const learns = new Map(); // pokemon id -> Set of MOVE_LIST indices (any way)
const byLevel = new Map(); // pokemon id -> Set of those it learns levelling up (method 1)
for (const line of (await (await fetch("https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_moves.csv")).text()).split("\n").slice(1)) {
  const c = line.split(","), i = listIndex.get(Number(c[2]));
  if (i === undefined) continue;
  const id = Number(c[0]);
  for (const [map, ok] of [[learns, true], [byLevel, c[3] === "1"]]) {
    if (!ok) continue;
    if (!map.has(id)) map.set(id, new Set());
    map.get(id).add(i);
  }
}
const typesOfKey = (key) => (out[key] ?? formBase[key] ?? []).slice(2).filter(Boolean);
const moveset = {}, learnsets = {};
const WEAK = 50;
// Those that evolve further (a trainer teaches a TM to the final one, mostly).
const evolvesOn = new Set(Object.values(EVOLVES_FROM).map(Number));
for (const key of Object.keys(full)) {
  const own = typesOfKey(key), st = full[key], strongPhys = st[1] >= st[3];
  const id = /m/.test(key) ? Number(parseInt(key, 10)) : pokeId[key];
  const all = [...(learns.get(id) ?? learns.get(Number(parseInt(key, 10))) ?? [])];
  const can = all.filter((i) => i < SIG_FROM);
  const final = !evolvesOn.has(Number(parseInt(key, 10))) || /m/.test(key);
  const lv = byLevel.get(id) ?? byLevel.get(Number(parseInt(key, 10))) ?? new Set();
  // What it learns levelling up first (its own moves, as the games give it them); a TM or a
  // tutor's only where those run short (×0.3: Bulbasaur doesn't Outrage), but nearly as readily
  // for one fully evolved (×0.8: Venusaur's Earthquake over Tackle; it's been trained).
  // A weak one (power 50 or less: Tackle, Ember) only when it has nothing else: it can still be
  // taught one (LEARNS), it just never starts with it.
  const score = (i) => { const [t, n, ph] = MOVE_LIST[i]; const pw = movePower[n] ?? 80; return pw * (ph === strongPhys ? 1.3 : 1) * (own.includes(t) ? 1.5 : 1) * (lv.has(i) ? 1 : final ? 0.8 : 0.3) * (pw <= WEAK ? 0.01 : 1); };
  // One of its own types it learns none of here (Rotom Wash's Hydro Pump isn't drawn): that
  // type's move on its stronger side stands in.
  for (const t of own) if (MOVES[t] && !can.some((i) => MOVE_LIST[i][0] === t)) can.push(MOVE_LIST.findIndex(([ty, , ph]) => ty === t && ph === strongPhys));
  // Its own types' two: with two types, the best of each (Gallade: a Psychic move and a Fighting one).
  const ownSorted = can.filter((i) => own.includes(MOVE_LIST[i][0])).sort((x, y) => score(y) - score(x));
  const firsts = own.map((t) => ownSorted.find((i) => MOVE_LIST[i][0] === t)).filter((i) => i !== undefined);
  const stab = [...new Set([...firsts, ...ownSorted])].slice(0, 2).sort((x, y) => score(y) - score(x));
  const cover = can.filter((i) => !own.includes(MOVE_LIST[i][0])).sort((x, y) => score(y) - score(x)).slice(0, 4 - stab.length);
  if (can.length) moveset[key] = [...stab, ...cover];
  // Every one it can be taught (its own four among them): the others it learns, and the signature
  // moves it really learns (Charizard Blast Burn, Gallade Close Combat).
  const teach = [...new Set([...can, ...all.filter((i) => i >= SIG_FROM)])].sort((x, y) => x - y);
  if (teach.length) learnsets[key] = teach;
}
writeFileSync(new URL("../mods/pokemon-herd/base-stats.js", import.meta.url),
  `// GENERATED by scripts/gen-stats.mjs on ${new Date().toISOString().slice(0, 10)}. Do not edit.\n` +
  `// Each species' [strongest attack (Attack or Sp. Atk), sturdiest defence (Defense or Sp. Def), type, second type?],\n` +
  `// its base stats from PokeAPI (pokemon_stats.csv). Names are trademarks of Nintendo et al.; see README.\n` +
  `export const BASE = ${JSON.stringify(out)};\n` +
  `// The same for Megas ("<dex>m" + "X", "Y" or nothing) and regional forms ("<dex>f" + its form folder).\n` +
  `export const FORM_BASE = ${JSON.stringify(formBase)};\n` +
  `// Those whose Attack is at least their Sp. Atk (physical fighters: they rush in and strike).\n` +
  `export const PHYSICAL = ${JSON.stringify(physical.map(String))};\n` +
  `// Every species' and form's [HP, Attack, Defense, Sp. Atk, Sp. Def, Speed] (the same keys as above).\n` +
  `export const STATS = ${JSON.stringify(full)};\n` +
  `// Each named move's power (moves.js MOVES), from PokeAPI's moves.csv.\n` +
  `export const MOVE_POWER = ${JSON.stringify(movePower)};\n` +
  `// The moves drawn ([type, name, physical]) and each one's four (indices into it), from its learnset.\n` +
  `export const MOVE_LIST = ${JSON.stringify(MOVE_LIST)};\n` +
  `export const MOVESET = ${JSON.stringify(moveset)};\n` +
  `// Where the signature moves start in MOVE_LIST; every move each one can be taught (indices).\n` +
  `export const SIG_FROM = ${SIG_FROM};\n` +
  `export const LEARNS = ${JSON.stringify(learnsets)};\n`);
console.log(`base-stats.js: ${Object.keys(out).length} species, ${Object.keys(formBase).length} forms`);

// Which Pokémon exist here and what they're called (from the generated species.js).
import { SPECIES, MEGA, REGIONAL, EVOLVES_FROM, EVOLVE_HOW, SEASONAL } from "./species.js";

const NAME = new Map(SPECIES.map(([dex, name]) => [dex, name]));
const SHINY = new Set(SPECIES.filter((s) => s[2]).map((s) => s[0]));

// Dex numbers that can be handed out: they have a walking animation. Ascending.
export const WALKABLE = SPECIES.map((s) => s[0]);

export const isWalkable = (dex) => NAME.has(dex);
// Regional forms by dex: [{ form, label, shiny }].
const FORMS = new Map();
for (const [dex, form, label, shiny] of REGIONAL) {
  if (!FORMS.has(dex)) FORMS.set(dex, []);
  FORMS.get(dex).push({ form, label, shiny: shiny === 1 });
}
export const formsOf = (dex) => FORMS.get(dex) ?? [];
export const hasForm = (dex, form) => formsOf(dex).some((f) => f.form === form);

// Has a shiny sprite (the species', or that form's).
export const hasShiny = (dex, form) => (form ? formsOf(dex).find((f) => f.form === form)?.shiny === true : SHINY.has(dex));
export const nameOf = (dex) => NAME.get(dex) ?? `#${dex}`;
export const dexNo = (dex) => `#${String(dex).padStart(3, "0")}`;
// "Vulpix (Alola)" for a regional form, else just the name.
export function fullName(dex, form) {
  const f = form && formsOf(dex).find((x) => x.form === form);
  return f ? `${nameOf(dex)} (${f.label})` : nameOf(dex);
}

// Lowercase without accents, so "flabebe" finds Flabébé.
function fold(s) {
  let out = s.toLowerCase();
  try {
    out = out.normalize("NFD").replace(/[̀-ͯ]/g, "");
  } catch {}
  return out;
}
const FOLDED = new Map(SPECIES.map(([dex, name]) => [dex, fold(name)]));

// Pokémon whose name contains the query, or whose number is it or starts with it ("25", "#025").
// Returns the first `limit` in dex order, and how many match in all.
export function search(query, limit) {
  const f = fold(query.trim()).replace(/^#/, "");
  const num = f.replace(/^0+/, "");
  const ids = [];
  let total = 0;
  for (const dex of WALKABLE) {
    const hit = !f || FOLDED.get(dex).includes(f) || String(dex) === num || String(dex).padStart(3, "0").startsWith(f);
    if (!hit) continue;
    total++;
    if (ids.length < limit) ids.push(dex);
  }
  return { ids, total };
}

// The Megas with art: the built-in list, plus any drawn since (setMegas, from the tracker).
// Each species: [[form folder under sprite/<dex>/, has a shiny (1/0), "X" | "Y" | ""], ...].
let megas = MEGA;
export function setMegas(fresh) {
  megas = { ...MEGA, ...fresh };
}
// Every walking Mega form of a species: [{ form, shiny, kind }], X before Y.
export const megaForms = (dex) => (megas[dex] ?? []).map(([form, shiny, kind]) => ({ form, shiny: shiny === 1, kind }));
// The Mega to show: the `kind` asked for (X or Y) when it's drawn, else the first; null when none.
export const megaForm = (dex, kind) => {
  const forms = megaForms(dex);
  return forms.find((f) => kind && f.kind === kind) ?? forms[0] ?? null;
};

// Every species, each followed by its regional forms: what the picker lists.
const ENTRIES = WALKABLE.flatMap((dex) => [{ dex }, ...formsOf(dex).map((f) => ({ dex, form: f.form }))]);

// The picker's region filter. A species belongs to the region it was introduced in (by dex
// number); a regional form to its own region ("Paldea Blaze" -> Paldea).
export const REGIONS = ["Kanto", "Johto", "Hoenn", "Sinnoh", "Unova", "Kalos", "Alola", "Galar", "Hisui", "Paldea"];
const LAST_DEX = [151, 251, 386, 493, 649, 721, 809, 898, 905, Infinity];
export function regionOf(e) {
  if (e.form) return formsOf(e.dex).find((f) => f.form === e.form)?.label.split(" ")[0] ?? null;
  return REGIONS[LAST_DEX.findIndex((last) => e.dex <= last)];
}

// search() over species and forms: name, number, or a form's region ("alola") matches.
// `only`: { region } (one of REGIONS), { mega: true } (species that can Mega Evolve here) and/or
// { keys } (a Set of "<dex>" / "<dex>-<form>": the favourites).
export function searchEntries(query, limit, only = {}) {
  const f = fold(query.trim()).replace(/^#/, "");
  const num = f.replace(/^0+/, "");
  const entries = [];
  let total = 0;
  for (const e of ENTRIES) {
    if (only.region && regionOf(e) !== only.region) continue;
    if (only.mega && (e.form || !megaForm(e.dex))) continue;
    if (only.keys && !only.keys.has(`${e.dex}${e.form ? `-${e.form}` : ""}`)) continue;
    const label = e.form ? fold(formsOf(e.dex).find((x) => x.form === e.form).label) : "";
    const hit = !f || FOLDED.get(e.dex).includes(f) || label.includes(f) || String(e.dex) === num || String(e.dex).padStart(3, "0").startsWith(f);
    if (!hit) continue;
    total++;
    if (entries.length < limit) entries.push(e);
  }
  return { entries, total };
}

// Evolutions (both stages walk). What a species evolves into, in dex order (several for Eevee).
const FROM = new Map(Object.entries(EVOLVES_FROM).map(([to, from]) => [Number(to), from]));
const INTO = new Map();
for (const [to, from] of [...FROM].sort((a, b) => a[0] - b[0])) {
  if (!INTO.has(from)) INTO.set(from, []);
  INTO.get(from).push(to);
}
export const evolutionsOf = (dex) => INTO.get(dex) ?? [];
// Its whole line, stage by stage from the first: [[4], [5], [6]]; [[133], [134, 135, …]].
export function chainOf(dex) {
  let root = dex;
  for (let i = 0; i < 9 && FROM.has(root); i++) root = FROM.get(root);
  const stages = [];
  for (let stage = [root]; stage.length && stages.length < 9; stage = stage.flatMap(evolutionsOf)) stages.push(stage);
  return stages;
}
// How a species is evolved into: ["jobs"], or its special ways ("stone:fire", "friend", "night"…).
export const waysOf = (dex) => EVOLVE_HOW[dex] ?? ["jobs"];

// Its coat this season (Deerling, Sawsbuck): { form, shiny } for summer (1), autumn (2), winter (3);
// null in spring (0, its own) or for any other species.
export function coatOf(dex, season) {
  const c = season > 0 && SEASONAL[dex]?.[season - 1];
  return c ? { form: c[0], shiny: c[1] === 1 } : null;
}

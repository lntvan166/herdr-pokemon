// Which Pokémon exist here and what they're called (from the generated species.js).
import { SPECIES, MEGA, REGIONAL } from "./species.js";

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

// Its walking Mega form ({ form: folder under sprite/<dex>/, shiny: has one }), or null.
// The Megas with art: the built-in list, plus any drawn since (setMegas, from the tracker).
let megas = MEGA;
export function setMegas(fresh) {
  megas = { ...MEGA, ...fresh };
}
export const megaForm = (dex) => (megas[dex] ? { form: megas[dex][0], shiny: megas[dex][1] === 1 } : null);

// Every species, each followed by its regional forms: what the picker lists.
const ENTRIES = WALKABLE.flatMap((dex) => [{ dex }, ...formsOf(dex).map((f) => ({ dex, form: f.form }))]);

// search() over species and forms: name, number, or a form's region ("alola") matches.
export function searchEntries(query, limit) {
  const f = fold(query.trim()).replace(/^#/, "");
  const num = f.replace(/^0+/, "");
  const entries = [];
  let total = 0;
  for (const e of ENTRIES) {
    const label = e.form ? fold(formsOf(e.dex).find((x) => x.form === e.form).label) : "";
    const hit = !f || FOLDED.get(e.dex).includes(f) || label.includes(f) || String(e.dex) === num || String(e.dex).padStart(3, "0").startsWith(f);
    if (!hit) continue;
    total++;
    if (entries.length < limit) entries.push(e);
  }
  return { entries, total };
}

// Items that change a Pokémon's form, as the games' (its hearts, jobs, nature and what it holds
// kept), and those that evolve one into a region's form. Pure.
// A tool (kept, as the games' key items): each use the next of `cycle` (its form keys, "" its own):
// the Rotom Catalog through Rotom's appliances, the Reveal Glass between Incarnate and Therian…
export const FORM_TOOLS = {
  "rotom-catalog": { name: "Rotom Catalog", icon: "📕", dex: [479], cycle: ["", "0001", "0002", "0003", "0004", "0005"], about: "Rotom into its appliances in turn: Heat, Wash, Frost, Fan, Mow, then itself again." },
  meteorite: { name: "Meteorite", icon: "☄️", dex: [386], cycle: ["", "0001", "0002", "0003"], about: "Deoxys's forms in turn: Attack, Defense, Speed, then Normal." },
  "adamant-crystal": { name: "Adamant Crystal", icon: "💠", dex: [483], cycle: ["", "0001"], about: "Dialga into its Origin Forme, and back." },
  "lustrous-globe": { name: "Lustrous Globe", icon: "🔮", dex: [484], cycle: ["", "0001"], about: "Palkia into its Origin Forme, and back." },
  "griseous-core": { name: "Griseous Core", icon: "⚫", dex: [487], cycle: ["", "0001"], about: "Giratina into its Origin Forme, and back." },
  gracidea: { name: "Gracidea", icon: "🌸", dex: [492], cycle: ["", "0001"], about: "Shaymin into its Sky Forme, and back." },
  "reveal-glass": { name: "Reveal Glass", icon: "🪞", dex: [645, 905], cycle: ["", "0001"], about: "Landorus or Enamorus into its Therian Forme, and back." },
  "dna-splicers": { name: "DNA Splicers", icon: "🧬", dex: [646], cycle: ["", "0001", "0002"], about: "Kyurem into Black Kyurem, White Kyurem, then itself again." },
  "prison-bottle": { name: "Prison Bottle", icon: "🏺", dex: [720], cycle: ["", "0001"], about: "Hoopa Unbound, and back to Confined." },
  "zygarde-cube": { name: "Zygarde Cube", icon: "🟩", dex: [718], cycle: ["", "0001", "0002"], about: "Zygarde's forms in turn: 10%, Complete, then 50%." },
  // Ogerpon's masks (it wears one: kept).
  "teal-mask": { name: "Teal Mask", icon: "🟢", dex: [1017], set: "", about: "Ogerpon in its Teal Mask (Grass)." },
  "wellspring-mask": { name: "Wellspring Mask", icon: "🔵", dex: [1017], set: "0005", about: "Ogerpon in its Wellspring Mask (Grass/Water)." },
  "hearthflame-mask": { name: "Hearthflame Mask", icon: "🔴", dex: [1017], set: "0006", about: "Ogerpon in its Hearthflame Mask (Grass/Fire)." },
  "cornerstone-mask": { name: "Cornerstone Mask", icon: "⚪", dex: [1017], set: "0007", about: "Ogerpon in its Cornerstone Mask (Grass/Rock)." },
};
// Nectars (used up, as the games'): Oricorio's style.
export const NECTARS = {
  "red-nectar": { name: "Red Nectar", icon: "🟥", dex: [741], set: "", about: "Oricorio into its Baile Style (Fire/Flying)." },
  "yellow-nectar": { name: "Yellow Nectar", icon: "🟨", dex: [741], set: "0001", about: "Oricorio into its Pom-Pom Style (Electric/Flying)." },
  "pink-nectar": { name: "Pink Nectar", icon: "🟪", dex: [741], set: "0003", about: "Oricorio into its Sensu Style (Ghost/Flying)." },
};
// Maps (kept; not in the games, where the region it evolves in decides): one that would evolve
// into a species with this region's form evolves now into that form (Pikachu into Alolan Raichu,
// Quilava into Hisuian Typhlosion). One that has a form of the region itself evolves as it is.
export const REGION_MAPS = {
  "alola-map": { name: "Alola Map", icon: "🌺", label: "Alola", about: "Evolves it now into its next stage's Alolan form: Pikachu, Exeggcute, Cubone." },
  "galar-map": { name: "Galar Map", icon: "🏰", label: "Galar", about: "Evolves it now into its next stage's Galarian form: Koffing, Mime Jr." },
  "hisui-map": { name: "Hisui Map", icon: "🏔️", label: "Hisui", about: "Evolves it now into its next stage's Hisuian form: Quilava, Dewott, Dartrix, Petilil, Rufflet, Goomy, Bergmite." },
};
export const FORM_ITEM_IDS = [...Object.keys(FORM_TOOLS), ...Object.keys(NECTARS)];
export const KEPT_ITEMS = new Set([...Object.keys(FORM_TOOLS), ...Object.keys(REGION_MAPS)]);
const formItem = (id) => FORM_TOOLS[id] ?? NECTARS[id] ?? null;
// The form it would take with item `id` (a form key, "" its own), or null (nothing for it).
// `hasForm(dex, form)`: whether that form exists here.
export function formWith(pick, id, hasForm) {
  const f = formItem(id);
  if (!f || !f.dex.includes(pick.dex)) return null;
  const cur = pick.form ?? "";
  let next;
  if (f.set !== undefined) next = f.set;
  else { const i = f.cycle.indexOf(cur); next = f.cycle[(i + 1) % f.cycle.length]; }
  if (next === cur || (next && !hasForm(pick.dex, next))) return null;
  return next;
}
// The species and form a map evolves it into now: { dex, form } or null. `evolutionsOf`, `formsOf`
// from dex.js.
export function mapEvolution(pick, id, evolutionsOf, formsOf) {
  const m = REGION_MAPS[id];
  if (!m || pick.stay) return null;
  if (pick.form && formsOf(pick.dex).find((f) => f.form === pick.form)?.label === m.label) return null; // (one of the region already: as it is)
  if (formsOf(pick.dex).some((f) => f.label === m.label)) return null; // (Sandshrew: its Alolan one evolves so, not this one)
  for (const dex of evolutionsOf(pick.dex)) {
    const f = formsOf(dex).find((x) => x.label === m.label);
    if (f) return { dex, form: f.form };
  }
  return null;
}

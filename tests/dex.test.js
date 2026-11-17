import { test } from "node:test";
import assert from "node:assert/strict";
import { WALKABLE, nameOf, dexNo, search, hasShiny, isWalkable } from "../mods/pokemon-herd/dex.js";

test("walkable table", () => {
  assert.ok(WALKABLE.length > 950);
  assert.ok(WALKABLE.includes(25) && WALKABLE.includes(1025));
  assert.ok(!WALKABLE.includes(514)); // no Walk animation as of 2026-11-10
  assert.ok(isWalkable(25) && !isWalkable(514) && !isWalkable(0));
});

test("names", () => {
  assert.equal(nameOf(29), "Nidoran♀");
  assert.equal(nameOf(122), "Mr. Mime");
  assert.equal(nameOf(99999), "#99999");
});

test("dexNo", () => {
  assert.equal(dexNo(25), "#025");
  assert.equal(dexNo(1025), "#1025");
});

test("search", () => {
  assert.ok(search("pika", 60).ids.includes(25));
  assert.equal(search("#025", 60).ids[0], 25);
  assert.equal(search("025", 60).ids[0], 25);
  assert.equal(search("25", 60).ids[0], 25);
  assert.ok(search("flabebe", 60).ids.includes(669));
  const all = search("", 60);
  assert.equal(all.ids.length, 60);
  assert.equal(all.total, WALKABLE.length);
});

test("hasShiny", () => {
  assert.equal(hasShiny(25), true);
  assert.equal(hasShiny(99999), false);
});

import { megaForm } from "../mods/pokemon-herd/dex.js";
test("megaForm: the walking Mega's folder, and whether it has a shiny", () => {
  assert.deepEqual(megaForm(6), { form: "0001", shiny: true, kind: "X" }); // Charizard: Mega X walks, Y doesn't
  assert.deepEqual(megaForm(150), { form: "0002", shiny: true, kind: "Y" }); // Mewtwo: only Mega Y walks
  assert.equal(megaForm(80).form, "0002"); // Slowbro: Mega, not Mega_Altcolor
  assert.equal(megaForm(25), null);
});

import { formsOf, fullName, searchEntries, hasForm, regionOf, REGIONS } from "../mods/pokemon-herd/dex.js";
test("regional forms", () => {
  assert.deepEqual(formsOf(37), [{ form: "0001", label: "Alola", shiny: true }]);
  assert.deepEqual(formsOf(25).map((f) => f.label), ["Libre", "Cosplay"]); // its own Pokémon in PokeAPI
  assert.ok(!formsOf(77).some((f) => f.label.includes("Alternate"))); // fan variants left out
  assert.equal(formsOf(128).length, 3); // Paldean Tauros: Combat, Blaze, Aqua
  assert.equal(fullName(37, "0001"), "Vulpix (Alola)");
  assert.equal(fullName(37), "Vulpix");
  assert.ok(hasForm(37, "0001") && !hasForm(37, "0009") && !hasForm(25, "0001")); // (Pikachu's caps: not forms)
  assert.equal(hasShiny(52, "0002"), false); // Galarian Meowth: no shiny sprite
  assert.equal(hasShiny(52), true);
});

test("searchEntries: species and their forms, by name, number or region", () => {
  const vulpix = searchEntries("vulpix", 99).entries;
  assert.deepEqual(vulpix.map((e) => e.form ?? null), [null, "0001"]); // species first, then its form
  assert.ok(searchEntries("alola", 999).entries.some((e) => e.dex === 37 && e.form === "0001"));
  assert.deepEqual(searchEntries("#037", 99).entries.map((e) => e.form ?? null), [null, "0001"]);
  const all = searchEntries("", Infinity);
  assert.equal(all.total, WALKABLE.length + all.entries.filter((e) => e.form).length);
});

test("regionOf: by dex number, or a form's own region", () => {
  assert.equal(regionOf({ dex: 25 }), "Kanto");
  assert.equal(regionOf({ dex: 152 }), "Johto");
  assert.equal(regionOf({ dex: 493 }), "Sinnoh");
  assert.equal(regionOf({ dex: 899 }), "Hisui");
  assert.equal(regionOf({ dex: 906 }), "Paldea");
  assert.equal(regionOf({ dex: 37, form: "0001" }), "Alola");
  for (const e of searchEntries("", Infinity).entries) assert.ok(REGIONS.includes(regionOf(e)), JSON.stringify(e));
});

test("searchEntries filters by region and by Mega", () => {
  const kanto = searchEntries("", Infinity, { region: "Kanto" }).entries;
  // Kanto: its species, and their forms that aren't another region's (Pikachu Libre…).
  assert.ok(kanto.length > 100 && kanto.every((e) => e.dex <= 151 && (!e.form || regionOf(e) === "Kanto")));
  const alola = searchEntries("vulpix", 99, { region: "Alola" }).entries;
  assert.deepEqual(alola, [{ dex: 37, form: "0001" }]);
  const megas = searchEntries("", Infinity, { mega: true }).entries;
  assert.ok(megas.some((e) => e.dex === 6) && megas.every((e) => !e.form && megaForm(e.dex)));
  assert.deepEqual(searchEntries("pikachu", 9, { mega: true }).entries, []);
  // Both together: Kanto Megas only.
  assert.ok(searchEntries("", Infinity, { region: "Kanto", mega: true }).entries.every((e) => e.dex <= 151));
});

import { evolutionsOf, chainOf } from "../mods/pokemon-herd/dex.js";
test("evolutions: next stages and the whole line", () => {
  assert.deepEqual(evolutionsOf(4), [5]);
  assert.deepEqual(evolutionsOf(6), []);
  assert.ok(evolutionsOf(133).length >= 5 && evolutionsOf(133).includes(134)); // Eevee branches
  assert.deepEqual(chainOf(5), [[4], [5], [6]]); // from anywhere in the line
  assert.deepEqual(chainOf(133)[0], [133]);
  assert.deepEqual(chainOf(132), [[132]]); // Ditto: alone
});

test("searchEntries: only the favourites", () => {
  const keys = new Set(["25", "37-0001"]);
  assert.deepEqual(searchEntries("", Infinity, { keys }).entries, [{ dex: 25 }, { dex: 37, form: "0001" }]);
  assert.deepEqual(searchEntries("vulpix", 9, { keys }).entries, [{ dex: 37, form: "0001" }]);
});

test("Rotom's appliance forms: their own types, its species' region, named", async () => {
  const { formsOf, fullName, regionOf } = await import("../mods/pokemon-herd/dex.js");
  const { typesOf, fighterKey } = await import("../mods/pokemon-herd/trainer.js");
  assert.deepEqual(formsOf(479).map((f) => f.label), ["Heat", "Wash", "Frost", "Fan", "Mow"]);
  assert.equal(regionOf({ dex: 479, form: "0001" }), "Sinnoh");
  assert.match(fullName(479, "0001"), /Rotom.*Heat/);
  assert.deepEqual(typesOf(fighterKey(479, { form: "0002" })), ["electric", "water"]);
});

test("searchEntries by type: one, or two together (as it fights: a form's own types)", async () => {
  const { typesOf, fighterKey } = await import("../mods/pokemon-herd/trainer.js");
  const typesOfE = (e) => typesOf(fighterKey(e.dex, e.form ? { form: e.form } : {}));
  const fireFly = searchEntries("", Infinity, { types: ["fire", "flying"], typesOf: typesOfE }).entries;
  assert.ok(fireFly.some((e) => e.dex === 6) && fireFly.every((e) => ["fire", "flying"].every((t) => typesOfE(e).includes(t))));
  const water = searchEntries("rotom", 9, { types: ["water"], typesOf: typesOfE }).entries;
  assert.deepEqual(water, [{ dex: 479, form: "0002" }]); // Rotom Wash
});

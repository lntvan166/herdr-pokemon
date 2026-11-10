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

import { formsOf, fullName, searchEntries, hasForm } from "../mods/pokemon-herd/dex.js";
test("regional forms", () => {
  assert.deepEqual(formsOf(37), [{ form: "0001", label: "Alola", shiny: true }]);
  assert.deepEqual(formsOf(25), []);
  assert.ok(!formsOf(77).some((f) => f.label.includes("Alternate"))); // fan variants left out
  assert.equal(formsOf(128).length, 3); // Paldean Tauros: Combat, Blaze, Aqua
  assert.equal(fullName(37, "0001"), "Vulpix (Alola)");
  assert.equal(fullName(37), "Vulpix");
  assert.ok(hasForm(37, "0001") && !hasForm(37, "0009") && !hasForm(25, "0001"));
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

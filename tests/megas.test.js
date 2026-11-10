import { test } from "node:test";
import assert from "node:assert/strict";
import { megasFrom, isStale, DAY_MS } from "../mods/pokemon-herd/megas.js";
import { megaForm, setMegas } from "../mods/pokemon-herd/dex.js";

const walk = { Walk: "x" };
const tracker = {
  "0000": { name: "Missingno", sprite_files: walk, subgroups: {} },
  "0009": { name: "Blastoise", sprite_files: walk, subgroups: {
    "0000": { name: "", sprite_files: {}, subgroups: {} },
    "0001": { name: "Mega", sprite_files: walk, subgroups: { "0001": { name: "Shiny", sprite_files: walk } } },
  } },
  "0006": { name: "Charizard", sprite_files: walk, subgroups: {
    "0001": { name: "Mega_X", sprite_files: walk, subgroups: {} },
    "0002": { name: "Mega_Y", sprite_files: {}, subgroups: {} },
  } },
  "0003": { name: "Venusaur", sprite_files: walk, subgroups: { "0001": { name: "Mega", sprite_files: {}, subgroups: {} } } },
  "0150": { name: "Mewtwo", sprite_files: {}, subgroups: { "0001": { name: "Mega_Y", sprite_files: walk, subgroups: {} } } },
};

test("megasFrom: the first Mega that walks, with its shiny; none for a species that can't walk", () => {
  assert.deepEqual(megasFrom(tracker), { 9: ["0001", 1], 6: ["0001", 0] });
});

test("megasFrom: a broken tracker gives nothing", () => {
  assert.deepEqual(megasFrom(null), {});
  assert.deepEqual(megasFrom({ "0009": { subgroups: null } }), {});
});

test("isStale: fetched over a day ago, or never", () => {
  assert.equal(isStale(undefined, 1e12), true);
  assert.equal(isStale(1e12 - DAY_MS - 1, 1e12), true);
  assert.equal(isStale(1e12 - 1000, 1e12), false);
});

test("setMegas adds newly drawn Megas to the built-in ones, never removes them", () => {
  assert.equal(megaForm(9999), null);
  setMegas({ 9999: ["0001", 1] });
  assert.deepEqual(megaForm(9999), { form: "0001", shiny: true });
  setMegas({});
  assert.equal(megaForm(9999), null); // replaced, not piled up
  assert.ok(megaForm(6)); // the built-in list stays
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { megasFrom, isStale, DAY_MS } from "../mods/pokemon-herd/megas.js";
import { megaForm, megaForms, setMegas } from "../mods/pokemon-herd/dex.js";

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
  "0026": { name: "Raichu", sprite_files: walk, subgroups: {
    "0002": { name: "Mega_Y", sprite_files: walk, subgroups: { "0001": { name: "Shiny", sprite_files: walk } } },
    "0001": { name: "Mega_X", sprite_files: walk, subgroups: {} },
    "0003": { name: "Mega_Altcolor", sprite_files: walk, subgroups: {} },
  } },
  "0003": { name: "Venusaur", sprite_files: walk, subgroups: { "0001": { name: "Mega", sprite_files: {}, subgroups: {} } } },
  "0150": { name: "Mewtwo", sprite_files: {}, subgroups: { "0001": { name: "Mega_Y", sprite_files: walk, subgroups: {} } } },
};

test("megasFrom: every Mega that walks, X before Y, with its shiny; none for a species that can't walk", () => {
  assert.deepEqual(megasFrom(tracker), {
    9: [["0001", 1, ""]],
    6: [["0001", 0, "X"]],
    26: [["0001", 0, "X"], ["0002", 1, "Y"]],
  });
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
  setMegas({ 9999: [["0001", 1, ""]] });
  assert.deepEqual(megaForm(9999), { form: "0001", shiny: true, kind: "" });
  setMegas({});
  assert.equal(megaForm(9999), null); // replaced, not piled up
  assert.ok(megaForm(6)); // the built-in list stays
});

test("megaForm picks X or Y when both are drawn, else the one there is", () => {
  setMegas({ 9998: [["0001", 1, "X"], ["0002", 0, "Y"]] });
  assert.equal(megaForms(9998).length, 2);
  assert.equal(megaForm(9998).kind, "X"); // X by default
  assert.deepEqual(megaForm(9998, "Y"), { form: "0002", shiny: false, kind: "Y" });
  assert.equal(megaForm(6, "Y").kind, "X"); // Charizard: only X is drawn so far
  assert.deepEqual(megaForms(1), []);
  setMegas({});
});

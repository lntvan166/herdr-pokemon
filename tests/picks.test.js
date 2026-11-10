import { test } from "node:test";
import assert from "node:assert/strict";
import { loadPicks, assign, hash } from "../mods/pokemon-herd/picks.js";
import { hasShiny, isWalkable } from "../mods/pokemon-herd/dex.js";

test("loadPicks tolerates junk", () => {
  for (const junk of [null, undefined, 5, "x", { panes: 3 }, { panes: { p: { dex: "x" } } }, { panes: { p: null } }]) {
    assert.deepEqual(loadPicks(junk, null), { panes: {}, migrated: false });
  }
});

test("loadPicks migrates legacy", () => {
  assert.deepEqual(loadPicks(null, { panes: { p1: 25, p2: 514 } }), { panes: { p1: { dex: 25, shiny: false, mega: "auto" } }, migrated: true });
});

test("loadPicks prefers current", () => {
  const r = loadPicks({ v: 2, panes: { p1: { dex: 4, shiny: true } } }, { panes: { p1: 25 } });
  assert.deepEqual(r, { panes: { p1: { dex: 4, shiny: true, mega: "auto" } }, migrated: false });
});

test("assign keeps saved picks", () => {
  const { ids, fresh } = assign([{ address: "t1", pane: "p1" }], { p1: { dex: 7, shiny: true } });
  assert.deepEqual(ids.t1, { dex: 7, shiny: true });
  assert.deepEqual(fresh, {});
});

test("assign gives unique dex on screen", () => {
  // Saved picks take the slots fresh ones would hash to: they still all differ.
  const list = Array.from({ length: 30 }, (_, i) => ({ address: `t${i}`, pane: `p${i}` }));
  const first = assign(list, {}).ids;
  const saved = { p0: first.t1 }; // t0 is saved as what t1 would get
  const { ids } = assign(list, saved);
  const dexes = Object.values(ids).map((p) => p.dex);
  assert.equal(new Set(dexes).size, dexes.length);
});

test("assign is stable for paneless agents", () => {
  const list = [{ address: "t9", pane: "" }];
  const a = assign(list, {});
  const b = assign(list, {});
  assert.deepEqual(a.ids, b.ids);
  assert.deepEqual(a.fresh, {});
  assert.ok(isWalkable(a.ids.t9.dex));
});

test("shiny rate", () => {
  let shiny = 0;
  for (let i = 0; i < 6400; i++) {
    const { ids } = assign([{ address: `t${i}`, pane: `pane-${i}` }], {});
    const p = ids[`t${i}`];
    if (p.shiny) { shiny++; assert.ok(hasShiny(p.dex)); }
  }
  assert.ok(shiny >= 60 && shiny <= 140, `shiny count ${shiny}`);
});

test("hash is FNV-1a", () => {
  assert.equal(hash(""), 2166136261);
});

test("a paneless agent keeps its Pokémon when a pane later gets the same one", () => {
  const memo = {};
  const first = assign([{ address: "t9", pane: "" }], {}, memo).ids.t9;
  const later = assign([{ address: "t1", pane: "p1" }, { address: "t9", pane: "" }], { p1: { dex: first.dex, shiny: false } }, memo).ids.t9;
  assert.deepEqual(later, first);
});

test("mega mode: kept when valid, Auto when missing or junk", () => {
  const r = loadPicks({ v: 2, panes: { a: { dex: 6, shiny: false, mega: "on" }, b: { dex: 6, shiny: false }, c: { dex: 6, shiny: false, mega: "x" } } }, null);
  assert.equal(r.panes.a.mega, "on");
  assert.equal(r.panes.b.mega, "auto");
  assert.equal(r.panes.c.mega, "auto");
  assert.equal(assign([{ address: "t1", pane: "p1" }], {}).ids.t1.mega, "auto");
});

test("a regional form is kept when it exists, dropped (species kept) when not", () => {
  const r = loadPicks({ v: 2, panes: { a: { dex: 37, form: "0001" }, b: { dex: 37, form: "0009" } } }, null);
  assert.equal(r.panes.a.form, "0001");
  assert.equal(r.panes.b.dex, 37);
  assert.equal(r.panes.b.form, undefined);
});

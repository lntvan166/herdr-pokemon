import { test } from "node:test";
import assert from "node:assert/strict";
import { loadPicks, assign, hash, randomEntry } from "../mods/pokemon-herd/picks.js";
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

test("Mega X or Y: kept when it's X or Y, dropped otherwise", () => {
  const r = loadPicks({ v: 2, panes: { a: { dex: 6, shiny: false, megaKind: "Y" }, b: { dex: 6, shiny: false, megaKind: "Z" }, c: { dex: 6, shiny: false } } }, null);
  assert.equal(r.panes.a.megaKind, "Y");
  assert.equal("megaKind" in r.panes.b, false);
  assert.equal("megaKind" in r.panes.c, false);
});

test("randomEntry skips the current one and Pokémon others have", () => {
  const entries = [{ dex: 1 }, { dex: 4 }, { dex: 7 }, { dex: 25 }];
  for (let i = 0; i < 20; i++) {
    const r = randomEntry(entries, { dex: 1 }, new Set([4, 7]), Math.random);
    assert.deepEqual(r, { dex: 25 });
  }
});

test("randomEntry falls back when everything is taken", () => {
  const entries = [{ dex: 1 }, { dex: 4 }];
  assert.deepEqual(randomEntry(entries, { dex: 1 }, new Set([4]), () => 0), { dex: 4 });
  assert.deepEqual(randomEntry([{ dex: 1 }], { dex: 1 }, new Set(), () => 0), null);
  assert.equal(randomEntry([], null, new Set(), () => 0), null);
});

test("randomEntry tells regional forms apart from the current one", () => {
  const entries = [{ dex: 26 }, { dex: 26, form: 1 }];
  assert.deepEqual(randomEntry(entries, { dex: 26 }, new Set(), () => 0.99), { dex: 26, form: 1 });
});

import { EVOLVE_JOBS, gainJob } from "../mods/pokemon-herd/picks.js";
test("loadPicks keeps jobs and Everstone", () => {
  const r = loadPicks({ panes: { p: { dex: 4, jobs: 3, stay: true }, q: { dex: 4, jobs: -1, stay: "x" } } }, null);
  assert.equal(r.panes.p.jobs, 3);
  assert.equal(r.panes.p.stay, true);
  assert.equal(r.panes.q.jobs, undefined);
  assert.equal(r.panes.q.stay, undefined);
});

test("gainJob counts, then evolves at EVOLVE_JOBS", () => {
  let p = { dex: 4, shiny: true, mega: "on" };
  for (let i = 1; i < EVOLVE_JOBS; i++) {
    const r = gainJob(p, "pane");
    assert.equal(r.evolved, false);
    p = r.pick;
    assert.equal(p.jobs, i);
  }
  const r = gainJob(p, "pane");
  assert.equal(r.evolved, true);
  assert.deepEqual(r.pick, { dex: 5, shiny: true, mega: "on", jobs: 0 });
});

test("gainJob: Everstone and final stages keep counting without evolving", () => {
  const stay = gainJob({ dex: 4, shiny: false, mega: "auto", stay: true, jobs: EVOLVE_JOBS }, "p");
  assert.equal(stay.evolved, false);
  assert.equal(stay.pick.dex, 4);
  const last = gainJob({ dex: 6, shiny: false, mega: "auto", jobs: EVOLVE_JOBS }, "p");
  assert.equal(last.evolved, false);
  assert.equal(last.pick.dex, 6);
});

test("gainJob: branches pick one per pane, regional forms stay regional when they can", () => {
  const a = gainJob({ dex: 133, shiny: false, mega: "auto", jobs: EVOLVE_JOBS - 1 }, "pane-a").pick.dex;
  assert.ok([134, 135, 136, 196, 197, 470, 471, 700].includes(a));
  assert.equal(gainJob({ dex: 133, shiny: false, mega: "auto", jobs: EVOLVE_JOBS - 1 }, "pane-a").pick.dex, a); // same pane: same
  const vulpix = gainJob({ dex: 37, form: "0001", shiny: false, mega: "auto", jobs: EVOLVE_JOBS - 1 }, "p").pick;
  assert.equal(vulpix.dex, 38);
  assert.equal(vulpix.form, "0001"); // Alolan Ninetales
  const megaKind = gainJob({ dex: 5, shiny: false, mega: "auto", megaKind: "Y", jobs: EVOLVE_JOBS - 1 }, "p").pick;
  assert.equal(megaKind.megaKind, "Y"); // Charmeleon -> Charizard keeps its Y
});

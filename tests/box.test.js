import test from "node:test";
import assert from "node:assert/strict";
import { releasePay, releasable, sortBox, duplicates, SORTS, RELEASE_PAY } from "../mods/pokemon-herd/box.js";
import { loadPicks } from "../mods/pokemon-herd/picks.js";

const e = (slot, pick, tag) => ({ slot, pick: { mega: "auto", shiny: false, ...pick }, ...(tag ? { tag } : {}) });

test("releasing pays a little: more for a shiny or an Alpha, most for a legendary", () => {
  assert.equal(releasePay({ dex: 16 }), RELEASE_PAY.base);
  assert.equal(releasePay({ dex: 16, shiny: true }), RELEASE_PAY.rare);
  assert.equal(releasePay({ dex: 16, alpha: true }), RELEASE_PAY.rare);
  assert.equal(releasePay({ dex: 150 }), RELEASE_PAY.legend);
  assert.ok(RELEASE_PAY.base < 30); // under a Poké Ball's ₽30: no profit in catch-and-release
});

test("one with an agent or locked is never released", () => {
  assert.equal(releasable(e("box-1-16", { dex: 16 })), true);
  assert.equal(releasable(e("p1", { dex: 16 }, "api")), false);
  assert.equal(releasable(e("box-1-16", { dex: 16, locked: true })), false);
});

test("the Box sorts by newest, number, name, hearts", () => {
  const list = [e("box-100-25", { dex: 25 }), e("box-300-1", { dex: 1, friend: 40 }), e("box-200-150", { dex: 150, nick: "Zed" })];
  const slots = (how) => sortBox(list, how).map((x) => x.slot);
  assert.deepEqual(slots("new"), ["box-300-1", "box-200-150", "box-100-25"]);
  assert.deepEqual(slots("dex"), ["box-300-1", "box-100-25", "box-200-150"]);
  assert.deepEqual(slots("name"), ["box-300-1", "box-100-25", "box-200-150"]); // Bulbasaur, Pikachu, Zed
  assert.equal(slots("hearts")[0], "box-300-1");
  assert.deepEqual(SORTS.map(([k]) => k), ["new", "dex", "name", "hearts"]);
  assert.notEqual(sortBox(list, "dex"), list); // a copy
});

test("duplicates: all but the best of each species, never a rare one or a kept one", () => {
  const list = [
    e("box-1-16", { dex: 16 }), e("box-2-16", { dex: 16, friend: 30 }), e("box-3-16", { dex: 16 }),
    e("box-4-25", { dex: 25 }), e("box-5-25", { dex: 25, shiny: true }), e("box-6-25", { dex: 25, alpha: true, caught: 6 }),
    e("p1", { dex: 19 }, "api"), e("box-7-19", { dex: 19 }), e("box-8-19", { dex: 19, locked: true }),
    e("box-9-150", { dex: 150 }), e("box-10-150", { dex: 150 }),
    e("box-11-37", { dex: 37 }), e("box-12-37", { dex: 37, form: "0001" }), // a form is its own
  ];
  const d = duplicates(list).sort();
  assert.deepEqual(d, ["box-1-16", "box-3-16", "box-4-25", "box-7-19"].sort());
});

test("a lock is kept when the Box is read back", () => {
  const { panes } = loadPicks({ v: 2, panes: { "box-1-16": { dex: 16, shiny: false, mega: "auto", locked: true }, "box-2-16": { dex: 16, locked: "yes" } } });
  assert.equal(panes["box-1-16"].locked, true);
  assert.equal(panes["box-2-16"].locked, undefined);
});

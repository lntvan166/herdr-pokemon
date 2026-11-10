import { test } from "node:test";
import assert from "node:assert/strict";
import { wrapRow, exitX, entryX } from "../mods/pokemon-herd/wrap.js";

test("walking off the right edge continues on the next row; the last wraps to the first", () => {
  assert.equal(wrapRow(0, "r", 2), 1);
  assert.equal(wrapRow(1, "r", 2), 0);
  assert.equal(wrapRow(2, "r", 3), 0);
});

test("walking off the left edge continues on the row above; the first wraps to the last", () => {
  assert.equal(wrapRow(1, "l", 2), 0);
  assert.equal(wrapRow(0, "l", 2), 1);
  assert.equal(wrapRow(0, "l", 3), 2);
});

test("it leaves past one edge and comes in from the other, off-screen", () => {
  assert.equal(exitX("r", 243, 40), 283);
  assert.equal(entryX("r", 243, 40), -40);
  assert.equal(exitX("l", 243, 40), -40);
  assert.equal(entryX("l", 243, 40), 283);
});

import { wrapOk, clearWalk } from "../mods/pokemon-herd/wrap.js";

test("no wrapping onto a row that already has its fair share", () => {
  assert.equal(wrapOk([3, 3], 1, 6, 2), false); // 4 would be more than 6/2
  assert.equal(wrapOk([4, 2], 1, 6, 2), true);
  assert.equal(wrapOk([4, 3], 1, 7, 2), true); // fair share of 7 on 2 rows is 4
});

test("clearWalk ends a walk and drops every walk flag", () => {
  const m = { moving: true, wrap: true, shuffle: true, entering: true };
  clearWalk(m);
  assert.deepEqual(m, { moving: false, wrap: false, shuffle: false, entering: false });
});

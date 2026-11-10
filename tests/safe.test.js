import { test } from "node:test";
import assert from "node:assert/strict";
import { forEachSafe } from "../mods/pokemon-herd/safe.js";

test("runs all items when one throws", () => {
  const seenItems = [];
  const fails = forEachSafe([1, 2, 3], (n) => { seenItems.push(n); if (n === 2) throw new Error("boom"); }, () => {}, 0, new Map());
  assert.deepEqual(seenItems, [1, 2, 3]);
  assert.equal(fails, 1);
});

test("logs once per minute", () => {
  const logs = [];
  const seen = new Map();
  const bad = () => { throw new Error("boom"); };
  forEachSafe([1], bad, (m) => logs.push(m), 0, seen);
  forEachSafe([1], bad, (m) => logs.push(m), 30000, seen);
  assert.equal(logs.length, 1);
  assert.match(logs[0], /^pokemon-herd: .*boom/);
  forEachSafe([1], bad, (m) => logs.push(m), 61000, seen);
  assert.equal(logs.length, 2);
});

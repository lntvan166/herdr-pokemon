import { test } from "node:test";
import assert from "node:assert/strict";
import { layoutTags } from "../mods/pokemon-herd/tags.js";

const text = (n) => "x".repeat(n);
const tag = (id, cx, chars, rank = 4) => ({ id, cx, text: text(chars), rank });

// Tags on a line never overlap (6 px gap), stay inside [0, width], and sit under their Pokémon:
// centred on it, or at least covering its x when pushed in from an edge.
function sane(items, map, width) {
  const byLine = {};
  for (const t of map.values()) (byLine[t.line] ??= []).push(t);
  for (const line of Object.values(byLine)) {
    line.sort((a, b) => a.left - b.left);
    for (let i = 1; i < line.length; i++) assert.ok(line[i].left >= line[i - 1].left + line[i - 1].w + 6 - 1e-9, "overlap");
  }
  for (const it of items) {
    const t = map.get(it.id);
    assert.ok(t, `${it.id} hidden`);
    assert.ok(t.left >= -1e-9 && t.left + t.w <= width + 1e-9, `outside: ${JSON.stringify(t)}`);
    const cx = Math.min(Math.max(it.cx, 0), width);
    assert.ok(t.left <= cx + 1e-9 && cx <= t.left + t.w + 1e-9, `${it.id} not under its Pokémon`);
    const centred = Math.abs(t.left + t.w / 2 - it.cx) < 1e-9;
    const atEdge = t.left < 1e-9 || t.left + t.w > width - 1e-9;
    assert.ok(centred || atEdge, `${it.id} slid sideways: ${JSON.stringify(t)}`);
  }
}

test("far apart: full width, centred, one line", () => {
  const items = [tag("a", 50, 10), tag("b", 300, 10)];
  const m = layoutTags(items, 360);
  assert.deepEqual(m.get("a"), { left: 11, w: 78, line: 0 });
  assert.deepEqual(m.get("b"), { left: 261, w: 78, line: 0 });
  sane(items, m, 360);
});

test("same spot: the less important one drops a line, still centred", () => {
  const items = [tag("a", 180, 10, 0), tag("b", 180, 10, 4)];
  const m = layoutTags(items, 360);
  assert.deepEqual(m.get("a"), { left: 141, w: 78, line: 0 });
  assert.deepEqual(m.get("b"), { left: 141, w: 78, line: 1 });
});

test("neighbours squeeze a tag, never below the minimum", () => {
  // b sits between a and c: it shrinks to fit the gap, centred.
  const items = [tag("a", 30, 4, 0), tag("c", 170, 4, 1), tag("b", 100, 20, 2)]; // b's share: 68..132
  const m = layoutTags(items, 243);
  const b = m.get("b");
  assert.equal(b.line, 0);
  assert.equal(b.w, 64);
  sane(items, m, 243);
});

test("real sidebar: 4 agents on a 243 px row", () => {
  const items = [tag("api", 30, 5, 4), tag("refactor", 95, 13, 4), tag("ui", 105, 4, 3), tag("tests", 150, 7, 4)];
  sane(items, layoutTags(items, 243), 243);
});

test("crowded: everyone at one spot stacks, nobody hidden", () => {
  const items = Array.from({ length: 8 }, (_, i) => tag(`a${i}`, 180, 20, i));
  const m = layoutTags(items, 360);
  for (let i = 0; i < 8; i++) assert.equal(m.get(`a${i}`).line, i);
  sane(items, m, 360);
});

test("edge: pushed in, still under its Pokémon", () => {
  const items = [tag("a", 5, 10, 0)];
  const m = layoutTags(items, 360);
  assert.equal(m.get("a").left, 0);
  sane(items, m, 360);
});

test("long names are capped", () => {
  assert.equal(layoutTags([tag("a", 180, 100, 0)], 360).get("a").w, 200);
});

test("strip narrower than a tag", () => {
  const m = layoutTags([tag("a", 20, 10, 0)], 40);
  assert.deepEqual(m.get("a"), { left: 0, w: 40, line: 0 });
});

test("a walking Pokémon's tag avoids every tag along its way", () => {
  // b stands at 120; a walks from 40 to 200 past it: a's tag must not share b's line.
  const items = [{ id: "b", cx: 120, text: text(6), rank: 3 }, { id: "a", cx: 200, from: 40, text: text(6), rank: 4 }];
  const m = layoutTags(items, 243);
  assert.equal(m.get("b").line, 0);
  assert.equal(m.get("a").line, 1);
  assert.equal(m.get("a").left + m.get("a").w / 2, 200); // laid out where it's headed
});

test("a walk that crosses nobody stays on line 0", () => {
  const items = [{ id: "b", cx: 30, text: text(4), rank: 3 }, { id: "a", cx: 200, from: 120, text: text(4), rank: 4 }];
  assert.equal(layoutTags(items, 243).get("a").line, 0);
});

test("a walking tag never bumps a standing one, whatever its rank", () => {
  // a (rank 0, focused) walks past b (rank 4) standing at 120: b keeps line 0.
  const items = [{ id: "b", cx: 120, text: text(6), rank: 4 }, { id: "a", cx: 200, from: 40, text: text(6), rank: 0 }];
  const m = layoutTags(items, 243);
  assert.equal(m.get("b").line, 0);
  assert.equal(m.get("a").line, 1);
});

test("a Pokémon that just stopped doesn't bump one that was already standing there", () => {
  const items = [{ id: "b", cx: 120, text: text(6), rank: 4, settled: true }, { id: "a", cx: 130, text: text(6), rank: 0 }];
  const m = layoutTags(items, 243);
  assert.equal(m.get("b").line, 0);
  assert.equal(m.get("a").line, 1);
});

test("maxLines: crowded tags squeeze further instead of opening more lines", () => {
  const items = Array.from({ length: 8 }, (_, i) => tag(`a${i}`, 120, 12, i));
  const m = layoutTags(items, 243, { maxLines: 2 });
  assert.equal(m.size, 8);
  for (const t of m.values()) {
    assert.ok(t.line < 2, JSON.stringify(t));
    assert.ok(t.left >= -1e-9 && t.left + t.w <= 243 + 1e-9);
  }
});

test("maxLines: the sidebar's 4 a row fit on 2 lines, squeezed but readable", () => {
  const items = [tag("api", 30, 5, 4), tag("refactor", 95, 13, 4), tag("ui", 105, 4, 3), tag("tests", 150, 7, 4)];
  const m = layoutTags(items, 243, { maxLines: 2 });
  for (const t of m.values()) { assert.ok(t.line < 2); assert.ok(t.w >= 24, JSON.stringify(t)); }
  sane(items, m, 243);
});

test("settled order is by how long they've stood, so lines don't swap a render later", () => {
  // A has stood since t=0; B arrived at t=100 with a better rank. Every render, A keeps line 0.
  const items = [{ id: "A", cx: 100, text: text(10), rank: 4, settled: true, since: 0 }, { id: "B", cx: 110, text: text(10), rank: 3, settled: true, since: 100 }];
  const m = layoutTags(items, 243, { maxLines: 2 });
  assert.equal(m.get("A").line, 0);
  assert.equal(m.get("B").line, 1);
});

test("a long name next door doesn't swallow a short one (api → a…)", () => {
  // "refactor auth" has stood longer, right beside "api"; "api" still gets room for its name.
  const items = [
    { id: "refactor", cx: 90, text: "refactor auth", rank: 4, settled: true, since: 0 },
    { id: "api", cx: 30, text: "api", rank: 4, settled: true, since: 50 },
  ];
  const m = layoutTags(items, 243, { maxLines: 2 });
  assert.ok(m.get("api").w >= 48, JSON.stringify(m.get("api")));
  assert.equal(m.get("api").line, 0);
  sane(items, m, 243);
});

test("a tag with something beside its text (an Alpha's α) is that much wider", () => {
  const plain = layoutTags([{ id: "a", cx: 200, text: "worklog", rank: 1 }], 400).get("a");
  const alpha = layoutTags([{ id: "a", cx: 200, text: "worklog", rank: 1, extra: 16 }], 400).get("a");
  assert.equal(alpha.w, plain.w + 16);
});

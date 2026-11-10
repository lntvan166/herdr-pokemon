import { test } from "node:test";
import assert from "node:assert/strict";
import { placesIn, placeOf, placeBlock, rowsOf } from "../mods/pokemon-herd/place.js";

const block = { id: "pokemon-herd", type: "block", content: { mod: "pokemon-herd", props: { scale: 0.75, rows: 2 } }, size: { px: 180 } };
const tree = () => ({
  id: "root", type: "row", theme: "graphite",
  children: [
    { id: "sidebar", type: "column", children: [
      { id: "sidebar-lists", type: "column", children: [
        { id: "spaces", type: "block", content: { mod: "better-sidebar" } },
        structuredClone(block),
        { id: "needs-you", type: "block", content: { mod: "needs-you" } },
      ] },
    ] },
    { id: "work", type: "column", children: [
      { id: "work-body", type: "row", children: [
        { id: "main", type: "block" },
        { id: "panel", type: "column", children: [{ id: "panel-body", type: "stack", children: [] }] },
      ] },
      { id: "status-row", type: "row", children: [] },
    ] },
  ],
});
const find = (n, id, parent = null) => (n.id === id ? { n, parent } : (n.children ?? []).reduce((r, c) => r ?? find(c, id, n), null));

test("places this layout offers", () => {
  assert.deepEqual(placesIn(tree()), ["sidebar", "bottom", "panel"]);
  assert.deepEqual(placesIn({ id: "root", type: "row", children: [{ id: "work", type: "column", children: [] }] }), ["bottom"]);
  assert.deepEqual(placesIn(null), []);
});

test("where it is now, and how many rows", () => {
  assert.equal(placeOf(tree(), "pokemon-herd"), "sidebar");
  assert.equal(rowsOf(tree(), "pokemon-herd"), 2);
  assert.equal(placeOf({ id: "root", children: [] }, "pokemon-herd"), null);
});

test("move to the bottom: above the status bar, rows and height set, the old spot emptied", () => {
  const before = tree();
  const out = placeBlock(before, "pokemon-herd", "bottom", 1, 112);
  const { n, parent } = find(out, "pokemon-herd");
  assert.equal(parent.id, "work");
  assert.deepEqual(parent.children.map((c) => c.id), ["work-body", "pokemon-herd", "status-row"]);
  assert.equal(n.content.props.rows, 1);
  assert.equal(n.content.props.scale, 0.75); // its other props kept
  assert.deepEqual(n.size, { px: 112 });
  assert.deepEqual(find(out, "sidebar-lists").n.children.map((c) => c.id), ["spaces", "needs-you"]);
  assert.equal(out.theme, "graphite"); // the rest of the layout untouched
  assert.equal(placeOf(before, "pokemon-herd"), "sidebar"); // input not mutated
});

test("sidebar: between the lists and needs-you; panel: under the panel's body", () => {
  const side = placeBlock(placeBlock(tree(), "pokemon-herd", "panel", 3, 300), "pokemon-herd", "sidebar", 2, 200);
  assert.deepEqual(find(side, "sidebar-lists").n.children.map((c) => c.id), ["spaces", "pokemon-herd", "needs-you"]);
  const panel = placeBlock(tree(), "pokemon-herd", "panel", 3, 300);
  assert.deepEqual(find(panel, "panel").n.children.map((c) => c.id), ["panel-body", "pokemon-herd"]);
});

test("same place, new rows: stays where it is", () => {
  const out = placeBlock(tree(), "pokemon-herd", "sidebar", 3, 270);
  assert.deepEqual(find(out, "sidebar-lists").n.children.map((c) => c.id), ["spaces", "pokemon-herd", "needs-you"]);
  assert.equal(find(out, "pokemon-herd").n.content.props.rows, 3);
});

test("not in this layout yet: added at the place with default props", () => {
  const t = tree();
  t.children[0].children[0].children.splice(1, 1);
  const out = placeBlock(t, "pokemon-herd", "bottom", 1, 112);
  const { n } = find(out, "pokemon-herd");
  assert.equal(n.type, "block");
  assert.deepEqual(n.content, { mod: "pokemon-herd", props: { rows: 1 } });
});

test("a place this layout lacks: null", () => {
  assert.equal(placeBlock({ id: "root", type: "row", children: [] }, "pokemon-herd", "panel", 1, 100), null);
});

import { blockProps } from "../mods/pokemon-herd/place.js";
test("blockProps", () => {
  assert.deepEqual(blockProps(tree(), "pokemon-herd"), { scale: 0.75, rows: 2 });
  assert.deepEqual(blockProps({ id: "root" }, "pokemon-herd"), {});
});

import { hiddenAlong } from "../mods/pokemon-herd/place.js";
test("hiddenAlong: the hidden nodes to show so a place can be seen", () => {
  const t = tree();
  find(t, "panel").n.hidden = true;
  assert.deepEqual(hiddenAlong(t, "panel"), ["panel"]);
  assert.deepEqual(hiddenAlong(t, "sidebar"), []);
  find(t, "sidebar").n.hidden = true;
  assert.deepEqual(hiddenAlong(t, "sidebar"), ["sidebar"]);
  assert.deepEqual(hiddenAlong(t, "nowhere"), []);
});

import { setRows } from "../mods/pokemon-herd/place.js";
test("setRows: rows and height changed where it is, even outside the known places (auto-docked)", () => {
  const docked = { id: "root", type: "column", children: [
    { id: "old-root", type: "row", children: [] },
    { id: "pokemon-herd", type: "block", content: { mod: "pokemon-herd" }, size: { px: 112 } },
  ] };
  const out = setRows(docked, "pokemon-herd", 2, 216);
  const b = out.children[1];
  assert.deepEqual(b.content, { mod: "pokemon-herd", props: { rows: 2 } });
  assert.deepEqual(b.size, { px: 216 });
  assert.equal(out.children[0].id, "old-root"); // nothing moved
  assert.equal(docked.children[1].size.px, 112); // input not mutated
  assert.equal(setRows({ id: "root", children: [] }, "pokemon-herd", 2, 216), null);
});

import { setBlockProps } from "../mods/pokemon-herd/place.js";
test("setBlockProps: merges props where it is, size untouched", () => {
  const out = setBlockProps(tree(), "pokemon-herd", { background: "plain" });
  const { n } = find(out, "pokemon-herd");
  assert.deepEqual(n.content.props, { scale: 0.75, rows: 2, background: "plain" });
  assert.deepEqual(n.size, { px: 180 });
  assert.equal(setBlockProps({ id: "root", children: [] }, "pokemon-herd", { background: "plain" }), null);
});

// Where the strip sits in the shown layout, and moving it: the right-click menu's "Rows" and
// "Place" items. Pure: takes and returns layout trees (layouts/<name>.json), never edits one.

// The places, by the ids Herdr's own layouts use: the sidebar's lists column (above the
// needs-you block), the work column (above the status bar), the right panel (under its body).
const PLACES = {
  sidebar: { parent: "sidebar-lists", before: "needs-you" },
  bottom: { parent: "work", before: "status-row" },
  panel: { parent: "panel", after: "panel-body" },
};

function find(node, test, parent = null) {
  if (!node || typeof node !== "object") return null;
  if (test(node)) return { node, parent };
  for (const c of node.children ?? []) {
    const hit = find(c, test, node);
    if (hit) return hit;
  }
  return null;
}
const byId = (id) => (n) => n.id === id;
// The strip's block: this mod's block without a `view` (the Party panel is this mod too, with
// props { view: "party" }, and must never be taken for the strip).
const isMod = (mod) => (n) => n.type === "block" && n.content?.mod === mod && !n.content?.props?.view;

// The places this layout has, in menu order.
export const placesIn = (tree) => Object.keys(PLACES).filter((p) => find(tree, byId(PLACES[p].parent)));

// Which place the mod's block is in now (null: elsewhere, or not in this layout).
export function placeOf(tree, mod) {
  const hit = find(tree, isMod(mod));
  return Object.keys(PLACES).find((p) => hit?.parent?.id === PLACES[p].parent) ?? null;
}

// Its block's rows (1 when unset).
export const rowsOf = (tree, mod) => Math.max(1, Math.floor(Number(find(tree, isMod(mod))?.node.content?.props?.rows)) || 1);

// A copy of the tree with the mod's block at `place`, showing `rows` rows, `px` tall; its other
// props are kept. Null when the layout has no such place.
export function placeBlock(tree, mod, place, rows, px) {
  const spot = PLACES[place];
  const out = JSON.parse(JSON.stringify(tree));
  const target = spot && find(out, byId(spot.parent))?.node;
  if (!target) return null;
  const hit = find(out, isMod(mod));
  const block = hit ? hit.node : { id: mod, type: "block", content: { mod, props: {} } };
  if (hit) hit.parent.children = hit.parent.children.filter((c) => c !== block);
  block.content = { ...block.content, props: { ...(block.content.props ?? {}), rows } };
  block.size = { px };
  const kids = (target.children ??= []);
  const at = spot.before ? kids.findIndex((c) => c.id === spot.before) : kids.findIndex((c) => c.id === spot.after) + 1;
  kids.splice(at < 0 || (spot.after && at === 0) ? kids.length : at, 0, block);
  return out;
}

// Its block's props ({} when it isn't in this layout).
export const blockProps = (tree, mod) => find(tree, isMod(mod))?.node.content?.props ?? {};

// The hidden nodes between the root and a place (the place's column included): showing them
// makes the strip visible there. A closed right panel is the usual one.
export function hiddenAlong(tree, place) {
  const id = PLACES[place]?.parent;
  const path = [];
  const walk = (n) => {
    if (!n || typeof n !== "object") return false;
    path.push(n);
    if (n.id === id || (n.children ?? []).some(walk)) return true;
    path.pop();
    return false;
  };
  return id && walk(tree) ? path.filter((n) => n.hidden === true).map((n) => n.id) : [];
}

// A copy of the tree with the mod's block showing `rows` rows, `px` tall, wherever it is (also
// where Herdr docked it on first sight). Null when it isn't in this layout.
export function setRows(tree, mod, rows, px) {
  const out = setBlockProps(tree, mod, { rows });
  if (out) find(out, isMod(mod)).node.size = { px };
  return out;
}

// A copy of the tree with `patch` merged into the mod's block's props, wherever it is. Null when
// it isn't in this layout.
export function setBlockProps(tree, mod, patch) {
  const out = JSON.parse(JSON.stringify(tree));
  const hit = find(out, isMod(mod));
  if (!hit) return null;
  hit.node.content = { ...hit.node.content, props: { ...(hit.node.content.props ?? {}), ...patch } };
  return out;
}

// ---- the Party panel: a block of its own (id PARTY_ID, this mod with props { view: "party" }),
// in the sidebar's lists column (above needs-you, sharing the height with the list beside it) or
// in the right panel (under its body). Settings → Party panel.
export const PARTY_ID = "pokemon-party";
export const PARTY_PLACES = ["sidebar", "panel"];

// Where the Party panel is (null: not in this layout).
export function partyPlace(tree) {
  const hit = find(tree, byId(PARTY_ID));
  return PARTY_PLACES.find((p) => hit?.parent?.id === PLACES[p].parent) ?? (hit ? "elsewhere" : null);
}

// A copy of the tree with the Party panel at `place` ("sidebar" | "panel"), or taken out (null).
// Null when the layout has no such place.
export function placeParty(tree, mod, place) {
  const out = JSON.parse(JSON.stringify(tree));
  const hit = find(out, byId(PARTY_ID));
  if (hit) hit.parent.children = hit.parent.children.filter((c) => c !== hit.node);
  if (!place) return out;
  const spot = PLACES[place];
  const target = spot && find(out, byId(spot.parent))?.node;
  if (!target) return null;
  const block = { id: PARTY_ID, type: "block", content: { mod, props: { view: "party" } }, size: { weight: 1 } };
  const kids = (target.children ??= []);
  const at = spot.before ? kids.findIndex((c) => c.id === spot.before) : kids.findIndex((c) => c.id === spot.after) + 1;
  kids.splice(at < 0 || (spot.after && at === 0) ? kids.length : at, 0, block);
  return out;
}

// Rows are one long track, like lines of text: walking off a row's right edge continues on the
// next row from the left, walking off the left edge continues on the row above from the right,
// and the last row wraps round to the first.
export const wrapRow = (row, dir, rows) => (dir === "r" ? (row + 1) % rows : (row - 1 + rows) % rows);
// Where it walks to, just past the edge, to leave its row...
export const exitX = (dir, width, off) => (dir === "r" ? width + off : -off);
// ...and where it then appears on the next row, just outside the opposite edge.
export const entryX = (dir, width, off) => (dir === "r" ? -off : width + off);

// Wrap onto row `to` only if it isn't already holding its fair share, so walking about doesn't
// pile everyone onto one row (with no room left for their names).
export const wrapOk = (counts, to, total, rows) => (counts[to] ?? 0) + 1 <= Math.ceil(total / rows);

// Ends any walk: stopped, and no longer leaving, entering or shuffling.
export function clearWalk(m) {
  m.moving = false;
  m.wrap = false;
  m.shuffle = false;
  m.entering = false;
}

// Where each name tag goes on one row of the strip. A tag always sits right under its own
// Pokémon (centred, or pushed in from the strip's edge), and none is ever hidden: when two
// would collide, the less important one drops to the next line; a squeezed one gets narrower
// (the renderer cuts the text with "…") but keeps at least ~6 letters.

const DEFAULTS = { charW: 6, pad: 18, minW: 54, maxW: 200, gap: 6, maxLines: Infinity };

// items: [{ id, cx, text, rank, from?, settled?, since? }] (lower rank = more important). A walking Pokémon's tag
// is laid out at cx, where it's headed, and its line is kept clear all the way from `from`,
// where it is now, so it never passes over another tag. Returns Map id -> { left, w, line }.
export function layoutTags(items, width, opt = {}) {
  const { charW, pad, minW: minW0, maxW, gap, maxLines } = { ...DEFAULTS, ...opt };
  const minW = Math.min(minW0, width);
  const lines = []; // per line: [{ left, right }]
  // On the first line, each tag keeps to its own share: up to halfway to the next Pokémon on
  // either side. A long name is cut in its own share rather than taking a short one's.
  const xs = items.map((it) => Math.min(Math.max(it.cx, 0), width));
  const share = (it, cx) => {
    let lo = 0;
    let hi = width;
    items.forEach((o, k) => {
      if (o === it || xs[k] === cx) return;
      if (xs[k] < cx) lo = Math.max(lo, (xs[k] + cx) / 2 + gap / 2);
      else hi = Math.min(hi, (xs[k] + cx) / 2 - gap / 2);
    });
    return { lo, hi };
  };
  const out = new Map();

  // Standing Pokémon first, so a walking one never bumps their tags to another line as it
  // passes; it finds a line that's clear along its way instead. Then by rank.
  // Among the standing ones, those already settled before the ones that just stopped, so an
  // arrival never bumps a neighbour either.
  const walking = (it) => (it.from !== undefined && it.from !== it.cx ? 1 : 0);
  const fresh = (it) => (it.settled ? 0 : 1);
  // Settled ones go by how long they've stood (`since`), oldest first, so a newcomer never
  // takes a neighbour's line on a later render either.
  const since = (it) => (it.settled ? (it.since ?? 0) : 0);
  for (const it of [...items].sort((a, b) => walking(a) - walking(b) || fresh(a) - fresh(b) || since(a) - since(b) || a.rank - b.rank || a.cx - b.cx)) {
    const want = Math.min(width, Math.max(minW, Math.min(maxW, it.text.length * charW + pad)));
    const clampX = (v) => Math.min(Math.max(v, 0), width);
    const cx = clampX(it.cx);
    const shift = clampX(it.from ?? it.cx) - cx; // where the tag is now, relative to where it ends
    const place = (minNow, sweepClear) => {
      for (let line = 0; line < maxLines; line++) {
        const taken = (lines[line] ??= []);
        // Its share, if that leaves room; Pokémon standing too close share nothing: plain lines.
        const spot = (line === 0 && fit(taken, cx, want, minNow, width, gap, share(it, cx))) || fit(taken, cx, want, minNow, width, gap);
        if (!spot) continue;
        const sweep = { left: spot.left + Math.min(0, shift), right: spot.left + spot.w + Math.max(0, shift) };
        if (sweepClear && taken.some((t) => sweep.left < t.right + gap && sweep.right > t.left - gap)) continue;
        taken.push(sweepClear ? sweep : { left: spot.left, right: spot.left + spot.w });
        out.set(it.id, { ...spot, line });
        return true;
      }
      return false;
    };
    // With a cap on lines, a crowded tag gets narrower before it gives up its clear path, and
    // as a last resort sits on the last line over the others, as narrow as it gets.
    if (place(minW, true) || place(Math.min(minW, 36), true) || place(Math.min(minW, 24), true) || place(Math.min(minW, 24), false)) continue;
    const w = Math.min(24, width);
    out.set(it.id, { left: Math.min(Math.max(cx - w / 2, 0), width - w), w, line: maxLines - 1 });
  }
  return out;
}

// The widest tag (up to `want`, at least `minW`) under cx on a line, or null if none fits.
function fit(taken, cx, want, minW, width, gap, bounds) {
  // The free stretch around cx between its neighbours on this line (and its share, if given).
  let lo = bounds ? bounds.lo : 0;
  let hi = bounds ? bounds.hi : width;
  for (const t of taken) {
    if (cx > t.left - gap && cx < t.right + gap) return null; // cx is under another tag
    if (t.right + gap <= cx) lo = Math.max(lo, t.right + gap);
    else hi = Math.min(hi, t.left - gap);
  }
  // Centred on its Pokémon...
  const wc = Math.min(want, 2 * Math.min(cx - lo, hi - cx));
  // ...or, against the strip's edge, shifted in so it still covers the Pokémon.
  const we = Math.min(want, hi - lo);
  if (we > wc && we >= minW && ((lo === 0 && cx - we / 2 < 0) || (hi === width && cx + we / 2 > width))) {
    return { left: Math.min(Math.max(cx - we / 2, lo), hi - we), w: we };
  }
  return wc >= minW ? { left: cx - wc / 2, w: wc } : null;
}

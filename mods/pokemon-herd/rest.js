// Where a resting Pokémon stands: away from the others on its row, so names fit under each.

// Distance to the nearest other (Infinity when alone).
export const roomAt = (x, others) => others.reduce((r, o) => Math.min(r, Math.abs(x - o)), Infinity);

// x itself when every other is at least `gap` away; else the nearest spot in [lo, hi] that is;
// else the roomiest spot (nearest to x on ties). Always a finite number inside [lo, hi].
export function restSpot(x, others, lo, hi, gap = 96) {
  if (!(hi >= lo)) return lo;
  const here = Math.min(Math.max(x, lo), hi);
  if (roomAt(here, others) >= gap) return here;
  const inside = (c) => c >= lo && c <= hi;
  const free = [lo, hi, ...others.flatMap((o) => [o - gap, o + gap])].filter((c) => inside(c) && roomAt(c, others) >= gap - 1e-9);
  if (free.length) return free.reduce((b, c) => (Math.abs(c - here) < Math.abs(b - here) ? c : b));
  let best = here;
  let bestRoom = roomAt(here, others);
  const candidates = [lo, hi];
  for (let c = lo; c <= hi; c += 4) candidates.push(c);
  const sorted = [...others].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) candidates.push((sorted[i - 1] + sorted[i]) / 2); // midpoints
  for (const c of candidates) {
    if (!inside(c)) continue;
    const r = roomAt(c, others);
    if (r > bestRoom || (r === bestRoom && Math.abs(c - here) < Math.abs(best - here))) { best = c; bestRoom = r; }
  }
  return best;
}

// Seats round a campfire at `fire` for `n` Pokémon, `gap` apart and the first `gap` from the fire,
// alternating left and right, kept within lo..hi (a side that runs out of room overflows to the
// other). Ascending, so the leftmost Pokémon takes the leftmost seat and nobody crosses the fire.
export function campSeats(n, fire, gap, lo, hi) {
  const seats = [];
  let left = fire - gap, right = fire + gap;
  for (let i = 0; i < n; i++) {
    const leftOk = left >= lo, rightOk = right <= hi;
    const goLeft = (i % 2 === 0 && leftOk) || !rightOk;
    if (goLeft) { seats.push(Math.max(lo, left)); left -= gap; }
    else { seats.push(right); right += gap; }
  }
  return seats.sort((a, b) => a - b);
}

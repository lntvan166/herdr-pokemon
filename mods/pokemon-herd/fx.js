// Battle effects, worked out here and drawn by main.js: what a move looks like by its type (a
// glowing shot with a tail), the burst where a blow lands, how far the target is knocked back and
// whether it shakes, the word that pops up ("Super effective!"). GPUI animates the parts natively
// (transition, loop), so the strip's four ticks a second never make them stutter. Pure.
//
// What makes a hit feel strong, in the order it lands (all within about a tenth of a second): a
// white flash where it hits, sparks flying out, the target knocked back (further for a harder
// hit) and back again, a shake only for the big ones (shaking on every hit, players stop seeing
// it), the word the games say.

// Each move type's colours: a soft glow round it, its core, a lighter ring and the hot centre;
// and its look: an orb with a tail of embers, bubbles, leaves, sparks, shards, rings, wind, a star.
export const MOVE = {
  normal: { glow: "#ffffff", core: "#e8e4d8", mid: "#f6f3ea", hot: "#ffffff", look: "star" },
  fire: { glow: "#ff8a2a", core: "#ff5a14", mid: "#ffb43a", hot: "#fff2a8", look: "orb" },
  water: { glow: "#4fb4ff", core: "#2a8cff", mid: "#8fd3ff", hot: "#ffffff", look: "bubble" },
  grass: { glow: "#7bd65a", core: "#3fae3a", mid: "#9be36a", hot: "#e8ffd0", look: "leaf" },
  electric: { glow: "#ffe14a", core: "#ffc400", mid: "#fff07a", hot: "#ffffff", look: "spark" },
  ice: { glow: "#9fe8ff", core: "#5fc8f0", mid: "#c8f4ff", hot: "#ffffff", look: "shard" },
  fighting: { glow: "#ff7a4a", core: "#d8452a", mid: "#ffa070", hot: "#fff0e0", look: "orb" },
  poison: { glow: "#c060ff", core: "#9a3ad8", mid: "#d890ff", hot: "#f6e0ff", look: "bubble" },
  ground: { glow: "#d8a860", core: "#a8783a", mid: "#d8b070", hot: "#f6e6c0", look: "shard" },
  flying: { glow: "#d8f0ff", core: "#a8d8f0", mid: "#e8f8ff", hot: "#ffffff", look: "wind" },
  psychic: { glow: "#ff70c0", core: "#f04aa0", mid: "#ffa0d8", hot: "#ffffff", look: "ring" },
  bug: { glow: "#b8e040", core: "#8ab820", mid: "#d0f070", hot: "#f6ffd0", look: "orb" },
  rock: { glow: "#c8b080", core: "#9a8050", mid: "#c8b080", hot: "#efe4c8", look: "shard" },
  ghost: { glow: "#9a70ff", core: "#5a3ab8", mid: "#b090ff", hot: "#efe6ff", look: "orb" },
  dragon: { glow: "#7a70ff", core: "#4a3ad8", mid: "#a090ff", hot: "#ffffff", look: "orb" },
  dark: { glow: "#7a5aa0", core: "#2a2038", mid: "#5a4a70", hot: "#c0a8e0", look: "orb" },
  steel: { glow: "#d0dce8", core: "#8aa0b8", mid: "#c0d0e0", hot: "#ffffff", look: "star" },
  fairy: { glow: "#ffb0e0", core: "#ff80c8", mid: "#ffd0ee", hot: "#ffffff", look: "star" },
};
// Mega Charizard X burns blue.
export const BLUE_FIRE = { glow: "#4fb4ff", core: "#1f6fe0", mid: "#6fd2ff", hot: "#e8fbff", look: "orb" };
export const moveStyle = (type, blue = false) => (type === "fire" && blue ? BLUE_FIRE : MOVE[type] ?? MOVE.normal);

// A part: { x, y, w, h, color, round?, ring?, opacity?, flicker? (ms) }, x and y its centre's
// offset from the shot's centre. `dir`: 1 flying right, -1 left (its tail trails behind).
export function shotParts(style, dir = 1, k = 1) {
  const back = -dir;
  const c = (x, y, d, color, opacity = 1, flicker) => ({ x: x * k, y: y * k, w: d * k, h: d * k, color, round: true, opacity, ...(flicker ? { flicker } : {}) });
  const box = (x, y, w, h, color, opacity = 1, flicker) => ({ x: x * k, y: y * k, w: w * k, h: h * k, color, opacity, ...(flicker ? { flicker } : {}) });
  const glow = [c(0, 0, 30, style.glow, 0.22, 220), c(0, 0, 20, style.glow, 0.4, 160)];
  switch (style.look) {
    case "bubble":
      return [...glow,
        ...[[9, -4, 7], [17, 3, 5], [24, -2, 4]].map(([dx, dy, d], i) => ({ ...c(back * dx, dy, d, style.mid, 0.85 - i * 0.2), ring: true })),
        { ...c(0, 0, 15, style.core, 1), ring: true }, c(0, 0, 11, style.mid, 0.45), c(-2, -3, 4, style.hot, 1)];
    case "leaf":
      return [...glow,
        ...[[10, -4], [18, 3], [26, -1]].map(([dx, dy], i) => box(back * dx, dy, 9 - i * 2, 4, i % 2 ? style.core : style.mid, 0.9 - i * 0.25)),
        box(0, -3, 13, 6, style.core), box(2, 3, 11, 5, style.mid), c(0, 0, 4, style.hot)];
    case "spark":
      return [...glow,
        box(back * 7, -3, 7, 3, style.mid, 1, 100), box(back * 12, 2, 6, 3, style.core, 0.9, 110), box(back * 18, -2, 6, 3, style.mid, 0.7, 130), box(back * 24, 2, 5, 2, style.core, 0.5, 150),
        c(0, 0, 12, style.core), c(0, 0, 8, style.mid), c(0, 0, 4, style.hot)];
    case "shard":
      return [...glow,
        ...[[10, -3, 5], [17, 3, 4], [24, -1, 3]].map(([dx, dy, d], i) => box(back * dx, dy, d, d, style.mid, 0.9 - i * 0.25)),
        box(0, 0, 11, 11, style.core), box(1, -1, 6, 6, style.mid), box(2, -2, 3, 3, style.hot)];
    case "ring":
      return [...glow,
        { ...c(back * 10, 0, 12, style.mid, 0.6), ring: true }, { ...c(back * 19, 0, 9, style.mid, 0.35), ring: true },
        { ...c(0, 0, 18, style.core, 1), ring: true }, { ...c(0, 0, 11, style.mid, 1), ring: true }, c(0, 0, 4, style.hot)];
    case "wind":
      return [...glow,
        ...[[6, -5, 18], [12, 0, 22], [8, 5, 16]].map(([dx, dy, w], i) => box(back * dx, dy, w, 3, i === 1 ? style.core : style.mid, 0.85, 120 + i * 30)),
        c(0, 0, 6, style.hot)];
    case "star":
      return [...glow,
        ...[[10, -2, 4], [17, 2, 3], [23, -1, 2]].map(([dx, dy, d], i) => c(back * dx, dy, d, style.mid, 0.9 - i * 0.25, 140)),
        box(0, 0, 20, 3, style.mid), box(0, 0, 3, 20, style.mid), c(0, 0, 9, style.core), c(0, 0, 5, style.hot)];
    default: // orb: a fireball, a shadow ball…, embers trailing behind it
      return [...glow,
        ...[0, 1, 2, 3, 4].map((i) => c(back * (8 + i * 5.5), (i % 2 ? -1 : 1) * (0.5 + i * 0.6), 9 - i * 1.5, [style.mid, style.core, style.core, style.glow, style.glow][i], 1 - i * 0.17, 110 + i * 35)),
        c(0, 0, 14, style.core), c(1, 0, 9, style.mid), c(1.5, 0, 5, style.hot)];
  }
}

// How hard a blow lands, 0..1: a special move by how effective it is; a plain strike lightly.
export function power(eff = 1, special = true) {
  if (!special) return 0.3;
  return eff >= 4 ? 1 : eff >= 2 ? 0.85 : eff >= 1 ? 0.6 : eff > 0 ? 0.35 : 0.1;
}

// Where it lands: a flash (from `from` px wide to `to`, fading) and sparks flying out from the
// centre to (dx, dy), each fading; more and further for a harder hit. Seeded: every frame and
// every strip draws the same burst.
export function burstParts(style, p = 0.6, seed = 1) {
  let s = seed % 2147483647 || 1;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const n = Math.round(5 + 7 * p);
  const reach = 12 + 20 * p;
  const sparks = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (rnd() - 0.5) * 0.7;
    const d = reach * (0.55 + 0.45 * rnd());
    const size = Math.round(2 + 3 * rnd() + 2 * p);
    sparks.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.8 - 3, size, color: [style.hot, style.mid, style.core][i % 3], round: style.look !== "shard" && style.look !== "spark" });
  }
  return { flash: { from: 6, to: Math.round(22 + 26 * p), color: style.hot }, ring: { from: 8, to: Math.round(20 + 30 * p), color: style.glow }, sparks };
}

// The target, knocked back (px, away from the blow) and back; a shake for a big one.
export function knockOf(p) {
  return { px: Math.round(3 + 13 * p), shake: p >= 0.8 };
}
export const KNOCK_OUT = 140, KNOCK_BACK = 320, SHAKE_MS = 280; // out, back, how long it shakes

// The word that pops over the target, as the games say it: [text, colour]; none for a plain hit.
export function effectWord(eff) {
  if (eff >= 4) return ["Extremely effective!", "#ff9a3c"];
  if (eff >= 2) return ["Super effective!", "#ffd23f"];
  if (eff === 0) return ["No effect…", "#c8ccd4"];
  if (eff < 1) return ["Not very effective…", "#c8ccd4"];
  return null;
}

// Where yours stands to battle a wild one: `gap` from it, on the side it came from; the other
// side when that's off the strip (lo..hi).
export function wildSpot(ownX, wildX, lo, hi, gap) {
  const side = ownX <= wildX ? -1 : 1;
  const a = wildX + side * gap;
  if (a >= lo && a <= hi) return a;
  const b = wildX - side * gap;
  if (b >= lo && b <= hi) return b;
  return Math.min(hi, Math.max(lo, a));
}

// A ball thrown: up from the strip's edge on yours' side, over, and down onto the wild one.
// { at, until, from: [x, y], to: [x, y] } legs, relative to the throw (ms).
export const THROW_UP = 260, THROW_DOWN = 220, INTO_BALL = 260;
export const SHAKE_FROM = THROW_UP + THROW_DOWN + INTO_BALL; // the first shake
export const SHAKE_EVERY = 700, WOBBLE = 320;
// The ball wobbles (shake k, 0-based) from SHAKE_FROM + k·SHAKE_EVERY for WOBBLE ms; then rests.
export const wobbling = (t, shakes) => {
  const k = Math.floor((t - SHAKE_FROM) / SHAKE_EVERY);
  return t >= SHAKE_FROM && k < shakes && (t - SHAKE_FROM) % SHAKE_EVERY < WOBBLE;
};
// When the ball is done: caught (clicks shut), or it breaks out.
export const throwEnd = (shakes) => SHAKE_FROM + Math.max(1, shakes) * SHAKE_EVERY;

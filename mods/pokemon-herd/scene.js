// The Scenery background: per row, sky, hills and grass above the ground line (the names below it
// keep the strip's plain colour). Day by day, night by night, from the clock, blending for an hour
// at dawn and dusk. Pure: colours and where things go; main.js draws them.

// Muted and dark, so the strip sits in a dark app and the sprites stand out against it. The day sky
// is a grey teal, not blue: many Pokémon are blue and would sink into a blue sky.
const DAY = { sky: "#22383c", hill: "#2c4636", grass: "#558a41", dark: "#3a612e", tree: "#3b6e3c", treeDark: "#2c5530", trunk: "#5a4632" };
const NIGHT = { sky: "#141b2c", hill: "#1b2637", grass: "#27472f", dark: "#1a3222", tree: "#22402f", treeDark: "#1a3124", trunk: "#33291f" };
// For a light theme: pale and soft, a step off the app's own light surfaces. Night is a pale
// dusk slate, so it still reads as night without a dark block in a light window.
const LIGHT_DAY = { sky: "#d9e6e4", hill: "#c6d9c4", grass: "#8fb878", dark: "#6f9a5c", tree: "#86b673", treeDark: "#6f9d5f", trunk: "#8f7558" };
const LIGHT_NIGHT = { sky: "#c8cddb", hill: "#b6bece", grass: "#7f9e85", dark: "#62806a", tree: "#8aa293", treeDark: "#748b7d", trunk: "#7f7480" };

// 0 by day (6:30–17:30), 1 by night (18:30–5:30), in between at dawn and dusk. `hour` is 0–24.
export function nightness(hour) {
  const h = ((hour % 24) + 24) % 24;
  if (h >= 6.5 && h <= 17.5) return 0;
  if (h >= 18.5 || h <= 5.5) return 1;
  return h < 12 ? 6.5 - h : h - 17.5; // 5.5→6.5: 1→0; 17.5→18.5: 0→1
}

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
export function mix(a, b, t) {
  const [x, y] = [hex(a), hex(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

// Seasons: 0 spring, 1 summer, 2 autumn, 3 winter. Each lasts 3 hours, and each day starts one
// further on, so the same hour of the day sees a different season tomorrow. The last 20 minutes
// of a season blend into the next. Returns { a: this season, b: the next, t: how far into b }.
export function seasonAt(date) {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  const h = date.getHours();
  const a = (Math.floor(h / 3) + day) % 4;
  const into = (h % 3) * 60 + date.getMinutes();
  return { a, b: (a + 1) % 4, t: Math.min(1, Math.max(0, (into - 160) / 20)) };
}

// What each season does to the colours: [colour key, the colour it leans to, how far]. The grass
// band is the biggest patch of colour, so each season changes it most: fresh lime in spring, deep
// green in summer, gold in autumn, white in winter. Spring's trees blossom pink.
const SEASONS = [
  [["tree", "#f7a8cc", 0.85], ["treeDark", "#8ccf68", 0.45], ["grass", "#9be060", 0.65], ["dark", "#6cb84a", 0.45]],
  [["tree", "#2f8a3a", 0.3], ["treeDark", "#1f6a2c", 0.3], ["grass", "#3d9a33", 0.3]],
  [["tree", "#e07a26", 0.85], ["treeDark", "#b0461f", 0.8], ["grass", "#d1a640", 0.85], ["dark", "#946b26", 0.7], ["hill", "#5c4a2a", 0.2]],
  [["tree", "#eef3f5", 0.75], ["treeDark", "#c9d6dc", 0.65], ["grass", "#e6edf0", 0.7], ["dark", "#b8c6cc", 0.55], ["hill", "#d5e0e4", 0.3]],
];

// The palette `p` in season `s`. In a dark theme the season's colours are dimmed with the rest
// only a little, or blossoms, gold and snow read as grey.
function inSeason(p, s, n, light) {
  const q = { ...p };
  const dim = (light ? 0.05 : 0.18) + 0.35 * n;
  for (const [k, c, w] of SEASONS[s]) q[k] = mix(p[k], mix(c, "#000000", dim), w);
  return q;
}

// A light colour (a light theme's chrome), by its perceived brightness.
export const isLight = (c) => {
  const [r, g, b] = hex(c);
  return 0.299 * r + 0.587 * g + 0.114 * b > 140;
};

// The colours at a given nightness, for a dark theme or a light one (`light`), in a season
// (seasonAt; none: summer), and how much the clouds (day), stars and moon (night), spring's
// flowers, autumn's falling leaves and winter's snow show.
export function palette(n, light = false, season = null) {
  const [day, night] = light ? [LIGHT_DAY, LIGHT_NIGHT] : [DAY, NIGHT];
  let p = {};
  for (const k of Object.keys(day)) p[k] = mix(day[k], night[k], n);
  let flowers = 0, leaves = 0, snow = 0;
  if (season) {
    const [a, b] = [inSeason(p, season.a, n, light), inSeason(p, season.b, n, light)];
    for (const k of Object.keys(p)) p[k] = mix(a[k], b[k], season.t);
    const weight = (s) => (season.a === s ? 1 - season.t : 0) + (season.b === s ? season.t : 0);
    [flowers, leaves, snow] = [weight(0), weight(2), weight(3)];
  }
  p = { ...p, flowers, leaves, snow };
  // On a pale sky white clouds and stars need more weight to show at all.
  return { ...p, clouds: 1 - n, stars: n, cloudAlpha: light ? 0.75 : 0.14, starAlpha: light ? 0.95 : 0.7 };
}

// A small seeded random, so a row's scene is the same on every frame.
function rng(seed) {
  let s = (seed * 2654435761 + 1) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Where a row's hills, clouds, stars and grass tufts go: `width` × `ground` (the ground line's y
// from the row's top). Row `row` gets its own scene.
export function features(width, ground, row) {
  const r = rng(row + 1);
  const hills = [];
  for (let x = -40; x < width + 40; x += 110 + r() * 70) hills.push({ cx: x, rx: 70 + r() * 60, ry: 16 + r() * 12 });
  const clouds = [];
  for (let x = 20 + r() * 80; x + 50 < width && clouds.length < 3; x += 320 + r() * 240) {
    clouds.push({ x: Math.round(x), y: Math.round(6 + r() * Math.max(1, ground * 0.25)), w: Math.round(34 + r() * 18) });
  }
  const stars = [];
  const count = Math.round(width / 40);
  for (let i = 0; i < count; i++) {
    stars.push({ x: Math.floor(r() * width), y: Math.floor(r() * Math.max(1, ground - 24)), bright: r() < 0.3 });
  }
  const tufts = [];
  for (let x = Math.floor(r() * 8); x < width; x += 6 + Math.floor(r() * 12)) tufts.push({ x, h: 1 + Math.floor(r() * 3), dark: r() < 0.4 });
  // A few small trees, far apart (sometimes a little one beside), round or pine.
  const trees = [];
  for (let x = 30 + r() * 150; x < width; x += 150 + r() * 160) {
    const h = 18 + Math.floor(r() * 13);
    const kind = r() < 0.35 ? "pine" : "round";
    const w = kind === "pine" ? Math.round(h * 0.6) : Math.round(h * 0.8);
    if (x + w <= width) trees.push({ x: Math.round(x), w, h, kind });
    if (r() < 0.3) {
      const h2 = 13 + Math.floor(r() * 5);
      const x2 = Math.round(x + w + 1);
      if (x2 + h2 <= width) trees.push({ x: x2, w: Math.round(h2 * 0.8), h: h2, kind: "round" });
    }
  }
  const moon = { x: Math.round(width * 0.8), y: 10 + Math.round(r() * 8) };
  // Spring's flowers on the grass, and winter's snowflakes (snowAt moves them).
  const flowers = [];
  for (let x = Math.floor(r() * 10); x < width - 2; x += 7 + Math.floor(r() * 16)) flowers.push({ x, pink: r() < 0.5 });
  const flakes = [];
  for (let i = 0, n = Math.round(width / 25); i < n; i++) {
    const drift = 2 + r() * 4;
    flakes.push({ x: drift + r() * (width - 2 * drift), y: r() * ground, speed: 5 + r() * 7, drift, phase: r() * 6.28 });
  }
  return { hills, clouds, stars, tufts, trees, moon, flowers, flakes };
}

// Where the snowflakes are `sec` seconds on: falling, swaying, back at the top under `line`
// (`fall` counts those returns, so a flake back at the top can be drawn as a new one).
export const snowAt = (flakes, sec, line) => flakes.map((f) => {
  const d = f.y + f.speed * sec;
  return { x: Math.floor(f.x + Math.sin(sec * 0.8 + f.phase) * f.drift), y: Math.floor(d % line), fall: Math.floor(d / line) };
});

// One tree as flat pieces standing on `base` (the top of the grass): [x, y, w, h, colour key,
// rounded]. Round: a trunk under a canopy with a darker lower right. Pine: four tiers, narrowing to the top.
export function treeParts(t, base) {
  const trunkH = Math.max(3, Math.round(t.h * 0.28));
  const top = base - t.h;
  const cx = t.x + Math.round(t.w / 2);
  const parts = [[cx - 1, base - trunkH, 2, trunkH, "trunk", false]];
  if (t.kind === "pine") {
    const tierH = Math.round((t.h - trunkH + 2) / 4);
    [0.3, 0.55, 0.8, 1].forEach((k, i) => {
      const w = Math.max(3, Math.round(t.w * k));
      parts.push([cx - Math.round(w / 2), top + i * tierH, w, tierH + 1, "tree", false]);
      parts.push([cx, top + i * tierH, w - Math.round(w / 2), tierH + 1, "treeDark", false]);
    });
  } else {
    const ch = t.h - trunkH + 2;
    parts.push([t.x, top, t.w, ch, "tree", true]);
    parts.push([t.x + Math.round(t.w * 0.4), top + Math.round(ch * 0.4), Math.round(t.w * 0.5), Math.round(ch * 0.5), "treeDark", true]);
  }
  return parts;
}

// A cloud or the moon (`box`, in its row) that sits right above a Pokémon's head or its bubble, so
// it should fade: `heads` are [{ x0, x1, top }], top being the top of the bubble.
export const overHead = (box, heads) =>
  heads.some((h) => box.x < h.x1 && box.x + box.w > h.x0 && box.y + box.h > h.top - 4);


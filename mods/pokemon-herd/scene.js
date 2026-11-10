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

// A light colour (a light theme's chrome), by its perceived brightness.
export const isLight = (c) => {
  const [r, g, b] = hex(c);
  return 0.299 * r + 0.587 * g + 0.114 * b > 140;
};

// The colours at a given nightness, for a dark theme or a light one (`light`), and how much the
// clouds (day) and stars and moon (night) show.
export function palette(n, light = false) {
  const [day, night] = light ? [LIGHT_DAY, LIGHT_NIGHT] : [DAY, NIGHT];
  const p = {};
  for (const k of Object.keys(day)) p[k] = mix(day[k], night[k], n);
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
  return { hills, clouds, stars, tufts, trees, moon };
}

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

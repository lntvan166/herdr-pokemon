// The Scenery background: per row, sky, hills and grass above the ground line (the names below it
// keep the strip's plain colour). Day by day, night by night, from the clock, blending for an hour
// at dawn and dusk. Pure: colours and where things go; main.js draws them.

const DAY = { skyTop: "#64aef2", skyBottom: "#cdeaff", hill: "#9ad08a", grass: "#5fb84e", dark: "#3f8f38" };
const NIGHT = { skyTop: "#0d1430", skyBottom: "#2a3762", hill: "#1f2d45", grass: "#2f6b3e", dark: "#21502d" };

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

// The colours at a given nightness, and how much the clouds (day) and stars and moon (night) show.
export function palette(n) {
  const p = {};
  for (const k of Object.keys(DAY)) p[k] = mix(DAY[k], NIGHT[k], n);
  return { ...p, clouds: 1 - n, stars: n };
}

// The sky as `count` flat bands, top to horizon: a pixel-art gradient.
export const skyBands = (p, count) => Array.from({ length: count }, (_, i) => mix(p.skyTop, p.skyBottom, count > 1 ? i / (count - 1) : 0));

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
  for (let x = 10 + r() * 40; x + 50 < width; x += 120 + r() * 90) {
    clouds.push({ x: Math.round(x), y: Math.round(6 + r() * Math.max(1, ground * 0.25)), w: Math.round(34 + r() * 18) });
  }
  const stars = [];
  const count = Math.round(width / 14);
  for (let i = 0; i < count; i++) {
    stars.push({ x: Math.floor(r() * width), y: Math.floor(r() * Math.max(1, ground - 24)), bright: r() < 0.3 });
  }
  const tufts = Array.from({ length: Math.ceil(width / 3) }, (_, i) => ({ x: i * 3, h: 2 + Math.floor(r() * 4), dark: r() < 0.4 }));
  const moon = { x: Math.round(width * 0.8), y: 10 + Math.round(r() * 8) };
  return { hills, clouds, stars, tufts, moon };
}

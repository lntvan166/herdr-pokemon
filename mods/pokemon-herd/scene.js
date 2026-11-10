// The Scenery background: per row, sky, hills and grass above the ground line (the names below it
// keep the strip's plain colour). Day by day, night by night, from the clock, blending for an hour
// at dawn and dusk. Pure: colours and where things go; main.js draws them.

// Muted and dark, so the strip sits in a dark app and the sprites stand out against it. The day sky
// is a grey teal, not blue: many Pokémon are blue and would sink into a blue sky.
const DAY = { sky: "#22383c", hill: "#2c4636", grass: "#558a41", dark: "#3a612e" };
const NIGHT = { sky: "#141b2c", hill: "#1b2637", grass: "#27472f", dark: "#1a3222" };

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
  const moon = { x: Math.round(width * 0.8), y: 10 + Math.round(r() * 8) };
  return { hills, clouds, stars, tufts, moon };
}

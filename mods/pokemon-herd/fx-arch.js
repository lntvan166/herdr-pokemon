// How the games' other moves look (more-moves.js EXTRA_MOVES: those without a look of their own
// in fx-moves.js): each by its kind, as the games animate a family of moves alike (Fire Fang and
// Ice Fang the same jaws in their type's colours; a Punch a fist; a Beam a ray), in its type's
// colours (fx.js MOVE style `st`), varied a little by its name (`v`: no two of a kind alike).
// archOf(name, physical): its kind, from its name and its flags (ability-data.js MOVE_FLAGS:
// p punch, b bite, u pulse, s sound, c contact) and multi-hit (more-moves.js MULTI_POWER).
// PHYS_ARCH[kind](c), SPEC_ARCH[kind](c): parts as fx-moves.js PHYSICAL / SPECIAL, with the same
// helpers in `c`. Pure.
import { MOVE_FLAGS } from "./ability-data.js";
import { MULTI_POWER } from "./more-moves.js";

const has = (name, f) => (MOVE_FLAGS[name] ?? "").includes(f);
const hash = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
const PHYS_RULES = [
  ["multi", (n) => MULTI_POWER[n] !== undefined],
  ["punch", (n) => has(n, "p") || /Punch|Hammer|Fist|Uppercut|Jab/.test(n)],
  ["fang", (n) => has(n, "b") || /Fang|Bite|Jaw|Crunch/.test(n)],
  ["kick", (n) => /Kick|Stomp|Trample|Knee/.test(n)],
  ["slash", (n) => /Slash|Cut|Claw|Blade|Sword|Scissor|Cleave|Edge|Axe|Razor|Fury|Talon|Scratch/.test(n)],
  ["horn", (n) => /Horn|Drill|Spear|Peck|Sting|Needle|Pin|Thrust|Lance|Spike/.test(n)],
  ["tail", (n) => /Tail|Whip|Lash|Slap|Vine|Tentacle|Wrap/.test(n)],
  ["wing", (n) => /Wing|Aerial|Air|Feather|Acrobatics|Sky|Beak|Fly/.test(n)],
  ["quake", (n) => /Quake|Slam|Bulldoze|Land|Smash|Crash|Press|Heavy|Mountain|Ground|Stomping|Tremor|Body/.test(n)],
  ["rocks", (n) => /Rock|Stone|Boulder|Avalanche|Throw|Tomb|Smack|Bone|Icicle|Meteor/.test(n)],
];
const SPEC_RULES = [
  ["drain", (n) => /Drain|Absorb|Leech|Draining|Giga|Horn Leech/.test(n)],
  ["sound", (n) => has(n, "s") || /Voice|Song|Roar|Boom|Echo|Buzz|Noise|Howl|Sing|Clang/.test(n)],
  ["beam", (n) => /Beam|Ray|Laser|Cannon|Rays|Gleam|Flash/.test(n)],
  ["pulse", (n) => has(n, "u") || /Pulse|Wave|Aura|Ripple|Surf|Shock Wave|Vacuum/.test(n)],
  ["storm", (n) => /Storm|Wind|Gust|Twister|Hurricane|Tornado|Cyclone|Breeze|Blizzard|Snow|Hail|Heat|Tempest|Sand/.test(n)],
  ["bolt", (n) => /Thunder|Bolt|Shock|Spark|Discharge|Zap|Volt|Electro|Charge|Plasma|Lightning/.test(n)],
  ["spray", (n) => /Water|Hydro|Aqua|Bubble|Brine|Scald|Mud|Sludge|Acid|Spit|Steam|Snipe|Soak|Venom/.test(n)],
  ["leaves", (n) => /Leaf|Petal|Seed|Flower|Pollen|Blossom|Apple|Grass|Magical/.test(n)],
  ["ball", (n) => /Ball|Sphere|Orb|Bomb|Bullet|Shot|Blast|Star|Comet|Moon|Pellet|Burst/.test(n)],
];
// Its kind: by its rules in order; else by its type's way (fire rises, psychic pulses…).
const TYPE_PHYS = { ground: "quake", rock: "rocks", flying: "wing", bug: "horn", fighting: "punch", ice: "rocks", steel: "quake" };
const TYPE_SPEC = { fire: "flames", psychic: "psy", ghost: "wisps", dark: "wisps", ice: "shards", electric: "bolt", water: "spray", grass: "leaves", fairy: "sparkle", dragon: "pulse", poison: "spray", flying: "storm", ground: "quake", rock: "shards", bug: "leaves", fighting: "pulse", steel: "beam", normal: "ball" };
export function archOf(name, physical, type) {
  const rules = physical ? PHYS_RULES : SPEC_RULES;
  const hit = rules.find(([, test]) => test(name));
  if (hit) return hit[0];
  return physical ? TYPE_PHYS[type] ?? "body" : TYPE_SPEC[type] ?? "ball";
}

// ---- physical: its mark on the target as it lands (x, y its middle, g its ground, dir the way) ----
export const PHYS_ARCH = {
  // A fist driven in: the fist (fx.js fist), a burst, sparks thrown off.
  punch: ({ x, y, dir, P, O, ring, fist, st, rnd, v }) => {
    const out = [...fist(st.hot, st.core), P(0, 240, O(x - dir * 4, y, 14, 14, 1), O(x - dir * 4, y, 34, 34, 0), st.core, { round: true }), ring(20, x, y, 10, 40 + (v % 12), st.hot, 300)];
    for (let i = 0; i < 4 + (v % 3); i++) { const a = -1 + i * 0.6; out.push(P(30, 300, O(x, y, 4, 4, 1), O(x + dir * Math.cos(a) * (24 + rnd() * 10), y + Math.sin(a) * 20, 3, 3, 0), [st.hot, "#ffffff"][i % 2], { round: true })); }
    return out;
  },
  // Jaws closing on it: an upper and a lower bar of fangs meeting, its type's sparks where they bite.
  fang: ({ x, y, P, O, st, rnd, v }) => {
    const out = [];
    for (const [s, k] of [[-1, 0], [1, 1]]) {
      out.push(P(-140, 140, O(x, y + s * 26, 34, 6, 1), O(x, y + s * 6, 34, 6, 1), "#ffffff", { ease: "ease-in" }));
      for (let i = 0; i < 4; i++) out.push(P(-140, 140, O(x - 13 + i * 9, y + s * 22, 3, 7, 1), O(x - 13 + i * 9, y + s * 3, 3, 7, 1), "#f2f2f2", { ease: "ease-in" }));
      out.push(P(0, 220, O(x, y + s * 6, 34, 6, 1), O(x, y + s * 12, 40, 4, 0), k ? st.core : st.hot));
    }
    for (let i = 0; i < 6 + (v % 3); i++) out.push(P(10, 360, O(x, y, 5, 5, 1), O(x + (rnd() - 0.5) * 54, y + (rnd() - 0.5) * 36, 3, 3, 0), [st.hot, st.core, st.mid][i % 3], { round: true }));
    return out;
  },
  // A kick swung up into it: an arc of the foot's path, the blow, dust kicked up.
  kick: ({ x, y, g, dir, P, O, ring, puff, st, v }) => {
    const out = [];
    for (let i = 0; i < 6; i++) { const a = Math.PI * (0.9 - i * 0.12); out.push(P(-120 + i * 18, 160, O(x - dir * Math.cos(a) * 26, y + 18 - Math.sin(a) * 26, 7, 7, 0.9), O(x - dir * Math.cos(a) * 26, y + 18 - Math.sin(a) * 26, 3, 3, 0), i > 3 ? st.hot : "#ffffff", { round: true })); }
    return out.concat(ring(0, x, y, 12, 46 + (v % 10), st.core, 320), puff(40, x - dir * 8, g - 4, 22, "#c8bca8", 340, 0.7));
  },
  // A claw or a blade raked across: 2–3 streaks, its type's colour, a glint.
  slash: ({ x, y, dir, P, O, steps, st, v }) => {
    const n = 2 + (v % 2), out = [];
    for (let i = 0; i < n; i++) out.push(...steps(i * 45, 320, x - dir * 16 + i * 6 * dir, y - 18 + i * 4, 8, dir * 3.6, 4.4, ["#ffffff", st.hot, st.core], 3));
    return out.concat(P(80, 240, O(x + dir * 14, y + 14, 2, 10, 1), O(x + dir * 14, y + 14, 1, 2, 0), "#ffffff"), P(80, 240, O(x + dir * 14, y + 14, 10, 2, 1), O(x + dir * 14, y + 14, 2, 1, 0), "#ffffff"));
  },
  // A point driven in: lines converging on it, a sharp ring.
  horn: ({ x, y, dir, P, O, ring, st, v }) => {
    const out = [];
    for (let i = 0; i < 5; i++) { const dy = (i - 2) * 6; out.push(P(-120 + i * 12, 140, O(x - dir * 40, y + dy * 2, 18, 2, 0.9), O(x - dir * 4, y + dy * 0.3, 6, 2, 1), i === 2 ? "#ffffff" : st.hot, { ease: "ease-in" })); }
    return out.concat(ring(0, x, y, 6, 30 + (v % 10), st.core, 280), P(0, 200, O(x, y, 10, 10, 1), O(x, y, 22, 22, 0), "#ffffff", { round: true }));
  },
  // A tail or vine swung through it: an arc of its colour, a crack.
  tail: ({ x, y, dir, P, O, ring, st, rnd, v }) => {
    const out = [];
    for (let i = 0; i < 9; i++) { const a = -1.1 + i * 0.28; out.push(P(-100 + i * 14, 220, O(x + dir * Math.cos(a) * 30, y + Math.sin(a) * 22, 6, 6, 1), O(x + dir * Math.cos(a) * 34, y + Math.sin(a) * 26, 2, 2, 0), i % 2 ? st.core : st.hot, { round: true })); }
    return out.concat(ring(20, x, y, 8, 36 + (v % 8), "#ffffff", 260), P(40, 300, O(x, y, 4, 4, 1), O(x + dir * (14 + rnd() * 10), y - 18, 2, 2, 0), st.hot, { round: true }));
  },
  // Hit after hit: small bursts one after another, scattered over it.
  multi: ({ x, y, P, O, ring, st, rnd, v }) => {
    const out = [], n = 3 + (v % 3);
    for (let i = 0; i < n; i++) { const dx = (rnd() - 0.5) * 26, dy = (rnd() - 0.5) * 22, at = i * 90; out.push(P(at, 200, O(x + dx, y + dy, 8, 8, 1), O(x + dx, y + dy, 22, 22, 0), i % 2 ? st.hot : st.core, { round: true }), ring(at, x + dx, y + dy, 4, 20, "#ffffff", 200)); }
    return out;
  },
  // Wings or air struck in: feathers whirled about, slices of air.
  wing: ({ x, y, dir, P, O, st, rnd, v }) => {
    const out = [];
    for (let i = 0; i < 3; i++) out.push(P(-90 + i * 30, 160, O(x - dir * 30, y - 14 + i * 12, 22, 3, 0.9), O(x + dir * 6, y - 10 + i * 10, 10, 2, 0), "#ffffff", { ease: "ease-out" }));
    for (let i = 0; i < 5 + (v % 3); i++) out.push(P(20 + i * 20, 420, O(x, y, 6, 3, 1), O(x + (rnd() - 0.5) * 60, y - 10 - rnd() * 30, 5, 2, 0), [st.hot, "#ffffff"][i % 2]));
    return out;
  },
  // The ground struck: a shockwave out along it, earth thrown up, the target jolted.
  quake: ({ x, y, g, P, O, ring, puff, st, rnd, v }) => {
    const out = [ring(0, x, g - 2, 10, 90 + (v % 20), "#c8a060", 420), ring(60, x, g - 2, 8, 60, st.core, 380), P(0, 200, O(x, y, 20, 20, 1), O(x, y, 40, 40, 0), st.hot, { round: true })];
    for (let i = 0; i < 6; i++) out.push(P(20 + i * 20, 380, O(x + (i - 2.5) * 10, g - 2, 6, 6, 1), O(x + (i - 2.5) * 16, g - 18 - rnd() * 18, 4, 4, 0), "#a87a4a"));
    return out.concat(puff(60, x, g - 4, 30, "#c8bca8", 380, 0.7));
  },
  // Chunks (rocks, bones, ice) falling or hurled on it, breaking.
  rocks: ({ x, y, g, P, O, ring, st, rnd, v }) => {
    const out = [], n = 3 + (v % 3);
    for (let i = 0; i < n; i++) { const dx = (i - (n - 1) / 2) * 12, at = -160 + i * 50; out.push(P(at, 160, O(x + dx - 10, y - 40, 9, 9, 1), O(x + dx, y - 2 + (rnd() - 0.5) * 10, 9, 9, 1), st.core, { ease: "ease-in" }), P(at + 160, 260, O(x + dx, y, 9, 9, 1), O(x + dx + (rnd() - 0.5) * 14, g - 4, 4, 4, 0), st.mid)); }
    return out.concat(ring(40, x, y, 10, 44, st.hot, 320));
  },
  // A body blow, the default: a smack, a ring, its type's sparks.
  body: ({ x, y, dir, P, O, ring, st, rnd, v }) => {
    const out = [P(0, 260, O(x - dir * 6, y, 18, 18, 1), O(x - dir * 6, y, 40, 40, 0), st.core, { round: true }), ring(0, x, y, 10, 44 + (v % 10), "#ffffff", 300)];
    for (let i = 0; i < 4; i++) out.push(P(30, 320, O(x, y, 4, 4, 1), O(x + dir * (10 + rnd() * 20), y + (rnd() - 0.5) * 30, 3, 3, 0), st.hot, { round: true }));
    return out;
  },
};

// ---- special: fired from x0 at y onto x1 (from -FLY: its flight) ----------------------------------
export const SPEC_ARCH = {
  // A ray: a bright line from it to the target, a core of white, a flare where it lands.
  beam: ({ x0, x1, y, P, O, flash, ring, st, FLY, v }) => [
    P(-FLY, FLY, O(x0, y, 4, 8, 1), O((x0 + x1) / 2, y, Math.abs(x1 - x0), 8 + (v % 4), 0.9), st.core, { ease: "linear" }),
    P(-FLY + 40, FLY, O(x0, y, 4, 3, 1), O((x0 + x1) / 2, y, Math.abs(x1 - x0), 3, 1), "#ffffff", { ease: "linear" }),
    P(0, 220, O((x0 + x1) / 2, y, Math.abs(x1 - x0), 8, 0.8), O((x0 + x1) / 2, y, Math.abs(x1 - x0), 2, 0), st.mid),
    flash(0, x1, y, 34, st.hot), ring(30, x1, y, 10, 50, st.glow ?? st.core, 360),
  ],
  // A ball (a sphere, a bomb, a shot) rushing in with a trail, bursting.
  ball: ({ x1, y, P, O, fly, flash, ring, st, rnd, FLY, v }) => {
    const d = 12 + (v % 6), out = [fly(-FLY, d, d, st.core, { round: true }), fly(-FLY + 30, d * 0.6, d * 0.6, st.hot, { round: true }), fly(-FLY + 60, d * 0.4, d * 0.4, st.mid, { round: true })];
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; out.push(P(0, 320, O(x1, y, 5, 5, 1), O(x1 + Math.cos(a) * 24, y + Math.sin(a) * 20, 3, 3, 0), st.hot, { round: true })); }
    return out.concat(flash(0, x1, y, 34, st.mid), ring(0, x1, y, 10, 48, st.glow ?? st.core, 380), P(60, 200, O(x1 + (rnd() - 0.5) * 6, y, 6, 6, 1), O(x1, y - 14, 4, 4, 0), "#ffffff", { round: true }));
  },
  // A pulse (aura, wave): rings rolling out to it, one after another, then one breaking on it.
  pulse: ({ x0, x1, y, P, O, ring, st, FLY, v }) => {
    const out = [], n = 3 + (v % 2);
    for (let i = 0; i < n; i++) out.push(P(-FLY + i * 60, FLY - i * 60, O(x0, y, 10, 16, 1), O(x1, y, 26, 40, 0.4), i % 2 ? st.hot : st.core, { round: true, ring: true, ease: "linear" }));
    return out.concat(ring(0, x1, y, 14, 60, st.core, 400), ring(80, x1, y, 8, 40, "#ffffff", 300));
  },
  // Sound: arcs rolling out, wide, faint, and the target shaken in rings.
  sound: ({ x0, x1, y, P, O, ring, st, FLY, v }) => {
    const out = [];
    for (let i = 0; i < 4; i++) out.push(P(-FLY + i * 50, FLY - i * 40, O(x0, y, 4, 14, 0.9), O(x1, y, 10, 44, 0.2), i % 2 ? "#ffffff" : st.hot, { round: true, ring: true, ease: "linear" }));
    return out.concat(ring(0, x1, y, 10, 52 + (v % 10), st.core, 360), ring(70, x1, y, 10, 40, "#ffffff", 300));
  },
  // A storm (wind, snow, sand, heat): flecks swept across in a band, swirling about it.
  storm: ({ x0, x1, y, P, O, st, rnd, FLY, v }) => {
    const out = [];
    for (let i = 0; i < 12 + (v % 5); i++) { const dy = (rnd() - 0.5) * 40, at = -FLY + i * 22; out.push(P(at, FLY + 120 - i * 10, O(x0, y + dy, 4, 3, 0.9), O(x1 + (rnd() - 0.5) * 30, y + dy * 0.6 + (rnd() - 0.5) * 20, 3, 2, 0), [st.hot, st.core, "#ffffff"][i % 3], { ease: "linear" })); }
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; out.push(P(i * 25, 300, O(x1 + Math.cos(a) * 24, y + Math.sin(a) * 18, 4, 4, 1), O(x1 + Math.cos(a + 1.4) * 14, y + Math.sin(a + 1.4) * 10, 3, 3, 0), st.core, { round: true })); }
    return out;
  },
  // Lightning: a jagged bolt down onto it, a flash, crackles.
  bolt: ({ x1, y, P, O, flash, st, rnd, v }) => {
    const out = [];
    let px = x1 + (rnd() - 0.5) * 10, py = y - 60;
    for (let i = 0; i < 6; i++) { const nx = x1 + (rnd() - 0.5) * 18, ny = py + 10; out.push(P(-60 + i * 8, 200, O((px + nx) / 2, (py + ny) / 2, Math.abs(nx - px) + 3, 12, 1), O((px + nx) / 2, (py + ny) / 2, Math.abs(nx - px) + 3, 12, 0), i % 2 ? "#ffffff" : st.hot)); px = nx; py = ny; }
    for (let i = 0; i < 5 + (v % 3); i++) out.push(P(20, 220, O(x1, y, 3, 3, 1), O(x1 + (rnd() - 0.5) * 44, y + (rnd() - 0.5) * 30, 2, 6, 0), st.hot));
    return out.concat(flash(0, x1, y, 38, st.core));
  },
  // A spray (water, mud, sludge, venom): a stream of droplets, a splash.
  spray: ({ x0, x1, y, dir, P, O, flash, st, rnd, FLY, v }) => {
    const out = [];
    for (let i = 0; i < 8 + (v % 4); i++) { const dy = (rnd() - 0.5) * 10; out.push(P(-FLY + i * 24, FLY - i * 18, O(x0, y + dy, 6, 5, 1), O(x1, y + dy, 5, 4, 1), i % 2 ? st.core : st.mid, { round: true, ease: "linear" })); }
    for (let i = 0; i < 6; i++) out.push(P(0, 320, O(x1, y, 4, 4, 1), O(x1 - dir * (4 + rnd() * 18), y - 16 + rnd() * 14, 3, 3, 0), "#ffffff", { round: true }));
    return out.concat(flash(0, x1, y, 26, st.mid));
  },
  // Leaves, petals or seeds: a flurry flying in, settling about it.
  leaves: ({ x0, x1, y, P, O, st, rnd, FLY, v }) => {
    const out = [];
    for (let i = 0; i < 10 + (v % 4); i++) { const dy = (rnd() - 0.5) * 30; out.push(P(-FLY + i * 22, FLY - i * 12, O(x0, y + dy, 6, 3, 1), O(x1 + (rnd() - 0.5) * 24, y + dy * 0.5, 6, 3, 1), i % 3 ? st.core : st.hot, { ease: "linear" })); }
    for (let i = 0; i < 6; i++) out.push(P(20 + i * 15, 360, O(x1, y, 5, 3, 1), O(x1 + (rnd() - 0.5) * 40, y + 10 + rnd() * 16, 4, 2, 0), st.mid));
    return out;
  },
  // Drawing life from it: sparks drawn from the target back to the user, a glow there.
  drain: ({ x0, x1, y, P, O, flash, st, rnd }) => {
    const out = [flash(-200, x1, y, 30, st.core, 260)];
    for (let i = 0; i < 7; i++) { const dy = (rnd() - 0.5) * 24; out.push(P(-60 + i * 30, 360, O(x1, y + dy, 5, 5, 1), O(x0, y + dy * 0.3, 4, 4, 0.2), i % 2 ? "#b8ffb0" : st.hot, { round: true, ease: "ease-in" })); }
    return out.concat(flash(260, x0, y, 26, "#b8ffb0", 260));
  },
  // Flames: a fireball in, flames leaping up all over it.
  flames: ({ x1, y, P, O, fly, flash, st, rnd, FLY, v }) => {
    const out = [fly(-FLY, 14, 14, st.core, { round: true }), flash(0, x1, y, 34, st.mid)];
    for (let i = 0; i < 7 + (v % 3); i++) { const dx = (rnd() - 0.5) * 34; out.push(P(i * 25, 380, O(x1 + dx, y + 10, 7, 10, 1), O(x1 + dx, y - 24 - rnd() * 14, 3, 6, 0), i % 2 ? st.hot : st.core, { round: true })); }
    return out;
  },
  // A psychic force: waves of rings pulsing out of the target itself, a white core.
  psy: ({ x1, y, P, O, ring, st, v }) => {
    const out = [];
    for (let i = 0; i < 3 + (v % 2); i++) out.push(ring(-180 + i * 110, x1, y, 8, 54, i % 2 ? st.hot : st.core, 360));
    return out.concat(P(0, 300, O(x1, y, 10, 10, 1), O(x1, y, 26, 26, 0), "#ffffff", { round: true }));
  },
  // Shadow or spirit: dark wisps gathering on it from all sides, a pulse of dark.
  wisps: ({ x1, y, P, O, ring, st, rnd, v }) => {
    const out = [];
    for (let i = 0; i < 8 + (v % 3); i++) { const a = (i / 8) * Math.PI * 2 + rnd() * 0.4; out.push(P(-200 + i * 18, 260, O(x1 + Math.cos(a) * 40, y + Math.sin(a) * 30, 8, 8, 0.9), O(x1, y, 4, 4, 0.2), i % 2 ? st.core : st.mid, { round: true, ease: "ease-in" })); }
    return out.concat(ring(40, x1, y, 10, 50, st.hot, 380));
  },
  // Ice or rock shards: points converging on it, shattering.
  shards: ({ x1, y, P, O, ring, st, rnd, v }) => {
    const out = [];
    for (let i = 0; i < 6 + (v % 3); i++) { const a = (i / 6) * Math.PI * 2; out.push(P(-180 + i * 20, 180, O(x1 + Math.cos(a) * 44, y + Math.sin(a) * 34, 6, 6, 1), O(x1 + Math.cos(a) * 6, y + Math.sin(a) * 5, 4, 4, 1), i % 2 ? "#ffffff" : st.core, { ease: "ease-in" }), P(0, 300, O(x1, y, 4, 4, 1), O(x1 + (rnd() - 0.5) * 50, y + (rnd() - 0.5) * 40, 3, 3, 0), st.hot)); }
    return out.concat(ring(0, x1, y, 8, 46, st.core, 340));
  },
  // A fairy's light: twinkles drifting in, a soft pink burst, stars rising.
  sparkle: ({ x0, x1, y, P, O, fly, flash, st, rnd, FLY }) => {
    const out = [];
    for (let i = 0; i < 6; i++) out.push(fly(-FLY + i * 30, 5, 5, i % 2 ? "#ffffff" : st.core, { round: true }, (i % 2 ? -1 : 1) * (4 + i * 2)));
    for (let i = 0; i < 5; i++) out.push(P(30 + i * 30, 400, O(x1 + (rnd() - 0.5) * 30, y, 4, 4, 1), O(x1 + (rnd() - 0.5) * 40, y - 30 - rnd() * 10, 3, 3, 0), "#ffffff", { round: true }));
    return out.concat(flash(0, x1, y, 34, st.mid));
  },
  // Earth power: the ground under it erupts, earth and light thrown up.
  quake: ({ x1, y, g, P, O, ring, st, rnd }) => {
    const out = [ring(0, x1, g - 2, 10, 80, "#c8a060", 420)];
    for (let i = 0; i < 7; i++) out.push(P(i * 20, 380, O(x1 + (i - 3) * 8, g - 2, 6, 6, 1), O(x1 + (i - 3) * 12, y - 24 - rnd() * 16, 4, 4, 0), i % 2 ? st.core : "#a87a4a"));
    return out;
  },
};
// The parts for one of these moves, or null (one with a look of its own, or none of these).
export function archParts(name, physical, type, c) {
  const kind = archOf(name, physical, type);
  const f = (physical ? PHYS_ARCH : SPEC_ARCH)[kind];
  return f ? f({ ...c, v: hash(name) }) : null;
}

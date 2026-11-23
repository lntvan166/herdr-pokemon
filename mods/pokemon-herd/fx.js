import { archParts } from "./fx-arch.js";
import { EXTRA_MOVES } from "./more-moves.js";
const EXTRA_NAMES = new Set(Object.values(EXTRA_MOVES).flat().map(([n]) => n)); // (fx-arch.js draws these)
const EXTRA_PHYSICAL = new Set(Object.values(EXTRA_MOVES).flat().filter(([, ph]) => ph).map(([n]) => n));
import { PHYSICAL, SPECIAL, SIGNATURE } from "./fx-moves.js";
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
    // Debris by its look: embers rise, drops and rocks fall, sparks and leaves fly flat.
    const lift = { orb: -8, bubble: 9, shard: 10, leaf: -2, spark: 0, wind: -2, ring: 0, star: -3 }[style.look] ?? 0;
    const [w, h] = style.look === "spark" ? [size + 3, Math.max(1, size - 2)] : style.look === "leaf" || style.look === "wind" ? [size + 2, Math.max(2, size - 1)] : [size, size];
    sparks.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.8 - 3 + lift * p, size, w, h, color: [style.hot, style.mid, style.core][i % 3], round: style.look !== "shard" && style.look !== "spark" && style.look !== "leaf" });
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
// How far apart two battle, by how wide each is drawn (px): half of each, and FIGHT_ROOM between
// for their moves to fly, MIN_GAP..MAX_GAP.
export const FIGHT_ROOM = 60, MIN_GAP = 96, MAX_GAP = 170;
export const fightGap = (wa, wb) => Math.round(Math.min(MAX_GAP, Math.max(MIN_GAP, (wa || 0) / 2 + (wb || 0) / 2 + FIGHT_ROOM)));
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

// ---- a move's phases: gathering power, its flight, what it leaves ----------------------------
// Before it flies, the move gathers at the mouth: sparks drawn in from round it, a glow swelling.
export const CHARGE_MS = 340;
// How each type's move travels: a beam (a rail from one to the other, then fading), an arc (a
// rock thrown up and down onto it), a volley (three in a row, a little apart: leaves, bubbles,
// sludge, rings, gusts), a dash (it rushes in and strikes, no shot), else an orb (a shot).
export const TRAVEL = {
  ice: "beam", steel: "beam", electric: "beam", fairy: "beam",
  rock: "arc", ground: "arc",
  grass: "volley", water: "volley", poison: "volley", psychic: "volley", flying: "volley",
};
export const BEAMS = new Set(Object.keys(TRAVEL).filter((t) => TRAVEL[t] === "beam"));
// A physical move (moves.js) is a dash whatever its type; a special one travels its type's way.
export const travelOf = (type, physical = false) => (physical ? "dash" : TRAVEL[type] ?? "orb");
export const VOLLEY = [[0, 0], [70, -5], [140, 5]]; // each shot: [ms after the first, px up or down]
export const ARC_PEAK = 34; // how high a thrown rock goes over its path
export const DASH_SHORT = 30; // a dash stops this far short of the target
// The sparks gathering: each from (dx, dy) round the mouth to it, seeded.
export function chargeParts(style, seed = 1) {
  let s = seed % 2147483647 || 1;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  return Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 + (rnd() - 0.5) * 0.5;
    const r = 18 + 10 * rnd();
    return { dx: Math.cos(a) * r, dy: Math.sin(a) * r * 0.8, size: Math.round(2 + 3 * rnd()), color: i % 2 ? style.hot : style.mid };
  });
}
// The damage a blow did, floating up from the target: "-23%", coloured by how effective
// (yours hurt: red).
export function damageText(dmg, eff = 1, own = false) {
  if (!(dmg > 0) || eff === 0) return null; // no effect: no number
  const pct = Math.min(100, Math.max(1, Math.round(100 * dmg))); // (more than it had: 100%)
  const color = own ? "#ff8a80" : eff >= 2 ? "#ffd23f" : eff < 1 ? "#c8ccd4" : "#ffffff";
  return [`-${pct}%`, color];
}
// Which sound goes with each moment (mods/pokemon-herd/sfx/<name>.mp3, scripts/make-sfx.py).
export const SOUNDS = ["charge", "whoosh", "zap", "hit", "bighit", "faint", "throw", "absorb", "shake", "gotcha", "break"];
export const launchSound = (type, physical = false) => (travelOf(type, physical) === "beam" ? "zap" : "whoosh");
// The word over a blow's target: a critical hit's, else how effective it was.
export const blowWord = (eff, crit = false) => (crit && eff > 0 ? ["A critical hit!", "#ff8a3c"] : effectWord(eff)); // no crit on what it can't touch
// A dash: how far it rushes (to `DASH_SHORT` short of the target) and back, `t` ms after it sets
// off; `ms` its run. { px, ms }: its offset now and how long to get there.
export function dashAt(from, to, launch, land, now, stop = 0) {
  const run = to - from - Math.sign(to - from) * DASH_SHORT;
  if (now < launch || now >= land + stop + 260) return null;
  if (now < land) return { px: run, ms: Math.max(1, land - now) };
  return now < land + stop ? { px: run, ms: 1 } : { px: 0, ms: 260 }; // held there through a hitstop
}
// Hitstop: a heavy blow (super effective, a critical hit, a signature move, the last one) holds
// both still for a moment before it's knocked back, as fighting games do; never a miss.
export const HITSTOP = 90;
export const stopOf = (b) => (b && !b.miss && b.p >= 0.85 ? HITSTOP : 0);
export const stopOfMove = (m) => (m && !m.miss && (m.crit || m.ultimate || (m.eff ?? 1) >= 2) ? HITSTOP : 0);
export const hitSound = (p) => (p >= 0.8 ? "bighit" : "hit");

// A move that misses: the target hops aside (a few px away from it, no shake), "Missed!" over it;
// no burst, no number, no flash.
export const MISS_WORD = ["Missed!", "#c8ccd4"];
export const MISS_KNOCK = { px: 6, shake: false };
// A physical move landing: claw marks across the target, three slashes a pixel-step at a time
// (dir: the way the blow goes, 1 or -1), drawn whole and fading. Parts { x, y, w, h, color }
// round (0, 0); `p` the blow's power makes them longer.
export function slashParts(style, dir = 1, p = 0.6) {
  const steps = Math.round(5 + 4 * p), cell = 3;
  const out = [];
  for (let k = 0; k < 3; k++) {
    for (let i = 0; i < steps; i++) {
      // top-left to bottom-right going right (mirrored going left), each slash 6 px after the last
      const x = dir * (i * cell - (steps * cell) / 2 + (k - 1) * 6 - k * 2);
      const y = i * cell - (steps * cell) / 2 + (k - 1) * 2;
      const edge = i === 0 || i === steps - 1;
      out.push({ x, y, w: edge ? 2 : cell, h: edge ? 2 : cell, color: i % 2 ? style.hot : style.core });
    }
  }
  return out;
}
// Rushing in: streaks trailing behind it (dir: the way it runs), in its move's colours.
export function speedLines(style, dir = 1) {
  return [[-6, 24], [4, 34], [14, 18]].map(([dy, len], k) => ({ x: -dir * (22 + len / 2 + k * 4), y: dy, w: len, h: 2, color: k === 1 ? style.glow : style.mid, opacity: 0.75 }));
}

// ---- the big moments: evolving, Mega Evolving, a catch, a raid egg hatching -------------------
export const EVOLVE_MS = 3000, EVOLVE_BURST = 2000; // a light column, then it bursts (and stays)
// Evolving, as the games show it: its old form turns to white light (EVOLVE_WHITE), then the white
// shape switches between the old form's and the new one's, faster and faster (EVOLVE_SWAPS: when
// each switch comes, ms in), till the burst shows the new form.
export const EVOLVE_WHITE = 500;
export const EVOLVE_SWAPS = (() => {
  const out = [];
  for (let t = EVOLVE_WHITE + 150, gap = 300; t < EVOLVE_BURST - 40; gap = Math.max(60, gap * 0.75)) { out.push(Math.round(t)); t += gap; }
  return out;
})();
// Which white shape shows `t` ms in: "old" or "new" (every switch flips it).
export const evolveShape = (t) => (EVOLVE_SWAPS.filter((s) => s <= t).length % 2 ? "new" : "old");
export const MEGA_MS = 1500, MEGA_BURST = 1100; // a sphere and orbiting colours, then a burst
export const HATCH_SHAKE = 3000, HATCH_MS = 900; // an egg's last seconds; its hatching
export const RAINBOW = ["#ff5a5a", "#ffb43a", "#ffe14a", "#7bd65a", "#4fb4ff", "#b070ff"];
export const MEGA_STYLE = { glow: "#c8a0ff", core: "#ff70c0", mid: "#7aa2f7", hot: "#ffffff", look: "star" };
export const GOLD_STYLE = { glow: "#ffe9a8", core: "#ffd75e", mid: "#fff2c0", hot: "#ffffff", look: "star" };

// ---- what a move leaves on its target for a moment ------------------------------------------
// After the hit, by the move's type: burning, shocked, frosted, poisoned, dizzy, dripping,
// leaves falling, dust, sparkles. RESIDUE_MS from a little after the blow, fading at the end.
export const RESIDUE = {
  fire: "burn", electric: "shock", ice: "freeze", poison: "poison",
  psychic: "dizzy", ghost: "dizzy", dark: "dizzy", water: "drip", grass: "leaf", bug: "leaf",
  rock: "dust", ground: "dust", fighting: "dust",
  dragon: "sparkle", fairy: "sparkle", steel: "sparkle", normal: "sparkle", flying: "sparkle",
};
export const residueOf = (type) => RESIDUE[type] ?? null;
export const RESIDUE_FROM = 150, RESIDUE_MS = 1300, RESIDUE_FADE = 260;
// A status, as it's given and as it hurts (burn, poison) or costs a turn (paralysed, frozen):
// its residue over the one it's on, for `ms`, in its type's colours. (A moment only: no motion
// left on it after; frozen, it stays tinted, still.)
export const STATUS_FX = { brn: "burn", par: "shock", psn: "poison", frz: "freeze" };
export const STATUS_TYPE = { brn: "fire", par: "electric", psn: "poison", frz: "ice" };
export const AURA_GIVEN = 1300, AURA_TICK = 800, AURA_SKIP = 900, AURA_THAW = 700;
// [{ at, kind, ms, type, jolt? }] for a status: given, its exchange's hurt, a turn it lost, thawing.
export const statusAura = (what, at, ms, more = {}) => (STATUS_FX[what] ? { at, kind: STATUS_FX[what], ms, type: STATUS_TYPE[what], ...more } : null);

// ---- signature moves: each its own look, as in the games ------------------------------------
// A signature move (moves.js, names[2]) is drawn its own way instead of its type's shot. Each
// part: { at, ms, a, b, color, round?, ring?, ease? }: drawn as `a` ({ x, y, w, h, o }: centre,
// size, opacity) `at` ms after it lands (negative: before), moving to `b` over `ms`.
// x0: where it's fired from, x1: the target, y: their middle; the sky is above y - 30, the ground
// at y + 16. Seeded: the same move looks the same on every frame.
export const SIG_GROUND = 16;
const P = (at, ms, a, b, color, more = {}) => ({ at, ms, a, b, color, ...more });
const O = (x, y, w, h, o = 1) => ({ x, y, w, h, o });
export function signatureParts(type, x0, x1, y, seed = 1, style = null, name = null) {
  let s = seed % 2147483647 || 1;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const st = style ?? MOVE[type] ?? MOVE.normal; // its colours (Mega Charizard X: blue fire)
  const dir = x1 >= x0 ? 1 : -1, dist = Math.abs(x1 - x0), mid = (x0 + x1) / 2;
  const g = y + SIG_GROUND, sky = Math.max(2, y - 46);
  const ring = (at, x, yy, d0, d1, color, ms = 420, o = 0.9) => P(at, ms, O(x, yy, d0, d0, o), O(x, yy, d1, d1, 0), color, { round: true, ring: true });
  const flash = (at, x, yy, d, color, ms = 260) => P(at, ms, O(x, yy, d * 0.4, d * 0.4, 1), O(x, yy, d, d, 0), color, { round: true });
  // A Pokémon's own move with a look of its own (fx-moves.js SIGNATURE: Judgment).
  if (SIGNATURE[name]) return SIGNATURE[name]({ x0, x1, y, g, sky, dir, dist, mid, st, rnd, P, O, ring, flash });
  // Risen to its type's strongest (moves.js TOP_MOVE) that's one of the games' others (Zap Cannon,
  // High Jump Kick, Foul Play, Double Iron Bash): its own look (fx-arch.js), a kick where it lands,
  // a ball flying, lit gold as it lands (the type's scene was the old one's: Thunder's cloud).
  if (EXTRA_NAMES.has(name)) {
    const own = EXTRA_PHYSICAL.has(name) ? physicalParts(type, x1, y, g, dir, seed, style, name) : specialParts(type, x0, x1, y, seed, style, name);
    return [...own, flash(0, x1, y, 58, "#ffd23f", 320), ring(40, x1, y, 10, 84, "#ffd23f", 460), ring(110, x1, y, 8, 58, st.hot, 380)];
  }
  const out = [];
  switch (type) {
    case "normal": // Giga Impact: a white blast charging across, a shockwave where it lands
      out.push(P(-300, 300, O(x0, y, 14, 14, 1), O(x1, y, 30, 30, 1), st.hot, { round: true, ease: "ease-in" }),
        P(-300, 300, O(x0, y, 6, 22, 0.5), O(x1 - dir * 18, y, 40, 10, 0.4), st.core, { round: true, ease: "ease-in" }),
        flash(0, x1, y, 46, st.hot), ring(0, x1, y, 12, 80, st.core, 480), ring(70, x1, y, 8, 54, st.hot, 380));
      break;
    case "fire": // Blast Burn: the ground under it erupts in pillars of flame
      for (let i = 0; i < 5; i++) {
        const x = x1 + (i - 2) * 9, h = 30 + rnd() * 18;
        out.push(P(-80 + Math.abs(i - 2) * 50, 420, O(x, g, 8, 2, 1), O(x, g - h / 2, 11, h, 0), [st.core, st.mid, st.hot][i % 3], { ease: "ease-out" }));
      }
      out.push(P(-140, 200, O(x1, g, 10, 3, 0.9), O(x1, g, 60, 6, 0.9), st.glow, { round: true }), flash(40, x1, y, 54, st.mid, 320));
      break;
    case "water": // Hydro Cannon: a thick jet across, splashing
      out.push(P(-260, 260, O(x0, y, 6, 14, 1), O(mid, y, dist, 14, 1), st.core, { round: true, ease: "linear" }),
        P(-260, 260, O(x0, y, 4, 6, 1), O(mid, y, dist, 6, 1), st.hot, { round: true, ease: "linear" }),
        P(0, 320, O(mid, y, dist, 14, 1), O(mid, y, dist, 2, 0), st.mid, { round: true }));
      for (let i = 0; i < 6; i++) out.push(P(0, 420, O(x1, y, 5, 5, 1), O(x1 + (rnd() - 0.2) * 40 * dir, y - 10 - rnd() * 20, 3, 3, 0), st.mid, { round: true }));
      out.push(ring(0, x1, y, 10, 50, st.glow));
      break;
    case "grass": // Frenzy Plant: vines bursting out of the ground, one after another, to it
      for (let i = 0; i < 6; i++) {
        const x = x0 + dir * (dist * (0.3 + 0.14 * i)), h = 14 + i * 4;
        out.push(P(-360 + i * 60, 360, O(x, g, 5, 2, 1), O(x, g - h / 2, 6, h, 0), i % 2 ? st.core : st.glow, { ease: "ease-out" }),
          P(-340 + i * 60, 340, O(x, g, 3, 3, 1), O(x + 5, g - h, 6, 4, 0), st.mid, { round: true }));
      }
      out.push(flash(0, x1, y, 40, st.hot));
      break;
    case "electric": { // Zap Cannon (its strongest: moves.js TOP_MOVE): a dark cloud over it, a bolt out of the sky
      out.push(P(-420, 380, O(x1, sky - 4, 20, 6, 0), O(x1, sky - 4, 46, 12, 0.85), "#3a3f55", { round: true }));
      const n = 5, seg = (y - sky) / n;
      for (let i = 0; i < n; i++) {
        const xa = x1 + (i % 2 ? 5 : -4);
        out.push(P(-60, 320, O(xa, sky + seg * (i + 0.5), 4, seg + 2, 1), O(xa, sky + seg * (i + 0.5), 2, seg + 2, 0), i % 2 ? st.hot : st.core));
      }
      out.push(flash(0, x1, y, 44, st.mid), ring(0, x1, g, 10, 60, st.glow, 380));
      break;
    }
    case "ice": // Blizzard: a storm of snow blowing over it, a frost cloud
      out.push(P(-380, 380, O(x1 - dir * 40, y, 20, 18, 0), O(x1, y, 64, 30, 0.3), st.mid, { round: true }));
      for (let i = 0; i < 12; i++) {
        const dy = (rnd() - 0.5) * 40;
        out.push(P(-380 + i * 32, 360, O(x1 - dir * (70 + rnd() * 30), y + dy - 10, 3, 3, 1), O(x1 + dir * (20 + rnd() * 20), y + dy + 6, 4, 4, 0), i % 3 ? "#ffffff" : st.core, { round: true, ease: "linear" }));
      }
      out.push(P(0, 500, O(x1, y, 64, 30, 0.3), O(x1, y, 84, 36, 0), st.hot, { round: true }));
      break;
    case "fighting": // High Jump Kick (TOP_MOVE), drawn as a flurry of blows landing all over it
      for (let i = 0; i < 7; i++) {
        const x = x1 + (rnd() - 0.5) * 30, yy = y + (rnd() - 0.5) * 26;
        out.push(ring(-300 + i * 50, x, yy, 4, 22, i % 2 ? st.hot : st.core, 220, 1), flash(-300 + i * 50, x, yy, 12, st.mid, 160));
      }
      break;
    case "poison": // Gunk Shot: a great glob lobbed over, splattering into a pool
      out.push(P(-340, 170, O(x0, y, 10, 10, 1), O(mid, y - 34, 16, 14, 1), st.core, { round: true, ease: "ease-out" }),
        P(-170, 170, O(mid, y - 34, 16, 14, 1), O(x1, y, 20, 18, 1), st.core, { round: true, ease: "ease-in" }),
        P(0, 520, O(x1, g, 14, 4, 0.9), O(x1, g, 64, 8, 0), st.glow, { round: true }));
      for (let i = 0; i < 6; i++) out.push(P(0, 380, O(x1, y, 6, 6, 1), O(x1 + (rnd() - 0.5) * 56, y - 6 - rnd() * 22, 4, 4, 0), i % 2 ? st.mid : st.core, { round: true }));
      break;
    case "ground": // Precipice Blades: blades of rock rising out of the ground, up to it
      for (let i = 0; i < 5; i++) {
        const x = x0 + dir * dist * (0.35 + 0.16 * i), h = 18 + i * 5;
        out.push(P(-300 + i * 60, 380, O(x, g, 10, 2, 1), O(x, g - h / 2, 10, h, 0), i % 2 ? "#8a5a34" : "#b0703c", { ease: "ease-out" }),
          P(-300 + i * 60, 380, O(x, g, 4, 2, 1), O(x, g - h - 4, 4, 10, 0), "#ff6a3a", { ease: "ease-out" }));
      }
      out.push(P(-120, 380, O(x1, g, 20, 4, 0.8), O(x1, g, 70, 8, 0), "#c8bca8", { round: true }));
      break;
    case "flying": // Hurricane: a whirlwind round it
      for (let i = 0; i < 5; i++) {
        const yy = g - i * 10;
        out.push(P(-360 + i * 40, 520, O(x1, yy, 10 + i * 6, 5, 0.9), O(x1, yy - 8, 30 + i * 10, 7, 0), i % 2 ? st.hot : st.glow, { round: true, ring: true }));
      }
      for (let i = 0; i < 5; i++) out.push(P(-300 + i * 60, 400, O(x1 - 18 + i * 8, g, 3, 3, 1), O(x1 + 18 - i * 8, y - 30, 3, 3, 0), st.core, { round: true, ease: "linear" }));
      break;
    case "psychic": // Psystrike: rings closing in on it from all round, then a pulse
      for (let i = 0; i < 3; i++) out.push(P(-380 + i * 100, 340, O(x1, y, 90, 90, 0.15), O(x1, y, 10, 10, 1), i % 2 ? st.hot : st.core, { round: true, ring: true, ease: "ease-in" }));
      out.push(flash(0, x1, y, 40, st.mid), ring(0, x1, y, 12, 90, st.glow, 520));
      break;
    case "bug": // Megahorn: a great horn of light driving across
      out.push(P(-220, 220, O(x0, y, 26, 4, 1), O(x1, y, 26, 4, 1), st.hot, { ease: "ease-in" }),
        P(-220, 220, O(x0 - dir * 10, y, 20, 10, 0.7), O(x1 - dir * 14, y, 30, 12, 0.7), st.core, { round: true, ease: "ease-in" }),
        P(-220, 260, O(x0, y, 10, 2, 0.6), O(mid, y, dist, 2, 0), st.glow, { ease: "ease-in" }),
        flash(0, x1, y, 40, st.mid), ring(0, x1, y, 10, 56, st.core));
      break;
    case "rock": // Head Smash: boulders crashing down on it
      for (let i = 0; i < 3; i++) {
        const dx = (i - 1) * 14, d = 12 - Math.abs(i - 1) * 3;
        out.push(P(-260 + i * 70, 260, O(x1 + dx - dir * 20, sky - 10, d, d, 1), O(x1 + dx, y + 4, d, d, 1), i % 2 ? "#8a7a5a" : "#a8946a", { round: true, ease: "ease-in" }));
      }
      out.push(P(0, 420, O(x1, g, 16, 4, 0.8), O(x1, g, 70, 8, 0), "#c8bca8", { round: true }), flash(0, x1, y, 36, "#e8dcc0"));
      break;
    case "ghost": // Shadow Force: a rift tearing open behind it, the dark lunging out
      out.push(P(-380, 300, O(x1 + dir * 14, y, 2, 6, 1), O(x1 + dir * 14, y, 14, 46, 0.95), "#120a1e", { round: true }),
        P(-380, 300, O(x1 + dir * 14, y, 2, 4, 1), O(x1 + dir * 14, y, 18, 52, 0.7), st.core, { round: true, ring: true }),
        P(0, 340, O(x1 + dir * 14, y, 14, 46, 0.95), O(x1 + dir * 14, y, 2, 6, 0), "#120a1e", { round: true }),
        P(-40, 260, O(x1 + dir * 10, y, 10, 10, 0.9), O(x1 - dir * 22, y, 34, 34, 0), st.glow, { round: true, ease: "ease-in" }));
      break;
    case "dragon": // Draco Meteor: meteors raining down on it
      for (let i = 0; i < 4; i++) {
        const dx = (i - 1.5) * 12, at = -320 + i * 80;
        out.push(P(at, 240, O(x1 + dx - dir * 46, sky - 10, 9, 9, 1), O(x1 + dx, y + 6, 9, 9, 1), i % 2 ? "#ff9a3c" : st.core, { round: true, ease: "ease-in" }),
          P(at, 240, O(x1 + dx - dir * 54, sky - 18, 5, 5, 0.7), O(x1 + dx - dir * 8, y - 2, 5, 5, 0.3), st.glow, { round: true, ease: "ease-in" }),
          flash(at + 240, x1 + dx, y + 6, 22, "#ffd23f", 220));
      }
      break;
    case "dark": { // Night Daze: a dark shockwave swelling out from where it stands to it
      const w = dist * 2 + 10, h = Math.min(50, dist * 0.4 + 18); // reaching it
      out.push(P(-300, 300, O(x0, y, 10, 10, 0.6), O(x0, y, w, h, 0.3), "#1a0e1e", { round: true, ease: "ease-out" }),
        P(-300, 300, O(x0, y, 10, 10, 1), O(x0, y, w + 4, h + 4, 0.8), "#c0304a", { round: true, ring: true, ease: "ease-out" }),
        P(0, 300, O(x0, y, w + 4, h + 4, 0.8), O(x0, y, w + 30, h + 14, 0), "#c0304a", { round: true, ring: true }));
      break;
    }
    case "steel": // Meteor Mash: a steel star streaking down on it like a comet
      out.push(P(-300, 300, O(x0, sky, 12, 12, 1), O(x1, y, 14, 14, 1), st.hot, { round: true, ease: "ease-in" }),
        P(-300, 320, O(x0 - dir * 8, sky - 6, 8, 8, 0.6), O(x1 - dir * 14, y - 8, 8, 8, 0), st.core, { round: true, ease: "ease-in" }),
        flash(0, x1, y, 42, st.hot), ring(0, x1, y, 10, 60, st.glow));
      for (let i = 0; i < 6; i++) out.push(P(0, 360, O(x1, y, 3, 3, 1), O(x1 + Math.cos(i) * 26, y + Math.sin(i) * 18, 2, 2, 0), "#ffffff"));
      break;
    case "fairy": // Light of Ruin: a column of pink light from the sky onto it
      out.push(P(-380, 340, O(x1, sky, 4, 4, 0.2), O(x1, sky, 16, 16, 1), st.hot, { round: true }),
        P(-40, 140, O(x1, (sky + g) / 2, 2, g - sky, 1), O(x1, (sky + g) / 2, 16, g - sky, 1), st.core),
        P(100, 360, O(x1, (sky + g) / 2, 16, g - sky, 1), O(x1, (sky + g) / 2, 2, g - sky, 0), st.hot),
        flash(0, x1, y, 48, st.mid, 360));
      for (let i = 0; i < 5; i++) out.push(P(40 + i * 30, 420, O(x1 + (rnd() - 0.5) * 30, g - 4, 3, 3, 1), O(x1 + (rnd() - 0.5) * 40, y - 30, 3, 3, 0), "#ffffff", { round: true }));
      break;
  }
  return out;
}
// When a signature move's parts set off, ms after it lands (frames are asked for then).
export const signatureTimes = (type, name = null) => [...new Set(signatureParts(type, 0, 100, 40, 1, null, name).flatMap((p) => [p.at, p.at + 40]))];

// ---- physical moves: each its own mark where it lands ------------------------------------------
// The physical move of each type (moves.js, names[0]) leaves its own mark on the target as it
// lands, parts as signatureParts ({ at, ms, a, b, color, round?, ring?, ease? }, `at` from when it
// lands). x, y: the target's middle, g its ground; dir: the way the blow goes.
// A slash a pixel-step at a time, from (x, y) `n` steps of (sx, sy): small squares, drawn at once.
const steps = (at, ms, x, y, n, sx, sy, colors, size = 3) => Array.from({ length: n }, (_, i) =>
  P(at, ms, O(x + i * sx, y + i * sy, size, size, 1), O(x + i * sx, y + i * sy, size, size, 0), colors[i % colors.length]));
export function physicalParts(type, x, y, g, dir = 1, seed = 1, style = null, name = null) {
  let s = seed % 2147483647 || 1;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const st = style ?? MOVE[type] ?? MOVE.normal;
  const ring = (at, xx, yy, d0, d1, color, ms = 380, o = 0.9) => P(at, ms, O(xx, yy, d0, d0, o), O(xx, yy, d1, d1, 0), color, { round: true, ring: true });
  const puff = (at, xx, yy, d, color, ms = 300, o = 1) => P(at, ms, O(xx, yy, d * 0.4, d * 0.4, o), O(xx, yy, d, d, 0), color, { round: true });
  const fist = (color, glow) => [P(-120, 120, O(x - dir * 26, y, 10, 10, 1), O(x - dir * 4, y, 12, 12, 1), color, { round: true, ease: "ease-in" }),
    P(-120, 120, O(x - dir * 30, y, 16, 16, 0.5), O(x - dir * 6, y, 20, 20, 0.6), glow, { round: true, ease: "ease-in" })];
  const out = [];
  // A move with its own look (fx-moves.js).
  if (PHYSICAL[name]) return PHYSICAL[name]({ x, y, g, dir, st, rnd, P, O, ring, puff, steps, fist });
  // The games' others (PokeAPI's): drawn by their kind (fx-arch.js: a fang, a punch, a beam…).
  if (EXTRA_NAMES.has(name)) { const a = archParts(name, true, type, { x, y, g, dir, st, rnd, P, O, ring, puff, steps, fist }); if (a) return a; }
  switch (type) {
    case "normal": // Body Slam: it lands flat on it, a squash of white and dust
      out.push(P(0, 300, O(x, y + 4, 20, 8, 1), O(x, y + 6, 54, 6, 0), st.hot, { round: true }), ring(0, x, g, 10, 64, "#c8bca8", 420));
      break;
    case "fire": // Fire Punch: a fist of flame, flames licking up off it
      out.push(...fist(st.core, st.glow));
      for (let i = 0; i < 5; i++) out.push(P(20 + i * 30, 380, O(x + (i - 2) * 6, y, 6, 6, 1), O(x + (i - 2) * 8, y - 22 - rnd() * 10, 4, 10, 0), [st.core, st.mid, st.hot][i % 3], { round: true }));
      break;
    case "water": // Waterfall: a column of water crashing up under it
      out.push(P(-40, 360, O(x, g, 16, 4, 1), O(x, (g + y - 30) / 2, 18, g - y + 30, 0), st.core, { ease: "ease-out" }),
        P(-40, 360, O(x, g, 8, 4, 1), O(x, (g + y - 30) / 2, 8, g - y + 30, 0), st.hot, { ease: "ease-out" }));
      for (let i = 0; i < 5; i++) out.push(P(80, 360, O(x, y - 24, 4, 4, 1), O(x + (rnd() - 0.5) * 40, y - 6, 3, 3, 0), st.mid, { round: true }));
      break;
    case "grass": // Leaf Blade: one long green cut, leaves scattering
      out.push(...steps(0, 420, x - dir * 16, y - 16, 11, dir * 3, 3, [st.hot, st.core, st.glow], 4));
      for (let i = 0; i < 4; i++) out.push(P(40, 420, O(x, y, 5, 3, 1), O(x + dir * (10 + rnd() * 24), y - 14 + rnd() * 28, 5, 3, 0), st.mid));
      break;
    case "electric": // Thunder Punch: a fist of sparks, bolts jumping off it
      out.push(...fist(st.hot, st.core));
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + 0.4;
        out.push(...steps(0, 260, x + Math.cos(a) * 6, y + Math.sin(a) * 6, 4, Math.round(Math.cos(a) * 4) + (k % 2 ? 1 : -1), Math.round(Math.sin(a) * 4), [st.hot, st.core], 2));
      }
      break;
    case "ice": // Ice Punch: a fist of frost, ice crystals left on it
      out.push(...fist(st.hot, st.core), ring(0, x, y, 10, 44, st.glow));
      for (let i = 0; i < 5; i++) out.push(P(0, 560, O(x + (rnd() - 0.5) * 24, y + (rnd() - 0.5) * 24, 5, 5, 1), O(x + (rnd() - 0.5) * 30, y + (rnd() - 0.5) * 30, 2, 2, 0), i % 2 ? st.hot : st.mid));
      break;
    case "fighting": // Brick Break: a chop coming down on it, cracks
      out.push(P(-110, 110, O(x - dir * 6, y - 30, 6, 18, 1), O(x - dir * 2, y - 6, 6, 18, 1), st.hot, { ease: "ease-in" }));
      out.push(...steps(0, 380, x - 2, y - 2, 4, -3, 3, [st.core]), ...steps(0, 380, x + 2, y - 2, 4, 3, 3, [st.core]), ...steps(0, 380, x, y + 2, 4, 0, 3, [st.core]));
      break;
    case "poison": // Poison Jab: a quick purple jab, bubbles of poison
      out.push(P(-90, 90, O(x - dir * 30, y, 22, 3, 1), O(x - dir * 4, y, 22, 3, 1), st.hot, { ease: "ease-in" }));
      for (let i = 0; i < 5; i++) out.push(P(30 + i * 40, 420, O(x + (rnd() - 0.5) * 20, y + 6, 4, 4, 1), O(x + (rnd() - 0.5) * 26, y - 20 - rnd() * 10, 7, 7, 0), i % 2 ? st.mid : st.core, { round: true, ring: i % 2 === 0 }));
      break;
    case "ground": // Earthquake: the ground cracks out from under it, dust thrown up
      out.push(...steps(0, 520, x, g, 7, 4, 0, ["#5a3a1c"]).map((p, i) => ({ ...p, a: { ...p.a, y: g + (i % 2) }, b: { ...p.b, y: g + (i % 2) } })),
        ...steps(0, 520, x, g, 7, -4, 0, ["#5a3a1c"]).map((p, i) => ({ ...p, a: { ...p.a, y: g - (i % 2) }, b: { ...p.b, y: g - (i % 2) } })));
      for (const d of [-1, 1]) for (let i = 0; i < 3; i++) out.push(puff(40 + i * 60, x + d * (8 + i * 12), g - 6, 16, "#c8bca8", 420, 0.9));
      break;
    case "flying": // Brave Bird: wings of light closing on it, feathers
      out.push(P(0, 380, O(x, y, 14, 30, 0.9), O(x, y, 64, 44, 0), st.hot, { round: true, ring: true }), puff(0, x, y, 30, st.glow));
      for (let i = 0; i < 4; i++) out.push(P(40, 520, O(x, y, 6, 3, 1), O(x + (rnd() - 0.5) * 50, y + 10 + rnd() * 12, 6, 3, 0), "#ffffff"));
      break;
    case "psychic": // Zen Headbutt: a pink pulse off its head, stars
      out.push(ring(0, x - dir * 8, y - 8, 8, 50, st.core, 420), ring(80, x - dir * 8, y - 8, 6, 36, st.hot, 340));
      for (let i = 0; i < 3; i++) out.push(P(60, 520, O(x, y - 16, 4, 4, 1), O(x + (i - 1) * 14, y - 26, 4, 4, 0), "#ffd23f"));
      break;
    case "bug": // X-Scissor: an X cut across it
      out.push(...steps(0, 420, x - 12, y - 12, 9, 3, 3, [st.hot, st.core], 3), ...steps(40, 420, x + 12, y - 12, 9, -3, 3, [st.hot, st.core], 3));
      break;
    case "rock": // Stone Edge: sharp stones jabbing up round it
      for (let i = 0; i < 4; i++) {
        const xx = x + (i - 1.5) * 10, h = 14 + (i % 2) * 8;
        out.push(P(i * 30, 400, O(xx, g, 6, 2, 1), O(xx, g - h / 2, 6, h, 0), i % 2 ? "#a8946a" : "#8a7a5a", { ease: "ease-out" }));
      }
      break;
    case "ghost": // Shadow Claw: three long claws of shadow
      for (let k = 0; k < 3; k++) out.push(...steps(k * 30, 460, x - dir * 18 + dir * k * 7, y - 18, 10, dir * 3, 4, ["#120a1e", st.core], 4));
      break;
    case "dragon": // Dragon Claw: three glowing claws
      for (let k = 0; k < 3; k++) out.push(...steps(k * 30, 420, x - dir * 16 + dir * k * 7, y - 16, 9, dir * 3, 4, [st.hot, st.core, st.glow], 3));
      out.push(puff(0, x, y, 30, st.glow, 260, 0.6));
      break;
    case "dark": { // Crunch: jaws snapping shut on it
      for (let i = 0; i < 5; i++) {
        const xx = x + (i - 2) * 6;
        out.push(P(-120, 120, O(xx, y - 26, 4, 6, 1), O(xx, y - 5, 4, 6, 1), "#ffffff", { ease: "ease-in" }),
          P(-120, 120, O(xx + 3, y + 22, 4, 6, 1), O(xx + 3, y + 3, 4, 6, 1), "#ffffff", { ease: "ease-in" }));
      }
      out.push(P(0, 300, O(x, y, 34, 18, 0.9), O(x, y, 44, 4, 0), "#c0304a", { round: true }));
      break;
    }
    case "steel": // Iron Head: a hard metal clang, glints
      out.push(ring(0, x - dir * 6, y - 6, 8, 40, st.hot, 300), puff(0, x - dir * 6, y - 6, 26, st.core, 220));
      for (let i = 0; i < 4; i++) {
        const xx = x + (i - 1.5) * 12, yy = y - 14 + (i % 2) * 18;
        out.push(P(40 + i * 40, 300, O(xx, yy, 2, 10, 1), O(xx, yy, 1, 2, 0), "#ffffff"), P(40 + i * 40, 300, O(xx, yy, 10, 2, 1), O(xx, yy, 2, 1, 0), "#ffffff"));
      }
      break;
    case "fairy": // Play Rough: a cartoon scuffle cloud, stars and hearts flying
      for (let i = 0; i < 5; i++) out.push(puff(i * 40, x + (rnd() - 0.5) * 26, y + (rnd() - 0.5) * 18, 22, i % 2 ? "#ffffff" : st.mid, 360, 0.9));
      for (let i = 0; i < 4; i++) out.push(P(60, 460, O(x, y, 4, 4, 1), O(x + (rnd() - 0.5) * 50, y - 18 - rnd() * 14, 4, 4, 0), i % 2 ? "#ffd23f" : st.core, { round: i % 2 === 0 }));
      break;
  }
  return out;
}
// When a physical move's marks set off, ms after it lands.
export const physicalTimes = (type, name = null) => [...new Set(physicalParts(type, 50, 40, 56, 1, 1, null, name).flatMap((p) => [p.at, p.at + 40]))];

// ---- special moves: each its own look as it flies ----------------------------------------------
// The special move of each type (moves.js, names[1]), fired from where it stands: parts as
// signatureParts, `at` from when it lands (from -FLY: the shortest flight, 320 ms), x0 → x1 at y.
export const FLY = 320;
export function specialParts(type, x0, x1, y, seed = 1, style = null, name = null) {
  let s = seed % 2147483647 || 1;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const st = style ?? MOVE[type] ?? MOVE.normal;
  const dir = x1 >= x0 ? 1 : -1, dist = Math.abs(x1 - x0), mid = (x0 + x1) / 2;
  const g = y + SIG_GROUND;
  const ring = (at, x, yy, d0, d1, color, ms = 360, o = 0.9) => P(at, ms, O(x, yy, d0, d0, o), O(x, yy, d1, d1, 0), color, { round: true, ring: true });
  const flash = (at, x, yy, d, color, ms = 240) => P(at, ms, O(x, yy, d * 0.4, d * 0.4, 1), O(x, yy, d, d, 0), color, { round: true });
  // Something flying x0 → x1 (dy up or down), from `at` till it lands.
  const fly = (at, w, h, color, more = {}, dy = 0, o = 1) => P(at, -at, O(x0, y + dy, w, h, o), O(x1, y + dy, w, h, o), color, { ease: "linear", ...more });
  const out = [];
  if (SPECIAL[name]) return SPECIAL[name]({ x0, x1, y, g, dir, dist, mid, st, rnd, P, O, ring, flash, fly, FLY });
  if (EXTRA_NAMES.has(name)) { const a = archParts(name, false, type, { x0, x1, y, g, dir, dist, mid, st, rnd, P, O, ring, flash, fly, FLY }); if (a) return a; }
  switch (type) {
    case "normal": // Hyper Voice: rings of sound rolling out to it
      for (let i = 0; i < 3; i++) out.push(P(-FLY + i * 70, FLY - i * 70, O(x0, y, 6, 12, 1), O(x1, y, 14, 34, 0.5), i % 2 ? st.hot : st.core, { round: true, ring: true, ease: "linear" }));
      out.push(ring(0, x1, y, 10, 44, st.hot));
      break;
    case "fire": // Flamethrower: a stream of flame, puff after puff, from it to the other
      for (let i = 0; i < 10; i++) {
        const at = -FLY + i * 24, c = [st.hot, st.mid, st.core][i % 3];
        out.push(P(at, 200, O(x0, y, 5, 5, 1), O(x0 + dir * Math.min(dist, 200 / FLY * dist * 1.3), y - 2 + (rnd() - 0.5) * 6, 13, 11, 0.4), c, { round: true, ease: "linear" }));
      }
      out.push(P(-80, 300, O(x1, y, 10, 10, 1), O(x1, y - 10, 26, 26, 0), st.core, { round: true }), flash(0, x1, y, 30, st.mid));
      break;
    case "water": // Surf: a wave rolling along the ground onto it, white on its crest
      out.push(P(-FLY, FLY, O(x0, g - 6, 8, 12, 0.9), O(x1, g - 12, 22, 26, 1), st.core, { round: true, ease: "linear" }),
        P(-FLY, FLY, O(x0 + dir * 2, g - 12, 6, 4, 1), O(x1 + dir * 4, g - 24, 18, 5, 1), st.hot, { round: true, ease: "linear" }),
        P(0, 380, O(x1, g - 12, 22, 26, 1), O(x1 + dir * 10, g - 4, 50, 8, 0), st.mid, { round: true }));
      for (let i = 0; i < 4; i++) out.push(P(0, 360, O(x1, y - 4, 4, 4, 1), O(x1 + (rnd() - 0.3) * dir * 34, y - 20 - rnd() * 12, 3, 3, 0), "#ffffff", { round: true }));
      break;
    case "grass": // Energy Ball: a ball of light, ringed, swirling motes
      out.push(fly(-FLY, 16, 16, st.glow, { round: true }, 0, 0.6), fly(-FLY, 10, 10, st.mid, { round: true }), fly(-FLY, 5, 5, st.hot, { round: true }),
        fly(-FLY, 20, 20, st.core, { round: true, ring: true }), flash(0, x1, y, 36, st.mid), ring(0, x1, y, 10, 46, st.core));
      break;
    case "electric": { // Thunderbolt: a bolt jagging across, crackling
      const n = 7, seg = dist / n;
      for (let i = 0; i < n; i++) {
        const xa = x0 + dir * seg * (i + 0.5), dy = i % 2 ? -5 : 5;
        out.push(P(-120 + i * 12, 240, O(xa, y + dy, seg + 2, 3, 1), O(xa, y + dy, seg + 2, 1, 0), i % 2 ? st.hot : st.core));
      }
      out.push(P(-120, 240, O(mid, y, dist, 12, 0.35), O(mid, y, dist, 2, 0), st.glow), flash(0, x1, y, 34, st.hot), ring(0, x1, y, 8, 40, st.core, 300));
      break;
    }
    case "ice": // Ice Beam: a cold beam reaching across, ice crystals growing on it
      out.push(P(-200, 200, O(x0, y, 4, 5, 1), O(mid, y, dist, 5, 1), st.hot, { ease: "linear" }),
        P(-200, 200, O(x0, y, 4, 11, 0.5), O(mid, y, dist, 11, 0.5), st.glow, { ease: "linear" }),
        P(0, 260, O(mid, y, dist, 11, 0.6), O(mid, y, dist, 1, 0), st.mid));
      for (let i = 0; i < 5; i++) {
        const xx = x1 + (rnd() - 0.5) * 24, yy = y + (rnd() - 0.5) * 26;
        out.push(P(20 + i * 30, 500, O(xx, yy, 2, 2, 1), O(xx, yy, 7, 7, 0), i % 2 ? "#ffffff" : st.core));
      }
      break;
    case "fighting": // Aura Sphere: a sphere of blue aura, homing in
      out.push(P(-FLY, FLY, O(x0, y - 8, 14, 14, 0.5), O(x1, y, 18, 18, 0.6), "#4f8cff", { round: true, ease: "ease-in" }),
        P(-FLY, FLY, O(x0, y - 8, 8, 8, 1), O(x1, y, 10, 10, 1), "#cfe4ff", { round: true, ease: "ease-in" }),
        P(-FLY, FLY, O(x0, y - 8, 20, 20, 0.8), O(x1, y, 24, 24, 0.8), "#2a6cff", { round: true, ring: true, ease: "ease-in" }),
        flash(0, x1, y, 40, "#cfe4ff"), ring(0, x1, y, 10, 50, "#4f8cff"));
      break;
    case "poison": // Sludge Bomb: globs of sludge lobbed up and over, splattering
      for (let i = 0; i < 3; i++) {
        const at = -FLY + i * 50, half = (-at) / 2, d = 9 - i * 2, dx = (i - 1) * 6;
        out.push(P(at, half, O(x0, y, d, d, 1), O(mid, y - 26 - i * 4, d, d, 1), st.core, { round: true, ease: "ease-out" }),
          P(at + half, half, O(mid, y - 26 - i * 4, d, d, 1), O(x1 + dx, y, d + 2, d, 1), i % 2 ? st.mid : st.core, { round: true, ease: "ease-in" }));
      }
      out.push(P(0, 420, O(x1, g, 12, 4, 0.9), O(x1, g, 46, 6, 0), st.glow, { round: true }), flash(0, x1, y, 28, st.mid));
      break;
    case "ground": // Earth Power: the ground under it glows, then bursts up
      out.push(P(-FLY, FLY, O(x1, g, 6, 3, 0.4), O(x1, g, 40, 6, 1), "#ff8a3c", { round: true, ease: "ease-in" }),
        P(0, 360, O(x1, g, 18, 4, 1), O(x1, g - 22, 22, 44, 0), "#b0703c"),
        P(0, 300, O(x1, g, 8, 4, 1), O(x1, g - 26, 8, 52, 0), "#ffb43a"));
      for (let i = 0; i < 5; i++) out.push(P(20, 420, O(x1, g - 4, 5, 5, 1), O(x1 + (rnd() - 0.5) * 40, g - 20 - rnd() * 24, 4, 4, 0), "#8a5a34"));
      break;
    case "flying": // Air Slash: blades of air, one after another
      for (let i = 0; i < 3; i++) {
        const at = -FLY + i * 60, dy = (i - 1) * 7;
        out.push(P(at, -at, O(x0, y + dy, 4, 14, 1), O(x1, y + dy, 6, 18, 1), i % 2 ? st.hot : st.glow, { round: true, ring: true, ease: "linear" }));
      }
      out.push(...steps(0, 300, x1 - 8, y - 8, 6, 3, 3, [st.hot, st.glow], 2));
      break;
    case "psychic": // Psychic: waves of power round it, pulsing, as it's gripped
      for (let i = 0; i < 4; i++) out.push(P(-FLY + i * 80, 260, O(x1, y, 50, 50, 0.1), O(x1, y, 16, 16, 0.9), i % 2 ? st.hot : st.core, { round: true, ring: true, ease: "ease-in" }));
      out.push(P(-FLY, FLY, O(x0, y - 16, 6, 6, 1), O(x0, y - 16, 18, 18, 0), st.core, { round: true, ring: true }), flash(0, x1, y, 34, st.mid));
      break;
    case "bug": // Bug Buzz: waves of buzzing, green, a little ragged
      for (let i = 0; i < 4; i++) out.push(P(-FLY + i * 55, FLY - i * 55, O(x0, y + (i % 2 ? -3 : 3), 4, 10, 1), O(x1, y + (i % 2 ? 3 : -3), 10, 30, 0.5), i % 2 ? st.mid : st.core, { round: true, ring: true, ease: "linear" }));
      out.push(ring(0, x1, y, 8, 40, st.glow, 300));
      break;
    case "rock": // Power Gem: shining gems flying across, sparkling
      for (let i = 0; i < 4; i++) {
        const at = -FLY + i * 30, dy = (i - 1.5) * 6, c = ["#ff6a9a", "#6ad0ff", "#ffd23f", "#9aff8a"][i];
        out.push(P(at, -at, O(x0, y + dy, 5, 5, 1), O(x1, y + dy * 0.3, 6, 6, 1), c, { ease: "linear" }), P(at, -at, O(x0, y + dy, 2, 2, 1), O(x1, y + dy * 0.3, 2, 2, 1), "#ffffff", { ease: "linear" }));
      }
      out.push(flash(0, x1, y, 32, "#ffffff"));
      for (let i = 0; i < 4; i++) out.push(P(20, 360, O(x1, y, 2, 6, 1), O(x1 + (i - 1.5) * 10, y - 12 + (i % 2) * 20, 1, 2, 0), "#ffffff"));
      break;
    case "ghost": // Shadow Ball: a dark ball, wisps trailing
      out.push(fly(-FLY, 18, 18, "#1a0e2a", { round: true }, 0, 0.85), fly(-FLY, 18, 18, st.core, { round: true, ring: true }), fly(-FLY, 7, 7, st.mid, { round: true }));
      for (let i = 0; i < 3; i++) out.push(P(-FLY + 60 + i * 60, 200, O(x0 + dir * dist * (0.2 + 0.25 * i), y, 6, 6, 0.8), O(x0 + dir * dist * (0.1 + 0.25 * i), y - 8, 3, 3, 0), st.core, { round: true }));
      out.push(flash(0, x1, y, 38, st.core), ring(0, x1, y, 10, 48, "#1a0e2a"));
      break;
    case "dragon": { // Dragon Pulse: a stream of draconic light, weaving
      for (let i = 0; i < 8; i++) {
        const at = -FLY + i * 22, dy = Math.sin(i * 1.2) * 6;
        out.push(P(at, -at, O(x0, y + dy, 8 - i * 0.5, 8 - i * 0.5, 1), O(x1, y - dy, 8 - i * 0.5, 8 - i * 0.5, 0.6), i % 2 ? st.glow : st.core, { round: true, ease: "linear" }));
      }
      out.push(flash(0, x1, y, 36, st.mid), ring(0, x1, y, 10, 46, st.glow));
      break;
    }
    case "dark": // Dark Pulse: rings of dark rolling out from it, one after another
      for (let i = 0; i < 3; i++) {
        const at = -FLY + i * 70, r = dist * 2 + 10;
        out.push(P(at, -at + 40, O(x0, y, 8, 8, 0.9), O(x0, y, r, Math.min(46, r * 0.4), 0.2), i % 2 ? "#c0304a" : "#5a2a5a", { round: true, ring: true, ease: "linear" }));
      }
      out.push(flash(0, x1, y, 30, "#5a2a5a"));
      break;
    case "steel": // Flash Cannon: a blinding flash, then a silver beam
      out.push(flash(-FLY, x0, y, 30, "#ffffff", 200),
        P(-200, 200, O(x0, y, 4, 9, 1), O(mid, y, dist, 9, 1), st.hot, { ease: "linear" }),
        P(-200, 200, O(x0, y, 4, 15, 0.5), O(mid, y, dist, 15, 0.5), st.core, { ease: "linear" }),
        P(0, 240, O(mid, y, dist, 15, 0.8), O(mid, y, dist, 1, 0), st.hot), ring(0, x1, y, 8, 44, st.hot, 300));
      break;
    case "fairy": // Moonblast: a moon gathering over it, then its light shot down at the other
      out.push(P(-FLY, 160, O(x0, y - 34, 4, 4, 0.3), O(x0, y - 34, 16, 16, 1), "#fff4f8", { round: true }),
        P(-FLY + 160, FLY - 160, O(x0, y - 34, 16, 16, 1), O(x1, y, 18, 18, 1), st.core, { round: true, ease: "ease-in" }),
        P(-FLY + 160, FLY - 160, O(x0, y - 34, 24, 24, 0.5), O(x1, y, 26, 26, 0.4), st.glow, { round: true, ease: "ease-in" }),
        flash(0, x1, y, 44, "#fff4f8", 300), ring(0, x1, y, 10, 54, st.core));
      break;
  }
  return out;
}
export const specialTimes = (type, name = null) => [...new Set(specialParts(type, 0, 100, 40, 1, null, name).flatMap((p) => [p.at, p.at + 40]))];

// ---- Mega Evolution, as the games play it ----------------------------------------------------
// Full (as its agent starts working): the Key Stone's rainbow beams
// come down from the sky onto it; it turns to white light inside a cocoon of light; the Mega
// symbol shines over it; the cocoon bursts (shards, a rainbow shockwave) and its Mega form stands
// there, its name over it. Short (for a battle: it shouldn't wait): the cocoon,
// then the burst. Out of its Mega: only a small flash. Times from when it starts (ms).
export const MEGA_FULL = { beams: 0, cocoon: 300, symbol: 850, burst: 1300, total: 2200 };
export const MEGA_SHORT = { beams: null, cocoon: 0, symbol: null, burst: 450, total: 1150 };
export const megaTiming = (full) => (full ? MEGA_FULL : MEGA_SHORT);
// Its parts (as signatureParts: { at, ms, a, b, color, round?, ring?, ease? }, `at` from the start)
// round (cx, mid), its body `r` across; the sky's top at y 0.
export function megaParts(full, cx, mid, r) {
  const T = megaTiming(full);
  const out = [];
  const P2 = (at, ms, a, b, color, more = {}) => ({ at, ms, a, b, color, ...more });
  if (T.beams !== null) {
    // Six beams, one of each colour, from the sky down onto it, then fading.
    RAINBOW.forEach((c, k) => {
      const dx = (k - 2.5) * Math.max(6, r * 0.35), at = T.beams + k * 35;
      out.push(P2(at, 260, { x: cx + dx * 1.6, y: 2, w: 3, h: 4, o: 1 }, { x: cx + dx * 0.25, y: mid / 2, w: 3, h: mid, o: 0.95 }, c, { ease: "ease-in" }),
        P2(at + 260, T.cocoon + 250 - at - 260 + 200, { x: cx + dx * 0.25, y: mid / 2, w: 3, h: mid, o: 0.95 }, { x: cx, y: mid, w: 1, h: 6, o: 0 }, c, { ease: "ease-in" }));
    });
  }
  // The cocoon: light swelling round it, a rainbow edge, till it bursts.
  const cw = r * 1.5, ch = r * 1.9;
  out.push(P2(T.cocoon, T.burst - T.cocoon, { x: cx, y: mid, w: cw * 0.6, h: ch * 0.6, o: 0.25 }, { x: cx, y: mid, w: cw * 1.15, h: ch * 1.15, o: 0.55 }, "#f3e8ff", { round: true }),
    P2(T.cocoon, T.burst - T.cocoon, { x: cx, y: mid, w: cw * 0.6, h: ch * 0.6, o: 0.6 }, { x: cx, y: mid, w: cw * 1.2, h: ch * 1.2, o: 1 }, "#c8a0ff", { round: true, ring: true }),
    P2(T.cocoon + 100, T.burst - T.cocoon - 100, { x: cx, y: mid, w: cw * 0.7, h: ch * 0.7, o: 0.4 }, { x: cx, y: mid, w: cw * 1.3, h: ch * 1.3, o: 0.9 }, "#7aa2f7", { round: true, ring: true }));
  // The burst: the cocoon flares solid white and melts away (its Mega form comes out of the light:
  // no silhouette of one form over the other, which never lined up), shards, a rainbow shockwave.
  out.push(P2(T.burst - 60, 60, { x: cx, y: mid, w: cw * 1.15, h: ch * 1.15, o: 0.6 }, { x: cx, y: mid, w: cw * 1.25, h: ch * 1.25, o: 1 }, "#ffffff", { round: true, ease: "linear" }),
    P2(T.burst, 380, { x: cx, y: mid, w: cw * 1.25, h: ch * 1.25, o: 1 }, { x: cx, y: mid, w: cw * 1.7, h: ch * 1.5, o: 0 }, "#ffffff", { round: true, ease: "ease-in" }));
  // The burst: shards of the cocoon flying out, a rainbow shockwave.
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    out.push(P2(T.burst, 450, { x: cx + Math.cos(a) * cw * 0.5, y: mid + Math.sin(a) * ch * 0.5, w: 5, h: 3, o: 1 },
      { x: cx + Math.cos(a) * (cw * 0.5 + 34), y: mid + Math.sin(a) * (ch * 0.5 + 22), w: 2, h: 2, o: 0 }, k % 2 ? "#ffffff" : RAINBOW[k % 6]));
  }
  [0, 70, 140].forEach((d, k) => out.push(P2(T.burst + d, 520, { x: cx, y: mid, w: cw * 0.8, h: ch * 0.8, o: 0.9 }, { x: cx, y: mid, w: cw * 2.6, h: ch * 1.8, o: 0 }, RAINBOW[[0, 2, 4][k]], { round: true, ring: true })));
  return out;
}
export const megaTimes = (full) => [...new Set(megaParts(full, 0, 40, 30).flatMap((p) => [p.at, p.at + 40]).concat(Object.values(megaTiming(full)).filter(Number.isFinite).flatMap((t) => [t, t + 40])))];

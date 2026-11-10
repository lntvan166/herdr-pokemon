import { megaForm } from "./dex.js";

// Reactions: short one-shot animations a Pokémon plays when something happens to its agent.

// Each reaction's animations, in order of preference. Sprites cut whichever of these exist.
export const REACTIONS = {
  wake: ["Wake", "Hop"],
  celebrate: ["Dance", "Hop"],
  startle: ["Hurt", "Shake"],
  charge: ["Charge", "Hop"],
  // By the season (Scenery), now and then while idle. Few sprites have the fitting animation
  // (Eat, LookUp, Shake…), so each ends in one nearly all have (Hop, Rotate, Hurt).
  sniff: ["Eat", "Nod", "Hop"], // spring: the flowers
  bask: ["Laying", "Sit", "DeepBreath", "Hop"], // summer: the sun
  lookUp: ["LookUp", "Rotate"], // autumn: the falling leaves
  shiver: ["Shake", "Cringe", "Hurt"], // winter: the cold
};

// Spring, summer, autumn, winter (scene.js's seasons): the reaction, and an icon over its head
// that says what it is about, whichever animation it got.
export const SEASON_KINDS = [
  { kind: "sniff", icon: "🌸" },
  { kind: "bask", icon: "☀️" },
  { kind: "lookUp", icon: "🍂" },
  { kind: "shiver", icon: "❄️" },
];
export const SEASON_MS = 2000; // a seasonal reaction plays its animation over again for this long

// The animation to play for a reaction, given the ones this sprite has; null: none fits.
export function reactionAnim(kind, has) {
  for (const name of REACTIONS[kind] ?? []) if (has.has(name)) return name;
  return null;
}

export const LOOK_MS = 1500; // how long it faces you
export const AWAKE_MS = 15000; // after you look at it, it stays up this long before napping again
const NO_ANIM_MS = 600; // a reaction with no fitting animation: a short stand facing you

// m.react = { anim, animUntil, until }: plays `anim` (null: stands facing you) until animUntil,
// then faces you until `until`.
function play(m, kind, now, has, msOf, look) {
  const anim = reactionAnim(kind, has);
  const animUntil = now + (anim ? msOf(anim) : NO_ANIM_MS);
  m.react = { anim, animUntil, until: animUntil + (look ? LOOK_MS : 0) };
}

// Which agent has focus now, and which one just got it (null at startup and when it leaves).
export function focusEdge(prev, list) {
  const addr = list.find((a) => a.focused)?.address ?? null;
  return { addr, react: prev !== undefined && addr !== null && addr !== prev ? addr : null };
}

// You focused its agent: it wakes up if asleep, then looks at you, and stays up a while.
export function onFocus(m, mood, now, has, msOf) {
  if (mood === "sleep") play(m, "wake", now, has, msOf, true);
  else m.react = { anim: null, animUntil: now, until: now + LOOK_MS };
  m.awakeUntil = now + AWAKE_MS;
}

// Its agent changed status: finished (celebrate, then look at you), needs you (startle),
// or got to work (charge).
export function onStatus(m, prev, next, now, has, msOf) {
  if (prev === next) return;
  if (prev === "working" && (next === "done" || next === "idle")) play(m, "celebrate", now, has, msOf, true);
  else if (next === "blocked") play(m, "startle", now, has, msOf, false);
  else if (next === "working" && (prev === "idle" || prev === "done")) play(m, "charge", now, has, msOf, false);
}

// Idle, it reacts to the season: true when it does (false: no fitting animation, it strolls on).
export function onSeason(m, season, now, has, msOf) {
  const { kind, icon } = SEASON_KINDS[season];
  const anim = reactionAnim(kind, has);
  if (!anim) return false;
  const ms = Math.max(100, msOf(anim));
  const until = now + ms * Math.ceil(SEASON_MS / ms);
  m.react = { anim, animUntil: until, until, icon };
  return true;
}

// Idle this long and it falls asleep: sooner at night.
export const sleepAfter = (night) => (night > 0.5 ? 60000 : 180000);

// Asleep, unless you looked at it recently.
export const effectiveMood = (mood, m, now) => (mood === "sleep" && now < (m.awakeUntil ?? 0) ? "idle" : mood);

// Which sprite to show: a reaction, walking, facing you (done), turned to you on hover, asleep, standing.
export function pose(m, mood, now, hovered, side) {
  const r = m.react;
  if (r && now < r.until) return r.anim && now < r.animUntil ? { sprite: "react", anim: r.anim } : { sprite: "idleD" };
  if (m.moving) return { sprite: m.dir === "r" ? "walkR" : "walkL" };
  if (mood === "done") return { sprite: "idleD" };
  if (hovered) return { sprite: side === "r" ? "idleR" : "idleL" };
  if (mood === "sleep") return { sprite: "sleep" };
  return { sprite: m.dir === "r" ? "idleR" : "idleL" };
}

// Whether it shows its Mega form now: On always, Auto while its agent works, Off never.
export const megaShown = (pick, status) => !pick.form && !!megaForm(pick.dex) && (pick.mega === "on" || (pick.mega !== "off" && status === "working"));

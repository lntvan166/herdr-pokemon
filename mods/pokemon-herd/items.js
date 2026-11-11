// The Bag (items found and earned, shared by every pane) and the badges. Pure.
import { EVOLVE_HOW, EVOLVES_FROM } from "./species.js";
import { nameOf } from "./dex.js";
import { itemUse, useItem, HELD_IDS, MAX_HEARTS } from "./picks.js";
import { duration } from "./stats.js";
// Kept in shared state as { v: 1, items: { <id>: count }, marks: { evolutions, nightJob, fullHearts } }.

export const STONES = ["fire", "water", "thunder", "leaf", "moon", "sun", "shiny", "dusk", "dawn", "ice"];
const STONE_ICON = { fire: "🔥", water: "💧", thunder: "⚡", leaf: "🍃", moon: "🌙", sun: "🌞", shiny: "💎", dusk: "🌑", dawn: "🌅", ice: "🧊" };

// Every item, in the Bag's order: its name, its icon (an emoji, for the strip) and its art
// (PokeAPI's sprite, for the Bag). Stones are "<kind>-stone".
export const ITEMS = {
  berry: { name: "Oran Berry", icon: "🍓", art: "items/oran-berry" },
  "rare-candy": { name: "Rare Candy", icon: "🍬", art: "items/rare-candy" },
  ...Object.fromEntries(STONES.map((k) => [`${k}-stone`, { name: `${k[0].toUpperCase()}${k.slice(1)} Stone`, icon: STONE_ICON[k], art: `items/${k}-stone` }])),
  "lucky-egg": { name: "Lucky Egg", icon: "🥚", art: "items/lucky-egg", kind: "held" },
  "soothe-bell": { name: "Soothe Bell", icon: "🔔", art: "items/soothe-bell", kind: "held" },
  "amulet-coin": { name: "Amulet Coin", icon: "🪙", art: "items/amulet-coin", kind: "held" },
  leftovers: { name: "Leftovers", icon: "🍎", art: "items/leftovers", kind: "held" },
  "exp-share": { name: "Exp. Share", icon: "📡", art: "items/exp-share", kind: "held" },
  honey: { name: "Honey", icon: "🍯", art: "items/honey", kind: "use" },
};
export const HELD = HELD_IDS;
export const CHARM_ART = "items/shiny-charm";

// The species a stone evolves (by name, dex order): "Pikachu, Eevee, Eelektrik…".
export function stoneTakers(kind) {
  const from = Object.entries(EVOLVE_HOW).filter(([, ways]) => ways.includes(`stone:${kind}`)).map(([dex]) => EVOLVES_FROM[dex]);
  return [...new Set(from)].sort((a, b) => a - b).map(nameOf);
}

// What an item does, in a sentence.
export function itemAbout(id) {
  if (id === "berry") return "Half a heart for a Pokémon. A hungry one eats one by itself when you answer its agent.";
  if (id === "lucky-egg") return "For a Pokémon to hold: every job its agent finishes counts twice towards evolving.";
  if (id === "soothe-bell") return "For a Pokémon to hold: every heart it gains is two.";
  if (id === "amulet-coin") return "For a Pokémon to hold: it finds items twice as often.";
  if (id === "leftovers") return "For a Pokémon to hold: it never goes hungry, however long its agent waits on you.";
  if (id === "exp-share") return "For a Pokémon to hold: each job its agent finishes also counts for the Pokémon on screen furthest from evolving.";
  if (id === "honey") return "Calls a wild Pokémon over right away, with its gift.";
  if (id === "rare-candy") return "Evolves a Pokémon now, if it evolves by jobs or by friendship (with its hearts full).";
  const names = stoneTakers(id.replace(/-stone$/, ""));
  const list = names.length > 6 ? `${names.slice(0, 6).join(", ")} and ${names.length - 6} more` : names.join(", ");
  return `Evolves ${list}.`;
}

// Who in the herd ({ slot, tag, pick }, agents with a pane) an item would do something for now,
// and what: { slot, tag, pick, use: "evolve" | "hearts", after: the pick it would become }.
export function takersOf(id, herd, how = {}) {
  return herd.flatMap((h) => {
    const use = itemUse(h.pick, h.slot, id, how);
    return use ? [{ ...h, use, after: useItem(h.pick, h.slot, id, how).pick }] : [];
  });
}
export const MAX_ITEM = 99;

// Pickup: what an idle Pokémon digs up. Berries mostly, a stone now and then, rarely a Rare Candy.
const PICKUP = [["berry", 70], ...STONES.map((k) => [`${k}-stone`, 2]), ["rare-candy", 10], ["honey", 4], ...HELD_IDS.map((id) => [id, 1])];
export function pickup(rnd = Math.random) {
  let r = rnd() * PICKUP.reduce((t, [, w]) => t + w, 0);
  for (const [id, w] of PICKUP) if ((r -= w) < 0) return id;
  return PICKUP[0][0];
}
// How long a Pokémon goes between finds (ms): somewhere in 1 to 2 hours; it finds one only if
// its agent is idle then. (Eight agents, a working day: a dozen or two Berries, a few stones.)
export const pickupDelay = (rnd = Math.random) => (60 + rnd() * 60) * 60000;

// A job at least this long earns a Rare Candy.
export const CANDY_JOB_MS = 30 * 60000;

const count = (v) => (Number.isInteger(v) && v > 0 ? Math.min(v, MAX_ITEM) : 0);

export function loadBag(raw) {
  const items = {};
  if (raw?.v === 1 && raw.items && typeof raw.items === "object") {
    for (const id of Object.keys(ITEMS)) if (count(raw.items[id])) items[id] = count(raw.items[id]);
  }
  const m = raw?.v === 1 && raw.marks && typeof raw.marks === "object" ? raw.marks : {};
  const seen = Array.isArray(m.seen) ? m.seen.filter((id) => BADGES.some((b) => b.id === id)) : [];
  return { v: 1, items, marks: { evolutions: Number.isInteger(m.evolutions) && m.evolutions > 0 ? m.evolutions : 0, nightJob: m.nightJob === true, fullHearts: m.fullHearts === true, seen } };
}

// The bag with `n` more (or fewer) of an item, kept within 0..MAX_ITEM.
export function addItem(bag, id, n = 1) {
  const next = Math.max(0, Math.min(MAX_ITEM, (bag.items[id] ?? 0) + n));
  const items = { ...bag.items, [id]: next };
  if (!next) delete items[id];
  return { ...bag, items };
}
export const mark = (bag, marks) => ({ ...bag, marks: { ...bag.marks, ...marks } });

// Shiny Charm: from this many jobs done in all, a new agent's Pokémon is shiny 1 in 32, not 1 in 64.
export const CHARM_JOBS = 500;
export const shinyOdds = (jobs) => (jobs >= CHARM_JOBS ? 32 : 64);

// The eight badges, in order. `got` reads the stats summary ({ jobs, ms, longest }) and the bag's marks.
const HOUR = 3600000;
// Each badge: what earns it (`got`) and how far along it is (`progress`: { fraction, left }),
// from one goal each. `s`: the stats summary ({ jobs, ms, longest }); `m`: the Bag's marks;
// `live`: the Pokémon on screen now ({ best: the most hearts, evolve: the closest to evolving,
// 0..1 }). Times still to go round up a minute, times done round down (stats.js duration).
const toGo = (ms) => duration(Math.ceil(Math.max(0, ms) / 60000) * 60000);
const jobsTo = (goal) => ({
  got: (s) => s.jobs >= goal,
  progress: (s) => ({ fraction: s.jobs / goal, left: `${goal - s.jobs} job${goal - s.jobs === 1 ? "" : "s"} to go` }),
});
export const BADGES = [ // art: PokeAPI's badges/1..8, the Kanto badges in this order
  { id: "boulder", name: "Boulder Badge", icon: "🪨", how: "10 jobs done", ...jobsTo(10) },
  { id: "cascade", name: "Cascade Badge", icon: "💧", how: "100 jobs done", ...jobsTo(100) },
  { id: "thunder", name: "Thunder Badge", icon: "⚡", how: "a Pokémon evolved", got: (_s, m) => m.evolutions >= 1,
    progress: (_s, _m, live) => ({ fraction: live.evolve ?? 0, left: "evolve a Pokémon" }) },
  { id: "rainbow", name: "Rainbow Badge", icon: "🌈", how: "24 hours of work", got: (s) => s.ms >= 24 * HOUR,
    progress: (s) => ({ fraction: s.ms / (24 * HOUR), left: `${toGo(24 * HOUR - s.ms)} of work to go` }) },
  { id: "soul", name: "Soul Badge", icon: "💗", how: `a Pokémon with ${MAX_HEARTS} hearts`,
    got: (_s, m, live = {}) => m.fullHearts || (live.best ?? 0) >= MAX_HEARTS,
    progress: (_s, _m, live) => ({ fraction: (live.best ?? 0) / MAX_HEARTS, left: `best now is ♥${live.best ?? 0}: ${MAX_HEARTS - (live.best ?? 0)} to go` }) },
  { id: "marsh", name: "Marsh Badge", icon: "🌙", how: "a job finished between midnight and 5", got: (_s, m) => m.nightJob,
    progress: () => ({ fraction: 0, left: "finish a job between midnight and 5" }) },
  { id: "volcano", name: "Volcano Badge", icon: "🌋", how: "one job over an hour", got: (s) => s.longest >= HOUR,
    progress: (s) => ({ fraction: s.longest / HOUR, left: s.longest ? `longest job ${duration(s.longest)}: ${toGo(HOUR - s.longest)} to go` : "one job over an hour" }) },
  { id: "earth", name: "Earth Badge", icon: "🌍", how: "1000 jobs done", ...jobsTo(1000) },
];
export const badges = (summary, marks, live = {}) => BADGES.map((b) => ({ ...b, earned: !!b.got(summary, marks, live) }));

// Each badge, the first time it is earned, comes with an item to hold (in turn: Lucky Egg,
// Soothe Bell, Amulet Coin…). Returns the gifts and the badges now seen (for marks.seen).
export function badgeGifts(summary, marks) {
  const seen = [...(marks.seen ?? [])];
  const gifts = [];
  for (const b of badges(summary, marks)) {
    if (!b.earned || seen.includes(b.id)) continue;
    gifts.push(HELD_IDS[BADGES.indexOf(BADGES.find((x) => x.id === b.id)) % HELD_IDS.length]);
    seen.push(b.id);
  }
  return { gifts, seen };
}

// How far along each badge is: { ...badge, earned, fraction (0..1; under 1 till earned), left
// (what's still to do, in words; "" once earned) }.
export function badgeProgress(summary, marks, live = {}) {
  return badges(summary, marks, live).map((b) => {
    if (b.earned) return { ...b, fraction: 1, left: "" };
    const p = b.progress(summary, marks, live);
    return { ...b, fraction: Math.max(0, Math.min(0.99, p.fraction)), left: p.left };
  });
}

// The badge nearest to earning (the largest fraction), or null when all are earned.
export const nextBadge = (progress) => progress.filter((b) => !b.earned).sort((x, y) => y.fraction - x.fraction)[0] ?? null;

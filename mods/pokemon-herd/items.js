// The Bag (items found and earned, shared by every pane) and the badges. Pure.
import { EVOLVE_HOW, EVOLVES_FROM } from "./species.js";
import { nameOf } from "./dex.js";
import { itemUse, useItem } from "./picks.js";
// Kept in shared state as { v: 1, items: { <id>: count }, marks: { evolutions, nightJob, fullHearts } }.

export const STONES = ["fire", "water", "thunder", "leaf", "moon", "sun", "shiny", "dusk", "dawn", "ice"];
const STONE_ICON = { fire: "🔥", water: "💧", thunder: "⚡", leaf: "🍃", moon: "🌙", sun: "🌞", shiny: "💎", dusk: "🌑", dawn: "🌅", ice: "🧊" };

// Every item, in the Bag's order: its name, its icon (an emoji, for the strip) and its art
// (PokeAPI's sprite, for the Bag). Stones are "<kind>-stone".
export const ITEMS = {
  berry: { name: "Oran Berry", icon: "🍓", art: "items/oran-berry" },
  "rare-candy": { name: "Rare Candy", icon: "🍬", art: "items/rare-candy" },
  ...Object.fromEntries(STONES.map((k) => [`${k}-stone`, { name: `${k[0].toUpperCase()}${k.slice(1)} Stone`, icon: STONE_ICON[k], art: `items/${k}-stone` }])),
};
export const CHARM_ART = "items/shiny-charm";

// The species a stone evolves (by name, dex order): "Pikachu, Eevee, Eelektrik…".
export function stoneTakers(kind) {
  const from = Object.entries(EVOLVE_HOW).filter(([, ways]) => ways.includes(`stone:${kind}`)).map(([dex]) => EVOLVES_FROM[dex]);
  return [...new Set(from)].sort((a, b) => a - b).map(nameOf);
}

// What an item does, in a sentence.
export function itemAbout(id) {
  if (id === "berry") return "Gives a Pokémon a heart. A hungry one eats one by itself when you answer its agent.";
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
const PICKUP = [["berry", 70], ...STONES.map((k) => [`${k}-stone`, 2]), ["rare-candy", 10]];
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
  return { v: 1, items, marks: { evolutions: Number.isInteger(m.evolutions) && m.evolutions > 0 ? m.evolutions : 0, nightJob: m.nightJob === true, fullHearts: m.fullHearts === true } };
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
export const BADGES = [ // art: PokeAPI's badges/1..8, the Kanto badges in this order
  { id: "boulder", name: "Boulder Badge", icon: "🪨", how: "10 jobs done", got: (s) => s.jobs >= 10 },
  { id: "cascade", name: "Cascade Badge", icon: "💧", how: "100 jobs done", got: (s) => s.jobs >= 100 },
  { id: "thunder", name: "Thunder Badge", icon: "⚡", how: "a Pokémon evolved", got: (_s, m) => m.evolutions >= 1 },
  { id: "rainbow", name: "Rainbow Badge", icon: "🌈", how: "24 hours of work", got: (s) => s.ms >= 24 * HOUR },
  { id: "soul", name: "Soul Badge", icon: "💗", how: "a Pokémon with 5 hearts", got: (_s, m) => m.fullHearts },
  { id: "marsh", name: "Marsh Badge", icon: "🌙", how: "a job finished between midnight and 5", got: (_s, m) => m.nightJob },
  { id: "volcano", name: "Volcano Badge", icon: "🌋", how: "one job over an hour", got: (s) => s.longest >= HOUR },
  { id: "earth", name: "Earth Badge", icon: "🌍", how: "1000 jobs done", got: (s) => s.jobs >= 1000 },
];
export const badges = (summary, marks) => BADGES.map((b) => ({ ...b, earned: !!b.got(summary, marks) }));

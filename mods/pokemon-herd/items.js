// The Bag (items found and earned, shared by every pane) and the badges. Pure.
import { EVOLVE_HOW, EVOLVES_FROM } from "./species.js";
import { nameOf, evolutionsOf } from "./dex.js";
import { isPhysicalKey, fighterKey } from "./trainer.js";
import { itemUse, useItem, HELD_IDS, CARE_HELD, BATTLE_HELD, MAX_HEARTS } from "./picks.js";
import { BATTLE_ITEMS } from "./abilities.js";
const BATTLE_ICON = {"life-orb": "🔮", "choice-band": "🎗️", "choice-specs": "👓", "choice-scarf": "🧣", "focus-sash": "🎀", "expert-belt": "🥋", "muscle-band": "💪", "wise-glasses": "🤓", "assault-vest": "🦺", "eviolite": "💎", "rocky-helmet": "⛑️", "shell-bell": "🐚", "quick-claw": "🦅", "scope-lens": "🔭", "weakness-policy": "📜", "air-balloon": "🎈", "flame-orb": "🔥", "toxic-orb": "☠️"};
// What each does in a battle (itemAbout).
const BATTLE_ABOUT = {"life-orb": "Its moves hit ×1.3, and each one that lands costs it a tenth of its health.", "choice-band": "Its physical moves hit ×1.5, but it uses only the move it chose first while it stays in.", "choice-specs": "Its special moves hit ×1.5, but it uses only the move it chose first while it stays in.", "choice-scarf": "It's ×1.5 faster, but it uses only the move it chose first while it stays in.", "focus-sash": "At full health, a hit that would knock it out leaves it hanging on, once a battle.", "expert-belt": "Its super-effective moves hit ×1.2.", "muscle-band": "Its physical moves hit ×1.1.", "wise-glasses": "Its special moves hit ×1.1.", "assault-vest": "It takes special moves as if its Sp. Def were ×1.5.", "eviolite": "One that can still evolve takes every hit as if its Defense and Sp. Def were ×1.5.", "rocky-helmet": "One that hits it with a move that touches loses a sixth of its health.", "shell-bell": "It gets back an eighth of the damage it deals.", "quick-claw": "One time in five it moves first (after quick moves).", "scope-lens": "Its moves land critical hits more often (1 in 8).", "weakness-policy": "Hit super-effectively and still up: its Attack and Sp. Atk two stages up, once a battle.", "air-balloon": "Ground moves miss it till a hit pops the balloon (back for the next battle).", "flame-orb": "Burns its holder at the end of its first exchange (for Guts, Quick Feet, Marvel Scale: stronger burned).", "toxic-orb": "Poisons its holder at the end of its first exchange (for Poison Heal: it heals instead; Guts, Quick Feet)."};
import { duration } from "./stats.js";
// Kept in shared state as { v: 1, items: { <id>: count }, money, marks: { evolutions, nightJob, fullHearts } }.

export const STONES = ["fire", "water", "thunder", "leaf", "moon", "sun", "shiny", "dusk", "dawn", "ice"];
const STONE_ICON = { fire: "🔥", water: "💧", thunder: "⚡", leaf: "🍃", moon: "🌙", sun: "🌞", shiny: "💎", dusk: "🌑", dawn: "🌅", ice: "🧊" };

// Every item, in the Bag's order: its name, its icon (an emoji, for the strip) and its art
// (PokeAPI's sprite, for the Bag). Stones are "<kind>-stone".
export const ITEMS = {
  berry: { name: "Oran Berry", icon: "🍓", art: "items/oran-berry" },
  "sitrus-berry": { name: "Sitrus Berry", icon: "🍋", art: "items/sitrus-berry" },
  // Medicine: one that fainted (resting) back up at once, at half its health or all of it.
  revive: { name: "Revive", icon: "💊", art: "items/revive" },
  "max-revive": { name: "Max Revive", icon: "💎", art: "items/max-revive" },
  // Berries for catching (as in Pokémon GO): fed before each ball while one is set (Bag → Feed).
  "razz-berry": { name: "Razz Berry", icon: "🍒", art: "items/razz-berry", kind: "bait" },
  "golden-razz-berry": { name: "Golden Razz Berry", icon: "🌟", art: "items/golden-razz-berry", kind: "bait" },
  "pinap-berry": { name: "Pinap Berry", icon: "🍍", art: "items/pinap-berry", kind: "bait" },
  "silver-pinap-berry": { name: "Silver Pinap Berry", icon: "🥈", art: "items/silver-pinap-berry", kind: "bait" },
  "rare-candy": { name: "Rare Candy", icon: "🍬", art: "items/rare-candy" },
  "ability-capsule": { name: "Ability Capsule", icon: "💊", art: "items/ability-capsule" },
  "ability-patch": { name: "Ability Patch", icon: "🩹", art: "items/ability-patch" },
  ...Object.fromEntries(STONES.map((k) => [`${k}-stone`, { name: `${k[0].toUpperCase()}${k.slice(1)} Stone`, icon: STONE_ICON[k], art: `items/${k}-stone` }])),
  "lucky-egg": { name: "Lucky Egg", icon: "🥚", art: "items/lucky-egg", kind: "held" },
  "soothe-bell": { name: "Soothe Bell", icon: "🔔", art: "items/soothe-bell", kind: "held" },
  "amulet-coin": { name: "Amulet Coin", icon: "🪙", art: "items/amulet-coin", kind: "held" },
  leftovers: { name: "Leftovers", icon: "🍎", art: "items/leftovers", kind: "held" },
  "exp-share": { name: "Exp. Share", icon: "📡", art: "items/exp-share", kind: "held" },
  // For battles (abilities.js BATTLE_ITEMS), one at a time, as the games'.
  ...Object.fromEntries(BATTLE_HELD.map((id) => [id, { name: BATTLE_ITEMS[id], icon: BATTLE_ICON[id], art: `items/${id}`, kind: "held", battle: true }])),
  honey: { name: "Honey", icon: "🍯", art: "items/honey", kind: "use" },
  "azure-flute": { name: "Azure Flute", icon: "🪈", art: "items/azure-flute", kind: "use" },
  // From the Shop: for the whole herd, BOOST_MS each (the Festival Ticket at once).
  "x-speed": { name: "X Speed", icon: "⚡", art: "items/x-speed", kind: "boost" },
  "poke-flute": { name: "Poké Flute", icon: "🎺", art: "items/poke-flute", kind: "boost" },
  "x-attack": { name: "X Attack", icon: "⚔️", art: "items/x-attack", kind: "boost" },
  "soda-pop": { name: "Soda Pop", icon: "🥤", art: "items/soda-pop", kind: "boost" },
  "festival-ticket": { name: "Festival Ticket", icon: "🎆", art: "items/festival-ticket", kind: "use" },
  // Thrown at a wild Pokémon walking by (trainer.js): click it once its gift is taken.
  "poke-ball": { name: "Poké Ball", icon: "⚪", art: "items/poke-ball", kind: "ball" },
  "great-ball": { name: "Great Ball", icon: "🔵", art: "items/great-ball", kind: "ball" },
  "ultra-ball": { name: "Ultra Ball", icon: "🟡", art: "items/ultra-ball", kind: "ball" },
  "quick-ball": { name: "Quick Ball", icon: "⚡", art: "items/quick-ball", kind: "ball" },
  "dusk-ball": { name: "Dusk Ball", icon: "🌙", art: "items/dusk-ball", kind: "ball" },
  "timer-ball": { name: "Timer Ball", icon: "⏱️", art: "items/timer-ball", kind: "ball" },
  "master-ball": { name: "Master Ball", icon: "🟣", art: "items/master-ball", kind: "ball" },
};

// The Shop: every item, for Pokédollars (₽).
export const PRICE = {
  // Set from a working day: agents at work 6 hours pay about ₽1,900 (jobPay), the day's Research,
  // visitors' purses and tips about ₽1,000 more (≈ ₽3,000). Two Azure Flutes a day; balls cheap
  // enough to throw 15 at a legendary; a Master Ball about eight days.
  berry: 20, "sitrus-berry": 80, "razz-berry": 40, "pinap-berry": 40, "golden-razz-berry": 300, "silver-pinap-berry": 200,
  "poke-ball": 30, "great-ball": 80, "ultra-ball": 150, "quick-ball": 200, "dusk-ball": 120, "timer-ball": 120, "master-ball": 25000,
  honey: 150, "azure-flute": 1000, "rare-candy": 600, revive: 300, "max-revive": 800, "ability-capsule": 1500, "ability-patch": 10000, // (a Patch also the Battle Tower's 28th floor)
  ...Object.fromEntries(STONES.map((k) => [`${k}-stone`, 400])),
  ...Object.fromEntries(CARE_HELD.map((id) => [id, 2000])),
  // For battles: the strongest dearest (as the games' Battle Points: Life Orb, Choice, Focus Sash 48 BP, the rest 32).
  ...Object.fromEntries(BATTLE_HELD.map((id) => [id, ["life-orb", "choice-band", "choice-specs", "choice-scarf", "focus-sash", "assault-vest", "weakness-policy"].includes(id) ? 4000 : 2500])),
  "x-speed": 150, "poke-flute": 100, "x-attack": 200, "soda-pop": 100, "festival-ticket": 250,
};
export const MAX_MONEY = 999999;
export const money = (n) => `₽${String(Math.max(0, Math.round(n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

// A Bag from before Pokédollars: what the jobs done till then pay, as jobPay would have (from
// the stats summary { jobs, ms }: ₽5 a job and ₽2 a minute worked, ₽150 a job at most).
export const backPay = (s) => Math.min(150 * (s.jobs || 0), 5 * (s.jobs || 0) + 2 * Math.floor((s.ms || 0) / 60000));

// What a finished job pays: by the time it took, ₽1 and ₽5 a minute (to the second), ₽300 at most;
// twice that for a Pokémon holding an Amulet Coin. About ₽300 an hour of agents' work, however it
// is cut into jobs: many short ones pay no more than a few long ones (a 10 s answer: ₽2). A
// working day with agents at work 6 hours: ~₽1,900, plus ~₽1,000 from the Research, purses, tips.
export const jobPay = (taskMs, coin = false) => Math.min(300, Math.max(1, Math.round(1 + 5 * Math.max(0, taskMs || 0) / 60000))) * (coin ? 2 : 1);
// What the Shop gives back for one: half its price, as in the games.
export const sellPrice = (id) => Math.floor((PRICE[id] ?? 0) / 2);
// The bag after selling `n` of `id` (as many as there are, at most), or null: none to sell.
export function sell(bag, id, n = 1) {
  const have = bag.items[id] ?? 0;
  // Only as many as the purse can take (MAX_MONEY): none sold for nothing.
  const room = Math.floor((MAX_MONEY - (bag.money ?? 0)) / Math.max(1, sellPrice(id)));
  const k = Math.min(have, n, room);
  if (!(k > 0) || !sellPrice(id)) return null;
  return addMoney(addItem(bag, id, -k), k * sellPrice(id));
}
export const addMoney = (bag, n) => ({ ...bag, money: Math.max(0, Math.min(MAX_MONEY, (bag.money ?? 0) + n)) });

// The bag after buying one `id`, or null: not enough money, or already MAX_ITEM.
export function buy(bag, id, n = 1, price = PRICE[id]) {
  if (!price || n < 1 || (bag.money ?? 0) < price * n || (bag.items[id] ?? 0) + n > MAX_ITEM) return null;
  return addItem(addMoney(bag, -price * n), id, n);
}
// The most of `id` the Bag can take and the money buy (0: none).
export const maxBuy = (bag, id, price = PRICE[id]) => (price ? Math.max(0, Math.min(MAX_ITEM - (bag.items[id] ?? 0), Math.floor((bag.money ?? 0) / price))) : 0);

// The Bag's and the Shop's groups, in order: each item in one.
export const GROUPS = [
  ["Balls", (id) => ITEMS[id].kind === "ball"],
  ["Berries", (id) => id === "berry" || id.endsWith("-berry")],
  ["Medicine", (id) => id === "revive" || id === "max-revive"],
  ["Evolution", (id) => id === "rare-candy" || id.endsWith("-stone")],
  ["Abilities", (id) => id.startsWith("ability-")],
  ["To hold", (id) => ITEMS[id].kind === "held" && !ITEMS[id].battle],
  ["For battle", (id) => !!ITEMS[id].battle],
  ["For the herd", (id) => ITEMS[id].kind === "boost" || id === "festival-ticket"],
  ["Calls", (id) => id === "honey" || id === "azure-flute"],
];
export const groupOf = (id) => GROUPS.find(([, f]) => f(id))?.[0] ?? "Other";
// Item ids in group order (each group in the Bag's order).
export const grouped = (ids) => GROUPS.flatMap(([, f]) => ids.filter(f)).concat(ids.filter((id) => !GROUPS.some(([, f]) => f(id))));

// Boosts (shared state { <id>: until }): each lasts BOOST_MS from its use, another one adding
// as much again, up to BOOST_MAX ahead. Which are on now: { <id>: until }.
export const BOOST_MS = 10 * 60000;
export const BOOST_MAX = 60 * 60000;
export function loadBoosts(raw, now) {
  const out = {};
  for (const [id, until] of Object.entries(raw && typeof raw === "object" ? raw : {})) {
    if (ITEMS[id]?.kind === "boost" && Number.isFinite(until) && until > now) out[id] = until;
  }
  return out;
}
export const withBoost = (boosts, id, now) => ({ ...boosts, [id]: Math.min(now + BOOST_MAX, Math.max(now, boosts[id] ?? 0) + BOOST_MS) });
export const HELD = HELD_IDS;
export const CHARM_ART = "items/shiny-charm";

// The species a stone evolves (by name, dex order): "Pikachu, Eevee, Eelektrik…".
export function stoneTakers(kind) {
  const from = Object.entries(EVOLVE_HOW).filter(([, ways]) => ways.includes(`stone:${kind}`)).map(([dex]) => EVOLVES_FROM[dex]);
  return [...new Set(from)].sort((a, b) => a - b).map(nameOf);
}

// Items to hold, the best for it first (a Pokémon's menu shows HOLD_SHOWN, the rest on asking):
// for battle by its stronger side (a Choice Band or Life Orb on one that hits physically),
// Eviolite and a Lucky Egg first on one that can still evolve, Leftovers and Focus Sash for any;
// the rest after, as the Bag has them.
export const HOLD_SHOWN = 4;
export function holdOrder(pick, ids) {
  const nfe = evolutionsOf(pick.dex).length > 0;
  const phys = isPhysicalKey(fighterKey(pick.dex, { form: pick.form }));
  const best = [...(nfe ? ["eviolite", "lucky-egg"] : []), ...(phys ? ["choice-band", "life-orb", "muscle-band"] : ["choice-specs", "life-orb", "wise-glasses"]), "leftovers", "focus-sash", "expert-belt", "choice-scarf", "assault-vest"];
  const rank = (id) => { const i = best.indexOf(id); return i < 0 ? best.length + ids.indexOf(id) : i; };
  return [...ids].sort((a, b) => rank(a) - rank(b));
}

// What an item does, in a sentence.
export function itemAbout(id) {
  if (id === "revive") return "Brings one that fainted back at once, with half its health (it would rest 10 minutes).";
  if (id === "max-revive") return "Brings one that fainted back at once, with all its health.";
  if (id === "berry") return "A quarter of a heart for a Pokémon, and a quarter of its health back if a wild one hurt it; three a day each for hearts. A hungry one eats one by itself when you answer its agent.";
  if (id === "sitrus-berry") return "Half a heart for a Pokémon, and half its health back if a wild one hurt it; three a day each for hearts.";
  if (id === "razz-berry") return "Fed to a wild Pokémon before the ball: half again as likely to catch it.";
  if (id === "golden-razz-berry") return "Fed before the ball: two and a half times as likely to catch it. For a shiny or a legendary.";
  if (id === "pinap-berry") return "Fed before the ball: if it's caught, it brings twice the gift.";
  if (id === "silver-pinap-berry") return "Fed before the ball: a better chance (×1.8), and twice the gift if it's caught.";
  if (id === "lucky-egg") return "For a Pokémon to hold: every job its agent finishes counts twice towards evolving.";
  if (id === "soothe-bell") return "For a Pokémon to hold: every heart it gains is two.";
  if (id === "amulet-coin") return "For a Pokémon to hold: it finds items twice as often.";
  if (id === "exp-share") return "For a Pokémon to hold: each job its agent finishes also counts for the Pokémon on screen furthest from evolving.";
  if (BATTLE_ABOUT[id]) return `For a Pokémon to hold in battle: ${BATTLE_ABOUT[id][0].toLowerCase()}${BATTLE_ABOUT[id].slice(1)}`;
  if (id === "leftovers") return "For a Pokémon to hold: it never goes hungry, however long its agent waits on you; in battle, a sixteenth of its health back each exchange.";
  if (id === "honey") return "Calls a wild Pokémon over right away, with its gift.";
  if (id === "azure-flute") return "Calls a legendary Pokémon over. Hard to catch: 20 balls before it's gone, and it may get away.";
  if (id === "x-speed") return "For 10 minutes the whole herd is on the go: faster, and hardly stopping.";
  if (id === "poke-flute") return "Wakes every sleeping Pokémon, and keeps the herd up for 10 minutes.";
  if (id === "x-attack") return "For 10 minutes the herd spars and teases each other again and again.";
  if (id === "soda-pop") return "For 10 minutes the herd fidgets three times as much, and those who can dance do.";
  if (id === "festival-ticket") return "Fireworks over the strip, and the whole herd celebrates.";
  if (id === "poke-ball") return "Catches a wild Pokémon walking by, now and then: click it once you have its gift. It joins your Box with a heart and a nature.";
  if (id === "great-ball") return "A better chance than a Poké Ball. Thrown first at a shiny.";
  if (id === "ultra-ball") return "The best chance short of a Master Ball: shinies and legendaries get these first.";
  if (id === "quick-ball") return "Five times as likely as a Poké Ball if it's the first ball thrown at it; no better after. Throw it the moment one appears.";
  if (id === "dusk-ball") return "Three times as likely as a Poké Ball at night; a Poké Ball by day.";
  if (id === "timer-ball") return "Better the more balls you've thrown at it: a Poké Ball at first, up to four times as likely. For a legendary's long chase.";
  if (id === "master-ball") return "Never fails. Kept for legendary Pokémon: only one of those gets it.";
  if (id === "ability-capsule") return "Swaps its ability for its species' other one (not the hidden one). Use it on a Pokémon in the Box or from its menu.";
  if (id === "ability-patch") return "Gives it its species' hidden ability, or takes one that has it back to its first. The Battle Tower's 28th floor gives one too.";
  if (id === "rare-candy") return "A level's worth: 5 jobs towards evolving (15 for a first evolution, 30 for a second); evolves it if that's enough.";
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
export const MAX_ITEM = 999; // as the newer games' Bag

// Pickup (what an idle Pokémon digs up, and a visitor's gift), out of 100, after the games'
// Pickup tables: Poké Balls and Berries mostly, a stone now and then, rarely a Rare Candy or
// something to hold. Balls and catching Berries lead: they're what you use up.
const PICKUP = [
  ["berry", 18], ["sitrus-berry", 6], ["razz-berry", 10], ["pinap-berry", 5], ["golden-razz-berry", 1], ["silver-pinap-berry", 1],
  ["poke-ball", 22], ["great-ball", 7], ["ultra-ball", 2], ["quick-ball", 1], ["dusk-ball", 1], ["timer-ball", 1],
  ...STONES.map((k) => [`${k}-stone`, 1.5]), ["rare-candy", 3], ["honey", 4], ["berry", 3], ["revive", 2], ["max-revive", 0.5], ...CARE_HELD.map((id) => [id, 0.6]), ...BATTLE_HELD.map((id) => [id, 0.15]),
];
export function pickup(rnd = Math.random) {
  let r = rnd() * PICKUP.reduce((t, [, w]) => t + w, 0);
  for (const [id, w] of PICKUP) if ((r -= w) < 0) return id;
  return PICKUP[0][0];
}
// A visitor's gift (out of 100): balls half the time, a few at once (Poké Balls ×3, Great Balls
// ×2, as a PokéStop gives them), then Berries for catching, now and then something rarer. Catching
// is hard (trainer.js): the balls to try again come from the visitors themselves.
const GIFT = [
  ["poke-ball", 35], ["great-ball", 12], ["ultra-ball", 4],
  ["berry", 8], ["sitrus-berry", 4], ["razz-berry", 10], ["pinap-berry", 6], ["golden-razz-berry", 1], ["silver-pinap-berry", 1],
  ...STONES.map((k) => [`${k}-stone`, 1]), ["rare-candy", 2], ["honey", 3], ["poke-ball", 2], ...CARE_HELD.map((id) => [id, 0.4]), ...BATTLE_HELD.map((id) => [id, 0.1]),
];
const GIFT_COUNT = { "poke-ball": 3, "great-ball": 2 };
// { id, n }: what a visitor leaves, and how many.
export function visitorGift(rnd = Math.random) {
  let r = rnd() * GIFT.reduce((t, [, w]) => t + w, 0);
  const id = (GIFT.find(([, w]) => (r -= w) < 0) ?? GIFT[0])[0];
  return { id, n: GIFT_COUNT[id] ?? 1 };
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
  const cash = Number.isInteger(raw?.money) && raw.money > 0 ? Math.min(raw.money, MAX_MONEY) : 0;
  return { v: 1, items, money: cash, marks: { evolutions: Number.isInteger(m.evolutions) && m.evolutions > 0 ? m.evolutions : 0, nightJob: m.nightJob === true, fullHearts: m.fullHearts === true, seen, ...(Number.isInteger(m.trainers) && m.trainers > 0 ? { trainers: m.trainers } : {}) } };
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
// What each takes (`live`: { best hearts on screen, evolve progress, caught: species in the Pokédex,
// towerBest: the Battle Tower's best }; `m.trainers`: trainers beaten) and what it gives for good
// (`perk`, as the games' badges did: a stat a little higher, and the like; small: +3% here, 5%
// there, never what wins a battle). The jobs-only ones of before (24 h of work, a job over an hour,
// one between midnight and 5) asked for long and late work: now the game's own goals.
export const BADGES = [ // art: PokeAPI's badges/1..8, the Kanto badges in this order
  { id: "boulder", name: "Boulder Badge", icon: "🪨", how: "10 jobs done", perk: "yours' physical moves +3%", ...jobsTo(10) },
  { id: "cascade", name: "Cascade Badge", icon: "💧", how: "10 kinds caught", perk: "catching a little easier (+5%)",
    got: (_s, _m, live = {}) => (live.caught ?? 0) >= 10,
    progress: (_s, _m, live = {}) => ({ fraction: (live.caught ?? 0) / 10, left: `${10 - (live.caught ?? 0)} more kinds to catch` }) },
  { id: "thunder", name: "Thunder Badge", icon: "⚡", how: "a Pokémon evolved", perk: "yours take 3% less", got: (_s, m) => m.evolutions >= 1,
    progress: (_s, _m, live) => ({ fraction: live.evolve ?? 0, left: "evolve a Pokémon" }) },
  { id: "rainbow", name: "Rainbow Badge", icon: "🌈", how: "100 jobs done", perk: "yours find things a fifth sooner (Pickup)", ...jobsTo(100) },
  { id: "soul", name: "Soul Badge", icon: "💗", how: `a Pokémon with ${MAX_HEARTS} hearts`, perk: "yours a touch faster (+3% Speed)",
    got: (_s, m, live = {}) => m.fullHearts || (live.best ?? 0) >= MAX_HEARTS,
    progress: (_s, _m, live) => ({ fraction: (live.best ?? 0) / MAX_HEARTS, left: `best now is ♥${live.best ?? 0}: ${MAX_HEARTS - (live.best ?? 0)} to go` }) },
  { id: "marsh", name: "Marsh Badge", icon: "🌙", how: "10 trainers beaten", perk: "trainers pay 10% more",
    got: (_s, m) => (m.trainers ?? 0) >= 10,
    progress: (_s, m) => ({ fraction: (m.trainers ?? 0) / 10, left: `${10 - (m.trainers ?? 0)} more trainers to beat` }) },
  { id: "volcano", name: "Volcano Badge", icon: "🌋", how: "the Battle Tower's 7th floor", perk: "yours' special moves +3%",
    got: (_s, _m, live = {}) => (live.towerBest ?? 0) >= 7,
    progress: (_s, _m, live = {}) => ({ fraction: (live.towerBest ?? 0) / 7, left: `best climb ${live.towerBest ?? 0} floors: ${7 - (live.towerBest ?? 0)} to go` }) },
  { id: "earth", name: "Earth Badge", icon: "🌍", how: "150 kinds caught", perk: "shinies a little likelier (×1.25)",
    got: (_s, _m, live = {}) => (live.caught ?? 0) >= 150,
    progress: (_s, _m, live = {}) => ({ fraction: (live.caught ?? 0) / 150, left: `${150 - (live.caught ?? 0)} more kinds to catch` }) },
];
// Once earned, kept (marks.seen: the badges whose gift came), however its goal changed since.
export const badges = (summary, marks, live = {}) => BADGES.map((b) => ({ ...b, earned: (marks.seen ?? []).includes(b.id) || !!b.got(summary, marks, live) }));
// The badges held, by id (a Set): what their perks ask.
export const badgeSet = (summary, marks, live = {}) => new Set(badges(summary, marks, live).filter((b) => b.earned).map((b) => b.id));
// The perks, as numbers (BADGES' perk): `has` a Set of badge ids.
export const perks = (has) => ({
  physical: has.has("boulder") ? 1.03 : 1, special: has.has("volcano") ? 1.03 : 1, take: has.has("thunder") ? 0.97 : 1,
  speed: has.has("soul") ? 1.03 : 1, catchMul: has.has("cascade") ? 1.05 : 1, pickup: has.has("rainbow") ? 0.8 : 1,
  trainerPay: has.has("marsh") ? 1.1 : 1, shiny: has.has("earth") ? 1.25 : 1,
});

// Each badge, the first time it is earned, comes with an item to hold (in turn: Lucky Egg,
// Soothe Bell, Amulet Coin…). Returns the gifts and the badges now seen (for marks.seen).
export function badgeGifts(summary, marks, live = {}) {
  const seen = [...(marks.seen ?? [])];
  const gifts = [];
  for (const b of badges(summary, marks, live)) {
    if (!b.earned || seen.includes(b.id)) continue;
    gifts.push(CARE_HELD[BADGES.indexOf(BADGES.find((x) => x.id === b.id)) % CARE_HELD.length]);
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

// The trainer's side: Poké Balls and catching, natures, the Pokédex, the day's Research and
// legendary Pokémon. Pure.
import { WALKABLE, REGIONS, regionOf, nameOf, isWalkable, hasShiny } from "./dex.js";
import { typeOf, TYPES } from "./types.js";

// ---- legendary and mythical Pokémon ------------------------------------------------
// They don't come to new agents, nor can they be chosen in the picker, until one is caught.
// A wild one walks by now and then (LEGEND_ODDS), and the day's Research, all done, calls one.
const LEGENDS = [144, 145, 146, 150, 151, 243, 244, 245, 249, 250, 251, ...range(377, 386), ...range(480, 494),
  ...range(638, 649), ...range(716, 721), 772, 773, ...range(785, 792), 800, 801, 802, 807, 808, 809, ...range(888, 898),
  905, 1001, 1002, 1003, 1004, 1007, 1008, 1014, 1015, 1016, 1017, 1024, 1025];
function range(a, b) { return Array.from({ length: b - a + 1 }, (_, i) => a + i); }
export const LEGENDARY = new Set(LEGENDS.filter(isWalkable));
export const isLegendary = (dex) => LEGENDARY.has(dex);
export const LEGEND_ODDS = 150; // a wild visitor is legendary 1 time in this many
// Locked: a legendary species not caught yet (`d`: the Pokédex, loadDex), unless Settings →
// Legendaries opened them all (`open`).
export const isLocked = (dex, d, open = false) => !open && isLegendary(dex) && !d.caught.includes(dex);

// A wild visitor: a species nobody on screen has (`taken`: their dex numbers), shiny 1 in
// `shinyOdds`; legendary only 1 time in LEGEND_ODDS, or always with `how.legend` (Research done).
export function wildPick(taken, rnd = Math.random, how = {}) {
  const legend = how.legend || rnd() * LEGEND_ODDS < 1;
  const all = WALKABLE.filter((dex) => isLegendary(dex) === legend);
  const free = all.filter((dex) => !taken.has(dex));
  const pool = free.length ? free : all;
  const dex = pool[Math.floor(rnd() * pool.length)];
  return { dex, shiny: rnd() * (how.shinyOdds ?? 64) < 1 && hasShiny(dex), mega: "off", ...(legend ? { legend: true } : {}), ...(how.legend ? { called: true } : {}) };
}

// ---- Poké Balls ---------------------------------------------------------------------
export const BALLS = ["poke-ball", "great-ball", "ultra-ball", "master-ball"];
const BALL_RATE = { "poke-ball": 0.45, "great-ball": 0.65, "ultra-ball": 0.85, "master-ball": 1 };
// Berries fed before the ball (Pokémon GO's): how much likelier, and whether a catch brings twice the gift.
export const BAIT = {
  "razz-berry": { rate: 1.5 },
  "golden-razz-berry": { rate: 2.5 },
  "pinap-berry": { rate: 1, double: true },
  "silver-pinap-berry": { rate: 1.8, double: true },
};
// How likely `ball` catches `pick` ({ dex, shiny }), with `bait` fed first: a shiny is warier, a
// legendary much more so. The Master Ball never fails.
export function catchChance(ball, pick, bait = null) {
  const rate = BALL_RATE[ball];
  if (!rate) return 0;
  if (rate >= 1) return 1;
  return Math.min(0.97, rate * (pick.shiny ? 0.6 : 1) * (isLegendary(pick.dex) ? LEGEND_RATE : 1) * (BAIT[bait]?.rate ?? 1));
}
// A legendary: about 15 balls before it's gone (LEGEND_THROWS), each one far less likely to hold
// it: over all 15, Poké Balls catch it 4 times in 10, Ultra Balls 6 in 10, Ultra Balls with
// Golden Razz Berries 9 in 10. The rest of the time it gets away.
export const LEGEND_RATE = 0.075;
export const LEGEND_THROWS = 15;
// One throw: { caught, shakes } (the ball shakes three times before it clicks; fewer when it breaks out).
export function throwBall(ball, pick, rnd = Math.random, bait = null) {
  const caught = rnd() < catchChance(ball, pick, bait);
  return { caught, shakes: caught ? 3 : Math.floor(rnd() * 3) };
}
// Which ball a click throws (`items`: the Bag's counts), or null: the one chosen in the Bag
// (`chosen`, any, the Master Ball too) while there are some; else the cheapest first, but the best
// for a shiny or a legendary, and the Master Ball only for a legendary.
export function ballFor(items, pick, chosen = null) {
  if (BALLS.includes(chosen) && (items[chosen] ?? 0) > 0) return chosen;
  const order = isLegendary(pick.dex) ? ["master-ball", "ultra-ball", "great-ball", "poke-ball"]
    : pick.shiny ? ["ultra-ball", "great-ball", "poke-ball"]
    : ["poke-ball", "great-ball", "ultra-ball"];
  return order.find((id) => (items[id] ?? 0) > 0) ?? null;
}

// ---- a visitor's purse ----------------------------------------------------------------------
// Each wild Pokémon walking by carries Pokédollars too, shown over its head, taken with its gift:
// ₽10–30 mostly, 1 in 10 ₽60–100, a shiny ₽150, a legendary ₽400. (At "Often", 8 hours bring
// ~90 visitors; clicking 20 of them is about ₽500.)
// `chance`: how many carry one at all, by the visitors' pace (PURSE_CHANCE), so the day's cap
// lasts the day: every one at Rare, 1 in 2 at Often, 1 in 3 at Lots. A shiny or a legendary always does.
export const PURSE_CHANCE = { rare: 1, often: 1 / 2, lots: 1 / 3 };
// A legendary called over (the Azure Flute, the day's Research) carries none: it was paid for.
export function purse(pick, rnd = Math.random, chance = 1) {
  if (pick.called) return 0;
  if (isLegendary(pick.dex)) return 400;
  if (pick.shiny) return 150;
  if (chance < 1 && rnd() >= chance) return 0;
  return rnd() < 0.1 ? 60 + Math.floor(rnd() * 41) : 10 + Math.floor(rnd() * 21);
}
// What a pat (when it gives a heart), a spar you set up and a spar you watch pay.
export const TIP = { pat: 10, drop: 15, spar: 5 };
// So clicking doesn't become the work: at most this much a day from visitors' purses and from tips.
export const DAY_CAP = { purse: 600, tip: 200 };
// How much of `amount` (of kind "purse" or "tip") is still to be had today.
export const allowance = (daily, kind, amount) => Math.max(0, Math.min(amount, (DAY_CAP[kind] ?? Infinity) - (daily.count[kind] ?? 0)));

// ---- natures --------------------------------------------------------------------------
// A caught Pokémon has a nature of its own, and it shows: how fast it walks, how soon it naps,
// how often it spars or fidgets. (One chosen in the picker has none.)
export const NATURES = {
  hasty: { name: "Hasty", about: "walks faster", speed: 1.35 },
  lazy: { name: "Lazy", about: "naps sooner", sleep: 0.5 },
  calm: { name: "Calm", about: "stays up longer", sleep: 2 },
  brave: { name: "Brave", about: "spars more often", spar: 3 },
  jolly: { name: "Jolly", about: "fidgets and dances more", fidget: 2 },
};
export const natureOf = (pick) => NATURES[pick?.nature] ?? null;
// What a nature changes: speed, sleep, spar, fidget (1: nothing).
export const natureMul = (pick, what) => natureOf(pick)?.[what] ?? 1;

// A wild Pokémon caught (`wild`: the visitor's pick): a Pokémon of yours for the Box, already ♥1
// (it chose to come along), with a nature, and when it was caught.
export function caughtPick(wild, now, rnd = Math.random) {
  const keys = Object.keys(NATURES);
  return {
    dex: wild.dex,
    shiny: wild.shiny === true,
    mega: "auto",
    ...(wild.form ? { form: wild.form } : {}),
    friend: 20,
    hearts: 1,
    caught: now,
    nature: keys[Math.floor(rnd() * keys.length)],
  };
}

// ---- the Pokédex ----------------------------------------------------------------------
// Shared state { v: 1, seen: [dex], caught: [dex], shiny: [dex caught shiny], goals: [n claimed] }.
const dexList = (v) => (Array.isArray(v) ? [...new Set(v.filter((d) => Number.isInteger(d) && isWalkable(d)))] : []);
export function loadDex(raw) {
  const ok = raw?.v === 1;
  const caught = ok ? dexList(raw.caught) : [];
  return {
    v: 1,
    seen: ok ? [...new Set([...dexList(raw.seen), ...caught])] : [],
    caught,
    shiny: ok ? dexList(raw.shiny).filter((d) => caught.includes(d)) : [],
    goals: ok && Array.isArray(raw.goals) ? raw.goals.filter((n) => DEX_GOALS.some((g) => g.n === n)) : [],
  };
}
// The Pokédex having seen these species (null: nothing new).
export function withSeen(d, dexes) {
  const add = dexes.filter((x) => isWalkable(x) && !d.seen.includes(x));
  return add.length ? { ...d, seen: [...d.seen, ...new Set(add)] } : null;
}
export function withCaught(d, pick) {
  const add = (list, x) => (list.includes(x) ? list : [...list, x]);
  return { ...d, seen: add(d.seen, pick.dex), caught: add(d.caught, pick.dex), shiny: pick.shiny ? add(d.shiny, pick.dex) : d.shiny };
}
// Shiny on purpose: a species caught shiny can be chosen shiny in the picker.
export const shinyUnlocked = (d, dex) => d.shiny.includes(dex);

// Rewards as the Pokédex fills (species caught).
export const DEX_GOALS = [
  { n: 5, money: 750 },
  { n: 15, item: "ultra-ball", count: 3 },
  { n: 30, item: "master-ball", count: 1 },
  { n: 60, item: "master-ball", count: 1 },
  { n: 100, item: "master-ball", count: 2 },
  { n: 200, item: "master-ball", count: 3 },
];
export const goalText = (g) => (g.money ? `₽${g.money.toLocaleString("en-US")}` : `${g.count > 1 ? `${g.count} × ` : ""}${g.item.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ").replace("Poke", "Poké")}`);
// Goals reached and not given yet.
export const dueGoals = (d) => DEX_GOALS.filter((g) => d.caught.length >= g.n && !d.goals.includes(g.n));
export const nextGoal = (d) => DEX_GOALS.find((g) => d.caught.length < g.n) ?? null;

// Each region's species (by where they were introduced): how many, seen, caught.
const BY_REGION = Object.fromEntries(REGIONS.map((r) => [r, WALKABLE.filter((dex) => regionOf({ dex }) === r)]));
export function dexByRegion(d) {
  const seen = new Set(d.seen), caught = new Set(d.caught);
  return REGIONS.map((r) => ({ region: r, total: BY_REGION[r].length, seen: BY_REGION[r].filter((x) => seen.has(x)).length, caught: BY_REGION[r].filter((x) => caught.has(x)).length }))
    .filter((x) => x.total > 0);
}
export const DEX_TOTAL = WALKABLE.length;

// ---- Trainer mode ---------------------------------------------------------------------
// Settings → Trainer mode: only the Pokémon you caught (and the three Kanto starters) can be
// chosen or come to new agents. Entries for the picker and for new agents.
export const STARTERS = [1, 4, 7];
export const trainerEntries = (d) => [...new Set([...STARTERS, ...d.caught])].sort((a, b) => a - b).map((dex) => ({ dex }));
export const trainerKeys = (d) => new Set(trainerEntries(d).map((e) => String(e.dex)));
// New agents' Pokémon when Trainer mode is off: any species but the locked legendaries.
export const openEntries = (d, open = false) => WALKABLE.filter((dex) => !isLocked(dex, d, open)).map((dex) => ({ dex }));

// ---- the day's Research -----------------------------------------------------------------
// Three tasks a day, drawn from the day itself (every window agrees), each paying when done; all
// three call a legendary Pokémon over. Shared state:
// { v: 1, day, tasks: [{ id, goal, type?, n }], count: { <event>: n, top: { <dex>: jobs } }, bonus, yesterday }.
// Events: job (a job finished, with its Pokémon's dex), quick (an answer within a minute), pet,
// catch, gift (a visitor's), berry (eaten), spar, work (minutes worked).
export const TASKS = {
  job: { goals: [5, 10, 15], text: (n) => `Finish ${n} jobs`, pay: (n) => ({ money: 30 * n }) },
  type: { goals: [3], text: (n, type) => `${cap(type)}-type Pokémon finish ${n} jobs`, pay: () => ({ money: 375 }) },
  work: { goals: [60, 120], text: (n) => `Work ${n / 60}h in all`, pay: (n) => ({ money: 3 * n }) },
  quick: { goals: [2, 3], text: (n) => `Answer an agent within a minute, ${n} times`, pay: () => ({ money: 225 }) },
  pet: { goals: [3], text: (n) => `Pet ${n} Pokémon`, pay: () => ({ item: "poke-ball", count: 3 }) },
  catch: { goals: [1, 2], text: (n) => `Catch ${n} wild Pokémon`, pay: () => ({ item: "great-ball", count: 2 }), wild: true },
  gift: { goals: [2, 3], text: (n) => `Take ${n} gifts from visitors`, pay: () => ({ item: "poke-ball", count: 3 }), wild: true },
  berry: { goals: [1, 2], text: (n) => `Feed ${n} Berr${n === 1 ? "y" : "ies"}`, pay: () => ({ money: 225 }) },
  spar: { goals: [2, 3], text: (n) => `Watch ${n} spars`, pay: () => ({ money: 180 }) },
};
export const BONUS = { item: "ultra-ball", count: 1 }; // all three done (and a legendary comes)
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
export const taskText = (t) => TASKS[t.id]?.text(t.goal, t.type) ?? t.id;
export const taskPay = (t) => TASKS[t.id]?.pay(t.goal) ?? { money: 0 };
export const payText = (p) => goalText(p);

export const dayOf = (now) => {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
// A small seeded generator (the day's draw).
function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// The day's three tasks. `how.wild`: visitors are on (else no catching or gifts); `how.types`:
// the types on screen (the type task names one of them; none: no type task).
export function rollTasks(day, how = {}) {
  const rnd = seeded(hash(day));
  const ids = Object.keys(TASKS).filter((id) => (how.wild !== false || !TASKS[id].wild) && (id !== "type" || how.types?.length));
  const out = [];
  // Always one about jobs (the work itself), then two others.
  const first = rnd() < 0.5 || !ids.includes("type") ? "job" : "type";
  const rest = ids.filter((id) => id !== "job" && id !== "type");
  const order = [first, ...rest.map((id) => [id, rnd()]).sort((a, b) => a[1] - b[1]).map(([id]) => id)];
  for (const id of order.slice(0, 3)) {
    const goals = TASKS[id].goals;
    const goal = goals[Math.floor(rnd() * goals.length)];
    const type = id === "type" ? how.types[Math.floor(rnd() * how.types.length)] : undefined;
    out.push({ id, goal, n: 0, ...(type ? { type } : {}) });
  }
  return out;
}

const num = (v) => (Number.isFinite(v) && v > 0 ? v : 0);
// The day's Research as saved, or a new day's (yesterday's summed up). `how`: as rollTasks.
export function loadDaily(raw, now, how = {}) {
  const day = dayOf(now);
  const ok = raw?.v === 1 && typeof raw.day === "string" && Array.isArray(raw.tasks);
  if (ok && raw.day === day) {
    const tasks = raw.tasks.filter((t) => TASKS[t?.id] && Number.isInteger(t.goal)).map((t) => ({ id: t.id, goal: t.goal, n: Math.min(t.goal, num(t.n)), ...(TYPES.includes(t.type) ? { type: t.type } : {}) }));
    return { v: 1, day, tasks, count: cleanCount(raw.count), bonus: raw.bonus === true, ...(raw.yesterday ? { yesterday: raw.yesterday } : {}) };
  }
  const fresh = { v: 1, day, tasks: rollTasks(day, how), count: { top: {} }, bonus: false };
  if (ok) fresh.yesterday = recap(raw);
  else if (raw?.yesterday) fresh.yesterday = raw.yesterday;
  return fresh;
}
function cleanCount(c) {
  const out = { top: {} };
  if (!c || typeof c !== "object") return out;
  for (const [k, v] of Object.entries(c)) if (k !== "top" && num(v)) out[k] = v;
  if (c.top && typeof c.top === "object") for (const [k, v] of Object.entries(c.top)) if (num(v)) out.top[k] = v;
  return out;
}
// A day summed up: { day, jobs, caught, done (tasks), of, top (the busiest species' dex) }.
export function recap(daily) {
  const c = cleanCount(daily.count);
  const top = Object.entries(c.top).sort((a, b) => b[1] - a[1])[0];
  return { day: daily.day, jobs: c.job ?? 0, caught: c.catch ?? 0, done: (daily.tasks ?? []).filter((t) => t.n >= t.goal).length, of: (daily.tasks ?? []).length, ...(top ? { top: Number(top[0]) } : {}) };
}
export function recapText(y) {
  if (!y) return "";
  const parts = [`${y.jobs} job${y.jobs === 1 ? "" : "s"}`];
  if (y.caught) parts.push(`${y.caught} caught`);
  parts.push(`Research ${y.done}/${y.of}`);
  if (y.top && isWalkable(y.top)) parts.push(`busiest ${nameOf(y.top)}`);
  return `Yesterday: ${parts.join(" · ")}`;
}

// Something happened (`ev`, `n` of it; `dex`: the Pokémon it happened to, for job and type).
// Returns { daily, done: [tasks finished just now], bonus: all three just finished }.
export function progress(daily, ev, n = 1, dex = null) {
  const count = { ...daily.count, top: { ...daily.count.top }, [ev]: (daily.count[ev] ?? 0) + n };
  if (ev === "job" && dex) count.top[dex] = (count.top[dex] ?? 0) + n;
  const done = [];
  const tasks = daily.tasks.map((t) => {
    const hit = t.id === ev || (t.id === "type" && ev === "job" && dex && typeOf(dex) === t.type);
    if (!hit || t.n >= t.goal) return t;
    const next = { ...t, n: Math.min(t.goal, t.n + n) };
    if (next.n >= t.goal) done.push(next);
    return next;
  });
  const all = tasks.length > 0 && tasks.every((t) => t.n >= t.goal);
  const bonus = all && !daily.bonus;
  return { daily: { ...daily, tasks, count, bonus: daily.bonus || all }, done, bonus };
}

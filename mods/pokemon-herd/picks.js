// Who is which Pokémon. Saved per pane in shared state as
// { v: 2, panes: { <pane>: { dex, shiny, mega, form?, megaKind?, jobs?, stay? } } }.
// jobs: jobs finished since it became this Pokémon; stay: holds an Everstone (never evolves);
// hearts: friendship, 0..MAX_HEARTS; evolvedAt: when it last evolved (each view flashes it).
import { WALKABLE, isWalkable, hasShiny, hasForm, formsOf, evolutionsOf, waysOf } from "./dex.js";

const SHINY_ODDS = 64;

export function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const isObj = (v) => !!v && typeof v === "object";

// Mega mode: "off", "on", or "auto" (Mega while its agent works). Anything else: "auto".
export const megaMode = (v) => (v === "off" || v === "on" || v === "auto" ? v : "auto");

// The saved picks, dropping anything malformed or no longer walkable. When this mod has none
// yet, the upstream mod's { panes: { <pane>: <dex> } } is taken over (migrated: true).
export function loadPicks(current, legacy) {
  const panes = {};
  if (isObj(current) && isObj(current.panes)) {
    for (const [pane, p] of Object.entries(current.panes)) {
      if (!isObj(p) || !isWalkable(p.dex)) continue;
      const form = hasForm(p.dex, p.form) ? p.form : undefined; // a regional form, if it still exists
      const megaKind = p.megaKind === "X" || p.megaKind === "Y" ? p.megaKind : undefined; // Mega X or Y
      const jobs = Number.isInteger(p.jobs) && p.jobs > 0 ? p.jobs : undefined;
      const hearts = Number.isInteger(p.hearts) && p.hearts > 0 ? Math.min(p.hearts, MAX_HEARTS) : undefined;
      const evolvedAt = Number.isFinite(p.evolvedAt) && p.evolvedAt > 0 ? p.evolvedAt : undefined;
      panes[pane] = { dex: p.dex, shiny: p.shiny === true && hasShiny(p.dex, form), mega: megaMode(p.mega), ...(form ? { form } : {}), ...(megaKind ? { megaKind } : {}), ...(jobs ? { jobs } : {}), ...(p.stay === true ? { stay: true } : {}), ...(hearts ? { hearts } : {}), ...(evolvedAt ? { evolvedAt } : {}) };
    }
    if (Object.keys(panes).length) return { panes, migrated: false };
  }
  if (isObj(legacy) && isObj(legacy.panes)) {
    for (const [pane, dex] of Object.entries(legacy.panes)) if (isWalkable(dex)) panes[pane] = { dex, shiny: false, mega: "auto" };
    if (Object.keys(panes).length) return { panes, migrated: true };
  }
  return { panes, migrated: false };
}

const slotOf = (a) => a.pane || a.address;

// Saved picks first; a new agent gets a Pokémon nobody on screen has yet, and a 1 in 64 chance
// of a shiny. Deterministic per pane. Agents without a pane (sub-agents) aren't saved; `memo`
// (kept by the caller, in memory) holds theirs so they keep it even when a pane takes the same one.
export function assign(list, panes, memo = {}, odds = SHINY_ODDS) {
  const ids = {};
  const fresh = {};
  const used = new Set();
  for (const a of list) {
    const p = panes[slotOf(a)] ?? (a.pane ? null : memo[a.address]);
    if (p) { ids[a.address] = p; used.add(p.dex); }
  }
  for (const a of list) {
    if (ids[a.address]) continue;
    const slot = slotOf(a);
    let k = hash(slot) % WALKABLE.length;
    for (let i = 0; i < WALKABLE.length && used.has(WALKABLE[k]); i++) k = (k + 1) % WALKABLE.length;
    const dex = WALKABLE[k];
    const pick = { dex, shiny: hash(`${slot}:shiny`) % odds === 0 && hasShiny(dex), mega: "auto" };
    ids[a.address] = pick;
    if (a.pane) fresh[a.pane] = pick; // saved: agents with a pane
    else memo[a.address] = pick; // in memory: sub-agents
    used.add(dex);
  }
  return { ids, fresh };
}

// The picker's dice: any of `entries` but the current one, preferring a species nobody else has
// (`taken`: their dex numbers). Null when there is nothing else to pick.
export function randomEntry(entries, current, taken, rnd = Math.random) {
  const isCurrent = (e) => !!current && e.dex === current.dex && (e.form ?? null) === (current.form ?? null);
  const others = entries.filter((e) => !isCurrent(e));
  const free = others.filter((e) => !taken.has(e.dex));
  const pool = free.length ? free : others;
  return pool.length ? pool[Math.floor(rnd() * pool.length)] : null;
}

// Jobs its agent finishes before a Pokémon evolves (by levelling up); hearts for friendship.
export const EVOLVE_JOBS = 10;
export const MAX_HEARTS = 5;

// Whether one way to evolve (from dex.js waysOf) is met. `how`: { night, stone?, candy? }.
// A stone works only for its own ways; levelling up needs EVOLVE_JOBS jobs (or a Rare Candy);
// friendship needs full hearts, checked when a job finishes (or on a Rare Candy).
function wayMet(way, pick, how) {
  if (how.stone) return way === `stone:${how.stone}`;
  if (way.startsWith("stone:")) return false;
  const [kind, time] = way.split(":");
  const when = kind === "day" || kind === "night" ? kind : time;
  if (when && (when === "night") !== !!how.night) return false;
  if (kind === "friend") return (pick.hearts ?? 0) >= MAX_HEARTS;
  return how.candy || (pick.jobs ?? 0) >= EVOLVE_JOBS;
}

// What it evolves into now, or null: among the species it can become whose way is met, one
// chosen per pane (a hash of pane and species), so Eevee picks one branch and keeps to it.
// An Everstone stops everything.
export function evolveTarget(pick, slot, how) {
  if (pick.stay) return null;
  const into = evolutionsOf(pick.dex).filter((dex) => waysOf(dex).some((w) => wayMet(w, pick, how)));
  return into.length ? into[hash(`${slot}:${pick.dex}:evolve`) % into.length] : null;
}

// The pick, evolved into `dex`: a regional form into the same region's form when there is one;
// shiny (if that one has a shiny sprite), Mega mode, X/Y, hearts and the Everstone carry over;
// the job count starts over. `at`: when, so every view can flash it.
export function evolveInto(pick, dex, at) {
  const label = pick.form && formsOf(pick.dex).find((f) => f.form === pick.form)?.label;
  const form = label ? formsOf(dex).find((f) => f.label === label)?.form : undefined;
  const { form: _f, jobs: _j, ...rest } = pick;
  return { ...rest, dex, shiny: pick.shiny && hasShiny(dex, form), ...(form ? { form } : {}), jobs: 0, ...(at ? { evolvedAt: at } : {}) };
}

// Its agent finished a job: one more on its count, and it evolves if it can. Returns { pick, evolved }.
export function gainJob(pick, slot, how = {}, at = 0) {
  const counted = { ...pick, jobs: (pick.jobs ?? 0) + 1 };
  const dex = evolveTarget(counted, slot, { night: how.night });
  return dex ? { pick: evolveInto(counted, dex, at), evolved: true } : { pick: counted, evolved: false };
}

// Hearts up (or down), within 0..MAX_HEARTS.
export const withHearts = (pick, n) => ({ ...pick, hearts: Math.max(0, Math.min(MAX_HEARTS, (pick.hearts ?? 0) + n)) });

// What an item from the Bag would do for it: "evolve", "hearts", or null (no use now).
export function itemUse(pick, slot, id, how = {}) {
  if (id === "berry") return (pick.hearts ?? 0) < MAX_HEARTS ? "hearts" : null;
  if (id === "rare-candy") return evolveTarget(pick, slot, { night: how.night, candy: true }) ? "evolve" : null;
  const stone = /^(\w+)-stone$/.exec(id)?.[1];
  return stone && evolveTarget(pick, slot, { stone }) ? "evolve" : null;
}

// Uses an item on it: { pick, evolved } or null when it does nothing now.
export function useItem(pick, slot, id, how = {}, at = 0) {
  const use = itemUse(pick, slot, id, how);
  if (use === "hearts") return { pick: withHearts(pick, 1), evolved: false };
  if (use !== "evolve") return null;
  const stone = /^(\w+)-stone$/.exec(id)?.[1];
  const dex = evolveTarget(pick, slot, stone ? { stone } : { night: how.night, candy: true });
  return { pick: evolveInto(pick, dex, at), evolved: true };
}

// What it takes to evolve, for the picker: each species it can become and that one's ways.
export const evolveNeeds = (pick) => evolutionsOf(pick.dex).map((dex) => ({ dex, ways: waysOf(dex) }));

// What it takes to evolve, in words: "after 7 more jobs", "with a Thunder Stone", "at 5 ♥, by
// day"… joined with "or". Null when it has nothing to become.
export function needsText(pick) {
  const ways = new Set(evolveNeeds(pick).flatMap((n) => n.ways));
  if (!ways.size) return null;
  const left = Math.max(1, EVOLVE_JOBS - (pick.jobs ?? 0));
  const jobs = `after ${left} more job${left === 1 ? "" : "s"}`;
  const stones = [...ways].filter((w) => w.startsWith("stone:")).map((w) => w.slice(6));
  const cap = (k) => `${k[0].toUpperCase()}${k.slice(1)}`;
  const parts = [];
  if (stones.length) parts.push(`with a ${stones.length > 1 ? `${stones.slice(0, -1).map(cap).join(", ")} or ${cap(stones.at(-1))}` : cap(stones[0])} Stone`);
  if (ways.has("jobs")) parts.push(jobs);
  if (ways.has("day")) parts.push(`${jobs}, by day`);
  if (ways.has("night")) parts.push(`${jobs}, at night`);
  if (ways.has("friend")) parts.push(`at ${MAX_HEARTS} ♥`);
  if (ways.has("friend:day")) parts.push(`at ${MAX_HEARTS} ♥, by day`);
  if (ways.has("friend:night")) parts.push(`at ${MAX_HEARTS} ♥, at night`);
  return parts.length > 1 ? `${parts.slice(0, -1).join("; ")}; or ${parts.at(-1)}` : parts[0];
}

// Who is which Pokémon. Saved per pane in shared state as
// { v: 2, panes: { <pane>: { dex, shiny, mega, form?, megaKind?, jobs?, stay? } } }.
// jobs: jobs finished since it became this Pokémon; stay: holds an Everstone (never evolves);
// friend: friendship points, 0..FRIEND_MAX, and hearts: how many hearts those make;
// evolvedAt: when it last evolved (each view flashes it);
// held: the item it holds (Lucky Egg, Soothe Bell, Amulet Coin…); nick: the name you gave it.
import { WALKABLE, isWalkable, hasShiny, hasForm, formsOf, evolutionsOf, waysOf, fullName } from "./dex.js";
import { EVOLVES_FROM } from "./species.js";

const EVOLVES_FROM_MAP = new Map(Object.entries(EVOLVES_FROM).map(([to, from]) => [Number(to), from]));

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
      const friend = Number.isInteger(p.friend) && p.friend >= 0 ? Math.min(p.friend, FRIEND_MAX)
        : Number.isInteger(p.hearts) && p.hearts > 0 ? Math.min(p.hearts, MAX_HEARTS) * HEART_PTS : undefined;
      const hearts = friend ? Math.floor(friend / HEART_PTS) : undefined;
      const evolvedAt = Number.isFinite(p.evolvedAt) && p.evolvedAt > 0 ? p.evolvedAt : undefined;
      const held = HELD_IDS.includes(p.held) ? p.held : undefined;
      const nick = cleanNick(p.nick) ?? undefined;
      panes[pane] = { dex: p.dex, shiny: p.shiny === true && hasShiny(p.dex, form), mega: megaMode(p.mega), ...(form ? { form } : {}), ...(megaKind ? { megaKind } : {}), ...(jobs ? { jobs } : {}), ...(p.stay === true ? { stay: true } : {}), ...(friend ? { friend } : {}), ...(hearts ? { hearts } : {}), ...(evolvedAt ? { evolvedAt } : {}), ...(held ? { held } : {}), ...(nick ? { nick } : {}) };
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
// `pool` (Settings → New agents: Favorites): new agents' Pokémon come from these entries
// ({ dex, form? }) instead of every walking species.
export function assign(list, panes, memo = {}, odds = SHINY_ODDS, pool = null) {
  const choices = pool?.length ? pool : WALKABLE.map((dex) => ({ dex }));
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
    let k = hash(slot) % choices.length;
    for (let i = 0; i < choices.length && used.has(choices[k].dex); i++) k = (k + 1) % choices.length;
    const { dex, form } = choices[k];
    const pick = { dex, shiny: hash(`${slot}:shiny`) % odds === 0 && hasShiny(dex, form), mega: "auto", ...(form ? { form } : {}) };
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

// What a Pokémon can hold, and what each does: Lucky Egg, every job counts twice towards
// evolving; Soothe Bell, every heart it gains is two; Amulet Coin, it finds items twice as often;
// Leftovers, it never goes hungry; Exp. Share, each job its agent finishes counts for another too.
export const HELD_IDS = ["lucky-egg", "soothe-bell", "amulet-coin", "leftovers", "exp-share"];

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
  const counted = { ...pick, jobs: (pick.jobs ?? 0) + (pick.held === "lucky-egg" ? 2 : 1) };
  const dex = evolveTarget(counted, slot, { night: how.night });
  return dex ? { pick: evolveInto(counted, dex, at), evolved: true } : { pick: counted, evolved: false };
}

// Hearts up (or down), within 0..MAX_HEARTS.
// A Soothe Bell doubles what it gains (not what it loses).
// Friendship is points, 0..FRIEND_MAX; every HEART_PTS make a heart (`hearts`, kept beside it
// for everything that reads hearts). What each thing is worth: FRIEND. A Soothe Bell doubles
// what it gains (not what it loses). A pick saved before points had only hearts: those count.
export const HEART_PTS = 20;
export const FRIEND_MAX = MAX_HEARTS * HEART_PTS;
export const FRIEND = { pat: 3, quick: 4, spar: 3, berry: 10, hungry: -10 };
export const friendOf = (pick) => (Number.isInteger(pick.friend) ? pick.friend : (pick.hearts ?? 0) * HEART_PTS);
export function withFriend(pick, pts) {
  const friend = Math.max(0, Math.min(FRIEND_MAX, friendOf(pick) + (pts > 0 && pick.held === "soothe-bell" ? 2 * pts : pts)));
  return { ...pick, friend, hearts: Math.floor(friend / HEART_PTS) };
}
export const withHearts = (pick, n) => withFriend(pick, n * HEART_PTS);

// What an item from the Bag would do for it: "evolve", "hearts", "hold", or null (no use now).
export function itemUse(pick, slot, id, how = {}) {
  if (HELD_IDS.includes(id)) return pick.held === id ? null : "hold";
  if (id === "berry") return friendOf(pick) < FRIEND_MAX ? "hearts" : null;
  if (id === "rare-candy") return evolveTarget(pick, slot, { night: how.night, candy: true }) ? "evolve" : null;
  const stone = /^(\w+)-stone$/.exec(id)?.[1];
  return stone && evolveTarget(pick, slot, { stone }) ? "evolve" : null;
}

// Uses an item on it: { pick, evolved, back? } or null when it does nothing now. Giving it an
// item to hold hands back what it held (`back`, for the Bag).
export function useItem(pick, slot, id, how = {}, at = 0) {
  const use = itemUse(pick, slot, id, how);
  if (use === "hold") return { pick: { ...pick, held: id }, evolved: false, ...(pick.held ? { back: pick.held } : {}) };
  if (use === "hearts") return { pick: withFriend(pick, FRIEND.berry), evolved: false };
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
  // A Lucky Egg counts each job twice: what's left is in real jobs, and says why.
  const egg = pick.held === "lucky-egg";
  const left = Math.max(1, Math.ceil((EVOLVE_JOBS - (pick.jobs ?? 0)) / (egg ? 2 : 1)));
  const jobs = `after ${left} more job${left === 1 ? "" : "s"}${egg ? " (Lucky Egg: each counts twice)" : ""}`;
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

// Takes back what it holds: { pick, back } (the item, for the Bag), or null.
export function takeHeld(pick) {
  if (!pick.held) return null;
  const { held, ...rest } = pick;
  return { pick: rest, back: held };
}

// Sub-agents: which agents (by address) were started by another agent on screen. `terms`:
// herdr's terminals() ({ address, parent }); parents on this computer are bare terminal IDs,
// as agents' addresses are. Only agents without a pane (sub-agents) count: one with a pane
// keeps its own Pokémon.
export function familyOf(list, terms) {
  const agents = new Set(list.map((a) => a.address));
  const parentOf = new Map((terms ?? []).filter((t) => t && t.parent).map((t) => [t.address, t.parent]));
  const out = {};
  for (const a of list) {
    const p = parentOf.get(a.address);
    if (!a.pane && p && p !== a.address && agents.has(p)) out[a.address] = p;
  }
  return out;
}

// A sub-agent's Pokémon: its parent's, younger (the first stage of its line; a regional form
// stays in its region), shiny if the parent is, never Mega.
export function youngOf(pick) {
  let dex = pick.dex;
  for (let i = 0; i < 9 && EVOLVES_FROM_MAP.has(dex); i++) dex = EVOLVES_FROM_MAP.get(dex);
  const label = pick.form && formsOf(pick.dex).find((f) => f.form === pick.form)?.label;
  const form = label ? formsOf(dex).find((f) => f.label === label)?.form : undefined;
  return { dex, shiny: !!pick.shiny && hasShiny(dex, form), mega: "off", ...(form ? { form } : {}), young: true };
}

// Sub-agents as agents: herdr's agents() leaves out those without a pane, but terminals() has
// them with their parent. Each live one with a status whose parent is on screen becomes an
// agent like the others (no pane; its parent's space and tab, so its tag reads like its parent's).
const STATUSES = new Set(["working", "blocked", "done", "idle"]);
export function subAgents(list, terms) {
  const byAddr = new Map(list.map((a) => [a.address, a]));
  return (terms ?? []).filter((t) => t && t.state === "live" && STATUSES.has(t.status) && t.parent && byAddr.has(t.parent) && !byAddr.has(t.address))
    .map((t) => {
      const p = byAddr.get(t.parent);
      // Its "done" is for its parent to pick up, not for you to look at: it shows as idle.
      return { address: t.address, pane: "", space: p.space, space_name: p.space_name, tab: p.tab, tab_index: p.tab_index, tab_name: p.tab_name, status: t.status === "done" ? "idle" : t.status, app: t.report?.app ?? null, program: t.program, title: t.title ?? "", seq: 0, pinned: false, focused: false };
    });
}

// What another mod shows for an agent (Better Sidebar's card): its Pokémon's hearts and how
// close it is to evolving. `progress`: 0..1 when jobs are the way, else null; `note`: in words.
export function cardOf(pick) {
  const ways = new Set(evolveNeeds(pick).flatMap((n) => n.ways));
  const jobs = pick.jobs ?? 0;
  const byJobs = !pick.stay && (ways.has("jobs") || ways.has("day") || ways.has("night"));
  const stone = [...ways].find((w) => w.startsWith("stone:"));
  const note = pick.stay ? "Everstone"
    : !ways.size ? "" // nothing to become: nothing to say
    : byJobs ? `${Math.min(jobs, EVOLVE_JOBS)}/${EVOLVE_JOBS}${pick.held === "lucky-egg" ? " · 🥚×2" : " jobs"}`
    : ways.has("friend") || ways.has("friend:day") || ways.has("friend:night") ? `evolves at ${MAX_HEARTS} ♥`
    : stone ? `needs a ${stone.slice(6)[0].toUpperCase()}${stone.slice(7)} Stone`
    : "";
  return { hearts: pick.hearts ?? 0, maxHearts: MAX_HEARTS, progress: byJobs ? Math.min(1, jobs / EVOLVE_JOBS) : null, note };
}

// Folders remember their Pokémon. `folders`: { <folder>: <pane> }, the pane whose Pokémon that
// folder last had; `cwdOf`: { <address>: <folder> } (each terminal's starting folder, exactly:
// a subfolder is a folder of its own). An agent whose pane has no Pokémon yet, opened in a
// folder whose last pane is gone from the screen, gets that pane's Pokémon back as it was
// (hearts, jobs, held item, Everstone). Two new agents in one folder: the first gets it.
// Returns { inherit: { <pane>: pick }, forget: [old panes], folders } (folders: who each folder
// has now). A Pokémon moves, it isn't copied: the old panes are to be forgotten, or an item it
// holds would be held twice.
export function fromFolders(list, panes, folders, cwdOf) {
  const onScreen = new Set(list.map((a) => a.pane).filter(Boolean));
  const inherit = {};
  const forget = [];
  const taken = new Set();
  const next = { ...folders };
  for (const a of list) {
    const cwd = a.pane && cwdOf[a.address];
    if (!cwd) continue;
    const prev = folders[cwd];
    if (!panes[a.pane] && prev && prev !== a.pane && panes[prev] && !onScreen.has(prev) && !taken.has(prev)) {
      inherit[a.pane] = panes[prev];
      forget.push(prev);
      taken.add(prev);
    }
    // The folder now has this agent's Pokémon, unless another agent on screen holds it already.
    if (!next[cwd] || next[cwd] === prev && !onScreen.has(prev) || next[cwd] === a.pane) next[cwd] = a.pane;
  }
  return { inherit, forget, folders: next };
}

// Rivals: agents working in the same folder at once, who may edit each other's files. `cwdOf`:
// { <address>: <folder> }. Returns { <address>: [the other addresses working there] }.
export function rivalsOf(list, cwdOf) {
  const byFolder = new Map();
  for (const a of list) {
    const cwd = a.pane && a.status === "working" && cwdOf[a.address];
    if (!cwd) continue;
    if (!byFolder.has(cwd)) byFolder.set(cwd, []);
    byFolder.get(cwd).push(a.address);
  }
  const out = {};
  for (const group of byFolder.values()) {
    if (group.length < 2) continue;
    for (const addr of group) out[addr] = group.filter((x) => x !== addr);
  }
  return out;
}

// Which agent a notification is about: its action's pane or terminal, else an agent whose tab's
// name is in its title. Null when it's about none.
export function agentOfToast(p, list) {
  const args = p?.action?.args ?? {};
  const byArg = list.find((a) => (args.pane && a.pane === args.pane) || (args.terminal && a.address === args.terminal));
  if (byArg) return byArg;
  const title = String(p?.title ?? "");
  return list.find((a) => a.tab_name && title.includes(a.tab_name)) ?? null;
}

// Tired: the Usage Limits mod's shared "usage-limits.state" says how much of each provider's
// 5-hour window is used. From TIRED_AT percent the herd is tired (sweats, walks slower): a nudge
// before the limit. Returns the highest percent used, or null when there's no such mod.
export const TIRED_AT = 90;
export function sessionUsed(state) {
  if (!state || typeof state !== "object") return null;
  let top = null;
  for (const p of Object.values(state)) {
    const report = p?.report ?? p?.lastGood;
    for (const w of report?.windows ?? []) {
      if (w?.id === "session" && Number.isFinite(w.percent)) top = Math.max(top ?? 0, w.percent);
    }
  }
  return top;
}

// What an agent says it's doing (its status report's message: "Running the tests"), cut to `max`.
export function sayingOf(term, max = 48) {
  const msg = term?.report?.msg ?? term?.report?.message ?? (typeof term?.status === "object" ? term.status?.msg : null);
  if (typeof msg !== "string" || !msg.trim()) return null;
  const one = msg.trim().split("\n")[0];
  return one.length > max ? `${one.slice(0, max - 1)}…` : one;
}

// Hearts in halves, from friendship points: "0", "½", "1", "1½" … "5". A Berry is half a heart,
// so the Bag can say "♥ 1 → 1½" rather than "1 → 1".
export function heartsText(friend) {
  const halves = Math.floor(Math.max(0, Math.min(FRIEND_MAX, friend)) / (HEART_PTS / 2));
  const whole = Math.floor(halves / 2);
  return halves % 2 ? (whole ? `${whole}½` : "½") : String(whole);
}

// Who holds what: [{ slot, pick }] of the panes whose Pokémon holds `id`.
export const holdersOf = (id, panes) => Object.entries(panes).filter(([, p]) => p.held === id).map(([slot, pick]) => ({ slot, pick }));

// A wild Pokémon passing by: any walking species nobody on screen has, shiny 1 in SHINY_ODDS.
export function visitorPick(taken, rnd = Math.random) {
  const free = WALKABLE.filter((dex) => !taken.has(dex));
  const pool = free.length ? free : WALKABLE;
  const dex = pool[Math.floor(rnd() * pool.length)];
  return { dex, shiny: rnd() * SHINY_ODDS < 1 && hasShiny(dex), mega: "off" };
}

// The pick after choosing another Pokémon in the picker (`entry`: { dex, form? }): what the pane
// holds and its Everstone stay with it (an item must never just vanish); its shiny luck stays if
// the new one has a shiny; the job count and friendship start over; Mega X/Y only for the same
// species. `mega`: the picker's Mega setting.
export function switchedPick(cur, entry, mega, megaKind) {
  const { dex, form } = entry;
  return {
    dex,
    shiny: cur?.shiny === true && hasShiny(dex, form),
    mega,
    ...(form ? { form } : {}),
    ...(dex === cur?.dex && megaKind ? { megaKind } : {}),
    ...(cur?.stay ? { stay: true } : {}),
    ...(cur?.held ? { held: cur.held } : {}),
  };
}

// The saved picks kept to `max` panes, the least recently saved forgotten first (savePicks puts
// every pane it saves last), and the items those forgotten Pokémon held, for the Bag.
// `keep`: panes never to drop (on screen, or being saved now); the oldest of the rest go first.
export function trimPanes(panes, max, keep = new Set()) {
  const out = { ...panes };
  const returned = [];
  let over = Object.keys(out).length - max;
  for (const k of Object.keys(panes)) {
    if (over <= 0) break;
    if (keep.has(k)) continue;
    if (out[k]?.held) returned.push(out[k].held);
    delete out[k];
    over--;
  }
  return { panes: out, returned };
}

// The Box: Pokémon you raised whose agents are gone. A saved pane not on screen whose Pokémon is
// of `entry`'s species (and form) and was raised (hearts, jobs, an item, an Everstone, a shiny):
// the latest such, as { slot, pick }, or null. Whoever gets that species next takes this one
// (moved, not copied: the caller forgets `slot`).
export const raised = (p) => !!(p && (p.held || p.stay || p.shiny || (p.friend ?? 0) > 0 || (p.hearts ?? 0) > 0 || (p.jobs ?? 0) > 0));
export function fromBox(entry, panes, onScreen, except = null) {
  const hits = Object.entries(panes).filter(([slot, p]) => slot !== except && !onScreen.has(slot)
    && p.dex === entry.dex && (p.form ?? null) === (entry.form ?? null) && raised(p));
  if (!hits.length) return null;
  const [slot, pick] = hits[hits.length - 1];
  return { slot, pick };
}

// Exp. Share: which other Pokémon on screen gets a job too when its holder's agent finishes one:
// one that evolves by jobs (no Everstone), the furthest from it. `picks`: { <pane>: pick } of
// those on screen; `giver`: the holder's pane. Null when none can use it.
export function expShareTarget(picks, giver) {
  let best = null, least = Infinity;
  for (const [pane, p] of Object.entries(picks)) {
    if (pane === giver) continue;
    const c = cardOf(p);
    if (c.progress === null || c.progress >= least) continue;
    best = pane;
    least = c.progress;
  }
  return best;
}

// One strip counts. Several may run at once (two windows, or the mod installed twice under one
// name); each would count every job, Berry and find again. They elect one through shared state
// `cur` ({ id, at }): the leader writes `at` each tick; another takes over once it's quiet for
// `ttl`. Returns { leader, write } (write: what to save, or null).
export function electLeader(cur, me, now, ttl = 3000) {
  const free = !cur || typeof cur.id !== "string" || !(now - cur.at < ttl);
  if (free || cur.id === me) return { leader: true, write: { id: me, at: now } };
  return { leader: false, write: null };
}

// The Box, for the Bag's Box tab: raised Pokémon whose agents are gone, the latest first.
export function boxList(panes, onScreen) {
  return Object.entries(panes).filter(([slot, p]) => !onScreen.has(slot) && raised(p)).map(([slot, pick]) => ({ slot, pick })).reverse();
}

// Choosing another Pokémon for a pane: the one it was goes to the Box when raised (its hearts,
// jobs, shiny…), under a key of its own ("box-<when>-<dex>"), instead of being overwritten. What
// it held and its Everstone stay with the pane (switchedPick), so the boxed one has neither.
// Returns { key, pick } to save, or null (not raised, or the same species and form).
export function boxOnSwitch(cur, entry, now) {
  if (!cur || (cur.dex === entry.dex && (cur.form ?? null) === (entry.form ?? null))) return null;
  const { held, stay, evolvedAt, ...rest } = cur;
  if (!raised(rest)) return null;
  return { key: `box-${now}-${cur.dex}`, pick: rest };
}

// A nickname (the Box's Rename): trimmed, 16 characters at most; null when empty or not text.
export function cleanNick(v) {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, 16).trim();
  return t || null;
}

// What to call it: "Blaze (Charizard)" with a nickname, else "Charizard" (a form: "Vulpix (Alola)").
export const nameFor = (p) => (p?.nick ? `${p.nick} (${fullName(p.dex, p.form)})` : fullName(p.dex, p.form));

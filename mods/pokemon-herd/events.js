// Two events, kept rare so they never pull you off your work: a Mass Outbreak (once a day, one
// species keeps walking by for 20 minutes, shinies likelier) and a Raid (an egg every 2½ hours of
// work per agent in a day, 2 at most; it hatches into a boss you fight by dropping your Pokémon
// on it, each once a minute, those whose agents are working hitting harder). Eggs come from
// minutes of work, not jobs: a message to an agent counts as a job, so jobs could be spammed. Pure.
import { WALKABLE, evolutionsOf, hasShiny } from "./dex.js";
import { EVOLVES_FROM } from "./species.js";
import { isLegendary, damage, dayOf, bestType } from "./trainer.js";
import { pickMove } from "./moves.js";

// ---- Mass Outbreak ------------------------------------------------------------------------
export const OUTBREAK_MS = 20 * 60000;
export const OUTBREAK_EVERY = [2, 3]; // minutes between visitors during one (as Often's 3–8, but faster)
// The pace during an outbreak: its own, or the one set if that's faster still ("lots").
export const outbreakPace = (pace) => [Math.min(OUTBREAK_EVERY[0], pace[0]), Math.min(OUTBREAK_EVERY[1], pace[1])];
export const OUTBREAK_SHARE = 0.8; // of its visitors, the outbreak's species
export const OUTBREAK_SHINY = 16; // 1 in 16 shiny, as an outbreak in the games
const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };
// The species that come in outbreaks: first stages that evolve, no legendaries.
const OUTBREAKERS = WALKABLE.filter((dex) => EVOLVES_FROM[dex] === undefined && evolutionsOf(dex).length > 0 && !isLegendary(dex));
// The day's outbreak (`day`: "YYYY-MM-DD", local): { dex, from, until } as ms since that day's
// midnight; between 9:30 and 17:00, the same in every window.
export function outbreakOfDay(day) {
  const start = Math.round((9.5 + hash(`${day}:at`) * 7.5) * 3600000);
  return { dex: OUTBREAKERS[Math.floor(hash(`${day}:dex`) * OUTBREAKERS.length)], from: start, until: start + OUTBREAK_MS };
}
// The outbreak on now, or null: the day's, or one called (`called`: { dex, from, until } in ms).
export function outbreakAt(now, called = null) {
  if (called && Number.isFinite(called.from) && now >= called.from && now < called.until && WALKABLE.includes(called.dex)) return called;
  const d = new Date(now);
  const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const o = outbreakOfDay(dayOf(now));
  return now >= midnight + o.from && now < midnight + o.until ? { dex: o.dex, from: midnight + o.from, until: midnight + o.until } : null;
}
// A visitor during an outbreak: most often its species, shinier.
export function outbreakPick(pick, o, rnd = Math.random) {
  if (pick.legend || rnd() >= OUTBREAK_SHARE) return pick;
  return { ...pick, dex: o.dex, shiny: rnd() * OUTBREAK_SHINY < 1 && hasShiny(o.dex), outbreak: true };
}

// ---- Raids ----------------------------------------------------------------------------------
// An egg every RAID_WORK minutes of work per agent (all agents' minutes, over how many there are),
// MAX_EGGS a day: simulated (scripts/sim-raid.mjs day), about 0.7 a day on a light day and 1.7 on
// a busy one, whatever the team.
export const RAID_WORK = 150;
export const MAX_EGGS = 2;
export const RAID_COOLDOWN = 60000; // each of yours hits it once a minute (dropped on it)
export const WORKING_HIT = 1.5; // one whose agent is working hits ×1.5
export const EGG_MS = 5 * 60000; // it hatches after 5 minutes
export const RAID_MS = 30 * 60000; // then 30 minutes to beat the boss
// A boss's bulk: 3× a wild one's beating for each agent working when it hatched (at least one).
// Simulated (scripts/sim-raid.mjs): an eager player, dropping each one as soon as it's ready, beats
// it in about 13 minutes of the 30 whatever the team (84% alone, 99% with six); one dropping one a
// minute wins alone, rarely against a big team's boss. Each of yours faints once or twice.
export const RAID_HP = 3;
export const RAID_HP_PER = 3;
export const BOSS_SIZE = 1.8;
export const RAID_CHIP = 0.03;
export const BEATEN_MS = 90000; // about as long as the beaten boss takes to walk off // the least a hit takes off a boss
export const RAID_LEGEND = 0.2; // a legendary boss 1 time in 5; else an Alpha at its last stage
const FINALS = WALKABLE.filter((dex) => EVOLVES_FROM[dex] !== undefined && evolutionsOf(dex).length === 0 && !isLegendary(dex));
const LEGENDS = WALKABLE.filter((dex) => isLegendary(dex));

// A raid, as kept in shared state: { v: 1, id, at (the egg), hatch, until, boss: { dex, alpha?,
// legend?, shiny? }, hp (0..1), hits: [{ at, pane, key, type, eff, dmg }], beaten?, paid? }.
// `how`: { caught: the Pokédex's caught (a legendary boss is a new one), agents: how many agents
// are working (its bulk: RAID_HP, and RAID_HP_PER for each one past the first) }.
export function newRaid(now, rnd = Math.random, how = {}) {
  let boss;
  if (rnd() < RAID_LEGEND) {
    const fresh = LEGENDS.filter((d) => !how.caught?.has(d));
    const pool = fresh.length ? fresh : LEGENDS;
    boss = { dex: pool[Math.floor(rnd() * pool.length)], legend: true };
  } else {
    boss = { dex: FINALS[Math.floor(rnd() * FINALS.length)], alpha: true };
  }
  if (rnd() * 64 < 1 && hasShiny(boss.dex)) boss.shiny = true;
  const bulk = RAID_HP + RAID_HP_PER * Math.max(0, (how.agents ?? 1) - 1);
  return { v: 1, id: `${now}-${boss.dex}`, at: now, hatch: now + EGG_MS, until: now + EGG_MS + RAID_MS, boss, bulk, hp: 1, hits: [] };
}
export function loadRaid(raw) {
  if (raw?.v !== 1 || typeof raw.id !== "string" || !raw.boss || !WALKABLE.includes(raw.boss.dex)) return null;
  if (![raw.at, raw.hatch, raw.until].every(Number.isFinite)) return null;
  return { ...raw, hp: Math.max(0, Math.min(1, Number.isFinite(raw.hp) ? raw.hp : 1)), hits: Array.isArray(raw.hits) ? raw.hits.slice(-12) : [] };
}
// Where a raid is: "egg", "battle", "beaten" (its boss, weakened, walks off to be caught), "gone"
// (it got away, or long over), or null (none).
export function raidPhase(r, now) {
  if (!r) return null;
  // Beaten: its note stays while the boss walks off (BEATEN_MS), or a moment once it's caught.
  if (r.beaten) return now < (Number.isFinite(r.caught) ? r.caught + 8000 : r.beaten + BEATEN_MS) ? "beaten" : null;
  if (now < r.hatch) return "egg";
  if (now < r.until) return "battle";
  return now < r.until + 8000 ? "gone" : null;
}
// Whether work done lays an egg: the day's minutes of work (all agents') went from `before` to
// `after` past a multiple of RAID_WORK × `agents` (MAX_EGGS a day at most), and none is on now.
export function laysEgg(before, after, phase, agents = 1) {
  const per = RAID_WORK * Math.max(1, agents);
  const a = Math.floor(before / per), b = Math.floor(after / per);
  return b > a && b >= 1 && b <= MAX_EGGS && (phase === null || phase === "gone");
}

// One of yours hits the boss (its fighter key; `pane` its agent's): its best type, the damage a wild
// one would take, over RAID_HP. Returns the raid after it, and the hit.
// Unless that blow beats it, the boss strikes back at once (COUNTER_MS after): its best type at
// the attacker (`back`: its effect, and the share of health it takes, as a wild one's hit back), and
// knocks it away (BOSS_PUSH px from the boss): no one crowds round it.
export const COUNTER_MS = 1200, BOSS_PUSH = 150; // (its own move gathers first: fx.js CHARGE_MS)
export const RAID_BACK = 0.75; // the boss's answer hurts ¾ of a wild one's hit back
export const RAID_REST = 2 * 60000; // fainted in a raid: back in 2 minutes (not a wild fight's 10)
export function raidHit(r, key, pane, type, now, rnd = Math.random, how = {}) {
  const d = damage(key, r.boss.dex, rnd, { alphaTarget: !!r.boss.alpha, shadowAttacker: !!how.shadow, mul: how.move?.mul ?? 1, ...(how.move?.type ? { type: how.move.type } : {}) });
  // Even a weak or wrong-typed one chips it: at least RAID_CHIP of a one-agent boss, before its
  // bulk. A miss does nothing.
  const dmg = how.move?.miss ? 0 : Math.max(RAID_CHIP * RAID_HP, d.dmg * (how.working ? WORKING_HIT : 1)) / (r.bulk ?? RAID_HP);
  const hp = Math.max(0, r.hp - dmg);
  const bm = pickMove(r.boss.dex, key, rnd); // the boss's answer: its move (never a dash: it stands)
  const b = damage(r.boss.dex, key, rnd, { alphaAttacker: !!r.boss.alpha, alphaTarget: !!how.alpha, shadowTarget: !!how.shadow, mul: bm.mul, type: bm.type });
  const back = hp > 0 ? { type: bm.type, name: bm.name, crit: bm.crit, ultimate: bm.ultimate, miss: bm.miss, eff: b.eff, dmg: b.dmg * 0.75 * RAID_BACK * (1 - 0.02 * Math.min(5, how.hearts ?? 0)) } : null;
  const mv = how.move ? { name: how.move.name, physical: how.move.physical, crit: how.move.crit, ultimate: how.move.ultimate, miss: how.move.miss } : {};
  const hit = { at: now, pane, key, type, eff: d.eff, dmg, ...mv, ...(back ? { back } : {}), ...(how.drop ? { drop: true } : {}) };
  return { raid: { ...r, hp, hits: [...r.hits, hit].slice(-12), ...(hp <= 0 ? { beaten: now } : {}) }, hit };
}
// How long till `pane`'s Pokémon can hit again (ms; 0: now): once a RAID_COOLDOWN.
export function cooldownLeft(r, pane, now) {
  const last = Math.max(-Infinity, ...r.hits.filter((h) => h.pane === pane).map((h) => h.at));
  return Math.max(0, last + RAID_COOLDOWN - now);
}
// What beating it pays: money, and Ultra Balls to catch it with.
export const raidReward = (boss) => ({ money: boss.legend ? 600 : 300, item: "ultra-ball", count: 3 });
// Its boss, as the visitor it becomes once beaten: weakened (a sliver of health), slow.
export const bossPick = (boss) => ({ dex: boss.dex, shiny: !!boss.shiny, mega: "off", hp: 0.05, ...(boss.alpha ? { alpha: true } : {}), ...(boss.legend ? { legend: true } : {}), raid: true });

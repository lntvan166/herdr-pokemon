// The Day Care, as in the games, its steps your agents' work. Pure.
// Two of the Box left together (`pair`: their Box keys) lay an egg now and then if they can breed
// (EGG_GROUPS from PokeAPI, breed-data.js): a ♂ and a ♀ sharing an egg group, or either with a
// Ditto (a genderless one only with Ditto); none in No Eggs (legendaries, babies). Every LAY_MIN
// minutes of all your agents' work together, an egg with a chance (as the games' "get along": the
// same species likelier). One egg at a time: it hatches after its species' egg cycles in minutes
// of work (EGG_CYCLES × HATCH_PER_CYCLE: most 1 h, a Magikarp 15 min, a Dratini 2 h, at most 4),
// into the Box: its mother's line at its first stage (a Pichu from a Raichu; not a baby that
// needs an Incense in the games: a Snorlax lays a Snorlax, not a Munchlax), its
// parents' moves it can learn passed on, the wild shiny odds.
import { EGG_GROUPS, EGG_CYCLES } from "./breed-data.js";
import { EVOLVES_FROM } from "./species.js";
import { isWalkable } from "./dex.js";
import { rateOf } from "./gender.js";

const NO_EGGS = 1 << 15, DITTO = 1 << 13;
export const DITTO_DEX = 132;
export const LAY_MIN = 15; // minutes of work between tries
export const LAY = { same: 0.5, other: 0.2 }; // the chance each try: the same species, or not
export const HATCH_PER_CYCLE = 3; // minutes of work per egg cycle
export const HATCH_MIN = 15, HATCH_MAX = 240;
// Where a line's babies hatch as both kinds: Nidoran ♀ (♂ too), Illumise (Volbeat too), Manaphy
// (Phione).
const BOTH = { 29: [29, 32], 314: [314, 313], 490: [489] };

const dexOf = (p) => parseInt(p?.dex, 10);
export const groupsOf = (dex) => EGG_GROUPS[parseInt(dex, 10)] ?? NO_EGGS;
export const isDitto = (p) => dexOf(p) === DITTO_DEX;
const genderOf = (p) => (rateOf(dexOf(p)) < 0 ? null : p.gender === "f" || p.gender === "m" ? p.gender : null);

// Whether `a` and `b` (picks) can have an egg: null if not, else "same" or "other" (how well they
// get along: the same species, or not; with a Ditto always "other").
export function canBreed(a, b) {
  if (!a || !b) return null;
  const ga = groupsOf(a.dex), gb = groupsOf(b.dex);
  if (ga & NO_EGGS || gb & NO_EGGS) return null;
  if (isDitto(a) && isDitto(b)) return null;
  if (isDitto(a) || isDitto(b)) return "other";
  const sa = genderOf(a), sb = genderOf(b);
  if (!sa || !sb || sa === sb || !(ga & gb)) return null;
  return dexOf(a) === dexOf(b) ? "same" : "other";
}
// Why two can't: a few words for the Day Care's line.
export function whyNot(a, b) {
  if (groupsOf(a.dex) & NO_EGGS || groupsOf(b.dex) & NO_EGGS) return "one of them can't have eggs";
  if (isDitto(a) && isDitto(b)) return "two Ditto can't";
  const sa = genderOf(a), sb = genderOf(b);
  if (!sa || !sb) return "a genderless one needs a Ditto";
  if (sa === sb) return "they're the same gender";
  return "they don't share an egg group";
}

// The one whose line the egg is: the female, else the one that isn't a Ditto.
export const motherOf = (a, b) => (isDitto(a) ? b : isDitto(b) ? a : genderOf(a) === "f" ? a : genderOf(b) === "f" ? b : a);

// The babies that hatch only with an Incense held in the games (Azurill, Wynaut, Budew, Chingling,
// Bonsly, Mime Jr., Happiny, Munchlax, Mantyke): without one, the next stage.
export const INCENSE = new Set([298, 360, 406, 433, 438, 439, 440, 446, 458]);
// Its line's first stage, as it hatches (a baby too, but for those needing an Incense), and that
// we can draw.
export function firstStage(dex) {
  let d = parseInt(dex, 10);
  for (let i = 0; i < 4; i++) {
    const pre = EVOLVES_FROM[d];
    if (pre === undefined || INCENSE.has(pre) || !isWalkable(pre)) break;
    d = pre;
  }
  return d;
}
export const hatchMinutes = (dex) => Math.max(HATCH_MIN, Math.min(HATCH_MAX, (EGG_CYCLES[parseInt(dex, 10)] ?? 20) * HATCH_PER_CYCLE));

// The egg two lay: { dex, moves?, need, done: 0, at }.
// `learnable(dex)`: the move names it can learn (moves.js learnableOf), for the moves passed on.
export function layEgg(a, b, now, rnd = Math.random, learnable = null) {
  const mom = motherOf(a, b);
  let dex = firstStage(mom.dex);
  const both = BOTH[dex];
  if (both) dex = both[Math.floor(rnd() * both.length)];
  const can = learnable ? new Set(learnable(dex)) : null;
  const moves = can ? [...new Set([...(a.moves ?? []), ...(b.moves ?? [])])].filter((n) => can.has(n)).slice(0, 4) : [];
  return { dex, ...(moves.length ? { moves } : {}), need: hatchMinutes(dex), done: 0, at: now };
}

// The Day Care's state, shared: { v: 1, pair: [Box key, Box key] | [], left: minutes toward the
// next try, egg: { dex, moves?, need, done, at } | null, hatched: how many so far, last? }.
export function loadCare(raw) {
  const ok = raw?.v === 1;
  const pair = ok && Array.isArray(raw.pair) ? raw.pair.filter((k) => typeof k === "string").slice(0, 2) : [];
  const e = ok ? raw.egg : null;
  const egg = e && Number.isInteger(e.dex) && Number.isFinite(e.need) ? { dex: e.dex, ...(Array.isArray(e.moves) && e.moves.length ? { moves: e.moves.filter((n) => typeof n === "string").slice(0, 4) } : {}), need: e.need, done: Math.max(0, Number(e.done) || 0), at: Number(e.at) || 0 } : null;
  const l = ok ? raw.last : null; // the last one hatched: { dex, shiny, at } (the strip says so a while)
  const last = l && Number.isInteger(l.dex) && Number.isFinite(l.at) ? { dex: l.dex, shiny: l.shiny === true, at: l.at } : null;
  return { v: 1, pair, left: ok && Number.isFinite(raw.left) ? Math.max(0, raw.left) : 0, egg, hatched: ok && Number.isInteger(raw.hatched) ? raw.hatched : 0, ...(last ? { last } : {}) };
}

// `minutes` more of your agents' work: the egg nearer hatching, or, with none, tries to lay.
// `picks`: the saved picks (the pair's are looked up there, in the Box). Returns { care, laid?,
// hatched? } (hatched: the egg, done; the caller makes the Pokémon, hatchPick).
export function careWork(care, picks, minutes, now, rnd = Math.random, learnable = null) {
  if (!(minutes > 0)) return { care };
  if (care.egg) {
    const done = care.egg.done + minutes;
    if (done < care.egg.need) return { care: { ...care, egg: { ...care.egg, done } } };
    // Hatched: the minutes over it go toward the next egg.
    return { care: { ...care, egg: null, left: Math.min(LAY_MIN, done - care.egg.need), hatched: care.hatched + 1 }, hatched: care.egg };
  }
  const [a, b] = care.pair.map((k) => (k.startsWith("box-") ? picks[k] : null));
  const how = canBreed(a, b);
  if (!how) return { care: { ...care, left: 0 } };
  let left = care.left + minutes;
  while (left >= LAY_MIN) {
    left -= LAY_MIN;
    if (rnd() < LAY[how]) {
      const egg = layEgg(a, b, now, rnd, learnable);
      return { care: { ...care, left: 0, egg: { ...egg, done: Math.min(egg.need - 1, left) } }, laid: egg };
    }
  }
  return { care: { ...care, left } };
}

// The Pokémon out of an egg: a pick for the Box, as one caught (hearts, a nature, a size, a
// gender; `extra` from the caller: shiny, size, gender, nature), hatched rather than caught.
export function hatchPick(egg, now, extra = {}) {
  return {
    dex: egg.dex,
    shiny: extra.shiny === true,
    mega: "auto",
    friend: 40, // two hearts: it knew you from the egg (as the games' hatched ones, friendlier)
    hearts: 2,
    ...(Number.isFinite(extra.size) ? { size: extra.size } : {}),
    ...(extra.gender === "m" || extra.gender === "f" ? { gender: extra.gender } : {}),
    ...(egg.moves?.length ? { moves: egg.moves } : {}),
    caught: now,
    caughtAs: egg.dex,
    hatched: true,
    ...(extra.nature ? { nature: extra.nature } : {}),
  };
}

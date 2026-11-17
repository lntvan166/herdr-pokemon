// Sparring, as a real (friendly) battle. Pure.
// Two of yours take turns with their moves (moves.js pickMove: their four, STAB, now and then a
// signature move; misses; crits), the damage as the games reckon it (trainer.js damage, without
// the strip's DAMAGE_SCALE: a knockout in one blow can happen, as in the games). Each starts at
// full health, the faster moving first; the first down loses, or after SPAR_TURNS each, the one with more left wins.
// Nobody is hurt for real.
import { damage, moveHow, DAMAGE_SCALE, speedOf } from "./trainer.js";
import { pickMove, PRIORITY, DRAIN } from "./moves.js";

export const SPAR_TURNS = 3; // rounds, each one move apiece, at most
export const SPAR_HIT = 1 / DAMAGE_SCALE; // the games' own numbers

// Each move's side effect, as in the games: [what, chance]. par: paralysed (a turn lost 1 in 4, its
// Speed halved); brn: burned (1/16 of its health a turn, its physical moves halved); psn: poisoned
// (1/8 a turn); frz: frozen (no move till it thaws, 1 in 5 a turn); flinch: it loses its move this
// round (only if hit first); atk/def/spa/spd: that stat of the other falls a stage (×⅔).
export const SIDE_EFFECTS = {
  "Body Slam": ["par", 0.3], "Thunder Punch": ["par", 0.1], "Thunderbolt": ["par", 0.1], "Thunder": ["par", 0.3],
  "Fire Punch": ["brn", 0.1], "Flamethrower": ["brn", 0.1],
  "Ice Punch": ["frz", 0.1], "Ice Beam": ["frz", 0.1], "Blizzard": ["frz", 0.1],
  "Poison Jab": ["psn", 0.3], "Sludge Bomb": ["psn", 0.3], "Gunk Shot": ["psn", 0.3],
  "Air Slash": ["flinch", 0.3], "Iron Head": ["flinch", 0.3], "Waterfall": ["flinch", 0.2], "Zen Headbutt": ["flinch", 0.2], "Dark Pulse": ["flinch", 0.2],
  "Crunch": ["def", 0.2], "Play Rough": ["atk", 0.1], "Moonblast": ["spa", 0.3],
  "Psychic": ["spd", 0.1], "Shadow Ball": ["spd", 0.2], "Bug Buzz": ["spd", 0.1], "Earth Power": ["spd", 0.1], "Energy Ball": ["spd", 0.1], "Flash Cannon": ["spd", 0.1],
  "Ember": ["brn", 0.1], "Flame Wheel": ["brn", 0.1], "Fire Blast": ["brn", 0.1], "Thunder Shock": ["par", 0.1], "Spark": ["par", 0.3],
  "Lick": ["par", 0.3], "Dragon Breath": ["par", 0.3], "Powder Snow": ["frz", 0.1], "Cross Poison": ["psn", 0.1], "Sludge Wave": ["psn", 0.1],
  "Icicle Crash": ["flinch", 0.3], "Rock Slide": ["flinch", 0.3], "Bite": ["flinch", 0.3], "Twister": ["flinch", 0.2],
  "Rock Smash": ["def", 0.5], "Iron Tail": ["def", 0.3], "Acid": ["spd", 0.1], "Focus Blast": ["spd", 0.1],
  "Mud Shot": ["spe", 1], "Bulldoze": ["spe", 1], "Struggle Bug": ["spa", 1], "Snarl": ["spa", 1],
};
export const STATUS_TEXT = { par: "It's paralyzed!", brn: "It's burned!", psn: "It's poisoned!", frz: "It's frozen solid!", atk: "Its Attack fell!", def: "Its Defense fell!", spa: "Its Sp. Atk fell!", spd: "Its Sp. Def fell!", spe: "Its Speed fell!" };
export const SKIP_TEXT = { par: "Fully paralyzed!", frz: "Frozen solid!", flinch: "It flinched!" };
export const TICK_TEXT = { brn: "Hurt by its burn!", psn: "Hurt by poison!" };
export const DRAIN_TEXT = { drain: "Its energy was drained!" };
export const NOTE_TEXT = { skip: SKIP_TEXT, effect: STATUS_TEXT, tick: TICK_TEXT, drain: DRAIN_TEXT };
// The games' status colours (paralysis yellow, burn red, poison purple, ice blue); a stat's fall grey-blue.
export const STATUS_COLOR = { par: "#f8d030", brn: "#f08030", psn: "#c060c0", frz: "#98d8d8", flinch: "#ffffff", atk: "#a0b8f0", def: "#a0b8f0", spa: "#a0b8f0", spd: "#a0b8f0", spe: "#a0b8f0", drain: "#78c850" };

// `A`, `B`: { key (fighter key), alpha?, shadow?, size?, nature?, effort? (effortOf), moves? (chosen) }; `boost(move)`: the
// weather's (main.js boosted). Round by round, the faster first (Speed: its nature and effort, halved
// paralysed); each round each moves once. Returns { turns, winner: "a"|"b", hp: { a, b } }, a turn
// being { by, move, dmg, hp (its target's after), effect?, drain? { hp: its own after } } when it
// moves, { by, skip } when it can't (paralysis, freezing, flinching), with { tick: { kind, dmg, hp } }
// when its burn or poison hurts it after. Each picks its move as the round starts; Ice Shard
// (PRIORITY) goes first whatever the Speed.
export function sparTurns(A, B, rnd = Math.random, boost = (m) => m) {
  const side = { a: A, b: B }, hp = { a: 1, b: 1 };
  const st = { a: { stage: {} }, b: { stage: {} } }; // status, stat stages (multipliers)
  const turns = [];
  const speed = (k) => speedOf(side[k].key, side[k]) * (st[k].status === "par" ? 0.5 : 1) * (st[k].stage.spe ?? 1);
  const other = (k) => (k === "a" ? "b" : "a");
  const over = () => hp.a <= 0 || hp.b <= 0;
  for (let round = 0; round < SPAR_TURNS && !over(); round++) {
    // Each picks its move, then the one with the quicker move (Ice Shard) or the faster goes first.
    const moves = { a: boost(pickMove(A.key, B.key, rnd, { targetSize: B.size, moves: A.moves })), b: boost(pickMove(B.key, A.key, rnd, { targetSize: A.size, moves: B.moves })) };
    const pa = PRIORITY[moves.a.name] ?? 0, pb = PRIORITY[moves.b.name] ?? 0, sa = speed("a"), sb = speed("b");
    const first = pa !== pb ? (pa > pb ? "a" : "b") : sa > sb ? "a" : sb > sa ? "b" : rnd() < 0.5 ? "a" : "b";
    let flinched = false;
    for (const by of [first, other(first)]) {
      if (over()) break;
      const to = other(by), me = st[by];
      if (by !== first && flinched) { turns.push({ by, skip: "flinch" }); continue; }
      if (me.status === "frz") { if (rnd() < 0.2) me.status = null; else { turns.push({ by, skip: "frz" }); continue; } }
      if (me.status === "par" && rnd() < 0.25) { turns.push({ by, skip: "par" }); continue; }
      const att = side[by], def = side[to];
      // Hex: twice as strong on one with a status.
      const move = moves[by].name === "Hex" && st[to].status ? { ...moves[by], power: moves[by].power * 2 } : moves[by];
      const d = damage(att.key, def.key, rnd, { mul: move.mul, type: move.type, alphaAttacker: !!att.alpha, alphaTarget: !!def.alpha, shadowAttacker: !!att.shadow, shadowTarget: !!def.shadow,
        ...moveHow(move), ctx: { na: att.nature, nb: def.nature, ea: att.effort, eb: def.effort } });
      // Stat stages: its attacking stat's, the other's defending stat's; a burn halves its physical moves.
      const stage = (move.physical ? me.stage.atk ?? 1 : me.stage.spa ?? 1) / (move.physical ? st[to].stage.def ?? 1 : st[to].stage.spd ?? 1);
      const dmg = move.miss ? 0 : d.dmg * SPAR_HIT * stage * (me.status === "brn" && move.physical ? 0.5 : 1);
      const dealt = Math.min(hp[to], dmg);
      hp[to] = Math.max(0, hp[to] - dmg);
      const turn = { by, move: { ...move, eff: d.eff }, dmg, hp: hp[to] };
      // Giga Drain, Drain Punch, Draining Kiss: it heals by part of what it took.
      if (DRAIN[move.name] && dealt > 0 && hp[by] < 1) { hp[by] = Math.min(1, hp[by] + dealt * DRAIN[move.name]); turn.drain = { hp: hp[by] }; }
      // Its side effect (not on one already down, nor a status on one that has one).
      const [what, chance] = SIDE_EFFECTS[move.name] ?? [];
      if (!move.miss && hp[to] > 0 && d.eff > 0 && what && rnd() < chance) {
        if (what === "flinch") { if (by === first) { flinched = true; } }
        else if (["par", "brn", "psn", "frz"].includes(what)) { if (!st[to].status) { st[to].status = what; turn.effect = what; } }
        else { st[to].stage[what] = (st[to].stage[what] ?? 1) * (2 / 3); turn.effect = what; }
      }
      // Its own burn or poison, after it moves.
      if ((me.status === "brn" || me.status === "psn") && hp[by] > 0 && hp[to] > 0) {
        const t = me.status === "brn" ? 1 / 16 : 1 / 8;
        hp[by] = Math.max(0, hp[by] - t);
        turn.tick = { kind: me.status, dmg: t, hp: hp[by] };
      }
      turns.push(turn);
    }
  }
  const first = speedOf(A.key, A) >= speedOf(B.key, B) ? "a" : "b";
  const winner = hp.a === hp.b ? first : hp.a > hp.b ? "a" : "b";
  return { turns, winner, hp };
}

// The record between two (picks' slots), kept as { "<slot>|<slot>": [wins of the first, of the
// second] } (sorted slots), MAX_RECORDS at most: the pair's, from `slot`'s side: [won, lost].
export const MAX_RECORDS = 300;
const pairKey = (x, y) => (x < y ? `${x}|${y}` : `${y}|${x}`);
export function recordOf(records, slot, other) {
  const r = records?.[pairKey(slot, other)];
  if (!Array.isArray(r)) return [0, 0];
  return slot < other ? [r[0] ?? 0, r[1] ?? 0] : [r[1] ?? 0, r[0] ?? 0];
}
export function withResult(records, winner, loser) {
  const key = pairKey(winner, loser);
  const r = Array.isArray(records?.[key]) ? [...records[key]] : [0, 0];
  r[winner < loser ? 0 : 1] = (r[winner < loser ? 0 : 1] ?? 0) + 1;
  const out = { ...(records ?? {}) };
  delete out[key];
  out[key] = r; // the latest last
  const keys = Object.keys(out);
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_RECORDS))) delete out[k];
  return out;
}

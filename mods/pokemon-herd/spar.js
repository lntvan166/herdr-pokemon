// Sparring, as a real (friendly) battle. Pure.
// Two of yours take turns with their moves (moves.js pickMove: their four, STAB, now and then a
// signature move; misses; crits), the damage as the games reckon it (trainer.js damage, without
// the strip's DAMAGE_SCALE: a knockout in one blow can happen, as in the games). Each starts at
// full health, the faster moving first; the first down loses, or after SPAR_TURNS each, the one with more left wins.
// Nobody is hurt for real.
import { EXTRA_SIDE } from "./more-moves.js";
import { damage, moveHow, DAMAGE_SCALE, speedOf, typesOf as typesOfKey } from "./trainer.js";
import { pickMove, PRIORITY, DRAIN, missOf, powerOf, movesetOf } from "./moves.js";
import { newSide, meet, speedMul, immuneTo, onHit, afterHit, endTurn, sturdyHolds, stageWords } from "./abilities.js";

export const SPAR_TURNS = 3; // rounds, each one move apiece, at most
export const SPAR_HIT = 1 / DAMAGE_SCALE; // the games' own numbers

// Each move's side effect, as in the games: [what, chance]. par: paralysed (a turn lost 1 in 4, its
// Speed halved); brn: burned (1/16 of its health a turn, its physical moves halved); psn: poisoned
// (1/8 a turn); frz: frozen (no move till it thaws, 1 in 5 a turn); flinch: it loses its move this
// round (only if hit first); atk/def/spa/spd: that stat of the other falls a stage (×⅔).
// (The games' other moves' from PokeAPI too, more-moves.js EXTRA_SIDE; these first.)
export const SIDE_EFFECTS = {
  ...EXTRA_SIDE,
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
  // Pokémon's own moves (moves.js EXCLUSIVE).
  "Sacred Fire": ["brn", 0.5], "Blue Flare": ["brn", 0.2], "Steam Eruption": ["brn", 0.3], "Pyro Ball": ["brn", 0.1],
  "Bolt Strike": ["par", 0.2], "Volt Tackle": ["par", 0.1], "Seed Flare": ["spd", 0.4],
};
export const STATUS_TEXT = { par: "It's paralyzed!", brn: "It's burned!", psn: "It's poisoned!", frz: "It's frozen solid!", atk: "Its Attack fell!", def: "Its Defense fell!", spa: "Its Sp. Atk fell!", spd: "Its Sp. Def fell!", spe: "Its Speed fell!" };
export const SKIP_TEXT = { par: "Fully paralyzed!", frz: "Frozen solid!", flinch: "It flinched!" };
export const TICK_TEXT = { brn: "Hurt by its burn!", psn: "Hurt by poison!" };
export const DRAIN_TEXT = { drain: "Its energy was drained!" };
// Its own stages a move changed (turn.self "def:-1,spd:-1"): "Self: Def↓ SpD↓".
const SELF_TEXT = new Proxy({}, { get: (_, k) => `Self: ${stageWords(String(k).split(",").map((x) => { const [s, n] = x.split(":"); return [s, Number(n)]; }))}` });
export const NOTE_TEXT = { skip: SKIP_TEXT, effect: STATUS_TEXT, tick: TICK_TEXT, drain: DRAIN_TEXT, self: SELF_TEXT };
// The games' status colours (paralysis yellow, burn red, poison purple, ice blue); a stat's fall grey-blue.
export const STATUS_COLOR = { par: "#f8d030", brn: "#f08030", psn: "#c060c0", frz: "#98d8d8", flinch: "#ffffff", atk: "#a0b8f0", def: "#a0b8f0", spa: "#a0b8f0", spd: "#a0b8f0", spe: "#a0b8f0", drain: "#78c850" };

// `A`, `B`: { key (fighter key), alpha?, shadow?, size?, nature?, effort? (effortOf), moves? (chosen), ab? (its ability,
// abilities.js: working as in a battle with a wild one) }; `boost(move)`: the
// weather's (main.js boosted). Round by round, the faster first (Speed: its nature and effort, halved
// paralysed); each round each moves once. Returns { turns, winner: "a"|"b", hp: { a, b } }, a turn
// being { by, move, dmg, hp (its target's after), effect?, drain? { hp: its own after } } when it
// moves, { by, skip } when it can't (paralysis, freezing, flinching), with { tick: { kind, dmg, hp } }
// when its burn or poison hurts it after. Each picks its move as the round starts; Ice Shard
// (PRIORITY) goes first whatever the Speed. Their abilities: `entry` { a, b } (ids) shown as they
// meet (Intimidate…); a turn's `abil` (ids) the ones that touched its hit, each once a spar.
export function sparTurns(A, B, rnd = Math.random, boost = (m) => m, weather = null) {
  const side = { a: A, b: B }, hp = { a: 1, b: 1 };
  const st = { a: { stage: {} }, b: { stage: {} } }; // status, stat stages (multipliers)
  const turns = [];
  // Their abilities: each one's side (stages of its own, as abilities.js keeps them).
  const ab = { a: newSide(A.ab), b: newSide(B.ab) };
  const met = meet(ab.a, ab.b);
  // Said once a spar for each side (keys tagged "a:", "b:": both with Intimidate, the second
  // was never said); the ids handed back untagged.
  const tag = (side, ks) => ks.map((k) => `${side}:${k}`);
  const shown = new Set([...tag("a", met.a), ...tag("b", met.b)]);
  const once = (keys) => [...new Set(keys)].filter((k) => k && !shown.has(k) && shown.add(k)).map((k) => k.slice(2));
  const speed = (k) => speedOf(side[k].key, side[k]) * (st[k].status === "par" ? 0.5 : 1) * (st[k].stage.spe ?? 1) * speedMul(ab[k], weather);
  const other = (k) => (k === "a" ? "b" : "a");
  const over = () => hp.a <= 0 || hp.b <= 0;
  for (let round = 0; round < SPAR_TURNS && !over(); round++) {
    // Each picks its move, then the one with the quicker move (Ice Shard) or the faster goes first.
    // (One its target's ability makes nothing of, Levitate…, picked again: twice at most.)
    // (As the games' trainers: a move that knocks the other out now; a quick one first when slower.)
    const by = (to) => (to === "a" ? "b" : "a");
    const dmgOf = (X, Y) => (m) => damage(X.key, Y.key, () => 0.5, { mul: typesOfKey(X.key).includes(m.type) ? 1.5 : 1, type: m.type, ...moveHow({ ...m, power: powerOf(m.name) }), ctx: { na: X.nature, nb: Y.nature, ea: X.effort, eb: Y.effort } }).dmg * SPAR_HIT;
    const how = (X, Y, to) => ({ targetSize: Y.size, moves: X.moves, weather, ai: true, dmgOf: dmgOf(X, Y), targetHp: hp[to], slower: speed(to) > speed(by(to)),
      threatened: movesetOf(Y.key, Y.moves).some((m) => dmgOf(Y, X)(m) >= hp[by(to)]) });
    const pick = (X, Y, to) => { let m = boost(pickMove(X.key, Y.key, rnd, how(X, Y, to))); for (let n = 0; n < 2 && immuneTo(ab[to], m); n++) m = boost(pickMove(X.key, Y.key, rnd, how(X, Y, to))); return m; };
    const moves = { a: pick(A, B, "b"), b: pick(B, A, "a") };
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
      const move0 = moves[by].name === "Hex" && st[to].status ? { ...moves[by], power: moves[by].power * 2 } : moves[by];
      // Their abilities on this hit (abilities.js onHit): its type, a miss or not, ×, or nothing.
      ab[by].hp = hp[by]; ab[to].hp = hp[to];
      const r = onHit(ab[by], ab[to], move0, { weather, missRate: move0.missRate ?? missOf(move0.name) }, rnd);
      const move = { ...move0, type: r.type, miss: r.miss, crit: r.crit };
      const d = damage(att.key, def.key, rnd, { mul: r.mul, type: move.type, alphaAttacker: !!att.alpha, alphaTarget: !!def.alpha, shadowAttacker: !!att.shadow, shadowTarget: !!def.shadow,
        ...moveHow(move), ctx: { na: att.nature, nb: def.nature, ea: att.effort, eb: def.effort } });
      // Stat stages: its attacking stat's, the other's defending stat's; a burn halves its physical moves.
      const stage = (move.physical ? me.stage.atk ?? 1 : me.stage.spa ?? 1) / (move.physical ? st[to].stage.def ?? 1 : st[to].stage.spd ?? 1);
      const dmg = move.miss ? 0 : d.dmg * SPAR_HIT * stage * (me.status === "brn" && move.physical ? 0.5 : 1);
      const dealt = Math.min(hp[to], dmg);
      const before = hp[to];
      hp[to] = Math.max(0, hp[to] - dmg);
      const said = [...tag(by, r.said.att), ...tag(to, r.said.def)];
      if (hp[to] <= 0 && sturdyHolds(ab[to], before)) { hp[to] = 0.01; said.push(`${to}:sturdy`); } // Sturdy: it hangs on
      if (r.heal) hp[to] = Math.min(1, hp[to] + r.heal); // Water Absorb…: a quarter back
      const after = afterHit(ab[by], ab[to], move, { ...r, fainted: hp[to] <= 0 }, r.type);
      said.push(...tag(by, after.att), ...tag(to, after.def));
      const turn = { by, move: { ...move, eff: d.eff }, dmg, hp: hp[to] };
      if (after.stages?.att.length) turn.self = after.stages.att.map(([s, n]) => `${s}:${n}`).join(","); // (Close Combat: its own Def, SpD down)
      const named = once(said);
      if (named.length) turn.abil = named;
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
    // The round over: Speed Boost (said with the round's last turn).
    const boosted = once([...tag("a", endTurn(ab.a)), ...tag("b", endTurn(ab.b))]);
    const last = turns.at(-1);
    if (boosted.length && last) last.abil = [...(last.abil ?? []), ...boosted];
  }
  const first = speedOf(A.key, A) >= speedOf(B.key, B) ? "a" : "b";
  const winner = hp.a === hp.b ? first : hp.a > hp.b ? "a" : "b";
  return { turns, winner, hp, entry: { a: met.a, b: met.b } };
}

// The record between two, today's only: { day, pairs: { "<who>|<who>": [wins of the first, of the
// second] } } (sorted), MAX_RECORDS pairs at most. `who`: one Pokémon on one pane (whoOf: an
// agent that changes its Pokémon starts a new record, its old one's isn't carried over). From
// `who`'s side: [won, lost]; another day's (or the old shape's) counts as none.
export const MAX_RECORDS = 300;
export const whoOf = (pane, pick) => `${pane}#${pick?.dex ?? 0}${pick?.form ? `-${pick.form}` : ""}`;
const pairKey = (x, y) => (x < y ? `${x}|${y}` : `${y}|${x}`);
const todays = (records, day) => (records?.day === day && records.pairs && typeof records.pairs === "object" ? records.pairs : {});
export function recordOf(records, who, other, day) {
  const r = todays(records, day)[pairKey(who, other)];
  if (!Array.isArray(r)) return [0, 0];
  return who < other ? [r[0] ?? 0, r[1] ?? 0] : [r[1] ?? 0, r[0] ?? 0];
}
export function withResult(records, winner, loser, day) {
  const key = pairKey(winner, loser);
  const pairs = todays(records, day);
  const r = Array.isArray(pairs[key]) ? [...pairs[key]] : [0, 0];
  r[winner < loser ? 0 : 1] = (r[winner < loser ? 0 : 1] ?? 0) + 1;
  const out = { ...pairs };
  delete out[key];
  out[key] = r; // the latest last
  const keys = Object.keys(out);
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_RECORDS))) delete out[k];
  return { day, pairs: out };
}

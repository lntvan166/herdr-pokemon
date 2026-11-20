import test from "node:test";
import assert from "node:assert/strict";
import { sparTurns, SPAR_TURNS, recordOf, withResult, whoOf, MAX_RECORDS, SIDE_EFFECTS, NOTE_TEXT } from "../mods/pokemon-herd/spar.js";
import { duel } from "../mods/pokemon-herd/react.js";
import { loadPicks } from "../mods/pokemon-herd/picks.js";

test("a spar: turns of named moves till one is down (or 3 each), the winner the one with more left", () => {
  for (let i = 0; i < 200; i++) {
    const r = sparTurns({ key: 6 }, { key: 25 });
    assert.ok(r.turns.length >= 1 && r.turns.length <= SPAR_TURNS * 2);
    for (let k = 0; k + 1 < r.turns.length; k += 2) assert.notEqual(r.turns[k].by, r.turns[k + 1].by); // each moves once a round
    assert.ok(r.turns.every((t) => t.skip || (t.move.name && t.hp >= 0 && t.hp <= 1)));
    const l = r.winner === "a" ? "b" : "a";
    assert.ok(r.hp[r.winner] >= r.hp[l]);
  }
  let zard = 0;
  for (let i = 0; i < 300; i++) if (sparTurns({ key: 6 }, { key: 10 }).winner === "a") zard++; // Charizard vs Caterpie
  assert.ok(zard > 250, String(zard));
});

test("duel: each turn its move flies and the other flinches with the health it's left; then 🎉 and 💫", () => {
  const S = { has: new Set(["Attack", "SpAttack", "Hurt", "Dance"]), msOf: () => 600, icon: "⭐" };
  const a = { x: 100 }, b = { x: 200 };
  const fight = sparTurns({ key: 6 }, { key: 25 }, () => 0.3);
  const end = duel(a, b, S, S, 0, fight);
  const shots = a.react.shots.length + b.react.shots.length;
  assert.equal(shots, fight.turns.filter((t) => !t.skip).length);
  const blows = [...a.react.seq, ...b.react.seq].filter((s) => s.blow);
  assert.equal(blows.length, fight.turns.filter((t) => !t.skip).length);
  assert.ok(blows.every((s) => s.move && Number.isFinite(s.hp)));
  const win = (fight.winner === "a" ? a : b).react.seq.at(-1);
  assert.deepEqual([win.result, win.icon], ["win", "🎉"]);
  assert.ok(end > win.at);
});

test("records: today's only, each pair of Pokémon's, from either side; the oldest forgotten past MAX_RECORDS", () => {
  const D = 100;
  let r = withResult(undefined, "p1#6", "p2#9", D);
  r = withResult(r, "p1#6", "p2#9", D);
  r = withResult(r, "p2#9", "p1#6", D);
  assert.deepEqual(recordOf(r, "p1#6", "p2#9", D), [2, 1]);
  assert.deepEqual(recordOf(r, "p2#9", "p1#6", D), [1, 2]);
  assert.deepEqual(recordOf(r, "p1#6", "p9#1", D), [0, 0]);
  // Its agent changed its Pokémon: a new record, the old one's not carried over.
  assert.equal(whoOf("p1", { dex: 6 }), "p1#6");
  assert.equal(whoOf("p1", { dex: 37, form: "alola" }), "p1#37-alola");
  assert.deepEqual(recordOf(r, whoOf("p1", { dex: 7 }), "p2#9", D), [0, 0]);
  // Tomorrow: a fresh start.
  assert.deepEqual(recordOf(r, "p1#6", "p2#9", D + 1), [0, 0]);
  assert.deepEqual(recordOf(withResult(r, "p1#6", "p2#9", D + 1), "p1#6", "p2#9", D + 1), [1, 0]);
  // The old shape (all days, by pane) counts as none.
  assert.deepEqual(recordOf({ "p1|p2": [5, 5] }, "p1#6", "p2#9", D), [0, 0]);
  for (let i = 0; i < MAX_RECORDS + 5; i++) r = withResult(r, `x${i}`, "y", D);
  assert.equal(Object.keys(r.pairs).length, MAX_RECORDS);
  assert.equal(loadPicks({ panes: { p: { dex: 25, sparW: 3, sparL: 1 } } }).panes.p.sparW, 3);
});

test("the faster moves first, as in the games", () => {
  for (let i = 0; i < 20; i++) {
    assert.equal(sparTurns({ key: 25 }, { key: 143 }).turns[0].by, "a"); // Pikachu (90) before Snorlax (30)
    assert.equal(sparTurns({ key: 143 }, { key: 65 }).turns[0].by, "b"); // Alakazam (120) first
  }
});

test("effort and natures: a raised one a little stronger, a Jolly one sooner", () => {
  let low = 0, high = 0;
  for (let i = 0; i < 2000; i++) {
    if (sparTurns({ key: 6 }, { key: 6 }).winner === "a") low++; // Charizard vs Charizard (even: Blastoise beat it every time, picking as trainers do)
    if (sparTurns({ key: 6, effort: 1.05 }, { key: 6 }).winner === "a") high++;
  }
  assert.ok(high > low, `${low} ${high}`);
  // Speed with natures: a Jolly Charmeleon (110) outruns a Brave Charizard (108); Raticate (117) a Brave Charizard too.
  assert.equal(sparTurns({ key: 5, nature: "jolly" }, { key: 6, nature: "brave" }).turns[0].by, "a");
  assert.equal(sparTurns({ key: 6, nature: "brave" }, { key: 20 }).turns[0].by, "b");
});

test("side effects as in the games: a status, a stat falling, a flinch; the turns they cost", () => {
  const seen = new Set(), skips = new Set(), ticks = new Set();
  for (let i = 0; i < 3000; i++) {
    const k = [25, 6, 131, 89, 248, 143][i % 6];
    const r = sparTurns({ key: k, ...(k === 6 ? { moves: ["Flamethrower"] } : k === 25 ? { moves: ["Headbutt"] } : {}) }, { key: [149, 130, 3, 143, 25, 94][i % 6] }); // (Charizard with Flamethrower, Pikachu with Headbutt, first: a burn and a flinch to see)
    for (const t of r.turns) {
      if (t.effect) { seen.add(t.effect); assert.ok(SIDE_EFFECTS[t.move.name]?.[0] === t.effect); assert.ok(NOTE_TEXT.effect[t.effect]); }
      if (t.skip) { skips.add(t.skip); assert.ok(NOTE_TEXT.skip[t.skip]); }
      if (t.tick) { ticks.add(t.tick.kind); assert.ok(t.tick.hp >= 0 && t.tick.hp < 1); }
    }
    // A flinch only on the one moving second in its round.
    for (let k = 0; k < r.turns.length; k++) if (r.turns[k].skip === "flinch") assert.ok(k % 2 === 1);
  }
  for (const e of ["par", "brn", "psn", "frz"]) assert.ok(seen.has(e), e);
  for (const s of ["par", "flinch"]) assert.ok(skips.has(s), s);
  assert.ok(ticks.has("brn") && ticks.has("psn"));
});

test("Ice Shard goes first whatever the Speed; a draining move heals the one using it", async () => {
  const { PRIORITY, DRAIN } = await import("../mods/pokemon-herd/moves.js");
  assert.equal(PRIORITY["Ice Shard"], 1);
  let early = 0, drained = 0;
  for (let i = 0; i < 3000; i++) {
    const r = sparTurns({ key: 712, moves: ["Ice Shard"] }, { key: 65 }); // Bergmite (28) taught only Ice Shard vs Alakazam (120)
    const t = r.turns.find((x) => x.move?.name === "Ice Shard");
    if (t && r.turns.indexOf(t) % 2 === 0) early++;
    for (const x of r.turns) if (x.drain) { drained++; assert.ok(DRAIN[x.move.name] && x.drain.hp <= 1); }
  }
  assert.ok(early > 0);
  for (let i = 0; i < 500; i++) for (const x of sparTurns({ key: 286, moves: ["Drain Punch"] }, { key: 9 }).turns) if (x.drain) drained++; // Breloom taught Drain Punch
  assert.ok(drained > 0);
});

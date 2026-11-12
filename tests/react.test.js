import { test } from "node:test";
import assert from "node:assert/strict";
import { reactionAnim, REACTIONS } from "../mods/pokemon-herd/react.js";

test("reactionAnim fallbacks", () => {
  assert.equal(reactionAnim("wake", new Set(["Wake", "Hop"])), "Wake");
  assert.equal(reactionAnim("wake", new Set(["Hop"])), "Hop");
  assert.equal(reactionAnim("wake", new Set()), null);
  assert.equal(reactionAnim("startle", new Set(["Shake"])), "Shake");
  assert.equal(reactionAnim("celebrate", new Set(["Hop", "Dance"])), "Dance");
  assert.equal(reactionAnim("nope", new Set(["Hop"])), null);
});

test("REACTIONS lists every animation sprites must cut", () => {
  assert.deepEqual([...new Set(Object.values(REACTIONS).flat())].sort(),
    ["Attack", "Charge", "Cringe", "Dance", "DeepBreath", "Double", "Eat", "Head", "Hop", "Hurt", "Laying", "LookUp", "Nod", "Pull", "Rotate", "Shake", "Shoot", "Sit", "Strike", "Swing", "Wake"]);
});

import { focusEdge, onFocus, onStatus, effectiveMood, pose, LOOK_MS, AWAKE_MS } from "../mods/pokemon-herd/react.js";

const ms = () => 800;
const mon = (extra = {}) => ({ x: 100, dir: "r", moving: false, react: null, awakeUntil: 0, ...extra });

test("constants", () => {
  assert.equal(LOOK_MS, 1500);
  assert.equal(AWAKE_MS, 15000);
});

test("focusEdge", () => {
  const f = (addr) => [{ address: "t1", focused: addr === "t1" }, { address: "t2", focused: addr === "t2" }];
  assert.deepEqual(focusEdge(undefined, f("t1")), { addr: "t1", react: null }); // startup: nobody reacts
  assert.deepEqual(focusEdge("t1", f("t1")), { addr: "t1", react: null });
  assert.deepEqual(focusEdge("t1", f("t2")), { addr: "t2", react: "t2" });
  assert.deepEqual(focusEdge("t1", f(null)), { addr: null, react: null });
  assert.deepEqual(focusEdge(null, f("t1")), { addr: "t1", react: "t1" }); // coming back reacts again
});

test("onFocus asleep with Wake", () => {
  const m = mon();
  onFocus(m, "sleep", 0, new Set(["Wake"]), ms);
  assert.equal(m.react.anim, "Wake");
  assert.equal(m.react.until, 2300);
  assert.equal(m.awakeUntil, 15000);
});

test("onFocus asleep without anims", () => {
  const m = mon();
  onFocus(m, "sleep", 0, new Set(), ms);
  assert.equal(m.react.anim, null);
  assert.equal(m.react.until, 2100);
});

test("onFocus awake", () => {
  const m = mon();
  onFocus(m, "working", 0, new Set(["Wake", "Hop"]), ms);
  assert.equal(m.react.anim, null);
  assert.equal(m.react.until, 1500);
});

test("effectiveMood", () => {
  const m = mon();
  onFocus(m, "sleep", 0, new Set(), ms);
  assert.equal(effectiveMood("sleep", m, 14999), "idle");
  assert.equal(effectiveMood("sleep", m, 15000), "sleep");
  assert.equal(effectiveMood("blocked", m, 10), "blocked");
});

test("onStatus", () => {
  let m = mon();
  onStatus(m, "working", "idle", 0, new Set(["Hop"]), ms);
  assert.equal(m.react.anim, "Hop");
  assert.equal(m.react.until, 800 + 1500); // celebrate, then look at you
  m = mon();
  onStatus(m, "idle", "blocked", 0, new Set(["Hurt"]), ms);
  assert.equal(m.react.anim, "Hurt");
  m = mon();
  onStatus(m, "idle", "working", 0, new Set(), ms);
  assert.equal(m.react.anim, null);
  assert.equal(m.react.until, 600);
  m = mon();
  onStatus(m, "idle", "idle", 0, new Set(["Hop"]), ms);
  assert.equal(m.react, null);
  m = mon();
  onStatus(m, "blocked", "blocked", 0, new Set(["Hurt"]), ms);
  assert.equal(m.react, null);
});

test("pose", () => {
  const playing = mon({ react: { anim: "Hop", animUntil: 400, until: 1900 } });
  assert.deepEqual(pose(playing, "idle", 100, false, "r"), { sprite: "react", anim: "Hop" });
  assert.deepEqual(pose(playing, "idle", 500, false, "r"), { sprite: "idleD" });
  assert.deepEqual(pose(playing, "idle", 1900, false, "r"), { sprite: "idleR" }); // over
  assert.deepEqual(pose(mon(), "done", 0, false, "r"), { sprite: "idleD" });
  assert.deepEqual(pose(mon({ moving: true, dir: "l" }), "working", 0, true, "r"), { sprite: "walkL" });
  assert.deepEqual(pose(mon({ dir: "r" }), "sleep", 0, true, "l"), { sprite: "idleL" });
  assert.deepEqual(pose(mon(), "sleep", 0, false, "l"), { sprite: "sleep" });
  assert.deepEqual(pose(mon({ dir: "l" }), "idle", 0, false, "r"), { sprite: "idleL" });
});

test("a done Pokémon shuffling aside walks, it doesn't glide facing you", () => {
  assert.deepEqual(pose(mon({ moving: true, dir: "r" }), "done", 0, false, "r"), { sprite: "walkR" });
});

import { megaShown } from "../mods/pokemon-herd/react.js";
test("megaShown: On always, Auto while working, Off never; only for species with a Mega", () => {
  assert.equal(megaShown({ dex: 6, mega: "on" }, "idle"), true);
  assert.equal(megaShown({ dex: 6, mega: "auto" }, "working"), true);
  assert.equal(megaShown({ dex: 6, mega: "auto" }, "done"), false);
  assert.equal(megaShown({ dex: 6, mega: "off" }, "working"), false);
  assert.equal(megaShown({ dex: 25, mega: "on" }, "working"), false);
});

test("a regional form never Mega Evolves", () => {
  assert.equal(megaShown({ dex: 80, form: "0001", mega: "on" }, "working"), false); // Galarian Slowbro
  assert.equal(megaShown({ dex: 80, mega: "on" }, "working"), true);
});

import { onSeason, SEASON_KINDS, sleepAfter, SEASON_MS } from "../mods/pokemon-herd/react.js";

test("each season has its reaction, falling back to animations every Pokémon has", () => {
  assert.deepEqual(SEASON_KINDS.map((k) => k.kind), ["sniff", "bask", "lookUp", "shiver"]);
  const common = new Set(["Hop", "Hurt", "Charge", "Rotate"]); // what nearly every sprite has
  for (const { kind } of SEASON_KINDS) assert.ok(reactionAnim(kind, common), kind);
  assert.equal(reactionAnim("sniff", new Set(["Eat", "Hop"])), "Eat");
  assert.equal(reactionAnim("lookUp", new Set(["LookUp", "Rotate"])), "LookUp");
  assert.equal(reactionAnim("shiver", new Set(["Shake", "Hurt"])), "Shake");
});

test("onSeason: plays the season's animation for about 2 s with its icon, not looking at you", () => {
  const m = mon();
  assert.equal(onSeason(m, 3, 1000, new Set(["Hurt"]), () => 600), true);
  assert.equal(m.react.anim, "Hurt");
  assert.equal(m.react.icon, "❄️");
  assert.equal(m.react.animUntil, 1000 + 2400); // 600 ms, played 4 times: at least SEASON_MS
  assert.equal(m.react.until, m.react.animUntil);
  assert.ok(SEASON_MS <= 2400);
});

test("onSeason: nothing fitting, nothing played", () => {
  const m = mon();
  assert.equal(onSeason(m, 0, 0, new Set(), ms), false);
  assert.equal(m.react, null);
});

test("sleepAfter: idle 3 minutes to fall asleep by day, 1 by night", () => {
  assert.equal(sleepAfter(0), 180000);
  assert.equal(sleepAfter(1), 60000);
  assert.equal(sleepAfter(0.4), 180000);
  assert.equal(sleepAfter(0.6), 60000);
});

import { sparPair, onSpar, SPAR_GAP } from "../mods/pokemon-herd/react.js";
test("sparPair: close, same row, rested", () => {
  const now = 1e9;
  assert.equal(sparPair([{ addr: "a", x: 100, row: 0 }, { addr: "b", x: 400, row: 0 }], now), null); // too far
  assert.equal(sparPair([{ addr: "a", x: 100, row: 0 }, { addr: "b", x: 110, row: 0 }], now), null); // on top
  assert.equal(sparPair([{ addr: "a", x: 100, row: 0 }, { addr: "b", x: 180, row: 1 }], now), null); // rows apart
  assert.deepEqual(sparPair([{ addr: "a", x: 100, row: 0 }, { addr: "b", x: 180, row: 0 }], now).map((c) => c.addr), ["a", "b"]);
  assert.equal(sparPair([{ addr: "a", x: 100, row: 0, lastSpar: now - 1000 }, { addr: "b", x: 180, row: 0 }], now), null);
  assert.ok(sparPair([{ addr: "a", x: 100, row: 0, lastSpar: now - SPAR_GAP }, { addr: "b", x: 180, row: 0 }], now));
});

test("onSpar faces the partner and attacks", () => {
  const m = { x: 100, dir: "l" };
  onSpar(m, 180, 0, new Set(["Attack"]), () => 500, "💥");
  assert.equal(m.dir, "r");
  assert.equal(m.react.anim, "Attack");
  assert.equal(m.react.until, 2000);
  assert.equal(m.react.icon, "💥");
  assert.equal(m.lastSpar, 0);
});

import { onCombo, COMBO_GAP } from "../mods/pokemon-herd/react.js";
test("onCombo: both face one way and attack", () => {
  const a = { x: 100, dir: "l" }, b = { x: 140, dir: "r" };
  onCombo(a, "r", 0, new Set(["Strike"]), () => 400, "⚡");
  onCombo(b, "r", 0, new Set([]), () => 400, null);
  assert.equal(a.dir, "r");
  assert.equal(b.dir, "r");
  assert.equal(a.react.anim, "Strike");
  assert.equal(a.react.icon, "⚡");
  assert.equal(b.react.anim, null); // no attack drawn: it stands facing you a moment
  assert.equal(a.lastCombo, 0);
  assert.ok(COMBO_GAP >= 60000);
});

import { onStir, stirGap, stirFor } from "../mods/pokemon-herd/react.js";
test("onStir: a sleeper wakes now and then, for a while, on its own clock", () => {
  const m = { x: 100, dir: "r" };
  const has = new Set(["Wake"]);
  const half = () => 0.5;
  assert.equal(onStir(m, "sleep", 0, false, has, () => 600, half), false); // first: just scheduled
  assert.equal(m.stirAt, stirGap(false, half));
  assert.equal(onStir(m, "sleep", m.stirAt - 1, false, has, () => 600, half), false);
  const t = m.stirAt;
  assert.equal(onStir(m, "sleep", t, false, has, () => 600, half), true);
  assert.equal(m.react.anim, "Wake");
  assert.equal(m.awakeUntil, t + stirFor(half));
  assert.ok(m.stirAt > t); // the next one
  // Not asleep: nothing scheduled.
  assert.equal(onStir(m, "idle", t + 1, false, has, () => 600, half), false);
  assert.equal(m.stirAt, undefined);
  // Night: further apart.
  assert.ok(stirGap(true, half) > stirGap(false, half));
  assert.ok(stirGap(false, () => 0) >= 90000 && stirGap(true, () => 1) <= 600000);
});

import { fidgetAnim, onFidget, FIDGETS, teasePair, teaseSpot, onPoke, TEASE_GAP } from "../mods/pokemon-herd/react.js";
test("fidgetAnim: a random one it has; Hop/Rotate only when it has none", () => {
  const has = new Set(["Nod", "Sit", "Hop", "Rotate"]);
  assert.equal(fidgetAnim(has, () => 0), "Nod");
  assert.equal(fidgetAnim(has, () => 0.99), "Sit");
  assert.equal(fidgetAnim(new Set(["Hop", "Rotate"]), () => 0.99), "Rotate");
  assert.equal(fidgetAnim(new Set(["Walk"])), null);
  assert.ok(!FIDGETS.includes("Hurt") && !FIDGETS.includes("Attack"));
});
test("onFidget plays about 1.5s, or does nothing without an animation", () => {
  const m = {};
  assert.equal(onFidget(m, 1000, new Set(["Twirl"]), () => 400, () => 0), true);
  assert.deepEqual(m.react, { anim: "Twirl", animUntil: 2600, until: 2600 });
  assert.equal(onFidget({}, 0, new Set(), () => 400), false);
});
test("teasePair: the nearest sleeper on the idle one's row, both rested", () => {
  const now = 10 * SPAR_GAP;
  const c = [
    { addr: "i", x: 100, row: 0, mood: "idle" },
    { addr: "far", x: 600, row: 0, mood: "sleep" },
    { addr: "near", x: 300, row: 0, mood: "sleep" },
    { addr: "other", x: 110, row: 1, mood: "sleep" },
  ];
  assert.deepEqual(teasePair(c, now).map((x) => x.addr), ["i", "near"]);
  assert.equal(teasePair(c.filter((x) => x.mood === "sleep"), now), null); // nobody awake
  assert.equal(teasePair([{ ...c[0], lastSpar: now - 1000 }, c[2]], now), null); // just sparred
  assert.equal(teasePair([c[0], { ...c[2], row: 1 }], now), null); // another row
});
test("teaseSpot: beside the sleeper on its own side, the other side at the edge", () => {
  assert.equal(teaseSpot(100, 300, 28, 800), 300 - TEASE_GAP);
  assert.equal(teaseSpot(500, 300, 28, 800), 300 + TEASE_GAP);
  assert.equal(teaseSpot(10, 40, 28, 800), 40 + TEASE_GAP); // no room on the left
});
test("onPoke: it pokes, the sleeper wakes with a start and stays up", () => {
  const m = { x: 100 };
  const s = { x: 140 };
  const end = onPoke(m, s, 1000, new Set(["Head"]), new Set(["Wake"]), () => 300, () => 900);
  assert.equal(m.dir, "r");
  assert.equal(s.dir, "l");
  assert.equal(m.react.anim, "Head");
  assert.equal(m.react.icon, "😜");
  assert.equal(s.react.anim, "Wake");
  assert.equal(s.react.icon, "💢");
  assert.equal(end, 1900);
  assert.ok(s.awakeUntil >= 21000);
});

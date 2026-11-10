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
  assert.deepEqual([...new Set(Object.values(REACTIONS).flat())].sort(), ["Charge", "Dance", "Hop", "Hurt", "Shake", "Wake"]);
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

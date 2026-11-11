import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSettings, withSetting, DEFAULTS } from "../mods/pokemon-herd/settings.js";

test("loadSettings: defaults, junk ignored, booleans kept", () => {
  assert.deepEqual(loadSettings(null), DEFAULTS);
  assert.deepEqual(loadSettings({ v: 2, evolve: false }), DEFAULTS);
  const s = loadSettings({ v: 1, evolve: false, cryDone: true, spar: "no", junk: 1 });
  assert.equal(s.evolve, false);
  assert.equal(s.cryDone, true);
  assert.equal(s.spar, true);
  assert.equal(s.junk, undefined);
  assert.equal(DEFAULTS.cryBlocked, false); // sounds are opt-in
});

test("withSetting", () => {
  const s = withSetting(loadSettings(null), "weather", false);
  assert.equal(loadSettings(s).weather, false);
});

test("the sidebar cards are off by default (opt-in), and can be turned on", () => {
  assert.equal(loadSettings(null).sidebar, false);
  assert.equal(loadSettings({ v: 1, sidebar: true }).sidebar, true);
});

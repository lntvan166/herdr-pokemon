import { test } from "node:test";
import assert from "node:assert/strict";
import { versionIn, isNewer } from "../mods/pokemon-herd/update.js";
import { VERSION } from "../mods/pokemon-herd/id.js";

test("versionIn: the VERSION in a copy of id.js, or null", () => {
  assert.equal(versionIn('export const VERSION = "2026.11.12";\n'), "2026.11.12");
  assert.equal(versionIn("404: Not Found"), null);
  assert.equal(versionIn(null), null);
});

test("isNewer: by each dotted number", () => {
  assert.equal(isNewer("2026.11.12", "2026.11.10"), true);
  assert.equal(isNewer("2026.12.1", "2026.11.30"), true);
  assert.equal(isNewer("2026.11.10", "2026.11.10"), false);
  assert.equal(isNewer("2026.11.9", "2026.11.10"), false);
  assert.equal(isNewer(null, "2026.11.10"), false);
});

test("this build has a version", () => {
  assert.match(VERSION, /^\d{4}\.\d{1,2}\.\d{1,2}(\.\d+)?$/); // a second release that day: .1, .2…
  assert.equal(isNewer("2026.11.10.1", "2026.11.10"), true);
});

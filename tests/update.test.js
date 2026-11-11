import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { versionIn, isNewer } from "../mods/pokemon-herd/update.js";
import { VERSION } from "../mods/pokemon-herd/id.js";

const ID_JS = readFileSync(new URL("../mods/pokemon-herd/id.js", import.meta.url), "utf8");

test("versionIn: the semver VERSION exported by a copy of id.js, or null", () => {
  assert.equal(versionIn('// VERSION = "2026.11.12"\nexport const VERSION = "1.0.0";\n'), "1.0.0");
  assert.equal(versionIn('export const VERSION = "2026.11.12";\n'), null); // a date: from before 1.0.0
  assert.equal(versionIn("404: Not Found"), null);
  assert.equal(versionIn(null), null);
});

test("isNewer: major, minor, patch; never a date-style version", () => {
  assert.equal(isNewer("1.0.1", "1.0.0"), true);
  assert.equal(isNewer("1.1.0", "1.0.9"), true);
  assert.equal(isNewer("2.0.0", "1.12.3"), true);
  assert.equal(isNewer("1.0.0", "1.0.0"), false);
  assert.equal(isNewer("1.0.0", "1.0.1"), false);
  assert.equal(isNewer("2026.11.11.4", "1.0.0"), false); // a cached check from before 1.0.0
  assert.equal(isNewer(null, "1.0.0"), false);
});

test("this build is semver, and copies from before 1.0.0 still see it as newer", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
  assert.equal(versionIn(ID_JS), VERSION);
  // What an old copy (date versions) reads: the first VERSION = "…" in the file, a date newer than any of theirs.
  const old = /VERSION\s*=\s*"(\d+(?:\.\d+)*)"/.exec(ID_JS)[1];
  assert.match(old, /^\d{4}\.\d{1,2}\.\d{1,2}(\.\d+)?$/);
  const oldIsNewer = (remote, local) => { const [a, b] = [remote, local].map((v) => v.split(".").map(Number)); for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] ?? 0) - (b[i] ?? 0); if (d) return d > 0; } return false; };
  assert.equal(oldIsNewer(old, "2026.11.11.4"), true);
});

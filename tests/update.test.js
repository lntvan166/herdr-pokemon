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

import { updateScript } from "../mods/pokemon-herd/update.js";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync as read } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

// A fake Herdr folder: the release (1.9.0) unpacked, and installed copies.
function fake() {
  const root = mkdtempSync(join(tmpdir(), "herd-update-"));
  const src = join(root, "release", "mods", "pokemon-herd");
  mkdirSync(src, { recursive: true });
  writeFileSync(join(src, "main.js"), "// new\n");
  writeFileSync(join(src, "id.js"), '// id\n// x\nexport const MOD = "pokemon-herd";\nexport const VERSION = "1.9.0";\nexport const REPO = "lntvan166/herdr-pokemon";\n');
  const copy = (name, mod, version, repo = "lntvan166/herdr-pokemon") => {
    const dir = join(root, "app", "mods", name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "main.js"), "// old\n");
    writeFileSync(join(dir, "id.js"), `// id\n// x\nexport const MOD = "${mod}";\nexport const VERSION = "${version}";\nexport const REPO = "${repo}";\n`);
    return dir;
  };
  return { root, src, app: join(root, "app"), copy };
}
const run = (script) => execFileSync("sh", ["-c", script], { encoding: "utf8" });

test("updateScript: updates the running copy wherever it is installed, keeping its MOD name", () => {
  const f = fake();
  const renamed = f.copy("pokemon-herd-2", "pokemon-herd-2", "1.6.1"); // the running one, renamed by an agent
  const other = f.copy("pokemon-herd", "pokemon-herd", "1.5.0"); // an older copy, not running
  const stranger = f.copy("weather", "weather", "1.6.1", "someone/weather"); // another mod
  const out = run(updateScript({ app: f.app, repo: "lntvan166/herdr-pokemon", running: "1.6.1", source: f.src }));
  assert.equal(out.trim(), `${renamed} 1.9.0`);
  assert.equal(read(join(renamed, "main.js"), "utf8"), "// new\n");
  const id = read(join(renamed, "id.js"), "utf8");
  assert.match(id, /export const VERSION = "1\.9\.0"/);
  assert.match(id, /export const MOD = "pokemon-herd-2";/); // its own name kept
  assert.equal(read(join(other, "main.js"), "utf8"), "// old\n"); // not the running one: left alone
  assert.equal(read(join(stranger, "main.js"), "utf8"), "// old\n");
});

test("updateScript: no copy runs this version: every copy of this repo is updated; none at all: an error", () => {
  const f = fake();
  const a = f.copy("pokemon-herd", "pokemon-herd", "1.5.0");
  const out = run(updateScript({ app: f.app, repo: "lntvan166/herdr-pokemon", running: "9.9.9", source: f.src }));
  assert.equal(out.trim(), `${a} 1.9.0`);
  const empty = fake();
  assert.throws(() => execFileSync("sh", ["-c", updateScript({ app: empty.app, repo: "lntvan166/herdr-pokemon", running: "1.0.0", source: empty.src })], { stdio: "pipe" }));
});

test("updateScript: Pokémon Sidebar beside it is installed, then updated keeping its settings", () => {
  const f = fake();
  const mine = f.copy("pokemon-herd", "pokemon-herd", "1.6.1");
  const side = join(f.root, "release", "mods", "pokemon-sidebar");
  mkdirSync(join(side, "views"), { recursive: true });
  writeFileSync(join(side, "main.js"), "// sidebar\n");
  writeFileSync(join(side, "views", "agents.js"), "// cards\n");
  writeFileSync(join(side, "mod.json"), '{\n  "version": "1.1.0",\n  "title": "Pokémon Sidebar"\n}\n');
  const to = join(f.app, "mods", "pokemon-sidebar");
  let out = run(updateScript({ app: f.app, repo: "lntvan166/herdr-pokemon", running: "1.6.1", source: f.src }));
  assert.equal(out.trim(), `${mine} 1.9.0\n${to} 1.1.0`);
  assert.equal(read(join(to, "views", "agents.js"), "utf8"), "// cards\n");
  // The person's settings stay; the version moves on.
  writeFileSync(join(to, "mod.json"), '{\n  "version": "1.0.0",\n  "settings": { "combined": false }\n}\n');
  run(updateScript({ app: f.app, repo: "lntvan166/herdr-pokemon", running: "1.9.0", source: f.src }));
  const json = JSON.parse(read(join(to, "mod.json"), "utf8"));
  assert.equal(json.version, "1.1.0");
  assert.deepEqual(json.settings, { combined: false });
});

import { shouldAutoUpdate } from "../mods/pokemon-herd/update.js";
test("update by itself: when on, newer, and not tried already", () => {
  assert.equal(shouldAutoUpdate(true, "2.5.6", "2.5.5", undefined), true);
  assert.equal(shouldAutoUpdate(false, "2.5.6", "2.5.5", undefined), false);
  assert.equal(shouldAutoUpdate(true, "2.5.5", "2.5.5", undefined), false);
  assert.equal(shouldAutoUpdate(true, "2.5.4", "2.5.5", undefined), false); // a local build ahead of GitHub
  assert.equal(shouldAutoUpdate(true, "2.5.6", "2.5.5", "2.5.6"), false); // tried: the pill, by hand
  assert.equal(shouldAutoUpdate(true, null, "2.5.5", undefined), false);
});

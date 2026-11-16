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

import { installUpdate } from "../mods/pokemon-herd/update.js";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync as read } from "node:fs";
import * as fsp from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Herdr's fs/promises, as Node's (plus `exists`, which Node lacks).
const io = { ...fsp, exists: (p) => fsp.access(p).then(() => true, () => false) };
// A fake Herdr folder: the release (1.9.0) unpacked, and installed copies.
function fake() {
  const root = mkdtempSync(join(tmpdir(), "herd-update-"));
  const src = join(root, "release", "mods", "pokemon-herd");
  mkdirSync(join(src, "sfx"), { recursive: true });
  writeFileSync(join(src, "main.js"), "// new\n");
  writeFileSync(join(src, "sfx", "hit.mp3"), Buffer.from([1, 2, 3, 255]));
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
const update = (f, running) => installUpdate(io, { app: f.app, repo: "lntvan166/herdr-pokemon", running, src: f.src });

test("installUpdate: updates the running copy wherever it is installed, keeping its MOD name; no shell", async () => {
  const f = fake();
  const renamed = f.copy("pokemon-herd-2", "pokemon-herd-2", "1.6.1"); // the running one, renamed by an agent
  const other = f.copy("pokemon-herd", "pokemon-herd", "1.5.0"); // an older copy, not running
  const stranger = f.copy("weather", "weather", "1.6.1", "someone/weather"); // another mod
  assert.deepEqual(await update(f, "1.6.1"), [{ dir: `${f.app}/mods/pokemon-herd-2`, version: "1.9.0" }]);
  assert.equal(read(join(renamed, "main.js"), "utf8"), "// new\n");
  assert.deepEqual([...read(join(renamed, "sfx", "hit.mp3"))], [1, 2, 3, 255]); // binary files, folders
  const id = read(join(renamed, "id.js"), "utf8");
  assert.match(id, /export const VERSION = "1\.9\.0"/);
  assert.match(id, /export const MOD = "pokemon-herd-2";/); // its own name kept
  assert.equal(read(join(other, "main.js"), "utf8"), "// old\n"); // not the running one: left alone
  assert.equal(read(join(stranger, "main.js"), "utf8"), "// old\n");
});

test("installUpdate: no copy runs this version: every copy of this repo is updated; none at all: an error", async () => {
  const f = fake();
  const a = f.copy("pokemon-herd", "pokemon-herd", "1.5.0");
  assert.deepEqual(await update(f, "1.4.0"), [{ dir: `${f.app}/mods/pokemon-herd`, version: "1.9.0" }]);
  assert.equal(read(join(a, "main.js"), "utf8"), "// new\n");
  await assert.rejects(update(fake(), "1.0.0"), /wasn't found/);
});

test("installUpdate: Pokémon Sidebar beside it is installed, then updated keeping its settings", async () => {
  const f = fake();
  f.copy("pokemon-herd", "pokemon-herd", "1.6.1");
  const side = join(f.root, "release", "mods", "pokemon-sidebar");
  mkdirSync(join(side, "views"), { recursive: true });
  writeFileSync(join(side, "main.js"), "// sidebar\n");
  writeFileSync(join(side, "views", "agents.js"), "// cards\n");
  writeFileSync(join(side, "mod.json"), '{\n  "version": "1.1.0",\n  "title": "Pokémon Sidebar"\n}\n');
  const to = `${f.app}/mods/pokemon-sidebar`;
  const out = await update(f, "1.6.1");
  assert.deepEqual(out.at(-1), { dir: to, version: "1.1.0" });
  assert.equal(read(join(to, "views", "agents.js"), "utf8"), "// cards\n");
  // The person's settings stay; the version moves on.
  writeFileSync(join(to, "mod.json"), '{\n  "version": "1.0.0",\n  "settings": { "combined": false }\n}\n');
  await installUpdate(io, { app: f.app, repo: "lntvan166/herdr-pokemon", running: "1.9.0", src: f.src, force: true }); // again, by hand
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

test("installUpdate: never one that isn't newer; a broken download touches nothing; main.js written last", async () => {
  const f = fake();
  const a = f.copy("pokemon-herd", "pokemon-herd", "1.9.0");
  await assert.rejects(update(f, "1.9.0"), /not newer/); // a reinstall
  await assert.rejects(update(f, "2.0.0"), /not newer/); // a downgrade
  assert.equal(read(join(a, "main.js"), "utf8"), "// old\n");
  // The order files go in: main.js after every module it imports.
  const order = [];
  const spy = { ...io, writeFile: (p, d) => { order.push(p.split("/").pop()); return io.writeFile(p, d); } };
  const g = fake();
  g.copy("pokemon-herd", "pokemon-herd", "1.6.1");
  await installUpdate(spy, { app: g.app, repo: "lntvan166/herdr-pokemon", running: "1.6.1", src: g.src });
  assert.equal(order.at(-1), "main.js");
});

test("update by itself: a failed try is tried again hours later, not never", () => {
  assert.equal(shouldAutoUpdate(true, "2.5.6", "2.5.5", { tried: "2.5.6", at: 0, failed: true }, 1000), false);
  assert.equal(shouldAutoUpdate(true, "2.5.6", "2.5.5", { tried: "2.5.6", at: 0, failed: true }, 7 * 3600000), true);
  assert.equal(shouldAutoUpdate(true, "2.5.6", "2.5.5", { tried: "2.5.6", at: 0 }, 7 * 3600000), false); // tried, not failed
});

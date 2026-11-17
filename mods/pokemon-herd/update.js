// Is there a newer release on GitHub? An installed copy never updates by itself, so once a day the
// strip reads id.js from the repo and compares its VERSION with this one's. Pure.

// Versions are semver ("1.2.3"). Before 1.0.0 they were dates ("2026.11.11.4"); id.js keeps one
// such date in a comment ahead of the real one, which copies from then read first and find newer.

// The semver VERSION an id.js exports, or null (a date-style one counts as none).
export const versionIn = (text) => /export const VERSION\s*=\s*"(\d{1,3}\.\d+\.\d+)"/.exec(String(text ?? ""))?.[1] ?? null;

const SEMVER = /^\d{1,3}\.\d+\.\d+$/; // a date ("2026.11.12") has a four-digit first part

// remote is newer than local: major, then minor, then patch. Anything not semver (a date cached
// from before 1.0.0) is never newer.
export function isNewer(remote, local) {
  if (!SEMVER.test(remote ?? "") || !SEMVER.test(local ?? "")) return false;
  const [a, b] = [remote, local].map((v) => v.split(".").map(Number));
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d) return d > 0;
  }
  return false;
}

// Update by itself (Settings → Updates): whether to install `latest` now. Not when it's off, not
// newer, or tried already (`tried`: the version last tried, so a failed one isn't tried again and
// again: the Update pill stays for a hand).
// `tried` may be the record { tried, at, failed }: a try that failed (a write refused halfway) is
// tried again RETRY_MS later, not never (it could have left the mod half updated).
export const RETRY_MS = 6 * 3600000;
export function shouldAutoUpdate(on, latest, running, tried, now = Date.now()) {
  if (!on || !isNewer(latest, running)) return false;
  const rec = tried && typeof tried === "object" ? tried : { tried };
  return rec.tried !== latest || (!!rec.failed && now - (rec.at ?? 0) >= RETRY_MS);
}

// Installs an unpacked release (`src`: its mods/pokemon-herd) over this mod, wherever it is
// installed under `app`/mods and whatever it is called: the copies of this repo running
// `running` (else every copy of this repo), each keeping its own MOD name; and Pokémon Sidebar
// beside it in the release, installed or updated (its mod.json keeps the person's settings: only
// its version moves on). No shell: `io` reads and writes files (Herdr's fs/promises, or Node's
// in the tests), so it works on Windows too. Returns [{ dir, version }]; throws when no copy is
// found.
//
// Herdr's fs has no rename, so the folder can't be swapped in one step. Instead: never one that
// isn't newer than `running` (no downgrade, no reinstall; `force` for a hand-run reinstall), every
// file read into memory first (a broken download fails before anything is touched), then written
// with main.js last (Herdr reloads the mod as its files change: till main.js lands, the old one runs).
// An update's progress, 0..1, for a bar (Settings, the strip's pill): the steps weighed by how
// long they take. The download's size isn't told (GitHub sends it in chunks), so it moves by
// time against the last download's (`expect` ms), never past 95% of its share; the rest by the
// files written so far. `p`: { phase: "download" | "unpack" | "read" | "write" | "done", at (the
// phase's start), expect?, n?, total? }.
export const PHASES = { download: [0, 0.6], unpack: [0.6, 0.7], read: [0.7, 0.75], write: [0.75, 1], done: [1, 1] };
export const PHASE_TEXT = { download: "Downloading", unpack: "Unpacking", read: "Reading the files", write: "Writing the files", done: "Done" };
export function progressAt(p, now = Date.now()) {
  const [a, b] = PHASES[p?.phase] ?? [0, 0];
  if (p?.phase === "download") return a + (b - a) * Math.min(0.95, Math.max(0, now - (p.at ?? now)) / Math.max(1000, p.expect ?? 8000));
  if (p?.phase === "write" && p.total > 0) return a + (b - a) * Math.min(1, (p.n ?? 0) / p.total);
  return a;
}

export async function installUpdate(io, { app, repo, running, src, force = false, onStep = () => {} }) {
  const read = (p) => io.readFile(p, "utf8");
  const has = (p) => io.exists(p);
  // A folder's files, read: [[relative path, contents]], main.js last.
  const load = async (from, rel = "") => {
    const out = [];
    for (const e of await io.readdir(from, { withFileTypes: true })) {
      const p = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) out.push(...(await load(`${from}/${e.name}`, p)));
      else out.push([p, await io.readFile(`${from}/${e.name}`)]);
    }
    return out.sort(([a], [b]) => (a === "main.js") - (b === "main.js"));
  };
  let written = 0, toWrite = 0;
  const writeAll = async (files, to) => {
    for (const [p, data] of files) {
      onStep({ phase: "write", n: written++, total: toWrite });
      const dir = p.includes("/") ? `${to}/${p.slice(0, p.lastIndexOf("/"))}` : to;
      await io.mkdir(dir, { recursive: true });
      await io.writeFile(`${to}/${p}`, data);
    }
  };
  const copyTree = async (from, to) => writeAll(await load(from), to);
  const version = versionIn(await read(`${src}/id.js`));
  if (!force && !isNewer(version, running)) throw new Error(`the download is ${version ?? "no version"}, not newer than ${running}`);
  onStep({ phase: "read" });
  const files = await load(src); // all of it, before a single file is written
  const mods = `${app}/mods`;
  const mine = [], all = [];
  for (const e of await io.readdir(mods, { withFileTypes: true }).catch(() => [])) {
    if (!e.isDirectory() || !(await has(`${mods}/${e.name}/id.js`))) continue;
    const id = await read(`${mods}/${e.name}/id.js`);
    if (!id.includes(`REPO = "${repo}"`)) continue;
    all.push(`${mods}/${e.name}`);
    if (new RegExp(`^export const VERSION = "${running.replace(/\./g, "\\.")}"`, "m").test(id)) mine.push(`${mods}/${e.name}`);
  }
  const targets = mine.length ? mine : all;
  if (!targets.length) throw new Error("this mod's folder wasn't found under mods/");
  toWrite = files.length * targets.length;
  const out = [];
  // The new id.js as text, read as such (no TextDecoder: Herdr's runtime on macOS has none, and
  // every update there failed on it).
  const newId = await read(`${src}/id.js`);
  for (const dir of targets) {
    const name = /^export const MOD = "(.*)";/m.exec(await read(`${dir}/id.js`))?.[1];
    // Its own MOD name kept in id.js as it's written (not after: no moment with another name).
    const mineFiles = files.map(([p, data]) => (p === "id.js" && name
      ? [p, newId.replace(/^export const MOD = .*$/m, `export const MOD = "${name}";`)] : [p, data]));
    await writeAll(mineFiles, dir);
    out.push({ dir, version });
  }
  // Pokémon Sidebar, beside it in the release.
  const side = src.replace(/[\\/]pokemon-herd$/, "/pokemon-sidebar");
  if (await has(`${side}/main.js`)) {
    const to = `${mods}/pokemon-sidebar`;
    await io.mkdir(to, { recursive: true });
    const sv = /"version":\s*"([0-9.]*)"/.exec(await read(`${side}/mod.json`).catch(() => ""))?.[1] ?? "";
    for (const e of await io.readdir(side, { withFileTypes: true })) {
      if (e.isDirectory()) await copyTree(`${side}/${e.name}`, `${to}/${e.name}`);
      else if (e.name === "mod.json" && (await has(`${to}/mod.json`))) {
        const json = await read(`${to}/mod.json`);
        await io.writeFile(`${to}/mod.json`, json.replace(/"version":\s*"[0-9.]*"/, `"version": "${sv}"`));
      } else await io.writeFile(`${to}/${e.name}`, await io.readFile(`${side}/${e.name}`));
    }
    out.push({ dir: to, version: sv });
  }
  return out;
}

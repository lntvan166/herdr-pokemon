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
export const shouldAutoUpdate = (on, latest, running, tried) => !!on && isNewer(latest, running) && tried !== latest;

// Installs an unpacked release (`src`: its mods/pokemon-herd) over this mod, wherever it is
// installed under `app`/mods and whatever it is called: the copies of this repo running
// `running` (else every copy of this repo), each keeping its own MOD name; and Pokémon Sidebar
// beside it in the release, installed or updated (its mod.json keeps the person's settings: only
// its version moves on). No shell: `io` reads and writes files (Herdr's fs/promises, or Node's
// in the tests), so it works on Windows too. Returns [{ dir, version }]; throws when no copy is
// found.
export async function installUpdate(io, { app, repo, running, src }) {
  const read = (p) => io.readFile(p, "utf8");
  const has = (p) => io.exists(p);
  const copyTree = async (from, to) => {
    await io.mkdir(to, { recursive: true });
    for (const e of await io.readdir(from, { withFileTypes: true })) {
      if (e.isDirectory()) await copyTree(`${from}/${e.name}`, `${to}/${e.name}`);
      else await io.writeFile(`${to}/${e.name}`, await io.readFile(`${from}/${e.name}`));
    }
  };
  const version = versionIn(await read(`${src}/id.js`));
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
  const out = [];
  for (const dir of targets) {
    const name = /^export const MOD = "(.*)";/m.exec(await read(`${dir}/id.js`))?.[1];
    await copyTree(src, dir);
    if (name) {
      const id = await read(`${dir}/id.js`);
      await io.writeFile(`${dir}/id.js`, id.replace(/^export const MOD = .*$/m, `export const MOD = "${name}";`));
    }
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

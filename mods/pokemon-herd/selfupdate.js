// Updating this mod in place (curl and tar, then files copied with fs: no shell, so it works on
// Windows too), and patching Better Sidebar to draw the agent cards (patch, through a shell).
// Each throws a short message.
import { exec, appHome } from "herdr";
import * as fs from "fs/promises";
import { MOD, REPO, VERSION } from "./id.js";
import { installUpdate, progressAt } from "./update.js";

const MOD_DIR = `${appHome()}/mods/${MOD}`;
const SIDEBAR_DIR = `${appHome()}/mods/better-sidebar`;
const PATCH = `${MOD_DIR}/extras/better-sidebar-cards.patch`;
// For a Better Sidebar patched before the rail showed Pokémon: only what that patch lacks.
const RAIL_PATCH = `${MOD_DIR}/extras/better-sidebar-rail.patch`;
// The shell by its full path, and the usual folders on PATH: right after Herdr itself updates or
// restarts, a mod's PATH can come up empty for a moment ("cannot run sh: program not found").
const STD_PATH = `export PATH="\${PATH:+$PATH:}/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin"`;
const sh = (script, timeout = 120000) => {
  const run = (cmd) => exec(cmd, ["-c", `${STD_PATH}\n${script}`], { timeout });
  return run("/bin/sh").catch(() => run("sh"));
};
const lastLine = (r) => (r.stderr || r.stdout).trim().split("\n").pop() || `exit ${r.code}`;

// A program by its name, else where it usually is (PATH can come up empty for a moment).
async function run(names, args, timeout) {
  let last;
  for (const n of names) {
    try { return await exec(n, args, { timeout }); } catch (e) { last = e; }
  }
  throw last;
}
async function removeTree(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory()) await removeTree(`${dir}/${e.name}`);
    else await fs.unlink(`${dir}/${e.name}`);
  }
  await fs.rmdir(dir);
}

// Downloads the repo's main branch (curl), unpacks it (tar: both come with Windows 10 and later,
// macOS and Linux) and copies its mods/pokemon-herd over this mod's folder, wherever it is
// installed and whatever it is called (update.js installUpdate); Herdr reloads it by itself.
// Picks, stats and the Bag live in shared state, not there, so nothing is lost. Returns
// [{ dir, version }] of what was updated.
// (`app`: where Herdr's mods are: its home, or a folder to try it in.)
// The update running now, if any (module state: every view in this window reads it): its step,
// for progressAt. `lastDownload`: how long the last download took (ms), what the next one's bar
// is timed by.
export const updateStep = { phase: null, at: 0 };
let lastDownload = 8000;
const step = (s) => Object.assign(updateStep, { at: Date.now(), n: undefined, total: undefined, ...s });
export const updateProgress = (now = Date.now()) => (updateStep.phase ? { phase: updateStep.phase, f: progressAt({ ...updateStep, expect: lastDownload }, now) } : null);

export async function updateNow(app = appHome()) {
  const tmp = `${appHome()}/data/${MOD}/update-${Date.now()}`;
  await fs.mkdir(tmp, { recursive: true });
  try {
    const tgz = `${tmp}/main.tar.gz`;
    const url = `https://codeload.github.com/${REPO}/tar.gz/refs/heads/main`;
    step({ phase: "download" });
    const t0 = Date.now();
    const d = await run(["curl", "/usr/bin/curl"], ["-sfL", "--retry", "2", "--connect-timeout", "10", "-o", tgz, url], 120000);
    if (d.code !== 0) throw new Error(`download failed: ${lastLine(d)}`);
    lastDownload = Math.max(1000, Date.now() - t0);
    step({ phase: "unpack" });
    const x = await run(["tar", "/usr/bin/tar", "/bin/tar"], ["-xzf", tgz, "-C", tmp], 120000);
    if (x.code !== 0) throw new Error(`unpacking failed: ${lastLine(x)}`);
    const top = (await fs.readdir(tmp, { withFileTypes: true })).find((e) => e.isDirectory());
    const src = top && `${tmp}/${top.name}/mods/pokemon-herd`;
    if (!src || !(await fs.exists(`${src}/main.js`))) throw new Error("the download has no mods/pokemon-herd");
    const done = await installUpdate(fs, { app, repo: REPO, running: VERSION, src, onStep: (s) => { if (s.phase === "write") Object.assign(updateStep, s); else step(s); } });
    step({ phase: "done" });
    return done;
  } finally {
    await removeTree(tmp).catch(() => null);
    if (updateStep.phase !== "done") step({ phase: null }); // failed: no bar
  }
}

// Better Sidebar: "missing" (not installed), "patched" (draws the cards, and Pokémon on the
// collapsed rail), "outdated" (the cards only: an earlier patch) or "unpatched".
export async function sidebarState() {
  const f = `${SIDEBAR_DIR}/views/agents.js`;
  if (!(await fs.exists(f).catch(() => false))) return "missing";
  const text = await fs.readFile(f, "utf8").catch(() => "");
  return !text.includes("agent-cards") ? "unpatched" : text.includes("railIcon") ? "patched" : "outdated";
}

// Applies extras/better-sidebar-cards.patch (made for Better Sidebar 3.2.0), or, on one patched
// before (`outdated`), extras/better-sidebar-rail.patch. A dry run first: on another version
// that it doesn't fit, nothing changes and it says so.
export async function patchSidebar(outdated = false) {
  const file = outdated ? RAIL_PATCH : PATCH;
  const r = await sh(`set -e
cd "${SIDEBAR_DIR}"
patch -p1 --forward --dry-run -s < "${file}" >/dev/null || { echo "the patch doesn't fit this Better Sidebar version" >&2; exit 1; }
patch -p1 --forward -s < "${file}"`, 20000);
  if (r.code !== 0) throw new Error(lastLine(r));
}

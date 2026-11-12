// Updating this mod in place, and patching Better Sidebar to draw the agent cards. Both run
// shell tools (curl, tar, patch) with the user's environment; each throws a short message.
import { exec, appHome } from "herdr";
import { MOD, REPO, VERSION } from "./id.js";
import { updateScript } from "./update.js";

const MOD_DIR = `${appHome()}/mods/${MOD}`;
const SIDEBAR_DIR = `${appHome()}/mods/better-sidebar`;
const PATCH = `${MOD_DIR}/extras/better-sidebar-cards.patch`;
// For a Better Sidebar patched before the rail showed Pokémon: only what that patch lacks.
const RAIL_PATCH = `${MOD_DIR}/extras/better-sidebar-rail.patch`;
const sh = (script, timeout = 120000) => exec("sh", ["-c", script], { timeout });
const lastLine = (r) => (r.stderr || r.stdout).trim().split("\n").pop() || `exit ${r.code}`;

// Downloads the repo's main branch and copies its mods/pokemon-herd over this mod's folder,
// wherever it is installed and whatever it is called (update.js updateScript finds it by its
// repo and running version); Herdr reloads it by itself. Picks, stats and the Bag live in
// shared state, not there, so nothing is lost. Returns [{ dir, version }] of what was updated.
export async function updateNow() {
  const r = await sh(updateScript({ app: appHome(), repo: REPO, running: VERSION }));
  if (r.code !== 0) throw new Error(lastLine(r));
  return r.stdout.trim().split("\n").filter(Boolean).map((l) => {
    const at = l.lastIndexOf(" ");
    return { dir: l.slice(0, at), version: l.slice(at + 1) };
  });
}

// Better Sidebar: "missing" (not installed), "patched" (draws the cards, and Pokémon on the
// collapsed rail), "outdated" (the cards only: an earlier patch) or "unpatched".
export async function sidebarState() {
  const f = `${SIDEBAR_DIR}/views/agents.js`;
  const r = await sh(`test -f "${f}" || { echo missing; exit 0; }
grep -q 'agent-cards' "${f}" || { echo unpatched; exit 0; }
grep -q 'railIcon' "${f}" && echo patched || echo outdated`, 10000);
  const s = r.stdout.trim();
  return ["missing", "patched", "outdated"].includes(s) ? s : "unpatched";
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

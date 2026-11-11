// Updating this mod in place, and patching Better Sidebar to draw the agent cards. Both run
// shell tools (curl, tar, patch) with the user's environment; each throws a short message.
import { exec, appHome } from "herdr";
import { MOD, REPO } from "./id.js";

const MOD_DIR = `${appHome()}/mods/${MOD}`;
const SIDEBAR_DIR = `${appHome()}/mods/better-sidebar`;
const PATCH = `${MOD_DIR}/extras/better-sidebar-cards.patch`;
const sh = (script, timeout = 120000) => exec("sh", ["-c", script], { timeout });
const lastLine = (r) => (r.stderr || r.stdout).trim().split("\n").pop() || `exit ${r.code}`;

// Downloads the repo's main branch and copies its mods/<MOD> over this folder; Herdr reloads
// the mod by itself. Herdr's own jsconfig.json and *.d.ts in the folder are left alone, and
// files the release dropped stay (harmless). Picks, stats and the Bag live in shared state,
// not here, so nothing is lost.
export async function updateNow() {
  const r = await sh(`set -e
d=$(mktemp -d)
trap 'rm -rf "$d"' EXIT
curl -sfL --retry 2 --connect-timeout 10 "https://codeload.github.com/${REPO}/tar.gz/refs/heads/main" | tar -xz -C "$d"
src=$(echo "$d"/*/mods/${MOD})
test -f "$src/main.js" || { echo "the download has no mods/${MOD}" >&2; exit 1; }
cp -R "$src"/. "${MOD_DIR}"/`);
  if (r.code !== 0) throw new Error(lastLine(r));
}

// Better Sidebar: "missing" (not installed), "patched" (draws the cards) or "unpatched".
export async function sidebarState() {
  const r = await sh(`test -f "${SIDEBAR_DIR}/views/agents.js" || { echo missing; exit 0; }
grep -q 'agent-cards' "${SIDEBAR_DIR}/views/agents.js" && echo patched || echo unpatched`, 10000);
  const s = r.stdout.trim();
  return s === "missing" || s === "patched" ? s : "unpatched";
}

// Applies extras/better-sidebar-cards.patch (made for Better Sidebar 3.2.0). A dry run first:
// on another version that it doesn't fit, nothing changes and it says so.
export async function patchSidebar() {
  const r = await sh(`set -e
cd "${SIDEBAR_DIR}"
patch -p1 --forward --dry-run -s < "${PATCH}" >/dev/null || { echo "the patch doesn't fit this Better Sidebar version" >&2; exit 1; }
patch -p1 --forward -s < "${PATCH}"`, 20000);
  if (r.code !== 0) throw new Error(lastLine(r));
}

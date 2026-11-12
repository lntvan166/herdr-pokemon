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

// The shell script that updates this mod where it really is. `app`: Herdr's folder; `repo`:
// "owner/name"; `running`: this copy's VERSION. It takes the repo's mods/pokemon-herd (the folder
// is always named that on GitHub) and copies it over every installed folder whose id.js names
// this repo and runs `running`, or over every folder of this repo if none does (an agent may have
// installed it under another name, or more than once). Each folder keeps its own `MOD` line (a
// renamed copy keeps its name). It prints, per line, "<folder> <new version>". `source`: an
// already unpacked release (tests), instead of downloading main. Pokémon Sidebar
// (mods/pokemon-sidebar next to it) is installed or updated as well, its settings kept.
export function updateScript({ app, repo, running, source = null }) {
  const q = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;
  const fetch = source
    ? `src=${q(source)}`
    : `d=$(mktemp -d)
trap 'rm -rf "$d"' EXIT
curl -sfL --retry 2 --connect-timeout 10 "https://codeload.github.com/${repo}/tar.gz/refs/heads/main" | tar -xz -C "$d"
src=$(echo "$d"/*/mods/pokemon-herd)`;
  return `set -e
${fetch}
test -f "$src/main.js" || { echo "the download has no mods/pokemon-herd" >&2; exit 1; }
new=$(sed -n 's/^export const VERSION = "\\([0-9.]*\\)".*/\\1/p' "$src/id.js")
mine=""; all=""
for f in ${q(app)}/mods/*/id.js; do
  [ -f "$f" ] || continue
  grep -q 'REPO = "${repo}"' "$f" || continue
  all="$all $(dirname "$f")"
  grep -q '^export const VERSION = "${running}"' "$f" && mine="$mine $(dirname "$f")"
done
targets="\${mine:-$all}"
[ -n "$targets" ] || { echo "this mod's folder wasn't found under mods/" >&2; exit 1; }
for dir in $targets; do
  modline=$(grep '^export const MOD = ' "$dir/id.js" || true)
  cp -R "$src"/. "$dir"/
  if [ -n "$modline" ]; then
    name=$(echo "$modline" | sed 's/^export const MOD = "\\(.*\\)";.*/\\1/')
    sed "s|^export const MOD = .*|export const MOD = \\"$name\\";|" "$dir/id.js" > "$dir/id.js.new" && mv "$dir/id.js.new" "$dir/id.js"
  fi
  echo "$dir $new"
done
# Pokémon Sidebar, beside it in the repo: installed or updated too. Its mod.json keeps the
# person's settings: only its version changes.
side="$(dirname "$src")/pokemon-sidebar"
if [ -f "$side/main.js" ]; then
  to=${q(app)}/mods/pokemon-sidebar
  mkdir -p "$to"
  sv=$(sed -n 's/.*"version": *"\\([0-9.]*\\)".*/\\1/p' "$side/mod.json")
  for f in "$side"/* ; do
    b=$(basename "$f")
    if [ "$b" = mod.json ] && [ -f "$to/mod.json" ]; then
      sed 's/"version": *"[0-9.]*"/"version": "'"$sv"'"/' "$to/mod.json" > "$to/mod.json.new" && mv "$to/mod.json.new" "$to/mod.json"
    else
      cp -R "$f" "$to"/
    fi
  done
  echo "$to $sv"
fi`;
}

#!/usr/bin/env bash
# Copies this repo's mod into Herdr (hot-reloads in a running window) and checks it.
set -euo pipefail
src="$(cd "$(dirname "$0")/.." && pwd)/mods/pokemon-herd/"
dest="${HERDR_HOME:-$HOME/.config/herdr-app}/mods/pokemon-herd/"
mkdir -p "$dest"
# Herdr writes jsconfig.json and *.d.ts into each mod folder: leave those alone.
rsync -a --delete --exclude 'jsconfig.json' --exclude '*.d.ts' "$src" "$dest"
herdr-app check "$dest"

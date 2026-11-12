#!/usr/bin/env bash
# Copies this repo's mods (Pokémon herd and Pokémon Sidebar) into Herdr (hot-reloads in a
# running window) and checks them. Pokémon Sidebar keeps its installed mod.json (your settings).
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
home="${HERDR_HOME:-$HOME/.config/herdr-app}"
# Herdr writes jsconfig.json and *.d.ts into each mod folder: leave those alone.
rsync -a --delete --exclude 'jsconfig.json' --exclude '*.d.ts' "$root/mods/pokemon-herd/" "$home/mods/pokemon-herd/"
herdr-app check "$home/mods/pokemon-herd/"
keep=()
[ -f "$home/mods/pokemon-sidebar/mod.json" ] && keep=(--exclude 'mod.json')
rsync -a --delete --exclude 'jsconfig.json' --exclude '*.d.ts' "${keep[@]}" "$root/mods/pokemon-sidebar/" "$home/mods/pokemon-sidebar/"
herdr-app check "$home/mods/pokemon-sidebar/"

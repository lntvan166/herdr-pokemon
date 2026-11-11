// The mod's id. Everything that names this mod (folder, shared state, cache dir, block id)
// comes from here, so it can sit next to the upstream mod it started from.
export const MOD = "pokemon-herd";
export const DATA_REL = `data/${MOD}`;
// Each species' stats (stats.js), in shared state.
export const STATS_KEY = `${MOD}-stats`;
// The Bag and badge marks (items.js), in shared state.
export const BAG_KEY = `${MOD}-bag`;
// The Settings dialog's choices (settings.js), in shared state.
export const SETTINGS_KEY = `${MOD}-settings`;
// Which pane's Pokémon each folder last had (picks.js fromFolders), in shared state.
export const FOLDERS_KEY = `${MOD}-folders`;
// When each agent last changed status (the strip notes it; the Party list shows "3m"), in shared state.
export const SINCE_KEY = `${MOD}-since`;
// The upstream mod's shared-state key: read once to keep agents' Pokémon when switching over.
export const LEGACY_KEY = "pokemon-agents";
// This release (year.month.day, then .1, .2 for more releases that day). Bump it with every change worth updating for: copies that are
// installed compare it with the repo's once a day and offer the update.
export const VERSION = "2026.11.11.3";
export const REPO = "lntvan166/herdr-pokemon";

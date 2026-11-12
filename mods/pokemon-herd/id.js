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
// The favourite Pokémon (favorites.js), in shared state.
export const FAVORITES_KEY = `${MOD}-favorites`;
// The upstream mod's shared-state key: read once to keep agents' Pokémon when switching over.
export const LEGACY_KEY = "pokemon-agents";
// For copies from before 1.0.0, which read the first VERSION = "<date>" in this file and compare
// dates: this one is newer than any of theirs, so they offer the update. Leave it as it is.
// VERSION = "2026.11.12"
// This release, semver: patch for fixes, minor for new things, major for what changes how it's
// used. Bump it with every change worth updating for: installed copies compare it with the
// repo's once a day and offer the update.
export const VERSION = "1.16.0";
export const REPO = "lntvan166/herdr-pokemon";

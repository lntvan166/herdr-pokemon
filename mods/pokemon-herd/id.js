// The mod's id. Everything that names this mod (folder, shared state, cache dir, block id)
// comes from here, so it can sit next to the upstream mod it started from.
export const MOD = "pokemon-herd";
export const DATA_REL = `data/${MOD}`;
// The upstream mod's shared-state key: read once to keep agents' Pokémon when switching over.
export const LEGACY_KEY = "pokemon-agents";

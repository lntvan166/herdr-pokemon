// The mod's own settings (the Settings dialog), in shared state as { v: 1, ... }. Pure.
// Where the strip sits, its rows and background live in the layout instead (place.js).

export const DEFAULTS = {
  cryBlocked: false, // its Pokémon cries when an agent needs you
  cryDone: false, // and when one finishes
  evolve: true, // Pokémon evolve as their agents work
  pickup: true, // idle Pokémon find items
  weather: true, // rain while agents wait on you, a storm when they wait long
  spar: true, // two idle Pokémon now and then spar
  family: true, // a sub-agent is its agent's Pokémon, younger, and follows it
  sidebar: false, // publish shared "agent-icons" / "agent-cards" for Better Sidebar (opt-in: it needs a patch)
};

export function loadSettings(raw) {
  const out = { ...DEFAULTS };
  if (raw?.v === 1) for (const k of Object.keys(DEFAULTS)) if (typeof raw[k] === "boolean") out[k] = raw[k];
  return out;
}

export const withSetting = (s, key, value) => ({ v: 1, ...s, [key]: value });

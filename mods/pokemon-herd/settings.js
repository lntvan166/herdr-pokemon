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
  campfire: true, // at night with every agent resting, the herd sleeps round a fire
  tired: true, // near the 5-hour limit (Usage Limits) the herd sweats and walks slower
  visitors: "often", // how often a wild Pokémon walks across the strip: VISIT_EVERY
  sidebar: false, // publish shared "agent-icons" / "agent-cards" for Better Sidebar (opt-in: it needs a patch)
};

// Visitors: off, or every so many minutes, [from, to] (a random time in between).
export const VISIT_EVERY = { off: null, rare: [10, 25], often: [3, 8], lots: [1, 3] };

export function loadSettings(raw) {
  const out = { ...DEFAULTS };
  if (raw?.v !== 1) return out;
  for (const k of Object.keys(DEFAULTS)) if (typeof DEFAULTS[k] === "boolean" && typeof raw[k] === "boolean") out[k] = raw[k];
  // Visitors was a switch before it had a pace: on is the default pace, off stays off.
  if (raw.visitors === false) out.visitors = "off";
  else if (typeof raw.visitors === "string" && raw.visitors in VISIT_EVERY) out.visitors = raw.visitors;
  return out;
}

export const withSetting = (s, key, value) => ({ v: 1, ...s, [key]: value });

// Which animation sheets to download for a Pokémon: the ones it can't do without (walk, idle,
// sleep) together, and each reaction sheet on its own, so one missing optional sheet can't
// sink the whole Pokémon.
export function sheetPlan(core, reacts) {
  const coreNames = [...new Set(Object.values(core).map((a) => a.name))];
  const optional = [...new Set(Object.values(reacts).map((a) => a.name))].filter((n) => !coreNames.includes(n));
  return { core: coreNames, optional };
}

// How big a Pokémon is drawn: 2x (its sheet's pixels doubled), else 1.5x, else 1x, the biggest
// that keeps it under SHOWN_MAX px tall (the strip's row). By what's drawn, not its frame: big
// ones were all 1x by their big frames, so Lugia (42 px) and Wailord came out smaller than
// Pikachu (48 px), and Rotom Wash (29 px in a 48x80 frame) half its size.
export const SHOWN_MAX = 84;
export const spriteScale = (drawn) => [2, 1.5].find((k) => drawn * k <= SHOWN_MAX) ?? 1;

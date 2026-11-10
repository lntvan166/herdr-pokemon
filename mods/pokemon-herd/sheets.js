// Which animation sheets to download for a Pokémon: the ones it can't do without (walk, idle,
// sleep) together, and each reaction sheet on its own, so one missing optional sheet can't
// sink the whole Pokémon.
export function sheetPlan(core, reacts) {
  const coreNames = [...new Set(Object.values(core).map((a) => a.name))];
  const optional = [...new Set(Object.values(reacts).map((a) => a.name))].filter((n) => !coreNames.includes(n));
  return { core: coreNames, optional };
}

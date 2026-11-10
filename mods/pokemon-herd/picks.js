// Who is which Pokémon. Saved per pane in shared state as
// { v: 2, panes: { <pane>: { dex, shiny, mega, form?, megaKind? } } }.
import { WALKABLE, isWalkable, hasShiny, hasForm } from "./dex.js";

const SHINY_ODDS = 64;

export function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const isObj = (v) => !!v && typeof v === "object";

// Mega mode: "off", "on", or "auto" (Mega while its agent works). Anything else: "auto".
export const megaMode = (v) => (v === "off" || v === "on" || v === "auto" ? v : "auto");

// The saved picks, dropping anything malformed or no longer walkable. When this mod has none
// yet, the upstream mod's { panes: { <pane>: <dex> } } is taken over (migrated: true).
export function loadPicks(current, legacy) {
  const panes = {};
  if (isObj(current) && isObj(current.panes)) {
    for (const [pane, p] of Object.entries(current.panes)) {
      if (!isObj(p) || !isWalkable(p.dex)) continue;
      const form = hasForm(p.dex, p.form) ? p.form : undefined; // a regional form, if it still exists
      const megaKind = p.megaKind === "X" || p.megaKind === "Y" ? p.megaKind : undefined; // Mega X or Y
      panes[pane] = { dex: p.dex, shiny: p.shiny === true && hasShiny(p.dex, form), mega: megaMode(p.mega), ...(form ? { form } : {}), ...(megaKind ? { megaKind } : {}) };
    }
    if (Object.keys(panes).length) return { panes, migrated: false };
  }
  if (isObj(legacy) && isObj(legacy.panes)) {
    for (const [pane, dex] of Object.entries(legacy.panes)) if (isWalkable(dex)) panes[pane] = { dex, shiny: false, mega: "auto" };
    if (Object.keys(panes).length) return { panes, migrated: true };
  }
  return { panes, migrated: false };
}

const slotOf = (a) => a.pane || a.address;

// Saved picks first; a new agent gets a Pokémon nobody on screen has yet, and a 1 in 64 chance
// of a shiny. Deterministic per pane. Agents without a pane (sub-agents) aren't saved; `memo`
// (kept by the caller, in memory) holds theirs so they keep it even when a pane takes the same one.
export function assign(list, panes, memo = {}) {
  const ids = {};
  const fresh = {};
  const used = new Set();
  for (const a of list) {
    const p = panes[slotOf(a)] ?? (a.pane ? null : memo[a.address]);
    if (p) { ids[a.address] = p; used.add(p.dex); }
  }
  for (const a of list) {
    if (ids[a.address]) continue;
    const slot = slotOf(a);
    let k = hash(slot) % WALKABLE.length;
    for (let i = 0; i < WALKABLE.length && used.has(WALKABLE[k]); i++) k = (k + 1) % WALKABLE.length;
    const dex = WALKABLE[k];
    const pick = { dex, shiny: hash(`${slot}:shiny`) % SHINY_ODDS === 0 && hasShiny(dex), mega: "auto" };
    ids[a.address] = pick;
    if (a.pane) fresh[a.pane] = pick; // saved: agents with a pane
    else memo[a.address] = pick; // in memory: sub-agents
    used.add(dex);
  }
  return { ids, fresh };
}

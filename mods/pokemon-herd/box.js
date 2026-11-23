// The Box's helpers: sorting it, what may be released and what it pays, picking the duplicates to
// let go. Entries are { slot, pick, tag? } (`tag`: the agent it's with). Pure.
import { nameOf } from "./dex.js";
import { isLegendary } from "./trainer.js";
import { friendOf } from "./picks.js";

// Released, a Pokémon leaves a little behind, as transferring one does in GO: ₽10; a shiny or an
// Alpha ₽50; a legendary ₽100. Less than the balls it took to catch it, so it can't be farmed.
export const RELEASE_PAY = { base: 10, rare: 50, legend: 100 };
export function releasePay(pick) {
  if (isLegendary(pick.dex)) return RELEASE_PAY.legend;
  return pick.shiny || pick.alpha ? RELEASE_PAY.rare : RELEASE_PAY.base;
}

// One with an agent, or locked (🔒), is never released, alone or in a batch.
export const releasable = (x) => !x.tag && !x.pick.locked;

// When it came: caught, else its box slot's time ("box-<when>-<dex>"), else 0.
const whenOf = (x) => x.pick.caught ?? Number(/^box-(\d+)-/.exec(x.slot)?.[1] ?? 0);

// The Box's orders: [key, label]. "new": newest first; "dex": by number (forms after their
// species); "name": A to Z (its nickname if it has one); "hearts": most first. Ties: newest first.
export const SORTS = [["new", "Newest"], ["dex", "No."], ["name", "Name"], ["hearts", "Hearts"]];
export function sortBox(list, how = "new") {
  const by = {
    new: () => 0,
    dex: (a, b) => a.pick.dex - b.pick.dex || String(a.pick.form ?? "").localeCompare(String(b.pick.form ?? "")),
    name: (a, b) => (a.pick.nick ?? nameOf(a.pick.dex)).localeCompare(b.pick.nick ?? nameOf(b.pick.dex)),
    hearts: (a, b) => friendOf(b.pick) - friendOf(a.pick),
  }[how] ?? (() => 0);
  return [...list].sort((a, b) => by(a, b) || whenOf(b) - whenOf(a));
}

// How much one is worth keeping, among its species: one with an agent or locked first, then a
// shiny, an Alpha, more hearts, more jobs, the older one.
const worth = (x) => (x.tag || x.pick.locked ? 1e9 : 0) + (x.pick.shiny ? 1e7 : 0) + (x.pick.alpha ? 1e6 : 0)
  + friendOf(x.pick) * 1e4 + Math.min(9999, (x.pick.jobs ?? 0) + (x.pick.pastJobs ?? 0));

// The duplicates: of each species (and form), every one but the best; never a shiny, an Alpha
// or a legendary (those you pick by hand), nor one that can't be released. Slots.
export function duplicates(list) {
  const groups = new Map();
  for (const x of list) {
    const k = `${x.pick.dex}${x.pick.form ? `f${x.pick.form}` : ""}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(x);
  }
  const out = [];
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    const keep = [...g].sort((a, b) => worth(b) - worth(a) || whenOf(a) - whenOf(b))[0];
    for (const x of g) if (x !== keep && releasable(x) && !x.pick.shiny && !x.pick.alpha && !isLegendary(x.pick.dex)) out.push(x.slot);
  }
  return out;
}

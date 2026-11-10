// Which Megas have art. SpriteCollab draws new ones every few weeks, so the mod reads its
// tracker.json once a day instead of relying only on the list baked into species.js. Pure.

export const DAY_MS = 24 * 60 * 60 * 1000;

// dex -> [[form folder, has a shiny (1/0), "X" | "Y" | ""], ...]: per species that walks, every
// Mega form that walks, X before Y. (In tracker.json a key's presence in sprite_files means the
// file exists.)
export function megasFrom(tracker) {
  const megas = {};
  for (const [key, entry] of Object.entries(tracker ?? {})) {
    const dex = Number(key);
    if (!(dex >= 1) || !("Walk" in (entry?.sprite_files ?? {}))) continue;
    const forms = [];
    for (const [form, sub] of Object.entries(entry.subgroups ?? {})) {
      const m = /^Mega(?:_([XY]))?$/.exec(sub?.name ?? "");
      if (!m || !("Walk" in (sub.sprite_files ?? {}))) continue;
      forms.push([form, "Walk" in (sub.subgroups?.["0001"]?.sprite_files ?? {}) ? 1 : 0, m[1] ?? ""]);
    }
    if (forms.length) megas[dex] = forms.sort((a, b) => a[2].localeCompare(b[2]) || a[0].localeCompare(b[0]));
  }
  return megas;
}

// Time to fetch the tracker again: never fetched, or over a day ago.
export const isStale = (fetchedAt, now) => !(fetchedAt > now - DAY_MS);

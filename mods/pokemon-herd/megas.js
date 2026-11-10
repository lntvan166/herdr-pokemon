// Which Megas have art. SpriteCollab draws new ones every few weeks, so the mod reads its
// tracker.json once a day instead of relying only on the list baked into species.js. Pure.

export const DAY_MS = 24 * 60 * 60 * 1000;

// dex -> [form folder, has a shiny (1/0)]: per species that walks, its first Mega form that walks.
// (In tracker.json a key's presence in sprite_files means the file exists.)
export function megasFrom(tracker) {
  const megas = {};
  for (const [key, entry] of Object.entries(tracker ?? {})) {
    const dex = Number(key);
    if (!(dex >= 1) || !("Walk" in (entry?.sprite_files ?? {}))) continue;
    for (const [form, sub] of Object.entries(entry.subgroups ?? {})) {
      if (!/^Mega(_[XY])?$/.test(sub?.name) || !("Walk" in (sub.sprite_files ?? {}))) continue;
      megas[dex] = [form, "Walk" in (sub.subgroups?.["0001"]?.sprite_files ?? {}) ? 1 : 0];
      break;
    }
  }
  return megas;
}

// Time to fetch the tracker again: never fetched, or over a day ago.
export const isStale = (fetchedAt, now) => !(fetchedAt > now - DAY_MS);

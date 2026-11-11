// Favourite Pokémon (the picker's ★), shared by every pane: { v: 1, keys: ["25", "37-0001"] },
// a species by its dex number, a regional form as "<dex>-<form>". Pure.
import { isWalkable, hasForm } from "./dex.js";

export const favKey = (e) => `${e.dex}${e.form ? `-${e.form}` : ""}`;
export function entryOf(key) {
  const [d, form] = String(key).split("-");
  const dex = Number(d);
  if (!isWalkable(dex) || (form && !hasForm(dex, form))) return null;
  return form ? { dex, form } : { dex };
}

// The saved keys that still name a walking Pokémon, each once, in the order they were added.
export function loadFavorites(raw) {
  const keys = raw?.v === 1 && Array.isArray(raw.keys) ? raw.keys : [];
  return [...new Set(keys.filter((k) => typeof k === "string" && entryOf(k)))];
}

export const isFavorite = (keys, e) => keys.includes(favKey(e));
export const toggleFavorite = (keys, e) => (isFavorite(keys, e) ? keys.filter((k) => k !== favKey(e)) : [...keys, favKey(e)]);
export const favoriteEntries = (keys) => keys.map(entryOf).filter(Boolean);

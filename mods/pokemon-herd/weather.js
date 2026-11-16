// Weather boost and sizes, as in Pokémon GO. Pure.
//
// Weather: the strip's own sky decides it. Rain or a storm (agents waiting on you, scene.js
// weatherOf): Water, Electric, Bug. Night: Dark, Ghost, Poison. By day, the season (scene.js
// seasonAt): spring's blossoms Fairy, Normal, Flying; summer's sun Fire, Grass, Ground; autumn's
// wind Dragon, Psychic, Fighting; winter's snow Ice, Steel, Rock. Every type has its turn. A
// boosted type's move hits ×1.2 (WEATHER_HIT); WEATHER_SHARE of the wild ones that walk by are
// of a boosted type.
//
// Sizes: each wild one is rolled a size as it appears (its height against its species', 0.5..1.5):
// XXS 1 in 40, XS 1 in 8, XL 1 in 8, XXL 1 in 40, the rest about average. Not strength (that's an
// Alpha's): feel. A small one is hard to hit (moves miss it more, sizeMiss); a big one is heavy
// (knocked back less, knocks the other further, knockMul). Drawn only a little bigger or smaller
// (drawSize) with XXL/XXS under its feet, so it's never taken for an Alpha; caught, it keeps it,
// and the Pokédex keeps each species' biggest and smallest.
import { typesOf } from "./trainer.js";

export const WEATHER_HIT = 1.2;
export const WEATHER_SHARE = 0.4;
const SEASON_WEATHER = [
  { id: "breezy", name: "Breezy", icon: "🌸", types: ["fairy", "normal", "flying"] },
  { id: "sunny", name: "Sunny", icon: "☀️", types: ["fire", "grass", "ground"] },
  { id: "windy", name: "Windy", icon: "🍂", types: ["dragon", "psychic", "fighting"] },
  { id: "snow", name: "Snow", icon: "❄️", types: ["ice", "steel", "rock"] },
];
const RAIN = { id: "rain", name: "Rain", icon: "🌧️", types: ["water", "electric", "bug"] };
const NIGHT = { id: "night", name: "Night", icon: "🌙", types: ["dark", "ghost", "poison"] };

// The weather now: `rain` the strip's (scene.js weatherOf: "clear", "rain", "storm"), `season`
// scene.js seasonAt's { a, b, t }, `night` scene.js nightness (0 day .. 1 night).
// { id, name, icon, types }.
export function weatherNow(rain = "clear", season = null, night = 0) {
  if (rain && rain !== "clear") return { ...RAIN, ...(rain === "storm" ? { id: "storm", name: "Storm", icon: "⛈️" } : {}) };
  if (night >= 0.5) return NIGHT;
  const s = season ? (season.t < 0.5 ? season.a : season.b) : 1;
  return SEASON_WEATHER[s] ?? SEASON_WEATHER[1];
}
export const boosts = (w, type) => !!w && w.types.includes(type);
// A Pokémon (fighter key or dex) of a boosted type.
export const boostedMon = (w, dex) => !!w && typesOf(dex).some((t) => w.types.includes(t));
export const weatherText = (w) => `${w.icon} ${w.name}: ${w.types.map((t) => t[0].toUpperCase() + t.slice(1)).join(", ")} stronger and more common`;

// ---- sizes ----
export const SIZES = [
  { id: "XXS", odds: 1 / 40, from: 0.5, to: 0.7 },
  { id: "XS", odds: 1 / 8, from: 0.75, to: 0.88 },
  { id: "XL", odds: 1 / 8, from: 1.12, to: 1.25 },
  { id: "XXL", odds: 1 / 40, from: 1.3, to: 1.5 },
];
export function rollSize(rnd = Math.random) {
  const r = rnd(), u = rnd();
  const pick = r < SIZES[0].odds ? SIZES[0] : r < SIZES[0].odds + SIZES[1].odds ? SIZES[1]
    : r >= 1 - SIZES[3].odds ? SIZES[3] : r >= 1 - SIZES[3].odds - SIZES[2].odds ? SIZES[2] : { from: 0.9, to: 1.1 };
  return Math.round((pick.from + (pick.to - pick.from) * u) * 100) / 100;
}
// Its size class: "XXS", "XS", "XL", "XXL", or null for an average one.
export function sizeClass(size) {
  if (!Number.isFinite(size)) return null;
  if (size <= 0.7) return "XXS";
  if (size <= 0.88) return "XS";
  if (size >= 1.3) return "XXL";
  if (size >= 1.12) return "XL";
  return null;
}
export const validSize = (x) => (Number.isFinite(x) && x >= 0.5 && x <= 1.5 ? Math.round(x * 100) / 100 : undefined);
// How much bigger it's drawn on the strip: 0.3 of its size's difference (XXL ×1.15 at most, XXS ×0.85).
export const drawSize = (size) => (Number.isFinite(size) ? 1 + (size - 1) * 0.3 : 1);
// How often a move misses it, by its size: XXS 1 in 8, XS 1 in 12; else null (the move's own).
export function sizeMiss(size) {
  const c = sizeClass(size);
  return c === "XXS" ? 1 / 8 : c === "XS" ? 1 / 12 : null;
}
// How far a blow knocks it back, by the two sizes: the hitter's over its own, 0.6..1.6.
export const knockMul = (hitter, target) => Math.min(1.6, Math.max(0.6, (Number.isFinite(hitter) ? hitter : 1) / (Number.isFinite(target) ? target : 1)));
// The Pokédex's records { [dex]: [smallest, biggest] } with `pick` caught. Null: no new record.
export function withRecord(records, pick) {
  const s = validSize(pick?.size);
  if (s === undefined) return null;
  const cur = records?.[pick.dex];
  if (cur && s >= cur[0] && s <= cur[1]) return null;
  return { ...(records ?? {}), [pick.dex]: cur ? [Math.min(cur[0], s), Math.max(cur[1], s)] : [s, s] };
}
// "XXL · 1.42× its species' size", and whether it is the species' record.
export function sizeText(size, record = null) {
  const c = sizeClass(size);
  if (!Number.isFinite(size)) return "";
  const rec = record && (size >= record[1] && c?.startsWith("X") && size > 1 ? " · biggest caught" : size <= record[0] && size < 1 && c ? " · smallest caught" : "");
  return `${c ? `${c} · ` : ""}${size.toFixed(2)}× size${rec || ""}`;
}

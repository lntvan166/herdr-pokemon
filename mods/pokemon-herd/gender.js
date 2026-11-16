// Pokémon genders, as in the games. Pure.
// Each species' share of females (gender-data.js, PokeAPI's eighths; -1 genderless). A wild one is
// rolled one as it appears; one saved before genders came is given one by its slot, so it never
// changes. 59 species look different as females (SpriteCollab's female sprites: Pikachu's
// heart-tipped tail, Venusaur's seed in its flower…). Some evolutions go by gender: Kirlia ♂ →
// Gallade, Snorunt ♀ → Froslass, Burmy ♀ → Wormadam and ♂ → Mothim, only a female Combee becomes
// Vespiquen, a female Salandit Salazzle.
import { FEMALE_RATE, FEMALE_SPRITE, FEMALE_SHINY } from "./gender-data.js";

export const rateOf = (dex) => FEMALE_RATE[parseInt(dex, 10)] ?? 4;
export const genderless = (dex) => rateOf(dex) < 0;
// "m", "f", or null (genderless): rolled.
export function rollGender(dex, rnd = Math.random) {
  const r = rateOf(dex);
  return r < 0 ? null : rnd() * 8 < r ? "f" : "m";
}
// The same, from a number (a hash of its slot): one saved before genders came.
export function genderFrom(dex, seed) {
  const r = rateOf(dex);
  return r < 0 ? null : Math.abs(seed) % 8 < r ? "f" : "m";
}
// Whether `g` can be this species' (an all-female one can't be "m"; a genderless one has none).
export function validGender(dex, g) {
  const r = rateOf(dex);
  if (r < 0) return g == null;
  return (g === "f" && r > 0) || (g === "m" && r < 8);
}
export const genderMark = (g) => (g === "f" ? "♀" : g === "m" ? "♂" : "");
export const GENDER_COLOR = { m: "#6ab0ff", f: "#ff8ab8" };
// Whether it is drawn with its own female sprite.
export const femaleSprite = (dex, shiny = false) => (shiny ? FEMALE_SHINY : FEMALE_SPRITE).includes(parseInt(dex, 10));
// Evolutions by gender: dex -> the gender it takes to become it.
export const GENDER_EVOLVE = { 475: "m", 478: "f", 416: "f", 758: "f", 413: "f", 414: "m" };
export const evolvesAs = (dex, g) => !GENDER_EVOLVE[dex] || GENDER_EVOLVE[dex] === g;

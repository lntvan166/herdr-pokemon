// What a wild Pokémon does besides walking by (about 1 in 3 do something): by its kind, what's
// going on, or chance. One thing each, short; the strip stays still otherwise. Pure.
//
//   tease      a mischievous one (Gengar, Zorua, Sableye, Impidimp…) pokes one of yours awake (💢)
//              and runs off laughing (😜), quicker; it leaves a bigger purse.
//   nap        a lazy one (Snorlax, Slowpoke, Slakoth, Komala) lies down halfway and sleeps a while:
//              easier to catch (×1.5); hit, it wakes cross and hits back harder (×1.3).
//   teleport   Abra, Ralts and their lines: a ball that misses, and it's elsewhere on the strip.
//   challenge  a fighter (Machop, Scrafty, Hawlucha, Lucario…) stops at one of yours, "!", and
//              they fight (as if you'd dropped yours on it).
//   friendly   Eevee, Pikachu, Togepi, Jigglypuff… stop by one of yours, both 💗: a little easier to
//              catch (×1.2).
//   curious    any, when an agent is working: it stops by that one's Pokémon and watches (❓).
//   weather    one of the types the day's weather favours stops to enjoy it (☀️ 💧 ❄️ 🍃…).
//   dash       a fast one (Speed 100+) runs across twice as fast (💨).
import { typesOf, NAP_CATCH, FRIEND_CATCH } from "./trainer.js";
export { NAP_CATCH, FRIEND_CATCH };
import { STATS } from "./base-stats.js";

const lines = (...ranges) => new Set(ranges.flatMap(([a, b = a]) => Array.from({ length: b - a + 1 }, (_, i) => a + i)));
export const TEASERS = lines([92, 94], [198], [200], [215], [302], [353, 354], [429], [461], [509, 510], [570, 571], [708, 709], [778], [859, 861], [885, 887], [39, 40]);
export const NAPPERS = lines([79, 80], [143], [199], [287, 289], [446], [775]);
export const TELEPORTERS = lines([63, 65], [280, 282], [475]);
export const FIGHTERS = lines([56, 57], [66, 68], [106, 107], [236, 237], [296, 297], [447, 448], [559, 560], [619, 620], [674, 675], [701], [979]);
export const FRIENDS = lines([25], [35, 36], [39, 40], [113], [133, 136], [172, 176], [183], [196, 197], [242], [427, 428], [440], [468], [470, 471], [587], [700], [702], [777]);

// The day's weather favours these (main.js boostNow().types): its icon for one enjoying it.
export const WEATHER_ICON = { fire: "☀️", grass: "☀️", ground: "☀️", water: "💧", electric: "⚡", bug: "💧", ice: "❄️", steel: "❄️", flying: "🍃", dragon: "🍃", psychic: "🍃", rock: "🌫️", fighting: "🌫️", poison: "☁️", fairy: "✨", dark: "🌙", ghost: "🌙", normal: "☁️" };

export const ACTS = ["tease", "nap", "teleport", "challenge", "friendly", "curious", "weather", "dash"];
const speedOf = (dex) => (STATS[dex] ?? STATS[String(dex)])?.[5] ?? 0;

// `pick`: the wild one ({ dex, legend? }); `how`: { boosted: [types the weather favours],
// working: an agent is working now }. Returns { kind, ... } or null (it only walks by). A
// legendary keeps to itself. `rnd` in the order: its kind's chance, then the situation's.
export function actFor(pick, how = {}, rnd = Math.random) {
  if (!pick || pick.legend) return null;
  const dex = pick.dex;
  const own = (set, kind, p, more = {}) => (set.has(dex) && rnd() < p ? { kind, ...more } : null);
  const mine = own(TEASERS, "tease", 0.6) ?? own(NAPPERS, "nap", 0.6, { ms: 60000 + Math.round(rnd() * 30000) })
    ?? own(TELEPORTERS, "teleport", 1) ?? own(FIGHTERS, "challenge", 0.5) ?? own(FRIENDS, "friendly", 0.5);
  if (mine) return mine;
  const types = typesOf(dex);
  const liked = types.find((t) => (how.boosted ?? []).includes(t));
  const r = rnd();
  if (liked && r < 0.25) return { kind: "weather", icon: WEATHER_ICON[liked] ?? "✨", ms: 4000 };
  if (how.working && r < 0.12) return { kind: "curious", ms: 3000 };
  if (speedOf(dex) >= 100 && r < 0.6) return { kind: "dash" };
  return null;
}

// How long each one stops (ms), and the icon over its head while it does.
export const HALT = { tease: 1600, challenge: 1500, friendly: 3000, curious: 3000 };
export const ICON = { tease: "😜", nap: "zZ", challenge: "❗", friendly: "💗", curious: "❓", dash: "💨" };
export const GRUMPY_HIT = 1.3, TEASE_PURSE = 1.5, FLEE_SPEED = 1.8, DASH_SPEED = 2;
// Whom it stops by: one of yours on its row, within NEAR px of it, that the act wants (tease: idle
// or asleep; challenge: idle, not resting; curious: its agent working; friendly: any).
export const NEAR = 24;
export function wants(kind, m) {
  if (!m || m.moving) return false;
  if (kind === "tease") return m.mood === "idle" || m.mood === "sleep";
  if (kind === "challenge") return m.mood === "idle" && !(m.restUntil > Date.now());
  if (kind === "curious") return m.mood === "working";
  if (kind === "friendly") return m.mood !== "blocked";
  return false;
}

// Abilities, as the games have them. Pure.
// Each species has one or two abilities and maybe a hidden one (ability-data.js, from PokeAPI);
// each Pokémon has one: its slot (`pick.abil`: 0, 1, or 2 for the hidden one), kept as it evolves
// (a Charmander's Blaze is its Charizard's; a hidden one stays hidden). A wild one caught has one
// of its species' two; a raid boss, and an Alpha half the time, its hidden one (as Max Raids gave
// them); an egg takes its mother's slot 4 in 5, her hidden one 3 in 5 (the games' rule); one saved
// before abilities came is given one by its slot, so it never changes. An Ability Capsule swaps
// the two, an Ability Patch makes it the hidden one.
// In a battle (one of yours against a wild one, or a trainer's), each side's ability works as in
// the games: a hit made stronger or weaker or nothing at all (Levitate, Wonder Guard, Water
// Absorb…), who's faster (Swift Swim in the rain…), crits and accuracy, Sturdy, and stat stages
// that last while the two face each other (Intimidate, Moxie, Speed Boost, Justified…). One that
// needs what the mod has none of (status, switching mid-battle, held items in battle, terrain)
// does nothing here (`works`).
import { SELF_STAGES } from "./move-stages.js";
import { SPECIES_ABILITIES, ABILITY_KEYS, ABILITY_NAMES, ABILITY_TEXTS, MOVE_FLAGS } from "./ability-data.js";

const INDEX = new Map(ABILITY_KEYS.map((k, i) => [k, i]));
const strHash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
export const slotsOf = (dex) => SPECIES_ABILITIES[parseInt(dex, 10)] ?? [0, 0, 0];
export const hasHidden = (dex) => slotsOf(dex)[2] > 0;

// Its slot (0, 1, 2): its own if its species has one there, else one by `slotKey` (its save slot).
export function abilSlot(pick, slotKey = "") {
  const s = slotsOf(pick?.dex);
  if ((pick?.abil === 0 || pick?.abil === 1 || pick?.abil === 2) && s[pick.abil]) return pick.abil;
  if (pick?.abil === 1 && !s[1]) return 0; // (one with one ability only: its first)
  return s[1] ? strHash(`${slotKey}:ability`) % 2 : 0;
}
// Its ability's id ("blaze"), or "" for one with none known.
export function abilityOf(pick, slotKey = "") {
  const s = slotsOf(pick?.dex);
  return ABILITY_KEYS[s[abilSlot(pick, slotKey)] || s[0]] ?? "";
}
export const abilityName = (key) => ABILITY_NAMES[INDEX.get(key)] ?? "";
export const abilityText = (key) => ABILITY_TEXTS[INDEX.get(key)] ?? "";
export const isHidden = (pick, slotKey = "") => abilSlot(pick, slotKey) === 2;

// A wild one's slot: one of its two (`hidden`: its hidden one, if it has one).
export function rollAbil(dex, rnd = Math.random, hidden = false) {
  const s = slotsOf(dex);
  if (hidden && s[2]) return 2;
  return s[1] && rnd() < 0.5 ? 1 : 0;
}
// An egg's: its mother's slot 4 in 5 (else the other), her hidden one 3 in 5 (else one of the two).
export function eggAbil(babyDex, motherSlot, rnd = Math.random) {
  const s = slotsOf(babyDex);
  if (motherSlot === 2 && s[2] && rnd() < 0.6) return 2;
  if (motherSlot === 2) return rollAbil(babyDex, rnd);
  if (!s[1]) return 0;
  return rnd() < 0.8 ? motherSlot : 1 - motherSlot;
}

// ---- in battle -------------------------------------------------------------------------------
const flag = (move, f) => (MOVE_FLAGS[move?.name] ?? "").includes(f);
const PINCH = { blaze: "fire", torrent: "water", overgrow: "grass", swarm: "bug" };
// Immune to a type (and what it gets from it: a quarter of its health back, a stage up, or its fire
// moves powered up).
const IMMUNE = {
  levitate: { type: "ground" }, "earth-eater": { type: "ground", heal: 0.25 },
  "flash-fire": { type: "fire", fire: true }, "well-baked-body": { type: "fire", stage: ["def", 2] },
  "water-absorb": { type: "water", heal: 0.25 }, "dry-skin": { type: "water", heal: 0.25 }, "storm-drain": { type: "water", stage: ["spa", 1] },
  "volt-absorb": { type: "electric", heal: 0.25 }, "lightning-rod": { type: "electric", stage: ["spa", 1] }, "motor-drive": { type: "electric", stage: ["spe", 1] },
  "sap-sipper": { type: "grass", stage: ["atk", 1] },
};
const WEATHER_SPEED = { "swift-swim": ["rain", "storm"], chlorophyll: ["sunny"], "slush-rush": ["snow"] };
const NO_INTIMIDATE = new Set(["inner-focus", "oblivious", "own-tempo", "scrappy"]);
// Abilities that do something here (the rest: their name and text in the Box, "no effect here").
export const WORKS = new Set([
  ...Object.keys(PINCH), ...Object.keys(IMMUNE), ...Object.keys(WEATHER_SPEED),
  "wonder-guard", "adaptability", "technician", "tough-claws", "iron-fist", "strong-jaw", "mega-launcher", "huge-power", "pure-power",
  "hustle", "sheer-force", "reckless", "solar-power", "steelworker", "transistor", "dragons-maw", "rocky-payload", "sharpness", "punk-rock",
  "gorilla-tactics", "protean", "libero", "aerilate", "pixilate", "refrigerate", "galvanize", "tinted-lens", "water-bubble",
  "thick-fat", "heatproof", "filter", "solid-rock", "prism-armor", "multiscale", "shadow-shield", "fur-coat", "fluffy", "ice-scales",
  "purifying-salt", "intimidate", "guard-dog", "defiant", "competitive", "rattled", "moxie", "chilling-neigh", "grim-neigh", "beast-boost",
  "speed-boost", "justified", "stamina", "weak-armor", "steam-engine", "water-compaction", "anger-point", "sturdy", "no-guard",
  "compound-eyes", "sniper", "super-luck", "battle-armor", "shell-armor", "inner-focus", "oblivious", "own-tempo", "scrappy",
  // out of battle (main.js): finding things, eggs, who walks by, a wild one's nature
  "pickup", "honey-gather", "flame-body", "magma-armor", "static", "magnet-pull", "harvest", "synchronize",
]);
export const works = (key) => WORKS.has(key);

// A stat stage (−6..+6) as a multiplier, as in the games.
export const stageMul = (n) => (n >= 0 ? (2 + n) / 2 : 2 / (2 - n));
const clampStage = (n) => Math.max(-6, Math.min(6, n));
// One side of a battle: its ability, health and stages (kept while the two face each other).
export const newSide = (ab, hp = 1) => ({ ab: ab || "", hp, st: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, fire: false });
function raise(side, stat, n, said, by = side.ab) {
  side.st[stat] = clampStage(side.st[stat] + n);
  if (by) said.push(by);
}

// Two meet: Intimidate (theirs one stage of Attack down; Inner Focus and the like shrug it off,
// Defiant and Competitive answer it, Rattled runs faster, Guard Dog's Attack goes up instead).
// Returns the abilities that showed, each side's: { a: [keys], b: [keys] }.
export function meet(a, b) {
  const said = { a: [], b: [] };
  const scare = (x, y, sx, sy) => {
    if (x.ab !== "intimidate") return;
    sx.push("intimidate");
    if (NO_INTIMIDATE.has(y.ab)) { sy.push(y.ab); return; }
    if (y.ab === "guard-dog") { raise(y, "atk", 1, sy); return; }
    y.st.atk = clampStage(y.st.atk - 1);
    if (y.ab === "defiant") raise(y, "atk", 2, sy);
    if (y.ab === "competitive") raise(y, "spa", 2, sy);
    if (y.ab === "rattled") raise(y, "spe", 1, sy);
  };
  scare(a, b, said.a, said.b);
  scare(b, a, said.b, said.a);
  return said;
}
// Its Speed: its stage, its ability in the weather (×2).
export function speedMul(side, weather) {
  return stageMul(side.st.spe) * (WEATHER_SPEED[side.ab]?.includes(weather) ? 2 : 1);
}
export const fastInWeather = (side, weather) => !!WEATHER_SPEED[side.ab]?.includes(weather);
// Whether `def`'s ability makes it immune to `move` (the attacker picks another, as the games' AI
// would: main.js asks again, twice at most).
export function immuneTo(def, move, eff = move?.eff ?? 1) {
  if (IMMUNE[def.ab]?.type === move?.type) return true;
  return def.ab === "wonder-guard" && eff <= 1;
}

// One hit from `att` at `def` with `move` (moves.js pickMove: its type, name, physical, stab, eff,
// crit, miss, mul): its type (one that changes it: Pixilate…), a hit or a miss now (No Guard,
// Compound Eyes, Hustle), and × on its damage from both abilities and their stages, or 0 (immune:
// and what it gets from that). `how.weather`: the weather's id; `how.missRate`: the move's chance to
// miss (moves.js missOf). `rnd` for the rolls the abilities add.
// Returns { mul, type, miss, crit, heal (to `def`, 0..1), said: { att: [keys], def: [keys] } }.
export function onHit(att, def, move, how = {}, rnd = Math.random) {
  const said = { att: [], def: [] };
  let type = move.type, crit = !!move.crit, miss = !!move.miss, eff = move.eff ?? 1;
  let base = 1; // its power (the crit, STAB and weather already in move.mul when it hits)
  // A Normal move made another type (×1.2).
  const skin = { aerilate: "flying", pixilate: "fairy", refrigerate: "ice", galvanize: "electric" }[att.ab];
  if (skin && type === "normal") { type = skin; base *= 1.2; said.att.push(att.ab); eff = how.effOf ? how.effOf(type) : eff; }
  // Accuracy: No Guard never misses; Compound Eyes ×1.3; Hustle ×0.8.
  const acc = 1 - (how.missRate ?? 0);
  if (miss && (att.ab === "no-guard" || def.ab === "no-guard")) { miss = false; said[att.ab === "no-guard" ? "att" : "def"].push("no-guard"); }
  // (Of the misses, the share Compound Eyes turns to hits: so it hits acc × 1.3 of the time in all.)
  else if (miss && att.ab === "compound-eyes" && acc < 1 && rnd() < (Math.min(1, acc * 1.3) - acc) / (1 - acc)) { miss = false; said.att.push("compound-eyes"); }
  if (!miss && att.ab === "hustle" && move.physical && rnd() < 0.2) miss = true;
  // Crits: Super Luck a stage higher (1 in 8), Battle and Shell Armor none.
  if (!crit && att.ab === "super-luck" && rnd() < 1 / 16) { crit = true; said.att.push("super-luck"); }
  if (crit && (def.ab === "battle-armor" || def.ab === "shell-armor")) { crit = false; said.def.push(def.ab); }
  // move.mul is 0 on a miss: what it'd be on a hit, from the move.
  let mul = miss ? 0 : (move.mul > 0 ? move.mul / (move.crit ? 1.5 : 1) : (move.stab ? 1.5 : 1)) * (crit ? 1.5 : 1);
  if (crit && att.ab === "sniper") { mul *= 1.5; said.att.push("sniper"); }
  if (miss) return { mul: 0, type, miss, crit, heal: 0, said };
  // Immune: nothing, and what its ability takes from it.
  const im = IMMUNE[def.ab];
  if (im && im.type === type) {
    said.def.push(def.ab);
    if (im.stage) raise(def, im.stage[0], im.stage[1], [], "");
    if (im.fire) def.fire = true;
    return { mul: 0, type, miss: false, crit, heal: im.heal ?? 0, said };
  }
  if (def.ab === "wonder-guard" && eff <= 1) { said.def.push("wonder-guard"); return { mul: 0, type, miss: false, crit, heal: 0, said }; }
  // The attacker's.
  const physical = !!move.physical;
  const atk = (k, x) => { base *= x; said.att.push(k); };
  if (PINCH[att.ab] === type && att.hp <= 1 / 3) atk(att.ab, 1.5);
  switch (att.ab) {
    case "adaptability": if (move.stab) atk("adaptability", 2 / 1.5); break;
    case "protean": case "libero": if (!move.stab) atk(att.ab, 1.5); break; // it becomes its move's type: STAB
    case "technician": if ((move.power ?? 80) <= 60) atk("technician", 1.5); break;
    case "tough-claws": if (flag(move, "c")) atk("tough-claws", 1.3); break;
    case "iron-fist": if (flag(move, "p")) atk("iron-fist", 1.2); break;
    case "strong-jaw": if (flag(move, "b")) atk("strong-jaw", 1.5); break;
    case "mega-launcher": if (flag(move, "u")) atk("mega-launcher", 1.5); break;
    case "punk-rock": if (flag(move, "s")) atk("punk-rock", 1.3); break;
    case "sheer-force": if (flag(move, "e")) atk("sheer-force", 1.3); break;
    case "reckless": if (flag(move, "r")) atk("reckless", 1.2); break;
    case "sharpness": if (/Slash|Cut|Blade|Sword|Scissor|Aerial Ace|Air Cutter|Kowtow Cleave|Ceaseless Edge|Razor|Cleave|Leaf Blade|Night Slash|Psycho Cut|Fury Cutter|Stone Axe/.test(move.name ?? "")) atk("sharpness", 1.5); break;
    case "huge-power": case "pure-power": if (physical) atk(att.ab, 2); break;
    case "hustle": case "gorilla-tactics": if (physical) atk(att.ab, 1.5); break;
    case "solar-power": if (!physical && how.weather === "sunny") atk("solar-power", 1.5); break;
    case "steelworker": if (type === "steel") atk("steelworker", 1.5); break;
    case "transistor": if (type === "electric") atk("transistor", 1.3); break;
    case "dragons-maw": if (type === "dragon") atk("dragons-maw", 1.5); break;
    case "rocky-payload": if (type === "rock") atk("rocky-payload", 1.5); break;
    case "water-bubble": if (type === "water") atk("water-bubble", 2); break;
    case "tinted-lens": if (eff < 1) atk("tinted-lens", 2); break;
  }
  if (att.fire && type === "fire") atk("flash-fire", 1.5);
  // The target's.
  const def_ = (k, x) => { base *= x; said.def.push(k); };
  switch (def.ab) {
    case "thick-fat": if (type === "fire" || type === "ice") def_("thick-fat", 0.5); break;
    case "heatproof": case "water-bubble": if (type === "fire") def_(def.ab, 0.5); break;
    case "filter": case "solid-rock": case "prism-armor": if (eff > 1) def_(def.ab, 0.75); break;
    case "multiscale": case "shadow-shield": if (def.hp >= 0.999) def_(def.ab, 0.5); break;
    case "fur-coat": if (physical) def_("fur-coat", 0.5); break;
    // (A contact Fire move: ½ × 2, as the games'; it was ×2.)
    case "fluffy": { const x = (flag(move, "c") ? 0.5 : 1) * (type === "fire" ? 2 : 1); if (x !== 1) def_("fluffy", x); break; }
    case "ice-scales": if (!physical) def_("ice-scales", 0.5); break;
    case "purifying-salt": if (type === "ghost") def_("purifying-salt", 0.5); break;
    case "dry-skin": if (type === "fire") def_("dry-skin", 1.25); break;
  }
  // Stages: its Attack (or Sp. Atk) over the target's Defense (or Sp. Def). A crit ignores the
  // attacker's drops and the target's rises, as in the games.
  // Sacred Sword and the like (IGNORE_STAGES): the target's stages, up or down, count for nothing.
  const a = physical ? att.st.atk : att.st.spa, d = IGNORE_STAGES.has(move.name) ? 0 : physical ? def.st.def : def.st.spd;
  base *= stageMul(crit ? Math.max(0, a) : a) / stageMul(crit ? Math.min(0, d) : d);
  return { mul: mul * base, type, miss: false, crit, heal: 0, said };
}

// Stage changes as short words ("Def↓ SpD↓", "Atk↑↑"), each stage an arrow.
const STAT_WORD = { atk: "Atk", def: "Def", spa: "SpA", spd: "SpD", spe: "Spe" };
export const stageWords = (list) => list.map(([s, n]) => `${STAT_WORD[s]}${(n > 0 ? "↑" : "↓").repeat(Math.min(3, Math.abs(n)))}`).join(" ");
// Moves that ignore the target's stat stages, as the games' (Sacred Sword, Darkest Lariat, Chip Away).
export const IGNORE_STAGES = new Set(["Sacred Sword", "Darkest Lariat", "Chip Away"]);
// A stage changed by a move, not an ability (nothing said by name): `n` stages of `stat`, kept in
// `out` ([stat, n] as it took: none at ±6).
export function stageBy(side, stat, n, out) {
  const was = side.st[stat];
  side.st[stat] = clampStage(was + n);
  if (side.st[stat] !== was) out.push([stat, side.st[stat] - was]);
}
// After a hit landed (`r`: { fainted, crit, eff }): the stages it changes. Its move's on its own
// user first (move-stages.js SELF_STAGES, as the games': Close Combat's Defense and Sp. Def −1 even
// as the other faints, Power-Up Punch's Attack +1; `stages.att` [stat, n] for the words). Justified (a Dark hit),
// Stamina, Weak Armor, Rattled, Steam Engine, Water Compaction, Anger Point (a crit); Moxie and the
// like (it knocked the other out). Returns { att: [keys], def: [keys] }.
export function afterHit(att, def, move, r, type = move.type, rnd = Math.random) {
  const said = { att: [], def: [], stages: { att: [] } };
  if (r.mul === 0 || r.miss) return said;
  // (Not on one risen to its type's own, 1 in 8: a gift, drawn as Close Combat or Draco Meteor
  // but struck as the move it rose from, physical or special: no cost of theirs.)
  const own = !move.risen && SELF_STAGES[move.name];
  if (own && (own[0] >= 1 || rnd() < own[0])) for (const [stat, n] of own[1]) stageBy(att, stat, n, said.stages.att);
  if (r.fainted) {
    if (att.ab === "moxie" || att.ab === "chilling-neigh") raise(att, "atk", 1, said.att);
    else if (att.ab === "grim-neigh") raise(att, "spa", 1, said.att);
    else if (att.ab === "beast-boost") raise(att, "atk", 1, said.att);
    return said;
  }
  switch (def.ab) {
    case "justified": if (type === "dark") raise(def, "atk", 1, said.def); break;
    case "stamina": raise(def, "def", 1, said.def); break;
    case "weak-armor": if (move.physical) { raise(def, "def", -1, said.def); raise(def, "spe", 2, [], ""); } break;
    case "rattled": if (["dark", "bug", "ghost"].includes(type)) raise(def, "spe", 1, said.def); break;
    case "steam-engine": if (type === "fire" || type === "water") raise(def, "spe", 6, said.def); break;
    case "water-compaction": if (type === "water") raise(def, "def", 2, said.def); break;
    case "anger-point": if (r.crit) raise(def, "atk", 6, said.def); break;
  }
  return said;
}
// The end of an exchange: Speed Boost.
export function endTurn(side) {
  if (side.ab !== "speed-boost" || side.st.spe >= 6) return [];
  side.st.spe += 1;
  return ["speed-boost"];
}
// Sturdy: at full health, one hit can't knock it out (it hangs on with a sliver).
export const sturdyHolds = (side, hpBefore) => side.ab === "sturdy" && hpBefore >= 0.999;

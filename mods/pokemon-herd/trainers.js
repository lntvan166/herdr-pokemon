// Trainers who come by now and then and want to battle (in place of a wild Pokémon): who they
// are, their team, what beating them pays, and how they look (pixel art of our own, cut into GIFs
// by sprites.js ensureTrainer). Pure.
//
// A team: 2 or 3 fully evolved Pokémon of the class's types (no legendaries), as raised as yours
// get (TEAM_EFFORT: every heart), each with a nature: no pushover. You fight it as a wild one,
// dropping yours on it; it can't be caught. Beat one and the next comes out; beat them all for
// its pay. Ignored, it leaves after WAIT_MS.
import { WALKABLE, evolutionsOf } from "./dex.js";
import { EVOLVES_FROM } from "./species.js";
import { isLegendary, typesOf, NATURES } from "./trainer.js";

export const TRAINER_ODDS = 10; // 1 visitor in 10 is a trainer (not in an outbreak or a raid)
export const WAIT_MS = 3 * 60000; // how long it waits for a battle, then walks on
export const TEAM_EFFORT = 1.1; // its Pokémon, a touch stronger than yours can be raised (trainer.js effortOf: 1.05 at most)
// Now and then a star: its last Pokémon a legendary, one of its team Mega Evolved, or an Alpha;
// it pays more for each (trainerPay). The likelier the more of them you have yourself (`owned`:
// { legends caught, megas: yours that can Mega Evolve, alphas }): trainers keep up with you.
export const LEGEND_ODDS = 0.12, MEGA_ODDS = 0.25; // with none of your own
export const STAR_CAP = { legend: 0.2, mega: 0.3, alpha: 0.25 }; // never likelier than this
export function starOdds(owned = {}) {
  return {
    legend: Math.min(STAR_CAP.legend, 0.05 + 0.01 * (owned.legends ?? 0)),
    mega: Math.min(STAR_CAP.mega, 0.1 + 0.015 * (owned.megas ?? 0)),
    alpha: Math.min(STAR_CAP.alpha, 0.05 + 0.01 * (owned.alphas ?? 0)),
  };
}

// Each class: its title, names, the types its team is of, its colours, and its pay.
// Colours: H hair, C cap (or hair again), T top, P trousers, B shoes, A arms' sleeves.
export const CLASSES = [
  { id: "ace", title: "Ace Trainer", names: ["Mia", "Leo", "Nora", "Kai"], types: null, pay: 600, item: ["ultra-ball", 3],
    colors: { H: "#3a2a1a", C: "#3a2a1a", T: "#2a5bd7", A: "#2a5bd7", P: "#22262e", B: "#c8402a" } },
  { id: "hiker", title: "Hiker", names: ["Ben", "Ruth", "Otis"], types: ["rock", "ground", "steel"], pay: 400, item: ["revive", 1],
    colors: { H: "#5a3a1a", C: "#a86a2a", T: "#c87a3a", A: "#c87a3a", P: "#5a4a2a", B: "#3a2a1a" } },
  { id: "swimmer", title: "Swimmer", names: ["Lia", "Finn", "Coral"], types: ["water", "ice"], pay: 350, item: ["dusk-ball", 2],
    colors: { H: "#e8c060", C: "#2a8cff", T: "#2a8cff", A: "#f0c8a0", P: "#2a8cff", B: "#f0c8a0" } },
  { id: "blackbelt", title: "Black Belt", names: ["Ken", "Mai", "Goro"], types: ["fighting"], pay: 450, item: ["revive", 1],
    colors: { H: "#1a1a1a", C: "#1a1a1a", T: "#f4f4f4", A: "#f4f4f4", P: "#f4f4f4", B: "#f0c8a0" } },
  { id: "psychic", title: "Psychic", names: ["Ivy", "Sol", "Luna"], types: ["psychic", "fairy", "ghost"], pay: 450, item: ["timer-ball", 2],
    colors: { H: "#8a3ad8", C: "#8a3ad8", T: "#c060ff", A: "#c060ff", P: "#5a2a8a", B: "#2a1a3a" } },
  { id: "bugcatcher", title: "Bug Catcher", names: ["Tom", "Sid", "Pip"], types: ["bug", "grass"], pay: 300, item: ["quick-ball", 2],
    colors: { H: "#3a2a1a", C: "#f2c94c", T: "#7bd65a", A: "#7bd65a", P: "#a86a2a", B: "#5a3a1a" } },
  { id: "kindler", title: "Kindler", names: ["Ash", "Ember", "Rex"], types: ["fire", "dragon"], pay: 450, item: ["ultra-ball", 2],
    colors: { H: "#c8402a", C: "#c8402a", T: "#ff8a2a", A: "#f0c8a0", P: "#5a2a1a", B: "#2a1a1a" } },
  { id: "punk", title: "Punk", names: ["Zed", "Roxy", "Vex"], types: ["dark", "poison"], pay: 400, item: ["max-revive", 1],
    colors: { H: "#ff3a8a", C: "#ff3a8a", T: "#2a2a2a", A: "#2a2a2a", P: "#3a3a5a", B: "#1a1a1a" } },
  { id: "engineer", title: "Engineer", names: ["Volt", "Iris", "Gus"], types: ["electric", "steel"], pay: 400, item: ["quick-ball", 2],
    colors: { H: "#3a2a1a", C: "#f2c94c", T: "#f2a03a", A: "#f2a03a", P: "#2a3a5a", B: "#2a2a2a" } },
  { id: "birdkeeper", title: "Bird Keeper", names: ["Sky", "Wren", "Hawk"], types: ["flying", "normal"], pay: 350, item: ["great-ball", 5],
    colors: { H: "#5a3a1a", C: "#2aa8a8", T: "#e8f0f4", A: "#e8f0f4", P: "#2aa8a8", B: "#3a2a1a" } },
];

const FINALS = WALKABLE.filter((dex) => EVOLVES_FROM[dex] !== undefined && evolutionsOf(dex).length === 0 && !isLegendary(dex));
const NATURE_IDS = Object.keys(NATURES);

// A trainer, as it comes: { cls (its id), title, name, team: [{ dex, nature, mega? (its kind:
// "X", "Y", ""), legend? }], at }. `how.megaOf(dex)`: the Mega kind it can take, or null.
const LEGENDS = WALKABLE.filter((d) => isLegendary(d));
export function newTrainer(rnd = Math.random, now = 0, how = {}) {
  const c = CLASSES[Math.floor(rnd() * CLASSES.length)];
  const pool = c.types ? FINALS.filter((d) => typesOf(d).some((t) => c.types.includes(t))) : FINALS;
  const n = how.size ?? (rnd() < 0.5 ? 2 : 3);
  const team = [];
  while (team.length < n && pool.length) {
    const dex = pool[Math.floor(rnd() * pool.length)];
    if (!team.some((m) => m.dex === dex)) team.push({ dex, nature: NATURE_IDS[Math.floor(rnd() * NATURE_IDS.length)] });
  }
  // Stars: a legendary in its last place, or a Mega of one that has one; and maybe an Alpha.
  const odds = how.odds ?? starOdds(how.owned);
  if ((how.force === "legend" || (!how.force && rnd() < odds.legend)) && LEGENDS.length) team[team.length - 1] = { dex: LEGENDS[Math.floor(rnd() * LEGENDS.length)], nature: NATURE_IDS[Math.floor(rnd() * NATURE_IDS.length)], legend: true };
  // (Each on its own: a team can have all three, a legendary, a Mega and an Alpha, each a
  // different one of its Pokémon.)
  if ((how.force === "mega" || (!how.force && rnd() < odds.mega)) && how.megaOf) {
    let i = team.findIndex((m) => !m.legend && how.megaOf(m.dex) != null);
    if (i < 0 && how.force === "mega") { const d = pool.find((x) => how.megaOf(x) != null) ?? FINALS.find((x) => how.megaOf(x) != null); if (d && !team[0].legend) { team[0] = { dex: d, nature: team[0].nature }; i = 0; } }
    if (i >= 0) team[i] = { ...team[i], mega: how.megaOf(team[i].dex) };
  }
  if (how.force === "alpha" || (!how.force && rnd() < odds.alpha)) {
    const i = team.findIndex((m) => !m.legend && m.mega == null);
    if (i >= 0) team[i] = { ...team[i], alpha: true };
  }
  return { cls: c.id, title: c.title, name: c.names[Math.floor(rnd() * c.names.length)], team, at: now };
}
export const classOf = (id) => CLASSES.find((c) => c.id === id) ?? CLASSES[0];
// Beating it: its class's pay (×1.3 for three, ×1.5 with a Mega, ×2.5 with a legendary, ×1.4
// with an Alpha) and item; a Rare Candy too for a Mega, an Azure Flute for a legendary, a Max
// Revive for an Alpha. { money, items: [[id, n]] }.
export function trainerPay(tr) {
  const c = classOf(tr.cls);
  const mega = tr.team.some((m) => m.mega != null), legend = tr.team.some((m) => m.legend), alpha = tr.team.some((m) => m.alpha);
  const money = Math.round(c.pay * (tr.team.length >= 3 ? 1.3 : 1) * (mega ? 1.5 : 1) * (legend ? 2.5 : 1) * (alpha ? 1.4 : 1));
  return { money, items: [[c.item[0], c.item[1]], ...(mega ? [["rare-candy", 1]] : []), ...(legend ? [["azure-flute", 1]] : []), ...(alpha ? [["max-revive", 1]] : [])] };
}

// How a trainer looks: 12 × 20 pixels, a letter a colour (CLASSES colors; S skin, E eyes, "."
// none). Facing right; drawn left by flipping. Two steps walking, and standing.
export const SKIN = "#f0c8a0", EYES = "#1a1a1a";
const HEAD = [
  "...CCCCC....",
  "..CCCCCCC...",
  ".CCCCCCCCC..",
  "..HSSSSSH...",
  "..HSSSESH...",
  "..HSSSSSS...",
  "...SSSSS....",
];
const BODY = [
  "...TTTTT....",
  "..ATTTTTA...",
  ".AATTTTTAA..",
  ".SATTTTTAS..",
  "..STTTTTS...",
  "...PPPPP....",
];
const LEGS = {
  stand: ["...PP.PP....", "...PP.PP....", "...PP.PP....", "...PP.PP....", "...BB.BB...."],
  step1: ["...PP..PP...", "..PP....PP..", "..PP....PP..", ".PP......PP.", ".BB......BB."],
  step2: ["....PPPP....", "....PP.P....", "...PP..PP...", "...PP..PP...", "...BB..BB..."],
};
export const TRAINER_W = 12, TRAINER_H = 18;
export const framesOf = () => ({ stand: [...HEAD, ...BODY, ...LEGS.stand], step1: [...HEAD, ...BODY, ...LEGS.step1], step2: [...HEAD, ...BODY, ...LEGS.step2] });
// One frame's pixels by colour: { "#hex": [[x, y], …] } (what ImageMagick draws as points).
export function pixelsOf(rows, colors) {
  const pal = { ...colors, S: SKIN, E: EYES };
  const out = {};
  rows.forEach((row, y) => [...row].forEach((ch, x) => { const c = pal[ch]; if (c) (out[c] ??= []).push([x, y]); }));
  return out;
}

// The Battle Tower (the menu): trainers one after another, as long as you keep winning. Each a
// team of three, stronger the higher you are (its effort, likelier stars); `lives` faints of
// yours end the climb (each one out for the rest of it), as does leaving one waiting (WAIT_MS).
// Each win pays (towerPay); every 7th a gift as well, a Master Ball from the 21st.
export const TOWER_LIVES = 3;
export const TOWER_NEXT_MS = 6000; // the next one in, after a win
export const towerEffort = (wins) => Math.min(1.3, TEAM_EFFORT + 0.01 * wins);
export const towerOdds = (wins) => ({
  legend: Math.min(0.5, 0.05 + 0.025 * wins),
  mega: Math.min(0.6, 0.15 + 0.03 * wins),
  alpha: Math.min(0.5, 0.05 + 0.025 * wins),
});
// The `n`th trainer of a climb (1, 2…): `wins` before it = n - 1.
export function towerTrainer(rnd, now, n, how = {}) {
  const tr = newTrainer(rnd, now, { ...how, size: 3, odds: towerOdds(n - 1), force: undefined });
  return { ...tr, tower: n, effort: towerEffort(n - 1) };
}
// The `n`th win: { money, items: [[id, count]] }.
export function towerPay(n) {
  const money = Math.min(2000, 300 + 60 * (n - 1));
  const k = n % 7 === 0 ? n / 7 : 0;
  const items = k === 1 ? [["rare-candy", 3], ["golden-razz-berry", 2]]
    : k === 2 ? [["max-revive", 2], ["golden-razz-berry", 3]]
    : k >= 3 ? [["master-ball", 1], ["golden-razz-berry", 3]] : [];
  return { money, items };
}
// The climb now: `run` (null: not climbing) { at, wins, faints, out: [panes], nextAt }, and the
// best run yet. Kept in shared state (pokemon-herd-tower).
export function loadTower(raw) {
  const best = Number.isInteger(raw?.best) && raw.best > 0 ? raw.best : 0;
  const r = raw?.run;
  const run = r && Number.isFinite(r.at) ? {
    at: r.at, wins: Number.isInteger(r.wins) && r.wins > 0 ? r.wins : 0, faints: Number.isInteger(r.faints) && r.faints > 0 ? r.faints : 0,
    out: Array.isArray(r.out) ? r.out.filter((x) => typeof x === "string") : [], nextAt: Number.isFinite(r.nextAt) ? r.nextAt : 0,
  } : null;
  return { v: 1, best, run };
}

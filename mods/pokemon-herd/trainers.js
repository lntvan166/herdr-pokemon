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
import { isLegendary, typesOf, NATURES, effectOn, isPhysicalKey, fighterKey } from "./trainer.js";

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
  { id: "ace", title: "Ace Trainer", names: ["Mia", "Leo", "Nora", "Kai"], types: null, pay: 600, item: ["ultra-ball", 1],
    colors: { H: "#3a2a1a", C: "#3a2a1a", T: "#2a5bd7", A: "#2a5bd7", P: "#22262e", B: "#c8402a" } },
  { id: "hiker", title: "Hiker", names: ["Ben", "Ruth", "Otis"], types: ["rock", "ground", "steel"], pay: 400, item: ["great-ball", 2],
    colors: { H: "#5a3a1a", C: "#a86a2a", T: "#c87a3a", A: "#c87a3a", P: "#5a4a2a", B: "#3a2a1a" } },
  { id: "swimmer", title: "Swimmer", names: ["Lia", "Finn", "Coral"], types: ["water", "ice"], pay: 350, item: ["dusk-ball", 1],
    colors: { H: "#e8c060", C: "#2a8cff", T: "#2a8cff", A: "#f0c8a0", P: "#2a8cff", B: "#f0c8a0" } },
  { id: "blackbelt", title: "Black Belt", names: ["Ken", "Mai", "Goro"], types: ["fighting"], pay: 450, item: ["sitrus-berry", 1],
    colors: { H: "#1a1a1a", C: "#1a1a1a", T: "#f4f4f4", A: "#f4f4f4", P: "#f4f4f4", B: "#f0c8a0" } },
  { id: "psychic", title: "Psychic", names: ["Ivy", "Sol", "Luna"], types: ["psychic", "fairy", "ghost"], pay: 450, item: ["timer-ball", 1],
    colors: { H: "#8a3ad8", C: "#8a3ad8", T: "#c060ff", A: "#c060ff", P: "#5a2a8a", B: "#2a1a3a" } },
  { id: "bugcatcher", title: "Bug Catcher", names: ["Tom", "Sid", "Pip"], types: ["bug", "grass"], pay: 300, item: ["quick-ball", 1],
    colors: { H: "#3a2a1a", C: "#f2c94c", T: "#7bd65a", A: "#7bd65a", P: "#a86a2a", B: "#5a3a1a" } },
  { id: "kindler", title: "Kindler", names: ["Ash", "Ember", "Rex"], types: ["fire", "dragon"], pay: 450, item: ["ultra-ball", 1],
    colors: { H: "#c8402a", C: "#c8402a", T: "#ff8a2a", A: "#f0c8a0", P: "#5a2a1a", B: "#2a1a1a" } },
  { id: "punk", title: "Punk", names: ["Zed", "Roxy", "Vex"], types: ["dark", "poison"], pay: 400, item: ["dusk-ball", 1],
    colors: { H: "#ff3a8a", C: "#ff3a8a", T: "#2a2a2a", A: "#2a2a2a", P: "#3a3a5a", B: "#1a1a1a" } },
  { id: "engineer", title: "Engineer", names: ["Volt", "Iris", "Gus"], types: ["electric", "steel"], pay: 400, item: ["quick-ball", 1],
    colors: { H: "#3a2a1a", C: "#f2c94c", T: "#f2a03a", A: "#f2a03a", P: "#2a3a5a", B: "#2a2a2a" } },
  { id: "birdkeeper", title: "Bird Keeper", names: ["Sky", "Wren", "Hawk"], types: ["flying", "normal"], pay: 350, item: ["great-ball", 2],
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
export const classOf = (id) => (id === "rival" ? RIVAL : CLASSES.find((c) => c.id === id) ?? CLASSES[0]);
// Beating it: a fifth of its class's pay (×1.2 for three, ×1.3 with a Mega, ×1.6 with a
// legendary, ×1.3 with an Alpha) and its item (one ball or Berry); a little more for each star (an
// Ultra Ball for a Mega, a Golden Razz for a legendary, 2 Razz for an Alpha). { money, items }.
// Simulated over a day (9 h with the strip open; owned: 17 legendaries, 30 Megas, 16 Alphas):
// visitors "often" bring ~8 trainers (~16 at "lots"); they paid ~₽5,600 + items worth ~₽6,300
// a day (Azure Flutes and Max Revives among them), four times the day's work (~₽1,500 for 4.5 h
// of agents' work, ~₽800 in tips and purses besides). Now: ~₽900 and ~₽1,500 in balls and
// Berries a day ("often"), a fine gift every other day or so.
// Now and then a fine gift besides (RARE_GIFT: 5%, and 5% more for each star in its team): a
// Golden Razz most often, a Rare Candy, a Max Revive, now and then an Azure Flute.
export const RARE_GIFT = 0.05;
const RARE_GIFTS = [["golden-razz-berry", 40], ["rare-candy", 25], ["max-revive", 20], ["azure-flute", 15]];
export function trainerPay(tr, rnd = Math.random) {
  const c = classOf(tr.cls);
  const mega = tr.team.some((m) => m.mega != null), legend = tr.team.some((m) => m.legend), alpha = tr.team.some((m) => m.alpha);
  const money = Math.round(c.pay * 0.2 * (tr.team.length >= 3 ? 1.2 : 1) * (mega ? 1.3 : 1) * (legend ? 1.6 : 1) * (alpha ? 1.3 : 1));
  const stars = (mega ? 1 : 0) + (legend ? 1 : 0) + (alpha ? 1 : 0);
  let fine = null;
  if (rnd() < RARE_GIFT * (1 + stars)) {
    let r = rnd() * RARE_GIFTS.reduce((a, [, w]) => a + w, 0);
    fine = RARE_GIFTS.find(([, w]) => (r -= w) < 0)?.[0] ?? RARE_GIFTS[0][0];
  }
  return { money, items: [[c.item[0], c.item[1]], ...(mega ? [["great-ball", 1]] : []), ...(legend ? [["ultra-ball", 1]] : []), ...(alpha ? [["razz-berry", 1]] : []), ...(fine ? [[fine, 1]] : [])], ...(fine ? { fine } : {}) };
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
// Each win pays (towerPay), each floor once a day (a climb again the same day pays only above
// the day's highest: no farming the first floors); every 7th a gift. No healing by itself in a
// climb, and TOWER_HEALS items a floor (Berries, Revives; a new floor, again). Simulated with the
// game's own battles (Sitrus; a 7-strong team with legendaries / 3 of them): 2 a climb ~8 / ~4.4
// floors; 1 a floor ~9 / ~5.6; 2 a floor ~11 / ~9.3; unlimited ~13 / ~13, up to 41. A day's
// climb pays ~₽600 and its small gifts, a couple of hours of agents' work.
export const TOWER_LIVES = 3;
export const TOWER_HEALS = 1; // a floor
// One of yours swapped for another in a climb (brought out of the Box, or a new kind chosen): it
// comes in with its agent's health as it stands, less this (the Box held fresh ones by the
// hundred). Switching between those on the strip is free: simulated (Speed first, its trainers
// from 0.95), ~8 floors played straight, ~11 switching every exchange to the best-typed.
export const TOWER_SWITCH = 0.1;
export const TOWER_HEAL_IDS = ["berry", "sitrus-berry", "revive", "max-revive"];
// A trainer's battle (the Rival's too), once fought: TRAINER_HEALS healing items in all, as many as
// the Rival's Potions (spammed from the right-click menu, a Berry each blow, yours never fell).
export const TRAINER_HEALS = 2; // (RIVAL_POTIONS)
export const TOWER_NEXT_MS = 6000; // the next one in, after a win
// Its trainers' Pokémon, raised: 0.95 on the first floor, +0.01 a floor, 1.3 at most. (Since the
// faster moves first, 1.1 from the start made a climb ~4.7 floors, 7-strong, ~3 for 3 of them;
// 0.95: ~7.2 and ~5.4.)
export const towerEffort = (wins) => Math.min(1.3, 0.95 + 0.01 * wins);
export const towerOdds = (wins) => ({
  legend: Math.min(0.5, 0.05 + 0.025 * wins),
  mega: Math.min(0.6, 0.15 + 0.03 * wins),
  alpha: Math.min(0.5, 0.05 + 0.025 * wins),
});
// The `n`th trainer of a climb (1, 2…): `wins` before it = n - 1.
// What a trainer's Pokémon holds, as the games' Battle Tower and rivals give theirs (abilities.js
// BATTLE_ITEMS): one for its stronger side most often (a Choice Band or Life Orb on one that hits
// physically), else one of the rest.
const GEAR_PHYSICAL = ["choice-band", "life-orb", "muscle-band", "expert-belt"];
const GEAR_SPECIAL = ["choice-specs", "life-orb", "wise-glasses", "expert-belt", "assault-vest"];
const GEAR_ANY = ["focus-sash", "leftovers", "choice-scarf", "quick-claw", "scope-lens", "rocky-helmet", "weakness-policy", "air-balloon", "shell-bell"];
export function gearFor(dex, rnd = Math.random) {
  const own = isPhysicalKey(fighterKey(dex, {})) ? GEAR_PHYSICAL : GEAR_SPECIAL;
  const pool = rnd() < 0.6 ? own : GEAR_ANY;
  return pool[Math.floor(rnd() * pool.length)];
}
// Each holds a different one (the games' Item Clause).
export function withGear(team, rnd = Math.random) {
  const used = new Set();
  return team.map((m) => { let g = gearFor(m.dex, rnd); for (let n = 0; n < 6 && used.has(g); n++) g = gearFor(m.dex, rnd); used.add(g); return { ...m, held: g }; });
}
export function towerTrainer(rnd, now, n, how = {}) {
  const tr = newTrainer(rnd, now, { ...how, size: 3, odds: towerOdds(n - 1), force: undefined });
  return { ...tr, team: withGear(tr.team, rnd), tower: n, effort: towerEffort(n - 1) };
}
// The `n`th win: { money, items: [[id, count]] }.
// Every floor a small gift too (balls, Berries, in turn; better ones from floor 8), and every 7th
// a bigger one besides.
const FLOOR_GIFTS = [["poke-ball", 3], ["berry", 2], ["great-ball", 2], ["razz-berry", 2], ["pinap-berry", 2], ["ultra-ball", 1]];
const HIGH_GIFTS = [["great-ball", 3], ["sitrus-berry", 1], ["ultra-ball", 2], ["razz-berry", 3], ["silver-pinap-berry", 1], ["ultra-ball", 3]];
export function towerPay(n) {
  const money = Math.min(300, 40 + 10 * n);
  const k = n % 7 === 0 ? n / 7 : 0;
  const big = k === 1 ? [["rare-candy", 1]]
    : k === 2 ? [["max-revive", 1], ["golden-razz-berry", 1]]
    : k === 3 ? [["master-ball", 1]]
    : k === 4 ? [["ability-patch", 1]]
    : k > 4 ? [["golden-razz-berry", 2]] : [];
  const small = (n >= 8 ? HIGH_GIFTS : FLOOR_GIFTS)[(n - 1) % 6];
  return { money, items: [small, ...big] };
}
// The `n`th win today, with `paid` ({ day, floor }: the day's highest floor paid): its pay, or
// none (paid already today), and `paid` after it.
export function towerWin(n, paid, day) {
  const upTo = paid?.day === day ? paid.floor : 0;
  return n > upTo ? { pay: towerPay(n), paid: { day, floor: n } } : { pay: { money: 0, items: [], again: true }, paid: { day, floor: upTo } };
}
// The climb now: `run` (null: not climbing) { at, wins, faints, out: [panes], nextAt }, and the
// best run yet. Kept in shared state (pokemon-herd-tower).
export function loadTower(raw) {
  const best = Number.isInteger(raw?.best) && raw.best > 0 ? raw.best : 0;
  const r = raw?.run;
  const run = r && Number.isFinite(r.at) ? {
    at: r.at, wins: Number.isInteger(r.wins) && r.wins > 0 ? r.wins : 0, faints: Number.isInteger(r.faints) && r.faints > 0 ? r.faints : 0,
    out: Array.isArray(r.out) ? r.out.filter((x) => typeof x === "string") : [], nextAt: Number.isFinite(r.nextAt) ? r.nextAt : 0,
    heals: Number.isInteger(r.heals) && r.heals > 0 ? r.heals : 0,
    ...(Number.isInteger(r.lives) && r.lives > 0 ? { lives: Math.min(TOWER_LIVES, r.lives) } : {}),
  } : null;
  const paid = typeof raw?.paid?.day === "string" && Number.isInteger(raw.paid.floor) ? { day: raw.paid.day, floor: raw.paid.floor } : null;
  return { v: 1, best, run, ...(paid ? { paid } : {}) };
}

// ---- the Rival ---------------------------------------------------------------------------------
// One trainer of your own, as the games' rival: it comes back about once a week (RIVAL_EVERY days),
// its team growing each time (`meets`: times it came): its starter's line (the one strong against
// your most-worked Pokémon, as the games' rival picks the starter that beats yours) at its middle
// stage the first time, fully evolved after, Mega Evolved from the 4th; two fully evolved others
// picked against the Pokémon on your strip, anew each visit (rivalPicks); raised far more than a
// trainer, a little more each time (rivalEffort). Three of yours down and it wins (RIVAL_LIVES);
// swapping one of yours in while the one before is still up costs a free hit (the games': it
// takes your turn), and it has RIVAL_POTIONS Potions (+½, one in the red, once each, its turn).
// Simulated against an 8-strong strip played well (the best-typed in, switched out below ⅓, so
// few faint): you win ~88% the first time, ~68% the fourth, ~45% the seventh (with the games'
// moves, 228 more; before them, ~90/75/52 at +0.03 a visit). (Without the switch's
// cost, the Potions and this effort, ~100% every time; an Alpha from the 5th made it drop from
// ~50% to ~13%: none.) Its record against you is kept; it pays more than a trainer, an Ability
// Patch the first time you beat it.
export const RIVAL = { id: "rival", title: "Rival", names: ["Blaze"], types: null, pay: 0, item: ["rare-candy", 1],
  colors: { H: "#c8402a", C: "#c8402a", T: "#2a2a2a", A: "#2a2a2a", P: "#3a3a5a", B: "#c8402a" } };
export const RIVAL_EVERY = [4, 7]; // days between visits
export const RIVAL_FIRST_MS = 2 * 3600000; // the first, two hours after the mod first sees it
export const RIVAL_RETRY_MS = 6 * 3600000; // ignored (it waited and left): again a few hours on
export const RIVAL_LIVES = 3;
export const rivalEffort = (meets) => Math.min(1.9, 1.55 + 0.025 * meets); // (+0.025 a visit: with held items from its third, ~86% your win the first time, ~44% the seventh; yours holding items too, ~55%)
export const RIVAL_GEAR_FROM = 2; // (meets before: its third visit)
export const RIVAL_POTIONS = 2, RIVAL_POTION_AT = 0.3, RIVAL_POTION = 0.5;
// The starters, by type, a line each region (their first stage).
export const STARTERS = {
  grass: [1, 152, 252, 387, 495, 650, 722, 810, 906],
  fire: [4, 155, 255, 390, 498, 653, 725, 813, 909],
  water: [7, 158, 258, 393, 501, 656, 728, 816, 912],
};
const BEATS = { grass: ["water", "ground", "rock"], fire: ["grass", "ice", "bug", "steel"], water: ["fire", "ground", "rock"] };
// Its starter (a first stage), against your most-worked Pokémon (`yourDex`): the type that beats its.
export function rivalStarter(yourDex, rnd = Math.random) {
  const yours = yourDex ? typesOf(yourDex) : [];
  const kind = Object.keys(BEATS).find((k) => yours.some((t) => BEATS[k].includes(t))) ?? Object.keys(STARTERS)[Math.floor(rnd() * 3)];
  const list = STARTERS[kind].filter((d) => WALKABLE.includes(d));
  return list[Math.floor(rnd() * list.length)];
}
const stageOf = (first, n) => { let d = first; for (let i = 0; i < n; i++) { const next = evolutionsOf(d)[0]; if (!next) break; d = next; } return d; };
// Its two others, against yours (`yours`: the dex numbers on your strip): each fully evolved kind
// scored by how hard its types hit yours (their best effect on each) less half how hard yours hit
// it; two of the best RIVAL_POOL, picked anew each visit. None given: any two.
export const RIVAL_POOL = 12;
export function rivalPicks(yours, rnd = Math.random, not = []) {
  if (!yours?.length) { const out = []; while (out.length < 2) { const d = FINALS[Math.floor(rnd() * FINALS.length)]; if (!not.includes(d) && !out.includes(d)) out.push(d); } return out; }
  const hits = (from, to) => Math.max(...typesOf(from).map((t) => effectOn(t, to)));
  const scored = FINALS.filter((d) => !not.includes(d)).map((d) => [d, yours.reduce((a, y) => a + hits(d, y) - 0.5 * hits(y, d), 0)]).sort((a, b) => b[1] - a[1]).slice(0, RIVAL_POOL);
  const out = [];
  while (out.length < 2 && scored.length) out.push(scored.splice(Math.floor(rnd() * scored.length), 1)[0][0]);
  return out;
}
// Its team now: { cls: "rival", title, name, team, at, effort, rival: true, meets }. `how.yours`:
// the dex numbers on your strip (its two others picked against them).
export function rivalTrainer(rnd, now, r, how = {}) {
  const nature = () => NATURE_IDS[Math.floor(rnd() * NATURE_IDS.length)];
  const lead = stageOf(r.starter, r.meets === 0 ? 1 : 2);
  const others = rivalPicks(how.yours, rnd, [lead]);
  const team = [...others.map((dex) => ({ dex, nature: nature() })), { dex: lead, nature: nature() }]; // its starter last, as the games'
  if (r.meets >= 3 && how.megaOf?.(lead) != null) team[2] = { ...team[2], mega: how.megaOf(lead) };
  // Its team holds items from its third visit, as a rival's grows (abilities.js BATTLE_ITEMS).
  return { cls: "rival", title: RIVAL.title, name: r.name, team: r.meets >= RIVAL_GEAR_FROM ? withGear(team, rnd) : team, at: now, effort: rivalEffort(r.meets), rival: true, meets: r.meets };
}
// Beating it: ₽600, ₽100 more each time it came (₽1,500 at most), a Rare Candy; the first win an
// Ability Patch, after that an Ability Capsule one time in three.
export function rivalPay(r, rnd = Math.random) {
  const money = Math.min(1500, 600 + 100 * r.meets);
  const extra = r.wins === 0 ? [["ability-patch", 1]] : rnd() < 1 / 3 ? [["ability-capsule", 1]] : [];
  return { money, items: [["rare-candy", 1], ...extra], ...(extra.length ? { fine: extra[0][0] } : {}) };
}
// Its state, shared: { v: 1, name, starter (its first stage) | null, meets, wins (yours), losses, nextAt }.
export function loadRival(raw, now = 0) {
  const ok = raw?.v === 1;
  const n = (k) => (ok && Number.isInteger(raw[k]) && raw[k] >= 0 ? raw[k] : 0);
  return { v: 1, name: ok && typeof raw.name === "string" && raw.name ? raw.name : RIVAL.names[0], starter: ok && Number.isInteger(raw.starter) ? raw.starter : null,
    meets: n("meets"), wins: n("wins"), losses: n("losses"), nextAt: ok && Number.isFinite(raw.nextAt) ? raw.nextAt : now + RIVAL_FIRST_MS };
}
export const rivalNext = (now, rnd = Math.random) => now + (RIVAL_EVERY[0] + rnd() * (RIVAL_EVERY[1] - RIVAL_EVERY[0])) * 86400000;
// What it says: as it arrives (by your record), beaten, and winning.
export function rivalGreet(r, rnd = Math.random) {
  if (r.meets === 0) return "Hey! You're the one with the Pokémon herd? Let's see what they've got!";
  const lines = r.losses > r.wins ? ["Back for another beating?", "You haven't gotten any better, have you?"]
    : r.wins > r.losses ? ["I've been training. This time it's different!", "I won't lose again. Not today!"]
    : ["We're even. Let's settle it!", "Ready? I've been waiting for this!"];
  return lines[Math.floor(rnd() * lines.length)];
}
export const RIVAL_BEATEN = ["Tch… I'll get stronger. Just watch!", "Not bad… but next time is mine!", "You got lucky. That's all!"];
export const RIVAL_WON = ["Ha! Told you I'd win!", "Too easy. Train harder!", "Come back when you're ready!"];

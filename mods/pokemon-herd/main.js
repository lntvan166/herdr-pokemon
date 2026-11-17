// pokemon-herd: every agent is a pixel-art Pokémon roaming a strip (or several rows of one).
// Working ones walk around, idle ones stroll and nap, blocked ones stop and call for you; they
// react when their agent changes or you focus it. Click one to go to its agent; right-click to
// choose which Pokémon it is.
import { View, div, image } from "gpui-kit";
import { h_flex, v_flex, InputState, Input, v_virtual_list, Scrollbar } from "gpui-base";
import { agents, spaces, theme, settings, run, props, shared, setShared, openOverlay, closeOverlay, nextCommand, layout, playSound, terminals, setAgentOrder, readTextFile, appHome } from "herdr";
import { placesIn, placeOf, placeBlock, rowsOf, blockProps, hiddenAlong, setRows, setBlockProps, partyPlace, placeParty, swapAgents, unswapAgents, agentsSwapped, hasAgentsList, usesMod, toastMod, setToast, usesPokemonSidebar, toPokemonSidebar, fromPokemonSidebar, SIDEBAR_MOD } from "./place.js";
import { nightness, palette, features, isLight, treeParts, overHead, seasonAt, snowAt, weatherOf, rainAt, lightning, sunAt, rainbowArcs, rainbowFade, RAINBOW_MS } from "./scene.js";
import { statusChange, record, loadStats, summary, duration, statLine } from "./stats.js";

const stats = () => loadStats(shared(STATS_KEY));
import { isNewer, shouldAutoUpdate } from "./update.js";
import { fold, hasShiny, dexNo, megaForm, megaForms, setMegas, fullName, nameOf, searchEntries, REGIONS, regionOf, chainOf, formsOf, coatOf, hasForm } from "./dex.js";
import { EVOLVES_FROM } from "./species.js";
import { MOD, LEGACY_KEY, VERSION, REPO, STATS_KEY, BAG_KEY, SETTINGS_KEY, FOLDERS_KEY, SINCE_KEY, FAVORITES_KEY } from "./id.js";
const HP_KEY = `${MOD}-hp`; // yours hurt: { pane: { hp, at, rest? } } (trainer.js healthNow), shared so a Berry fed anywhere heals it
const SPAR_KEY = `${MOD}-spar-records`; // each pair's sparring record (spar.js withResult)
const GUIDE_KEY = `${MOD}-guide-seen`; // Settings opened once: it opens on the Guide that time
const COPIES = new Map(); // every strip copy ticking, for leaderOf (the module is shared by copies)
import { loadFavorites, toggleFavorite, isFavorite, favoriteEntries } from "./favorites.js";
import { loadSettings, withSetting, VISIT_EVERY } from "./settings.js";
import { updateNow, sidebarState, patchSidebar } from "./selfupdate.js";
import { loadPicks, assign, randomEntry, gainJob, EVOLVE_JOBS, evolveJobs, CANDY_JOBS, MAX_HEARTS, withHearts, itemUse, useItem, HEAL, needsText, evolveNeeds, takeHeld, HELD_IDS, familyOf, youngOf, subAgents, cardOf, withFriend, friendOf, FRIEND, FRIEND_MAX, fromFolders, leaderOf, boxList, raised, rivalsOf, agentOfToast, switchedPick, trimPanes, fromBox, boxOnSwitch, rollShiny, nameFor, cleanNick, sessionUsed, sayingOf, TIRED_AT, heartsText, holdersOf, visitorPick, expShareTarget, canPurify, purified, PURIFY_HEARTS, PURIFY_PAY } from "./picks.js";
import { ITEMS, STONES, loadBag, addItem, mark, PRICE, money, sell, sellPrice, visitorGift, maxBuy, grouped, groupOf, jobPay, backPay, addMoney, buy, loadBoosts, withBoost, BOOST_MS, pickup, pickupDelay, CANDY_JOB_MS, shinyOdds, badges, CHARM_JOBS, CHARM_ART, itemAbout, takersOf, badgeGifts, badgeProgress, nextBadge, MAX_ITEM } from "./items.js";
import { forEachSafe, logOnce } from "./safe.js";
import { layoutTags } from "./tags.js";
import { releasePay, releasable, SORTS, sortBox, duplicates } from "./box.js";
import { pickMove, movesetOf, learnableOf, chosenOf, MAX_MOVES, MOVES, powerOf } from "./moves.js";
import { RAID_REST, RAID_WORK, MAX_EGGS, EGG_MS, eggsOn, outbreakOfDay, outbreakAt, outbreakPick, outbreakPace, newRaid, loadRaid, raidPhase, laysEgg, raidHit, cooldownLeft, raidReward, bossPick, BOSS_SIZE, COUNTER_MS, BOSS_PUSH } from "./events.js";
import { restSpot, roomAt, campSeats } from "./rest.js";
import { typeOf, TYPE_ICON, TYPES, TYPE_COLOR, typeText, typeLabel } from "./types.js";
import { effortOf, healthNow, baitFor, AUTO_BAIT, withEvolved, hitWild, hitBack, typesOf, bestType, bestEffect, fighterKey, isFormKey, RED, OWN_REST, ALPHA_SIZE, dayOf, LEGENDARY, BALLS, BAIT, LEGEND_THROWS, purse, PURSE_CHANCE, TIP, allowance, isLegendary, isLocked, wildPick, throwBall, ballFor, catchChance, natureOf, natureMul, caughtPick, loadDex, withSeen, withCaught, shinyUnlocked, dueGoals, nextGoal, goalText, dexByRegion, DEX_TOTAL, DEX_GOALS, trainerEntries, trainerKeys, openEntries, loadDaily, progress, taskText, taskPay, payText, recapText, BONUS, NATURES } from "./trainer.js";
import { wrapRow, exitX, entryX, wrapOk, clearWalk } from "./wrap.js";
import { sparTurns, withResult, recordOf, NOTE_TEXT, STATUS_COLOR } from "./spar.js";
import { duel } from "./react.js";
import { reactionAnim, focusEdge, onFocus, onStatus, onSeason, onFidget, onCelebrate, battle, battleSpots, reactIcon, sparPair, teasePair, attackPair, teaseSpot, onPoke, TEASE_GAP, shaken, dropTarget, onDizzy, SPAR_GAP, onCombo, COMBO_GAP, onStir, sleepAfter, effectiveMood, pose, megaShown } from "./react.js";
import { blowWord, EVOLVE_MS, EVOLVE_BURST, EVOLVE_WHITE, EVOLVE_SWAPS, evolveShape, MEGA_MS, MEGA_BURST, HATCH_SHAKE, HATCH_MS, RAINBOW, MEGA_STYLE, GOLD_STYLE, residueOf, RESIDUE_FROM, RESIDUE_MS, RESIDUE_FADE, VOLLEY, ARC_PEAK, dashAt, HITSTOP, MEGA_SHORT, megaTiming, megaParts, megaTimes, fightGap, specialParts, specialTimes, stopOf, stopOfMove, physicalParts, physicalTimes, signatureParts, signatureTimes, MISS_WORD, MISS_KNOCK, slashParts, speedLines, CHARGE_MS, travelOf, chargeParts, damageText, launchSound, hitSound, moveStyle, shotParts, power, burstParts, knockOf, effectWord, wildSpot, KNOCK_OUT, KNOCK_BACK, SHAKE_MS, THROW_UP, THROW_DOWN, INTO_BALL, SHAKE_FROM, SHAKE_EVERY, WOBBLE, wobbling, throwEnd, MOVE } from "./fx.js";
import { rollGender, genderMark, femaleSprite, GENDER_COLOR } from "./gender.js";
import { weatherNow, boosts, WEATHER_HIT, WEATHER_SHARE, weatherText, rollSize, sizeClass, drawSize, withRecord, sizeText, knockMul, recordSize } from "./weather.js";
import { ensureMegaMark, MEGA_MARK_REL } from "./sprites.js";
import { cachedIcons, ensureRing, RING_REL, loadSprite, ensureIcon, iconPath, ensureArt, artPath, ensureCry, ensureQuietCry, ensureWhite, whitePath, imageMagick, savedMegas, refreshMegas, latestVersion } from "./sprites.js";

const SLOT = 128; // width of one Pokémon's box (sprite, bubble)
const AMBIENT_MS = 1000; // snow, leaves, a rainbow: redrawn once a second (each redraw is the whole window)
const APPEAR_MS = 3500; // "A wild … appeared!" in the corner it walks in from, this long
const REST_GAP = 60; // a resting Pokémon keeps this far from the others on its row: room for a name
const WRAP_CHANCE = 0.3; // with rows: how often a walk goes off the edge onto the next row
const OFF = 40; // how far past the edge it walks before it turns up on the next row
const EDGE = 28; // how close to the strip's edges a Pokémon walks (its tag has its own layer)
const LABEL_H = 18; // name tag under the feet
const TAG_LINES = 2; // lines kept under each row for names: fixed, so the ground lines never move
const FEET = 24; // ground line, px above the strip's bottom
const SPEED = { working: 70, idle: 32 }; // px per second
const SEASON_CHANCE = 0.3;
const MOVED_KEY = `${MOD}-sidebar-moved`; // when cards in the sidebar were moved onto Pokémon Sidebar, once
const CARDS_KEY = `${MOD}-cards-default`; // when a new player's agents were first put as cards
const SHIPPED = ["main", "terminals", "win98"];
// Whether Pokémon Sidebar (this repo's mods/pokemon-sidebar) is installed next to this mod.
const sidebarModHere = () => readTextFile(`${appHome()}/mods/${SIDEBAR_MOD}/mod.json`).then((raw) => raw !== null, () => false); // Herdr's built-in layouts: a mod can't change them
const BOOSTS_KEY = `${MOD}-boosts`; // Shop boosts on now: { <item id>: until }
const FESTIVAL_KEY = `${MOD}-festival`; // when a Festival Ticket was last used
const FESTIVAL_MS = 6000; // its fireworks
const BOOST_GAP = 30000; // with X Attack: how soon one may spar again
const DEX_KEY = `${MOD}-dex`; // the Pokédex (trainer.js loadDex)
const DAILY_KEY = `${MOD}-daily`; // the day's Research (trainer.js loadDaily)
const AUTO_KEY = `${MOD}-auto-update`; // { tried: version, at }: the version last updated to by itself
const UPDATED_KEY = `${MOD}-updated`; // { from, to, at }: just updated by itself (the strip says so)
const BALL_KEY = `${MOD}-ball`; // the ball chosen to throw (Bag, or right-click a visitor); none: Auto
const RAID_KEY = `${MOD}-raid`; // the raid on now (events.js), the same in every window
const OUTBREAK_KEY = `${MOD}-outbreak`; // an outbreak called on top of the day's: { dex, from, until }
const BAIT_KEY = `${MOD}-bait`; // the Berry fed before each ball (Bag), while there are some
const LEGEND_KEY = `${MOD}-legend`; // when the Research last called a legendary Pokémon over
const HONEY_KEY = `${MOD}-honey`; // when Honey was last used (the strip calls a visitor over)
const VISIT_SPEED = 45; // px per second
// A legendary takes its time (half as fast): longer to go after it with its 20 balls.
const walkSpeed = (pick) => (pick?.legend ? VISIT_SPEED / 2 : VISIT_SPEED);
const SPAR_CHANCE = 1 / 240;
const TEASE_CHANCE = 1 / 480; // per tick: about every 2 minutes while one is asleep near an idle one
const FIDGET_CHANCE = 0.15; // idle, about to stroll: how often it fidgets instead (nods, sits, twirls…)
const COMBO_CHANCE = 1 / 480; // per tick: about every 2 minutes while an agent and its sub-agent both work
const CAMP_GAP = 46; // px between seats round the campfire // per tick (4 a second): about once a minute while a pair is ready // idle, about to stroll: how often it reacts to the season instead
// props.rows (> 1): agents take turns across that many rows; each roams its whole row, passing
// the others, and the block grows to fit the rows.

// ---- who is which Pokémon -------------------------------------------------------

const slotOf = (a) => a.pane || a.address;
// Every entry the picker can list (species and their forms), for fetching icons in the background.
const ALL_ENTRIES = searchEntries("", Infinity).entries;
const entryKey = (e) => `${e.dex}${e.form ? `-${e.form}` : ""}`;
// (A Mega is keyed by the X or Y really shown, so a Mega Y drawn later replaces the X stand-in.)
// Drawn with its own female sprite (gender.js): a female of one of the 59, in its usual form.
const asFemale = (pick, mega = false) => !mega && !pick.form && pick.gender === "f" && femaleSprite(pick.dex, pick.shiny);
const spriteKey = (pick, mega = false) => `${pick.dex}${pick.form ? `f${pick.form}` : ""}${mega ? `m${megaForm(pick.dex, pick.megaKind)?.kind ?? ""}` : ""}${asFemale(pick, mega) ? "g" : ""}${pick.shiny ? "s" : ""}`;

// Saved picks, live: the picker (another copy of this mod) writes them too.
const savedPicks = () => loadPicks(shared(MOD), null).panes;

function savePicks(update) {
  // The newest 300 panes are kept; what a forgotten one's Pokémon held goes back into the Bag.
  // Saved panes go last (the most recent), so the ones forgotten first are the longest untouched;
  // panes on screen and those being saved now are never forgotten.
  const next = { ...savedPicks() };
  for (const k of Object.keys(update)) delete next[k];
  Object.assign(next, update);
  let onScreen = [];
  try { onScreen = agents().map((a) => a.pane).filter(Boolean); } catch {}
  const { panes, returned } = trimPanes(next, 300, new Set([...onScreen, ...Object.keys(update)]));
  setShared(MOD, { v: 2, panes });
  if (returned.length) {
    let b = bag();
    for (const id of returned) b = addItem(b, id);
    saveBag(b);
  }
}

// Each agent's folder now (its program's working folder, else where its terminal started).
function foldersNow() {
  try {
    return Object.fromEntries(terminals().filter((x) => x?.address).map((x) => [x.address, x.foreground?.cwd ?? x.cwd]).filter(([, c]) => typeof c === "string"));
  } catch {
    return {};
  }
}

// What each agent says it's doing now (its status message), by address.
function sayingsNow() {
  try {
    return Object.fromEntries(terminals().filter((x) => x?.address).map((x) => [x.address, sayingOf(x)]).filter(([, m]) => m));
  } catch {
    return {};
  }
}

// What the badges read from the Pokémon on screen now: the most hearts, and how close the
// closest one is to evolving (0..1).
function liveForBadges(saved = savedPicks()) {
  const picks = agents().map((a) => a.pane && saved[a.pane]).filter(Boolean);
  return {
    best: Math.max(0, ...picks.map((p) => p.hearts ?? 0)),
    evolve: Math.max(0, ...picks.map((p) => cardOf(p).progress ?? 0)),
  };
}

// The favourite Pokémon (the picker's ★), shared by every pane.
const favs = () => loadFavorites(shared(FAVORITES_KEY));
const setFavs = (keys) => setShared(FAVORITES_KEY, { v: 1, keys });

// Every agent on the strip: herdr's agents, and (Settings: Sub-agents) the sub-agents it leaves out.
function herdAgents() {
  const list = agents();
  if (!settingsNow().family) return list;
  let terms = [];
  try { terms = terminals(); } catch {}
  return [...list, ...subAgents(list, terms)];
}

// Takes panes out of the saved picks (a Pokémon that moved to a new pane of its folder).
function forgetPanes(keys) {
  if (!keys.length) return;
  const next = { ...savedPicks() };
  for (const k of keys) delete next[k];
  setShared(MOD, { v: 2, panes: next });
}

const paneless = {}; // sub-agents' picks: not saved, only kept while the app runs
// Who is which Pokémon. Only the counting strip (`write`, its leader: see electLeader) saves what
// this decides (a folder's Pokémon given back, who each folder has); everyone else (dialogs,
// other strips) reads the same answer without writing.
const assignAll = (list, { write = false } = {}) => {
  const keys = Object.keys(paneless);
  for (let i = 0; i < keys.length - 200; i++) delete paneless[keys[i]]; // forget the oldest
  let terms = [];
  try { terms = terminals(); } catch {}
  // A new agent in a folder that had a Pokémon before gets it back (fromFolders).
  const raw = shared(FOLDERS_KEY);
  const folders = raw?.v === 1 && raw.folders && typeof raw.folders === "object" ? raw.folders : {};
  const cwdOf = Object.fromEntries(terms.filter((t) => t?.address && typeof t.cwd === "string").map((t) => [t.address, t.cwd]));
  const saved = savedPicks(); // read once (it was twice: ~25 KB parsed and checked each time)
  const back = fromFolders(list, saved, folders, cwdOf);
  let panesNow = saved;
  if (Object.keys(back.inherit).length) {
    if (write) { savePicks(back.inherit); forgetPanes(back.forget); }
    panesNow = { ...panesNow, ...back.inherit };
  }
  if (write && JSON.stringify(back.folders) !== JSON.stringify(folders)) {
    const keys = Object.keys(back.folders);
    for (let i = 0; i < keys.length - 300; i++) delete back.folders[keys[i]]; // forget the oldest folders
    setShared(FOLDERS_KEY, { v: 1, folders: back.folders });
  }
  // Settings → New agents: Favorites: a new agent's Pokémon is one of the favourites.
  // Trainer mode: what you caught (and the starters); otherwise any species but the legendaries
  // not caught yet (unless Settings opened them).
  const st = settingsNow();
  const d = pokedex();
  const open = (e) => !isLocked(e.dex, d, st.legendsOpen);
  const pool = st.trainer ? trainerEntries(d)
    : st.newFrom === "favorites" ? favoriteEntries(favs()).filter(open)
    : st.legendsOpen ? null : openEntries(d);
  const r = assign(list, write ? savedPicks() : panesNow, paneless, charmOdds(), pool);
  // Sub-agents (Settings: on): their agent's Pokémon, younger. `family`: child -> parent address.
  r.family = {};
  if (settingsNow().family) {
    r.family = familyOf(list, terms);
    for (const [child, parent] of Object.entries(r.family)) if (r.ids[parent]) r.ids[child] = youngOf(r.ids[parent]);
  }
  return r;
};

// The Bag (items.js), shared by every pane and window.
const bag = () => loadBag(shared(BAG_KEY));
const saveBag = (b) => setShared(BAG_KEY, b);
const isNight = (d = new Date()) => nightness(d.getHours() + d.getMinutes() / 60) >= 0.5;
const seasonNow = () => { const s = seasonAt(new Date()); return s.t < 0.5 ? s.a : s.b; };
// Shiny Charm: the odds for new agents' Pokémon, from all jobs done (looked up once a minute).
let odds = { v: 64, at: 0 };
function charmOdds() {
  if (Date.now() - odds.at > 60000) odds = { v: shinyOdds(summary(stats(), 0).jobs), at: Date.now() };
  return odds.v;
}
// Bring out: the boxed Pokémon `boxSlot` goes to `pane` (the picker's In the Box, the Bag's Box
// tab). The one there goes to the Box if raised (the same species too); its Everstone stays with
// the pane, and what it holds too unless the boxed one holds something (then it goes back into
// the Bag). `mega`: the Mega setting to give it (the picker's), else its own. False if it's gone.
function bringOut(boxSlot, pane, mega) {
  const saved = savedPicks();
  const b = saved[boxSlot];
  if (!b || boxSlot === pane) return false;
  const cur = saved[pane];
  if (cur?.held && b.held) saveBag(addItem(bag(), cur.held));
  const next = { ...b, ...(mega ? { mega } : {}), ...(b.held || !cur?.held ? {} : { held: cur.held }), ...(cur?.stay ? { stay: true } : {}) };
  const away = cur ? boxOnSwitch(cur, b, Date.now(), { same: true }) : null;
  savePicks({ ...(away ? { [away.key]: away.pick } : {}), [pane]: next });
  forgetPanes([boxSlot]);
  return true;
}

// One pane's saved Pokémon, changed by f (null: leave it). Returns the new one.
function updatePick(slot, f) {
  const cur = slot && savedPicks()[slot];
  const next = cur && f(cur);
  if (!next) return null;
  savePicks({ [slot]: next });
  if ((next.hearts ?? 0) >= MAX_HEARTS && !bag().marks.fullHearts) saveBag(mark(bag(), { fullHearts: true }));
  return next;
}
// dev.js (git-ignored): commands for trying things on this machine; absent elsewhere.
let dev = null;
import("./dev.js").then((m) => { dev = m; }, () => {});
const devApi = { bag: () => bag(), saveBag: (b) => saveBag(b), addItem, shared, setShared, HONEY_KEY, LEGEND_KEY, openBag: (t, sel) => openBag(t, sel), herdAgents: () => herdAgents(), picks: () => savedPicks() };

// The Pokédex and the day's Research (trainer.js), shared by every window.
const pokedex = () => loadDex(shared(DEX_KEY));
const saveDex = (d) => setShared(DEX_KEY, d);
// The types of the Pokémon on screen (the Research's type task names one of them).
function typesOnScreen() {
  try {
    const saved = savedPicks();
    return [...new Set(agents().map((a) => a.pane && saved[a.pane]).filter(Boolean).map((p) => typeOf(p.dex)))];
  } catch { return []; }
}
const dailyNow = (now = Date.now()) => loadDaily(shared(DAILY_KEY), now, { wild: settingsNow().visitors !== "off", types: typesOnScreen() });
// What a task, a Pokédex goal or the bonus pays: Pokédollars or items, into the Bag.
function payOut(p) {
  let b = bag();
  if (p.money) b = addMoney(b, p.money);
  if (p.item) b = addItem(b, p.item, p.count ?? 1);
  saveBag(b);
}
// Something the Research counts happened (`ev`: job, type, work, quick, pet, catch, gift, berry,
// spar; `dex`: whose). Pays each task as it is done; all three call a legendary over. Returns
// what was finished, for a note on the strip.
function research(ev, n = 1, dex = null) {
  const r = progress(dailyNow(), ev, n, dex);
  setShared(DAILY_KEY, r.daily);
  for (const t of r.done) payOut(taskPay(t));
  if (r.bonus) { payOut(BONUS); setShared(LEGEND_KEY, Date.now()); }
  return r;
}
// Pokédollars from clicking about (a visitor's purse, "purse"; a pat or a spar, "tip"), within the
// day's cap (trainer.js DAY_CAP). Returns how much it paid.
function earn(kind, amount) {
  const d = dailyNow();
  const got = allowance(d, kind, amount);
  if (!got) return 0;
  saveBag(addMoney(bag(), got));
  setShared(DAILY_KEY, progress(d, kind, got).daily);
  return got;
}
// The Pokédex's goals reached: paid, once each.
function payDexGoals() {
  const d = pokedex();
  const due = dueGoals(d);
  if (!due.length) return;
  for (const g of due) payOut(g);
  saveDex({ ...d, goals: [...d.goals, ...due.map((g) => g.n)] });
}
// A health bar (0..1) centred on x: green, amber, then red (blinking: one more hit may be the last).
// ---- battle effects (fx.js works them out; these draw them) ----
// One part of an effect, centred at (cx, cy) plus its offset.
const fxPart = (p, cx = 0, cy = 0) => div().absolute().left(cx + p.x - p.w / 2).top(cy + p.y - p.h / 2).w(p.w).h(p.h)
  .when(!!p.round, (el) => el.rounded_full())
  .when(!!p.ring, (el) => el.border_2().border_color(p.color))
  .when(!p.ring, (el) => el.bg(p.color))
  .opacity(p.opacity ?? 1)
  .when(!!p.flicker, (el) => el.loop("opacity", { from: (p.opacity ?? 1) * 0.55, to: p.opacity ?? 1, period: Math.max(100, p.flicker) })); // GPUI: at least 100 ms
// A dash (fx.js dashAt) with what draws its streaks: the move's look, and when it set off.
const lungeOf = (d, move, at) => d && { ...d, style: moveStyle(move?.type, move?.blue), type: move?.type, at };
// A move flying from (x0, y) to (x1, y), under one transition: drawn where it sets off the first
// time (`first`), at the far end after that.
const fxShot = (id, style, x0, x1, y, ms, first) => div().id(id).absolute().top(y).left(first ? x0 : x1).w(1).h(1)
  .transition("left", { duration: Math.max(1, ms), easing: "linear" })
  .children(shotParts(style, x1 >= x0 ? 1 : -1).map((p) => fxPart(p)));
// One leg of a thrown rock's arc, (xa, ya) to (xb, yb): up easing out, down easing in.
const fxArcLeg = (id, style, xa, ya, xb, yb, ms, first, ease) => div().id(id).absolute().left(first ? xa : xb).top(first ? ya : yb).w(1).h(1)
  .transition("left", { duration: Math.max(1, ms), easing: "linear" }).transition("top", { duration: Math.max(1, ms), easing: ease })
  .children(shotParts(style, xb >= xa ? 1 : -1, 1.15).map((p) => fxPart(p)));
// Where a blow lands, at (x, y): a flash and a ring swelling and fading, sparks flying out.
// Drawn small the first time (`first`), then swollen, faded, flown, under transitions.
function fxBurst(id, style, p, x, y, first, seed) {
  const b = burstParts(style, p, seed);
  const grow = (part, key, opacity, ms) => {
    const d = first ? part.from : part.to;
    return div().id(`${id}-${key}`).absolute().left(x - d / 2).top(y - d / 2).w(d).h(d).rounded_full()
      .when(key === "ring", (el) => el.border_2().border_color(part.color)).when(key !== "ring", (el) => el.bg(part.color))
      .opacity(first ? opacity : 0)
      .transition("left", { duration: ms, easing: "ease-out" }).transition("top", { duration: ms, easing: "ease-out" })
      .transition("width", { duration: ms, easing: "ease-out" }).transition("height", { duration: ms, easing: "ease-out" })
      .transition("opacity", { duration: ms, easing: "ease-in" });
  };
  return div().absolute().left(0).top(0)
    .child(grow(b.ring, "ring", 0.8, 360))
    .child(grow(b.flash, "flash", 0.95, 220))
    .children(b.sparks.map((sp, k) => div().id(`${id}-s${k}`).absolute()
      .left(x + (first ? 0 : sp.dx) - (sp.w ?? sp.size) / 2).top(y + (first ? 0 : sp.dy) - (sp.h ?? sp.size) / 2).w(sp.w ?? sp.size).h(sp.h ?? sp.size)
      .when(sp.round, (el) => el.rounded_full()).bg(sp.color).opacity(first ? 1 : 0)
      .transition("left", { duration: 380, easing: "ease-out" }).transition("top", { duration: 380, easing: "ease-out" })
      .transition("opacity", { duration: 420, easing: "ease-in" })));
}
// The word the games say ("Super effective!"), popping up over (x, top) and fading.
const fxWord = (id, [text, color], x, top, phase) => div().id(id).absolute().left(x - 70).w(140).top(phase === 0 ? top + 8 : top)
  .opacity(phase === 1 ? 1 : 0)
  .transition("top", { duration: 160, easing: "ease-out" }).transition("opacity", { duration: phase === 2 ? 260 : 120 })
  .flex().justify_center()
  .child(div().px(6).h(16).rounded(5).bg("#000000b8").flex().items_center().text_size(11).font_bold().text_color(color).child(text));
// A move gathering power at (x, y): sparks drawn in from round it, a glow swelling (first: drawn
// out round it, faint; after: in at the mouth).
const fxCharge = (id, style, x, y, first) => {
  const ms = CHARGE_MS - 40;
  const tr = (el, ease = "ease-in") => el.transition("left", { duration: ms, easing: ease }).transition("top", { duration: ms, easing: ease })
    .transition("width", { duration: ms, easing: ease }).transition("height", { duration: ms, easing: ease }).transition("opacity", { duration: 200 });
  const orb = (key, d0, d1, color, op0, op1) => {
    const d = first ? d0 : d1;
    return tr(div().id(`${id}-${key}`).absolute().left(x - d / 2).top(y - d / 2).w(d).h(d).rounded_full().bg(color).opacity(first ? op0 : op1));
  };
  return div().absolute().left(0).top(0)
    .children(chargeParts(style, 5).map((p, k) => tr(div().id(`${id}-${k}`).absolute()
      .left(x + (first ? p.dx : 0) - p.size / 2).top(y + (first ? p.dy : 0) - p.size / 2).w(p.size).h(p.size).rounded_full().bg(p.color).opacity(first ? 0.25 : 1))))
    .child(orb("glow", 4, 24, style.glow, 0.15, 0.45))
    .child(orb("core", 2, 10, style.hot, 0.4, 1));
};
// A beam from x0 to x1 at height y (ice, steel, electric, fairy): a rail drawn out to the target
// over `ms` (phase 0: not yet, 1: out, 2: fading thin), a bright head racing along it.
function fxBeam(id, style, x0, x1, y, ms, phase) {
  const len = Math.abs(x1 - x0), back = x1 < x0;
  const w = phase === 0 ? 0 : len;
  const left = back ? (phase === 0 ? x0 : x1) : x0;
  const layer = (key, h, color, op) => {
    const hh = phase === 2 ? Math.max(1, h * 0.3) : h;
    return div().id(`${id}-${key}`).absolute().left(left).top(y - hh / 2).w(w).h(hh).rounded(hh / 2).bg(color).opacity(phase === 2 ? 0 : op)
      .transition("width", { duration: ms, easing: "ease-out" }).transition("left", { duration: ms, easing: "ease-out" })
      .transition("height", { duration: 260 }).transition("top", { duration: 260 }).transition("opacity", { duration: 260 });
  };
  const hx = phase === 0 ? x0 : x1;
  return div().absolute().left(0).top(0)
    .child(layer("glow", 16, style.glow, 0.3))
    .child(layer("core", 6, style.core, 0.9))
    .child(layer("hot", 2, style.hot, 1))
    .child(div().id(`${id}-head`).absolute().left(hx - 7).top(y - 7).size(14).rounded_full().bg(style.hot).opacity(phase === 2 ? 0 : 0.95)
      .transition("left", { duration: ms, easing: "ease-out" }).transition("opacity", { duration: 200 }));
}
// The damage a blow did ("-23%"), floating up from (x, top) and fading.
const fxNumber = (id, [text, color], x, top, first) => div().id(id).absolute().left(x - 30).w(60).top(first ? top : top - 22)
  .opacity(first ? 1 : 0).flex().justify_center()
  .transition("top", { duration: 900, easing: "ease-out" }).transition("opacity", { duration: 450, delay: 450 })
  .child(div().px(4).h(15).rounded(4).bg("#00000080").flex().items_center().text_size(11.5).font_bold().text_color(color).child(text));
// What a move leaves on its target (fx.js RESIDUE), over its body (cx; headY to ground), `t` ms
// in: flames flickering, sparks crackling, frost, rising bubbles, dots circling its head, drips,
// leaves, dust, sparkles; faded out at the end.
function fxResidue(id, kind, style, cx, headY, ground, t, first) {
  const mid = (headY + ground) / 2, fading = t >= RESIDUE_MS - RESIDUE_FADE;
  const dot = (k, x, y, w, h, color, round = true) => div().id(`${id}-${k}`).absolute().left(x - w / 2).top(y - h / 2).w(w).h(h).bg(color).when(round, (el) => el.rounded_full());
  const flick = (el, p) => el.loop("opacity", { from: 0.25, to: 1, period: Math.max(100, p) });
  const bob = (el, y, dy, p) => el.loop("top", { from: y, to: y + dy, period: Math.max(100, p) });
  const parts = {
    burn: () => [[-10, 4, 230], [9, -6, 270], [0, -14, 310]].map(([dx, dy, p], k) => bob(flick(dot(k, cx + dx, mid + dy, 5, 8, k % 2 ? style.mid : style.core), p), mid + dy - 4, -4, p * 2)),
    shock: () => [[-14, -10], [13, -4], [-11, 8], [12, 10]].map(([dx, dy], k) => flick(dot(k, cx + dx, mid + dy, 8, 2, style.mid, false), 110 + k * 20)),
    freeze: () => [dot("ice", cx, mid, 34, Math.max(12, ground - headY - 6), "#bfefff").rounded(7).opacity(0.32),
      ...[[-9, -8], [10, 2], [-3, 10]].map(([dx, dy], k) => flick(dot(k, cx + dx, mid + dy, 3, 3, "#ffffff", false), 300 + k * 90))],
    poison: () => [[-10, 0, 520], [6, 4, 640], [12, -6, 580], [-4, -10, 700]].map(([dx, dy, p], k) => bob(dot(k, cx + dx, mid + dy, 4, 4, k % 2 ? style.mid : style.core).opacity(0.85), mid + dy, -12, p)),
    dizzy: () => [[0, 600, 300], [1, 700, 350], [2, 800, 400]].map(([k, pl, pt]) =>
      dot(k, cx, headY - 2, 4, 4, k === 1 ? style.hot : style.mid).loop("left", { from: cx - 14, to: cx + 10, period: pl }).loop("top", { from: headY - 8, to: headY + 2, period: pt })),
    drip: () => [[-8, 420], [4, 520], [11, 470]].map(([dx, p], k) => bob(dot(k, cx + dx, mid, 3, 4, style.mid).opacity(0.9), mid, ground - mid - 4, p)),
    leaf: () => [[-12, 700], [3, 820], [12, 760]].map(([dx, p], k) => bob(dot(k, cx + dx, headY + 4, 6, 3, k % 2 ? style.core : style.mid, false).loop("left", { from: cx + dx - 3, to: cx + dx + 3, period: p / 2 }), headY + 4, ground - headY - 10, p)),
    dust: () => [[-14, 0], [0, 2], [14, 0]].map(([dx, dy], k) => {
      const d = first ? 4 : 16;
      return dot(k, cx + dx, ground - 4 + dy, d, d * 0.7, "#b8ad9a").opacity(first ? 0.7 : 0)
        .transition("width", { duration: 700, easing: "ease-out" }).transition("height", { duration: 700, easing: "ease-out" })
        .transition("left", { duration: 700, easing: "ease-out" }).transition("top", { duration: 700, easing: "ease-out" }).transition("opacity", { duration: 800 });
    }),
    sparkle: () => [[-12, -8], [11, -2], [-6, 9], [8, 12]].map(([dx, dy], k) => flick(dot(k, cx + dx, mid + dy, 3, 3, k % 2 ? style.hot : style.mid, false), 260 + k * 70)),
  }[kind];
  return div().id(id).absolute().left(0).top(0).opacity(fading ? 0 : 1).transition("opacity", { duration: RESIDUE_FADE })
    .children(parts ? parts() : []);
}
// A one-shot part: drawn as `a` the first time, then moving to `b` under transitions (ms).
const fxOnce = (id, first, a, b, ms, extra = (el) => el) => {
  const s = first ? a : b;
  return extra(div().id(id).absolute().left(s.x - s.w / 2).top(s.y - s.h / 2).w(s.w).h(s.h).opacity(s.o ?? 1)
    .transition("left", { duration: ms, easing: "ease-out" }).transition("top", { duration: ms, easing: "ease-out" })
    .transition("width", { duration: ms, easing: "ease-out" }).transition("height", { duration: ms, easing: "ease-out" })
    .transition("opacity", { duration: ms, easing: "ease-in" }));
};
// One part of a signature move (fx.js signatureParts): drawn as `a` the first time, then
// moving to `b` over its ms.
const fxSig = (id, p, first) => {
  const s = first ? p.a : p.b, ease = p.ease ?? "ease-out";
  return div().id(id).absolute().left(s.x - s.w / 2).top(s.y - s.h / 2).w(s.w).h(s.h).opacity(s.o ?? 1)
    .when(!!p.round, (el) => el.rounded_full())
    .when(!!p.ring, (el) => el.border_2().border_color(p.color))
    .when(!p.ring, (el) => el.bg(p.color))
    .transition("left", { duration: p.ms, easing: ease }).transition("top", { duration: p.ms, easing: ease })
    .transition("width", { duration: p.ms, easing: ease }).transition("height", { duration: p.ms, easing: ease })
    .transition("opacity", { duration: p.ms, easing: "ease-in" });
};
// Evolving (`t` ms in): a column of light over it, motes rising, rings swelling out; the burst
// comes at EVOLVE_BURST (fxBurst, drawn by the caller) and "Evolved!".
function fxEvolve(id, cx, headY, ground, t, firstRing) {
  const top = Math.max(0, headY - 34), h = ground - top;
  const glowing = t < EVOLVE_BURST;
  const col = (k, w, color, p) => div().id(`${id}-col${k}`).absolute().left(cx - w / 2).top(top).w(w).h(h).rounded(w / 2).bg(color)
    .opacity(glowing ? 0.85 : 0).transition("opacity", { duration: 400 }).when(glowing, (el) => el.loop("opacity", { from: 0.3, to: 0.85, period: p }));
  const motes = [[-14, 700], [-6, 900], [5, 800], [13, 1000], [-10, 1100], [10, 650]].map(([dx, p], k) =>
    div().id(`${id}-m${k}`).absolute().left(cx + dx - 1.5).top(ground - 6).size(3).rounded_full().bg(k % 2 ? "#fff2a8" : "#ffffff")
      .opacity(glowing ? 1 : 0).transition("opacity", { duration: 300 }).when(glowing, (el) => el.loop("top", { from: ground - 6, to: top, period: p })));
  const ring = (k, first) => fxOnce(`${id}-r${k}`, first, { x: cx, y: (headY + ground) / 2, w: 10, h: 8, o: 0.9 }, { x: cx, y: (headY + ground) / 2, w: 90, h: 60, o: 0 }, 900,
    (el) => el.rounded_full().border_2().border_color("#ffe9a8"));
  return div().absolute().left(0).top(0)
    .child(col(0, 22, "#ffe9a855", 500)).child(col(1, 10, "#fff6c8", 380)).child(col(2, 4, "#ffffff", 300))
    .children(motes)
    .when(t < 1000, (el) => el.child(ring(0, firstRing)));
}
// A gentle style for a plain strike (no type): white and gold.
const STRIKE = { glow: "#fff6c8", core: "#ffd23a", mid: "#fff2a8", hot: "#ffffff", look: "star" };
const GOLD = { glow: "#ffe9a8", core: "#ffd75e", mid: "#fff2c0", hot: "#ffffff", look: "star" };
const FX_GAP = 84; // how far apart yours and a wild one battle

// `lost`: { id, prev, first } just after a hit: what it lost shows white, draining away.
const healthBar = (x, top, hp, lost = null) => div().absolute().left(x - 18).top(Math.max(1, top)).w(36).h(5).rounded(2).bg("#00000066").overflow_hidden()
  .when(hp <= RED, (el) => el.loop("opacity", { from: 0.35, to: 1, period: 600 }))
  .when(!!lost, (el) => el.child(div().id(lost.id).absolute().left(0).top(0).h_full().w(Math.round(36 * (lost.first ? lost.prev : hp))).bg("#ffffff").opacity(0.85)
    .transition("width", { duration: 450, delay: 250, easing: "ease-in" })))
  .child(div().absolute().left(0).top(0).h_full().w(Math.max(1, Math.round(36 * hp))).bg(hp > 0.5 ? "#46c46a" : hp > RED ? "#e8b062" : "#e5484d"));
// Yours after a wild one hit back: its health (0..1), coming back over OWN_REST.
// Its health kept for the Bag (a Berry heals it): fully healed ones dropped.
const keepHp = (pane, rec) => {
  if (!pane) return;
  const now = Date.now();
  const all = Object.fromEntries(Object.entries(shared(HP_KEY) ?? {}).filter(([, r]) => r && (now < (r.rest ?? 0) || healthNow(r, now) < 1)));
  setShared(HP_KEY, { ...all, [pane]: rec });
};
const hpOf = (slot) => healthNow(shared(HP_KEY)?.[slot], Date.now());
// A Berry eaten: `amount` more health (the strip it's on picks it up: care).
const healBy = (slot, amount) => { const hp = hpOf(slot); if (amount && hp != null && hp < 1) keepHp(slot, { hp: Math.min(1, hp + amount), at: Date.now() }); };
const ownHp = (m, now) => (Number.isFinite(m?.hp) ? Math.min(1, m.hp + (now - (m.hpAt ?? now)) / OWN_REST) : 1);
// An Alpha: a red glow behind it (breathing), and a red α by its head.
const ALPHA_RED = "#e5484d";
// The ring's picture (sprites.js ensureRing), made once at start.
const RING = { ready: false };
const MEGA_MARK = { ready: false }; // the Mega symbol's picture (sprites.js ensureMegaMark)
ensureMegaMark().then(() => { MEGA_MARK.ready = true; }, () => {});
ensureRing().then(() => { RING.ready = true; }, () => {});
// `shadow`: a Shadow Pokémon's (some Alphas): its motes dark violet, a dark aura flickering behind it.
// `still`: one of yours, on the strip all day: its ring only, not breathing, no motes (the moving
// glow is for a wild one or a raid boss, there a moment).
const alphaGlow = (mid, ground, box, scale, shadow = false, still = false) => {
  // A red ring on the ground under its feet (wider than its shadow), breathing; and a few red
  // motes rising beside it. No box round it.
  const w = Math.max(26, box.w * scale * 1.15), h = Math.max(9, 11 * scale);
  // Red motes drifting up round it, each on its own beat: [x across its width, how high it
  // starts (of its height), how far it rises (px), period ms, size px].
  const motes = [[-0.5, 0.15, 22, 1900, 3], [0.45, 0.3, 26, 2300, 2], [-0.25, 0.45, 18, 1700, 2],
    [0.3, 0.1, 24, 2100, 3], [0.05, 0.6, 16, 2600, 2], [-0.4, 0.7, 14, 1500, 2]];
  return div().absolute().left(0).top(0)
    .child((RING.ready ? image(RING_REL) : div().rounded_full().border_2().border_color("#ff4a4a").bg("#ff5a5a44"))
      .absolute().left(mid - w / 2).top(ground - h / 2 - 1).w(w).h(h).when(!still, (el) => el.loop("opacity", { from: 0.45, to: 1, period: 1400 })).when(still, (el) => el.opacity(0.75)))
    .children((still ? [] : motes).map(([dx, dy, rise, period, size], k) => {
      const y = ground - dy * box.h * scale;
      return div().absolute().left(mid + dx * box.w * scale).top(y).size(size).rounded_full()
        .bg(shadow ? (k % 2 ? "#3a1a5a" : "#9a5aff") : k % 3 === 2 ? "#ffb070" : "#ff4a4a")
        .loop("top", { from: y, to: y - rise, period, easing: "linear" })
        .loop("opacity", { from: 0, to: 0.95, period: period / 2 });
    }))
    // Shadow: dark violet flames standing behind it, slowly.
    .when(shadow, (el) => el.children([[-0.32, 0.9, 1700], [0, 1.05, 2100], [0.3, 0.85, 1900]].map(([dx, hh, period]) => {
      const fw = Math.max(8, box.w * scale * 0.34), fh = box.h * scale * hh;
      return div().absolute().left(mid + dx * box.w * scale - fw / 2).top(ground - fh).w(fw).h(fh).rounded(fw / 2).bg("#5a2a8a")
        .when(!still, (el) => el.loop("opacity", { from: 0.12, to: 0.4, period })).when(still, (el) => el.opacity(0.25));
    })));
};
// A "Sure?" asked by a first click takes a second one at least ARM_MS later: a double click on the
// same spot isn't a yes.
const ARM_MS = 400;
// The rare ones among Pokémon about to be released, for the "Sure?": ", incl. 2 ✨ 1 α 1 ✦".
const rareIn = (xs) => {
  const n = (f) => xs.filter((x) => f(x.pick)).length;
  const parts = [[n((p) => p.shiny), "✨"], [n((p) => p.alpha), "α"], [n((p) => isLegendary(p.dex)), "✦"]].filter(([k]) => k).map(([k, m]) => `${k} ${m}`);
  return parts.length ? `, incl. ${parts.join(" ")}` : "";
};
// What was just released or sold, for its Undo (UNDO_MS): { at, text, picks?: { slot: pick },
// items: { id: n } (back into the Pokémon, or the Bag), money (taken back) }.
const UNDO_MS = 10000;
// Selling `n` of `id`, kept for its Undo (`view.undo`). Returns whether it sold.
function sellSome(view, id, n) {
  const before = bag();
  const next = sell(before, id, n);
  if (!next) return false;
  saveBag(next);
  const k = (before.items[id] ?? 0) - (next.items[id] ?? 0);
  view.undo = { at: Date.now(), text: `Sold ${k} ${ITEMS[id].name}${k === 1 ? "" : "s"} for ${money(next.money - before.money)}`, items: { [id]: -k }, money: next.money - before.money };
  return true;
}
// Undoes view.undo: the Pokémon back in the Box (each with what it held, if the Bag still has
// it), the items back, the money given back. Not once the money's been spent.
function undoLast(view) {
  const u = view.undo;
  if (!u || Date.now() - u.at > UNDO_MS) return;
  let b = bag();
  if ((b.money ?? 0) < u.money) return;
  b = addMoney(b, -u.money);
  for (const [id, n] of Object.entries(u.items ?? {})) b = addItem(b, id, -n);
  const picks = {};
  for (const [slot, p] of Object.entries(u.picks ?? {})) {
    if (p.held && !((b.items[p.held] ?? 0) > 0)) { const { held: _h, ...rest } = p; picks[slot] = rest; continue; }
    if (p.held) b = addItem(b, p.held, -1);
    picks[slot] = p;
  }
  saveBag(b);
  if (Object.keys(picks).length) savePicks(picks);
  view.undo = null;
}
// Whether the Bag still has `n` of `id`, read at the click (not when the dialog was drawn:
// another window, or a hungry one's meal, may have used the last one since).
const hasItem = (id, n = 1) => (bag().items[id] ?? 0) >= n;
// A picker entry's types ({ dex, form }), as it fights: its form's (Rotom's Heat: Electric/Fire).
const entryTypes = (e) => typesOf(fighterKey(e.dex, e.form ? { form: e.form } : {}));
// Its types as badges in their colours (`h` px high, text `size`): the picker's grid and the Box.
const typeBadges = (e, h, size) => h_flex().gap(2).flex_none().children(entryTypes(e).map((ty) => div().h(h).px(h > 12 ? 5 : 3).rounded(h > 12 ? 4 : 3).flex().items_center()
  .bg(TYPE_COLOR[ty]).text_size(size).font_bold().text_color(typeText(ty)).child(typeLabel(ty))));
// What a boxed one looks like for its animations: its own form, shine and gender, no Mega.
const boxLook = (p) => ({ dex: p.dex, ...(p.form ? { form: p.form } : {}), shiny: !!p.shiny, ...(p.gender ? { gender: p.gender } : {}), mega: "off" });
// Its moves in a battle (react.js duel: one per turn; a raid strike's single one), and the one
// showing at `now` (from its gathering, CHARGE_MS before it flies, till just after it lands).
const shotsOf = (m) => m?.react?.shots ?? (m?.react?.shot ? [m.react.shot] : []);
const shotAt = (m, now, after = 300) => shotsOf(m).find((sh) => now >= sh.at - CHARGE_MS && now < sh.until + after) ?? null;
// "a Poké Ball", "an Ultra Ball".
const an = (name) => `${/^[AEIOU]/.test(name) ? "an" : "a"} ${name}`;
// The α in an Alpha's name tag (before its name).
// The shiny mark, in colour as the games draw it (Herdr's font draws ✨ in one colour, the text's).
const SHINY_GOLD = "#ffd23f";
// A line with ✨, ♂ or ♀ in it: each in its colour (✨ gold, ♂ blue, ♀ pink, as the games draw
// them), the rest as the text around it.
const MARK_COLOR = { "✨": SHINY_GOLD, "♂": "#6ab0ff", "♀": "#ff8ab8" };
const sparkled = (text) => (typeof text !== "string" || !/[✨♂♀]/.test(text) ? text
  : h_flex().min_w(0).items_center().children(text.split(/([✨♂♀])/).filter(Boolean).map((part) => MARK_COLOR[part] ? div().flex_none().text_color(MARK_COLOR[part]).child(part) : div().flex_none().child(part))));
const alphaTag = () => div().flex_none().h(12).px(3).rounded(3).flex().items_center().bg(ALPHA_RED).text_size(9).font_bold().text_color("#ffffff").child("α");
const alphaMark = (x, y) => div().absolute().left(x).top(Math.max(0, y)).h(14).px(3).rounded(4).flex().items_center()
  .bg(ALPHA_RED).text_size(10).font_bold().text_color("#ffffff").child("α");
const noteEvolved = () => { const b = bag(); saveBag(mark(b, { evolutions: b.marks.evolutions + 1 })); };
// Deerling and Sawsbuck wear this season's coat (sprites only; its name and pick stay as they are).
const dressed = (pick) => {
  const c = !pick.form && coatOf(pick.dex, seasonNow());
  return c ? { ...pick, form: c.form, shiny: pick.shiny && c.shiny } : pick;
};
const HEART = "#e5484d"; // a heart it has
// "<1m", "12m", "3h", "2d": how long ago, as the sidebar's own Agents list says it.
function ago(ms) {
  const m = Math.floor(ms / 60000);
  if (m < 1) return "<1m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
}
const PET_MS = 30 * 60000; // a click on a Pokémon adds a heart at most this often
const HUNGRY_MS = 5 * 60000; // waiting on you this long: it gets hungry (a heart down)
const QUICK_MS = 60000; // answered within this: a heart up
const petAt = {}; // pane -> when it last got a heart from a click or a quick answer
// The Settings dialog's choices, live (any window may change them).
// Read a dozen times a tick and as many a frame: parsed once per quarter second (every writer of
// it is this module, which drops the copy as it writes).
let settingsMemo = null;
const settingsNow = () => {
  const now = Date.now();
  if (!settingsMemo || now - settingsMemo.at >= 250) settingsMemo = { at: now, s: loadSettings(shared(SETTINGS_KEY)) };
  return settingsMemo.s;
};
const setSetting = (key, value) => { const s = withSetting(settingsNow(), key, value); settingsMemo = null; setShared(SETTINGS_KEY, s); };
const openSettings = (update, tab) => openOverlay({ mod: MOD, kind: "dialog", width: 520, height: 600, props: { settings: true, update, ...(tab ? { tab } : {}) } });
// A Pokémon's cry (downloaded and converted once); at most one every 2 s, so a burst of agents
// finishing together doesn't turn into a chorus.
let lastCry = 0;
// What makes a wild one rare, for the note in the corner: a legendary, an Alpha, a shiny; or null.
const rareOf = (pick) => isLegendary(pick.dex) ? { mark: "✦", what: "Legendary", color: "#f2c94c" }
  : pick.alpha ? { mark: "α", what: pick.shadow ? "Shadow Alpha" : "Alpha", color: pick.shadow ? "#c08aff" : "#ff8a80" }
  : pick.shiny ? { mark: "✨", what: "Shiny", color: "#ffffff" } : null;
// `quiet`: the soft one (a rare wild one walking in), not the one that calls you to an agent.
function cry(dex, quiet = false) {
  const now = Date.now();
  if (now - lastCry < 2000) return;
  lastCry = now;
  (quiet ? ensureQuietCry(dex) : ensureCry(dex)).then((path) => { if (path) playSound(path); }).catch(() => null);
}
// The Bag: a dialog of its own (menu, or keys.json "pokemon-herd.bag").
// Item art known to be on disk (ensureArt), shared by every view: the strip, the menu, dialogs.
const ART_READY = new Set();
const ART_ASKED = new Set();
// Every item's art, looked up (and fetched if missing) once; resolves when they're all known.
let artAll = null;
const EGG_ART = "pokemon/egg"; // a raid's egg
function readyArt() {
  artAll ??= Promise.all([...Object.values(ITEMS).map((x) => x.art), EGG_ART].map((a) => ensureArt(a).then(() => { ART_READY.add(a); ART_ASKED.add(a); }).catch(() => null)));
  return artAll;
}
// What the right-click menu offers from the Bag: the balls and catching Berries there are (and
// which are set), and Honey or the Azure Flute to call a visitor (only with visitors on).
function menuParts(b = bag()) {
  const balls = BALLS.filter((id) => b.items[id]);
  const baits = Object.keys(BAIT).filter((id) => b.items[id]);
  const chosen = shared(BALL_KEY), fed = shared(BAIT_KEY);
  const visitors = settingsNow().visitors !== "off";
  return {
    balls, baits,
    ball: balls.includes(chosen) ? chosen : null,
    bait: baits.includes(fed) ? fed : fed === null ? null : AUTO_BAIT, // unset: Auto
    calls: visitors ? ["honey", "azure-flute"].filter((id) => b.items[id]) : [],
  };
}
// How many Pokémon wait in the Box (the right-click menu's count).
const boxCount = () => { try { return boxList(savedPicks(), new Set(agents().map((a) => a.pane).filter(Boolean))).length; } catch { return 0; } };
// `sel`: the Box opened on that slot (its card showing).
const openBag = (tab, sel = null) => openOverlay({ mod: MOD, kind: "dialog", width: 600, height: 672, props: { bag: true, ...(typeof tab === "string" ? { tab } : {}), ...(sel ? { sel } : {}) } });

function tabsById() {
  const out = {};
  for (const s of spaces()) for (const t of s.tabs) out[t.id] = { ...t, space_name: s.name };
  return out;
}

function tagOf(a, tabs) {
  const t = tabs[a.tab];
  const tag = t?.named ? t.name : a.space_name || a.tab_name || a.address;
  return a.pane ? tag : `↳ ${tag}`; // a sub-agent: its parent's tag, marked
}

// What the Pokémon is doing: walks while working, strolls while idle, sleeps when idle long
// (`after`: sleepAfter, sooner at night).
function moodOf(a, tabs, now, after) {
  if (a.status === "blocked") return "blocked";
  if (a.status === "done") return "done";
  if (a.status === "working") return "working";
  // changed_at is null when nothing in the tab changed since the app started: idle all along.
  const changed = tabs[a.tab]?.changed_at;
  return changed == null || now - changed > after ? "sleep" : "idle";
}

const PICK_COLS = 6; // the picker's grid: columns, cell width and gap, row height
const PICK_W = 92;
const PICK_GAP = 6;
const PICK_ROW = 102;
const BOX_COLS = 6, BOX_ROW = 110; // the Box's grid: 84 px cells, 6 apart
const ICON_JOBS = 8; // icon downloads at once
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const zoom = () => (Number(settings()?.zoom) > 0 ? Number(settings().zoom) : 1);
// How big the Pokémon are drawn: props.scale (Settings → Strip → Size), small by default.
const DEFAULT_SCALE = 0.75;
const SIZES = [[0.5, "Tiny"], [0.75, "Small"], [1, "Medium"], [1.25, "Large"]];
const scaleIn = (p) => (Number.isFinite(Number(p?.scale)) && Number(p.scale) > 0 ? Number(p.scale) : DEFAULT_SCALE);
const scaleOf = () => scaleIn(props());
// One row's height at a scale: the sprites, the ground, and the lines for names.
const rowHeight = (scale) => Math.round(88 * scale) + FEET + (TAG_LINES - 1) * LABEL_H;

// ---- the view -------------------------------------------------------------------

export default class PokemonHerd extends View {
  init(_p, cx) {
    // A notification (the layout root's "toast" is this mod): props { title, body, level, icon, action }.
    this.toastView = !!props() && "title" in props() && !props().view;
    if (this.toastView) return this.initToast(cx);
    this.picker = !!props()?.picker;
    this.menu = !!props()?.menu;
    this.bagView = !!props()?.bag;
    this.settingsView = !!props()?.settings;
    this.partyView = props()?.view === "party";
    if (this.partyView) return this.initParty(cx);
    if (this.bagView) return this.initBag(cx);
    if (this.settingsView) return this.initSettings(cx);
    if (!this.menu) this.loadMegas(cx, !this.picker); // the strip refreshes them; the picker only reads
    if (this.picker) return this.initPicker(cx);
    if (this.menu) {
      // Its chips' item art: on disk already, but each menu is a view of its own; look them up
      // at once and draw them as soon as they're known (not the emoji, every time).
      cx.spawn(async (cx) => { await readyArt(); cx.notify(); });
      return;
    }
    // The picker's icons, every one not downloaded yet, fetched quietly here, one at a time: the
    // picker then finds them all on disk (fetching many there itself blanked its list).
    cx.spawn(async () => {
      const have = await cachedIcons();
      for (const e of ALL_ENTRIES) if (!have.has(entryKey(e))) await ensureIcon(e.dex, e.form).catch(() => null);
    });
    this.width = 900;
    this.sized = false; // Pokémon are placed only once the real width is known
    this.height = 112;
    // Switching over from the upstream mod: its agents keep their Pokémon.
    const start = loadPicks(shared(MOD), shared(LEGACY_KEY));
    if (start.migrated) setShared(MOD, { v: 2, panes: start.panes });
    this.mons = {}; // address -> { x, from, target, dir, moving, start, dur, pauseUntil, mood }
    this.sprites = {}; // dex number -> meta | "loading" | { error }
    this.hover = null;
    this.magick = null; // null: not checked yet
    cx.spawn(async (cx) => {
      this.magick = !!(await imageMagick());
      cx.notify();
    });
    this.errSeen = new Map(); // error message -> when it was last logged
    sidebarModHere().then((v) => { this.sidebarMod = v; });
    // The timer must never see a throw: one would stop every Pokémon for good.
    cx.timer.every(60000, (cx) => cx.notify()); // the sky follows the clock
    cx.timer.every(250, (cx) => {
      try {
        this.tick(cx);
      } catch (e) {
        logOnce(e, console.log, Date.now(), this.errSeen);
      }
    });
    // keys.json: "alt-shift-p": "pokemon-herd.pick" chooses the focused agent's Pokémon.
    cx.spawn(async () => {
      for (;;) {
        const c = await nextCommand();
        if (c === "bag") { openBag(); continue; }
        if (dev?.command?.(c, devApi)) continue; // dev.js, on this machine only
        if (c === "settings") { openSettings(this.update()); continue; }
        if (c === "about") { openSettings(this.update(), "about"); continue; } // Settings → About
        if (c !== "pick") continue;
        const list = herdAgents();
        const a = list.find((x) => x.focused) ?? list[0];
        if (a) this.openPicker(a, assignAll(list).ids[a.address], tagOf(a, tabsById()));
      }
    });
  }

  // Megas drawn since this release (SpriteCollab adds one every few weeks): the saved list at
  // once, then, from the strip, the tracker again when that list is a day old.
  loadMegas(cx, refresh) {
    cx.spawn(async (cx) => {
      try {
        const saved = await savedMegas();
        if (saved) { setMegas(saved.megas); cx.notify(); }
        if (!refresh) return;
        const fresh = await refreshMegas(saved);
        if (fresh) { setMegas(fresh); cx.notify(); }
        this.latest = await latestVersion(); // a newer release on GitHub: the strip offers it
        cx.notify();
      } catch (e) {
        logOnce(e, console.log, Date.now(), (this.errSeen ??= new Map()));
      }
    });
  }

  // One row's Scenery: a flat sky, stars and moon (night) or clouds (day), hills, then grass on
  // the ground line. It stops just under the grass: the names below keep the strip's colour.
  scenery(top, ground, row) {
    const now = new Date();
    const light = isLight(theme().chrome);
    const hour = now.getHours() + now.getMinutes() / 60;
    const bright = props()?.sky === "bright"; // Settings → Sky
    const p = palette(nightness(hour), light, seasonAt(now), bright ? "bright" : "muted");
    const weather = this.weather ?? "clear";
    const storm = weather === "storm";
    // Snow and leaves fall: the strip redraws once a second for them (tick: AMBIENT_MS) and each
    // flake slides there over that second. Rain stays still (it fell too fast to slide: it took a
    // redraw four times a second, the whole window each time, while an agent waited).
    this.snowing = p.snow > 0.05 || p.leaves > 0.05;
    const sec = Math.floor(now.getTime() / AMBIENT_MS) * AMBIENT_MS / 1000;
    const key = `v4|${Math.round(this.width)}|${ground}|${row}`; // bump when features() changes shape
    // Clouds and the moon fade over a Pokémon's head (its bubble stays readable): where heads were
    // on the last frame, which is a quarter second at most.
    const heads = this.heads?.[row] ?? [];
    const fade = (box) => (overHead(box, heads) ? 0.15 : 1);
    // Only this width's (a resize made a new entry for every width it passed, ~38 KB each, for good).
    if (this.sceneWidth !== Math.round(this.width)) { this.sceneWidth = Math.round(this.width); this.sceneCache = {}; }
    this.sceneCache ??= {};
    const f = (this.sceneCache[key] ??= features(Math.round(this.width), ground, row));
    const line = ground + 4; // the ground line, as the plain background draws it
    const box = div().absolute().left(0).top(top).w(this.width).h(line + 6).overflow_hidden().bg(p.sky);
    // Bright: the sky in four flat bands down to the horizon, and the sun on its arc by the clock.
    const bandH = Math.ceil(line / 4);
    const sun = bright && sunAt(hour);
    const sunX = sun ? Math.round(sun.x * (this.width - 16)) : 0;
    const sunY = sun ? Math.round(4 + sun.y * Math.max(1, line - 34)) : 0;
    return box
      .when(!!p.bands, (el) => el.children(p.bands.map((c, i) => div().absolute().left(0).top(i * bandH).w(this.width).h(bandH + 1).bg(c))))
      .when(!!sun && p.clouds > 0.05, (el) => el
        .child(div().absolute().left(sunX - 3).top(sunY - 3).size(20).rounded_full().bg("#fff6c8").opacity(0.35 * p.clouds * fade({ x: sunX, y: sunY, w: 14, h: 14 })))
        .child(div().absolute().left(sunX).top(sunY).size(14).rounded_full().bg("#ffe27a").opacity(p.clouds * fade({ x: sunX, y: sunY, w: 14, h: 14 }))))
      .when(p.stars > 0.05, (el) => el
        .children(f.stars.filter((s) => s.y < line - 20).map((s) => div().absolute().left(s.x).top(s.y).size(s.bright ? 2 : 1).bg(s.bright ? "#ffeebb" : "#cfd8ff").opacity(p.stars * p.starAlpha)))
        .child(div().absolute().left(f.moon.x).top(f.moon.y).size(10).rounded_full().bg("#e9e5c8").opacity(p.stars * 0.85 * fade({ x: f.moon.x, y: f.moon.y, w: 10, h: 10 }))))
      .when(p.clouds > 0.05, (el) => el.children(f.clouds.filter((c) => c.y + 10 < line - 24).map((c) => div()
        .absolute().left(c.x).top(c.y).w(c.w).h(12).opacity(p.clouds * p.cloudAlpha * fade({ x: c.x, y: c.y, w: c.w, h: 12 }))
        .child(div().absolute().left(0).top(4).w(c.w).h(8).rounded(4).bg("#ffffff"))
        .child(div().absolute().left(Math.round(c.w * 0.25)).top(0).w(Math.round(c.w * 0.45)).h(9).rounded(5).bg("#ffffff")))))
      // A rainbow after the rain, by day, its feet behind the hills.
      .when(!!this.rainbow && p.clouds > 0.05, (el) => {
        const strength = rainbowFade(now.getTime() - this.rainbow.at) * p.clouds * 0.8;
        const r = Math.round(Math.max(20, Math.min(line - 6, this.width * 0.12)));
        return el.children(rainbowArcs(Math.round(this.rainbow.x * this.width), line, r).map((a) => div()
          .absolute().left(a.x).top(a.y).size(a.size).rounded_full().border_2().border_color(a.color).opacity(strength)));
      })
      .children(f.hills.map((h) => div().absolute().left(Math.round(h.cx - h.rx)).top(line - h.ry).w(Math.round(2 * h.rx)).h(Math.round(2 * h.ry)).rounded_full().bg(p.hill)))
      .children(f.trees.flatMap((t) => treeParts(t, line - 3).map(([x, y, w, h, c, round]) => {
        const el = div().absolute().left(x).top(y).w(w).h(h).bg(p[c]);
        return round ? el.rounded_full() : el;
      })))
      .child(div().absolute().left(0).right(0).top(line - 3).h(7).bg(p.grass))
      .children(f.tufts.map((u) => div().absolute().left(u.x).top(line - 3 - u.h).w(1).h(u.h).bg(u.dark ? p.dark : p.grass)))
      .when(p.flowers > 0.05, (el) => el.children(f.flowers.map((w) => div()
        .absolute().left(w.x).top(line - 4).size(2).bg(w.pink ? "#f2a6c8" : "#f4e27a").opacity(p.flowers * (light ? 1 : 0.75)))))
      .child(div().absolute().left(0).right(0).top(line + 4).h(2).bg(p.dark))
      // Falling snow, or autumn leaves (every other flake, slower): each slides to where it is
      // next; back at the top, it is a new one.
      .when(this.snowing, (el) => el.children(snowAt(f.flakes, now.getTime() / 1000, line - 2).map((s, i) => [s, i])
        .filter(([, i]) => p.snow > 0.05 || i % 2 === 0)
        .map(([s, i]) => div()
        .id(`flake-${row}-${i}-${s.fall}`).absolute().left(s.x).top(s.y).size(2).rounded_full()
        .bg(p.snow >= p.leaves ? "#ffffff" : i % 4 ? "#d9822b" : "#b0461f")
        .opacity(p.snow >= p.leaves ? p.snow * (light ? 0.9 : 0.55) : p.leaves * (light ? 0.9 : 0.7))
        .transition("top", { duration: AMBIENT_MS, easing: "linear" })
        .transition("left", { duration: AMBIENT_MS, easing: "linear" }))))
      // Weather (agents waiting on you): the sky darkens, rain streaks it (still); a storm slants
      // it, and flashes once as it breaks (not every few seconds: it went on while you were away).
      .when(weather !== "clear", (el) => el
        .child(div().absolute().left(0).top(0).w(this.width).h(line + 6).bg("#0b1020").opacity(storm ? 0.32 : 0.18))
        .children(rainAt(f.drops, 0, line - 2, storm).map((d) => div()
          .absolute().left(d.x).top(d.y).w(1).h(storm ? 7 : 5).bg("#a9c3ff").opacity(light ? 0.6 : 0.4)))
        .when(storm && now.getTime() - (this.stormAt ?? 0) < 250, (e2) => e2.child(div().absolute().left(0).top(0).w(this.width).h(line + 6).bg("#ffffff").opacity(0.35))));
  }

  // The sprite set to draw: its Mega while megaShown and once loaded, else its usual one.
  // (A Mega set is marked megaShown, so the tick can tell when it changes.)
  spriteFor(pick, status) {
    pick = dressed(pick);
    if (megaShown(pick, status)) {
      const mega = this.sprites[spriteKey(pick, true)];
      if (mega?.walkR) { mega.megaShown = true; return mega; }
    }
    return this.sprites[spriteKey(pick)];
  }

  // The status its Mega follows: battling a wild one, it Mega Evolves as if working (unless its
  // Mega is Off), for the fight and a few seconds after.
  megaStatus(a) {
    return (this.mons[a.address]?.battleUntil ?? 0) > Date.now() ? "working" : a.status;
  }

  // Shiny, and really shown as one (not the normal sprite standing in for a shiny that failed).
  showsShiny(pick) {
    pick = dressed(pick);
    return pick.shiny && this.sprites[spriteKey(pick)]?.shiny !== false;
  }

  // Loads one Pokémon's sprites in the background; a failed one retries after a minute.
  // A shiny whose shiny sprite can't be had shows the normal one.
  want(pick, cx, mega = false) {
    pick = dressed(pick);
    const key = spriteKey(pick, mega);
    const form = mega ? megaForm(pick.dex, pick.megaKind)?.form : asFemale(pick) ? "female" : (pick.form ?? null); // its Mega (X or Y), its female sprite, or its regional form
    const cur = this.sprites[key];
    if (cur === "loading" || (cur && !cur.error)) return;
    // Failed: tried again after 1, 5, then 30 minutes (offline, it was every minute all day).
    if (cur?.error && Date.now() - cur.at < [60000, 300000, 1800000][Math.min(2, (cur.tries ?? 1) - 1)]) return;
    this.sprites[key] = "loading";
    cx.spawn(async (cx) => {
      try {
        // It shows as soon as it can walk; its reactions come in a moment later.
        const early = (meta) => { if (this.sprites[key] === "loading") { this.sprites[key] = meta; cx.notify(); } };
        this.sprites[key] = await loadSprite(pick.dex, pick.shiny, form, early).catch((e) => {
          if (form === "female") return loadSprite(pick.dex, pick.shiny, null, early); // no female sprite after all: its usual one
          if (!pick.shiny) throw e;
          return loadSprite(pick.dex, false, form, early);
        });
        // A Mega set: its white silhouettes made now, for the cocoon it Mega Evolves in (made the
        // moment it began, they came a second late: its colours showed through).
        const got = this.sprites[key];
        if (mega && got?.walkR) for (const c of [got.idleR, got.idleL, got.idleD, got.walkR, got.walkL, got.sleep]) if (c?.path) this.wantWhite(c.path);
      } catch (e) {
        this.sprites[key] = { error: String(e?.message ?? e), at: Date.now(), tries: (cur?.tries ?? 0) + 1 };
      }
      cx.notify();
    });
  }

  // The rows for n agents (props.rows > 1), or null for the classic single strip.
  grid(n) {
    const want = Math.floor(Number(props()?.rows));
    if (!(want >= 1)) return null; // no props.rows: the classic strip (as auto-docked at the bottom)
    const rows = Math.min(want, Math.max(1, n));
    return { rows, rowH: rowHeight(scaleOf()) };
  }

  // Moves the dragged Pokémon under the pointer, once it has moved a few px (else it's a click).
  dragTo(e, g, cx) {
    const d = this.drag;
    const m = d && this.mons[d.addr];
    if (!m) return;
    if (!d.moved && Math.hypot(e.position.x - d.start.x, e.position.y - d.start.y) < 5) return;
    d.moved = true;
    this.dropped = d.addr; // whichever comes first, the click that ends this drag is ignored
    const z = zoom();
    const x = clamp(e.local_position.x / z, EDGE, Math.max(EDGE, this.width - EDGE));
    // Shaking it about: each time the pointer turns back (after 6 px one way) counts.
    if (d.lastX === undefined) d.lastX = x;
    else if (Math.abs(x - d.lastX) >= 6) {
      const way = Math.sign(x - d.lastX);
      if (d.way && way !== d.way) (d.flips ??= []).push(Date.now());
      d.way = way;
      d.lastX = x;
    }
    m.x = m.target = m.from = x;
    clearWalk(m); // grabbed mid-walk (even mid-wrap): it's simply where you put it
    m.dur = 1;
    if (g) m.row = clamp(Math.floor(e.local_position.y / z / g.rowH), 0, g.rows - 1);
    cx.notify();
  }

  // Drops it: it stays where it was put for a while, and the click that ends a drag is ignored.
  dragEnd(cx) {
    const d = this.drag;
    this.drag = null;
    if (!d?.moved) return;
    const m = this.mons[d.addr];
    if (m) m.pauseUntil = Date.now() + 20000;
    // What it was dropped on (or how hard it was shaken) plays out on the next tick.
    this.dropAt = { addr: d.addr, dizzy: shaken(d.flips, Date.now()) };
    cx.notify();
  }

  // Its agent changed status: the work it did goes to its species' stats, and a finished job
  // to its pane's count towards evolving (sub-agents' Pokémon don't evolve).
  count(a, pick, m, next, now) {
    const c = statusChange(m.run, m.status, next, now);
    m.run = c.run;
    if (!this.leader) return; // another strip counts
    if (pick && (c.ms || c.job)) setShared(STATS_KEY, record(stats(), pick.dex, c));
    if (c.ms && a.pane) {
      const before = dailyNow().count.work ?? 0;
      research("work", c.ms / 60000);
      this.raidEgg(before, dailyNow().count.work ?? 0, now); // every 4 hours of work, an egg
    }
    if (!c.job) return;
    if (a.pane) research("job", 1, pick?.dex); // the day's Research: a job, and its Pokémon's type
    // Paid for the job, by how long it took (twice with an Amulet Coin): "+₽25" over its head.
    const pay = jobPay(c.task, savedPicks()[a.pane]?.held === "amulet-coin");
    saveBag(addMoney(bag(), pay));
    this.note(m, `+${money(pay)}`, now, 4000);
    const d = new Date(now);
    if (d.getHours() < 5 && !bag().marks.nightJob) saveBag(mark(bag(), { nightJob: true }));
    if (c.task >= CANDY_JOB_MS) { saveBag(addItem(bag(), "rare-candy")); this.note(m, "🍬", now, 5000, "rare-candy"); } // a long job: a Rare Candy
    let evolved = false;
    const evolve = settingsNow().evolve; // off: jobs are still counted, nothing evolves
    const sharing = savedPicks()[a.pane]?.held === "exp-share";
    updatePick(a.pane, (cur) => {
      const r = gainJob(evolve ? cur : { ...cur, stay: true }, a.pane, { night: isNight(d) }, now);
      evolved = r.evolved;
      const { stay: _s, ...p } = r.pick;
      return evolve || cur.stay ? r.pick : p;
    });
    if (evolved) noteEvolved(); // the strip flashes it from its evolvedAt
    // Exp. Share: the job counts for the Pokémon on screen furthest from evolving too.
    if (sharing && evolve) {
      const saved = savedPicks();
      const onScreen = Object.fromEntries(agents().filter((x) => x.pane && saved[x.pane]).map((x) => [x.pane, saved[x.pane]]));
      const to = expShareTarget(onScreen, a.pane);
      let shared2 = false;
      if (to) updatePick(to, (cur) => { const r = gainJob(cur, to, { night: isNight(d) }, now); shared2 = r.evolved; return r.pick; });
      if (shared2) noteEvolved();
    }
    if (this.giveBadgeGifts()) this.note(m, "🏅", now, 8000);
  }

  // A Bag from before Pokédollars (no "money" in it yet): paid once for the jobs done till then.
  backPayOnce() {
    const raw = shared(BAG_KEY);
    if (raw && typeof raw === "object" && "money" in raw) return;
    saveBag(addMoney(bag(), backPay(summary(stats(), 0))));
  }

  // A badge earned for the first time: an item to hold, in the Bag. Checked when a job finishes
  // and every half minute (a badge may come from the Bag: a stone, a Berry). True when one came.
  giveBadgeGifts() {
    const g = badgeGifts(summary(stats(), 0), bag().marks);
    if (!g.gifts.length) return false;
    let b = mark(bag(), { seen: g.seen });
    for (const id of g.gifts) b = addItem(b, id);
    saveBag(b);
    return true;
  }

  // Settings: Pokémon in the sidebar. Each agent's portrait (downloaded once) goes to shared
  // "agent-icons" { address: path }, and with its name, hearts and way to evolve to
  // "agent-cards" { address: { icon, name, shiny, hearts, maxHearts, progress, note } }:
  // Better Sidebar (patched) draws the card in place of the agent's row. Written only when it
  // changes; emptied when the setting is off.
  publishIcons(list, ids, cx) {
    const on = settingsNow().sidebar || usesPokemonSidebar(layout()); // Better Sidebar (patched), or Pokémon Sidebar
    this.portraits ??= {}; // entry key -> "loading" | "ready" | "failed"
    const icons = {};
    const cards = {};
    if (on) {
      for (const a of list) {
        const p = ids[a.address];
        if (!p) continue;
        const key = entryKey(p);
        if (this.portraits[key] === "ready") {
          icons[a.address] = iconPath(p.dex, p.form);
          const rivals = (this.rivals?.[a.address] ?? []).map((x) => list.find((b) => b.address === x)).filter(Boolean);
          const warn = rivals.length ? `⚔ same folder as ${rivals.map((b) => tagOf(b, tabsById())).join(", ")}` : "";
          if (a.pane) cards[a.address] = { icon: icons[a.address], name: `${nameFor(p)}${p.held ? ` ${ITEMS[p.held].icon}` : ""}`, shiny: !!p.shiny, ...cardOf(p), ...(warn ? { warn } : {}) };
          continue;
        }
        if (this.portraits[key]) continue;
        this.portraits[key] = "loading";
        cx.spawn(async () => {
          try { await ensureIcon(p.dex, p.form); this.portraits[key] = "ready"; } catch { this.portraits[key] = "failed"; }
        });
      }
    }
    const json = JSON.stringify([icons, cards]);
    if (json !== this.iconsJson) {
      this.iconsJson = json;
      setShared("agent-icons", icons);
      setShared("agent-cards", cards);
    }
  }

  // Visitors (Settings → Visitors): now and then a wild Pokémon nobody has walks across a row,
  // edge to edge, and is gone. Idle ones near it turn to watch it go by. Returns whether to redraw.
  visit(list, ids, g, now, cx) {
    const pace = VISIT_EVERY[settingsNow().visitors]; // [from, to] minutes; null: off
    if (!pace || !this.sized || this.width < 200) { this.visitor = null; return false; }
    // A Mass Outbreak (events.js): its species walks by every 2–3 minutes while it lasts.
    const outbreak = settingsNow().outbreaks ? outbreakAt(now, shared(OUTBREAK_KEY)) : null;
    const every = outbreak ? outbreakPace(pace) : pace;
    if (outbreak && this.outbreakFrom !== outbreak.from) { this.outbreakFrom = outbreak.from; this.visitAt = Math.min(this.visitAt ?? Infinity, now + 15000); }
    const next = () => now + rand(every[0], every[1]) * 60000;
    // The first within 5 minutes; a faster pace chosen since: the next one comes at that pace.
    if (this.visitAt === undefined || this.visitAt > now + every[1] * 60000) this.visitAt = Math.min(next(), now + rand(2, 5) * 60000);
    let v = this.visitor;
    // Honey (from the Bag): a visitor right away, or right after the one walking by now.
    const honey = shared(HONEY_KEY) ?? 0;
    const called = this.honeySeen !== undefined && honey > this.honeySeen; // used since we last looked (not before start)
    this.honeySeen = honey;
    if (called && v) this.honeyNext = true;
    else if (called) this.visitAt = now;
    if (called) this.coming ??= "honey"; // a pill says it's on its way (its sprite may take a while)
    // The day's Research all done: a legendary Pokémon comes next (once per call).
    const legend = shared(LEGEND_KEY) ?? 0;
    if (this.legendSeen !== undefined && legend > this.legendSeen) { this.legendNext = true; this.coming = "legend"; if (!v) this.visitAt = now; }
    this.legendSeen = legend;
    // A raid on: no other visitors meanwhile (its boss is the one to watch).
    const raidOn = ["egg", "battle"].includes(raidPhase(loadRaid(shared(RAID_KEY)), now));
    // Only the leader's strip has wild ones: one per window, each catchable, made one Azure Flute
    // or Honey a catch per window.
    if (!v && now >= this.visitAt && !raidOn && this.leader) {
      let pick = wildPick(new Set(Object.values(ids).map((p) => p.dex)), Math.random, { legend: !!this.legendNext, shinyOdds: charmOdds(), caught: new Set(pokedex().caught), boost: this.boostNow().types, share: WEATHER_SHARE });
      this.legendNext = false;
      if (outbreak) pick = outbreakPick(pick, outbreak);
      dev?.wild?.(pick, devApi); // dev.js: a wild one asked for
      // Its size and gender, once its species is settled (an outbreak's, one asked for).
      pick = { ...pick, ...(pick.size ? {} : { size: rollSize() }), ...(pick.gender !== undefined ? {} : ((g) => (g ? { gender: g } : {}))(rollGender(pick.dex))) }; // XXS..XXL (weather.js), ♂/♀ (gender.js)
      const seen = withSeen(pokedex(), [pick.dex]); // the Pokédex has seen it
      if (seen) saveDex(seen);
      const dir = (Math.random() < 0.5 ? "r" : "l");
      const [from, to] = dir === "r" ? [-OFF, this.width + OFF] : [this.width + OFF, -OFF];
      // `id`: its own, for every element drawn for it (a second visitor under the first one's ids
      // kept that one's picture: only its 🎁 showed).
      // Its purse, shown over its head while the day's purses last.
      v = this.visitor = { id: `${now}-${pick.dex}`, purse: allowance(dailyNow(now), "purse", purse(pick, Math.random, PURSE_CHANCE[settingsNow().visitors] ?? 1)), pick, dir, row: g ? Math.floor(Math.random() * g.rows) : 0, from, to, start: 0, dur: (Math.abs(to - from) / walkSpeed(pick)) * 1000, asked: now };
      this.want(pick, cx);
    }
    if (!v) return false;
    // Attacked by one of yours: it stands and takes the hit (its health drops halfway through),
    // then walks on from there; at 0 it faints, and is gone in a moment.
    if (v.fight) {
      const fx = v.fight;
      v.x = fx.x;
      if (now >= (fx.hitAt ?? fx.at + 500) && v.pick.hp !== fx.hp) { v.hpLost = { prev: Number.isFinite(v.pick.hp) ? v.pick.hp : 1, at: now }; v.pick.hp = fx.hp; }
      // It hits back: yours loses health (and faints at 0: it rests OWN_REST, 💫).
      const own = fx.back && this.mons[fx.own];
      if (own && !fx.backDone && now >= (fx.backHit ?? fx.at + 1500)) {
        fx.backDone = true;
        own.hpLost = { prev: ownHp(own, now), at: now };
        own.hp = fx.back.hp;
        own.hpAt = now;
        // (Hit, it flinches and is knocked back: its battle's steps and blows, set when it began.)
        if (fx.back.fainted) { own.restUntil = now + OWN_REST; own.faintAt = now; own.react = { anim: null, until: now + 3000, icon: "💫" }; }
        keepHp(agents().find((x) => x.address === fx.own)?.pane, { hp: own.hp, at: now, ...(fx.back.fainted ? { rest: own.restUntil } : {}) });
      }
      if (now < fx.until) return true;
      if (fx.fainted) {
        v.fainted ??= now;
        if (now >= v.fainted + 2200) { this.visitor = null; this.visitAt = this.honeyNext || this.legendNext ? now : now + rand(every[0], every[1]) * 60000; this.honeyNext = false; }
        return true;
      }
      v.from = fx.x;
      v.start = now;
      v.dur = (Math.abs(v.to - v.from) / walkSpeed(v.pick)) * 1000;
      v.walkFrom = undefined;
      v.leg = (v.leg ?? 0) + 1;
      v.fight = null;
    }
    // A ball thrown: it holds still while the ball shakes; then caught (gone in a moment), or it
    // breaks out and walks on from there.
    if (v.throw) {
      const th = v.throw;
      const end = th.at + throwEnd(th.shakes);
      if (now < end) return true;
      // A legendary after its last ball: it flees.
      if (!th.caught && v.pick.legend && (v.throws ?? 0) >= LEGEND_THROWS) th.fled = true;
      if (th.caught || th.fled) {
        if (th.caught && !th.saved) { th.saved = true; this.caught(v); }
        if (now >= end + 2500) { this.visitor = null; this.visitAt = this.honeyNext || this.legendNext ? now : this.visitAt > now ? this.visitAt : now + rand(every[0], every[1]) * 60000; this.honeyNext = false; }
        return true;
      }
      v.from = th.x;
      v.start = now;
      v.dur = (Math.abs(v.to - v.from) / walkSpeed(v.pick)) * 1000;
      v.walkFrom = undefined;
      v.leg = (v.leg ?? 0) + 1;
      v.broke = now;
      v.throw = null;
    }
    const meta = this.spriteFor(v.pick, "idle");
    if (!v.start) {
      // It sets off once its sprite is in; one that can't be had in a minute doesn't come.
      // A moment after its sprite is in, so the picture is up when it shows.
      if (meta?.walkR) {
        v.ready ??= now;
        if (now - v.ready >= 500) {
          v.start = now;
          // A rare one: its cry (once, from the leading strip), so it isn't missed while you work.
          if (rareOf(v.pick) && this.leader && settingsNow().cryRare) cry(v.pick.dex, true); // softly
          if (this.coming === "honey" || (this.coming === "legend" && v.pick.legend)) this.coming = null;
        }
      } else if (now - v.asked > 60000) {
        // Its sprite couldn't be had: another one comes instead (a called legendary is never lost).
        this.visitor = null;
        if (v.pick.legend && this.coming === "legend") this.legendNext = true;
        this.visitAt = this.coming ? now : next();
      }
      return false;
    }
    const f = (now - v.start) / v.dur;
    if (f >= 1) { this.visitor = null; this.visitAt = this.honeyNext || this.legendNext ? now : next(); this.honeyNext = false; return true; }
    v.x = v.from + (v.to - v.from) * f;
    // Idle ones on its row, standing within 220 px, turn to watch it.
    let turned = false;
    list.forEach((a, i) => {
      const m = this.mons[a.address];
      const row = g ? Math.min(m?.row ?? i % g.rows, g.rows - 1) : 0;
      const dir = v.x > (m?.x ?? 0) ? "r" : "l";
      if (m && !m.moving && m.mood === "idle" && row === v.row && Math.abs(m.x - v.x) < 220 && m.dir !== dir) { m.dir = dir; turned = true; }
    });
    // It walks on one transition, set as it sets off: a redraw only when something shows a change
    // (one turning to watch it, its first steps, its tag following it while hovered), not every
    // tick of its walk (that was the whole window four times a second, for a minute).
    const hovered = this.visitorHover?.id === v.id && now < this.visitorHover.until;
    return turned || now - v.start < 600 || hovered;
  }

  // A Pokémon's body (its box SLOT wide, `body` inside) with the blows landing on it (`blows`:
  // [{ at, dir, p, style, word? }], fx.js): knocked back `dir` and back, shaking for a big one;
  // the burst where it's hit; the word over its head.
  // `lunge`: { px, ms } while it rushes in to strike (a dash, fx.js dashAt) and back.
  withBlows(key, blows, body, cx, headY, ground, now, lunge = null) {
    const b = (blows ?? []).filter((x) => now >= x.at && now < x.at + 1300).at(-1);
    const k0 = b && (b.miss ? MISS_KNOCK : knockOf(b.p));
    const k = k0 && { ...k0, px: Math.round(k0.px * (b.kb ?? 1)) }; // a heavy one flies less (weather.js knockMul)
    const stop = stopOf(b); // a heavy blow: held still a moment before it's knocked back
    const out = !!b && now >= b.at + stop && now < b.at + stop + KNOCK_OUT;
    const wrap = div().absolute().left((out ? b.dir * k.px : 0) + (lunge?.px ?? 0)).top(0).w(SLOT).h(ground + 10)
      .transition("left", { duration: lunge ? lunge.ms : out ? 70 : KNOCK_BACK, easing: lunge ? (lunge.px ? "ease-in" : "ease-out") : "ease-out" })
      .when(!!b && k.shake && now >= b.at + stop && now < b.at + stop + SHAKE_MS, (el) => el.loop("top", { from: -2, to: 2, period: 100 }))
      .child(body);
    // Rushing in: streaks trailing behind it, carried with it.
    if (lunge?.px && lunge.style) {
      const sid = `sl-${key}-${lunge.at}`;
      const f = this.fxFirst(sid);
      wrap.child(div().id(sid).absolute().left(0).top(0).opacity(f ? 0 : 1).transition("opacity", { duration: 120 })
        .children(speedLines(lunge.style, Math.sign(lunge.px)).map((p) => fxPart(p, cx, Math.round((headY + ground) / 2)))));
      // Brave Bird: wrapped in light as it flies in.
      if (lunge.type === "flying") wrap.child(div().absolute().left(cx - 30).top(headY - 4).w(60).h(ground - headY + 8).rounded_full()
        .border_2().border_color(lunge.style.hot).bg(`${lunge.style.glow}55`).loop("opacity", { from: 0.5, to: 1, period: 120 }));
    }
    // A physical move's own mark on it (fx.js physicalParts), from just before it lands.
    const midY0 = Math.round((headY + ground) / 2);
    const marks = [];
    for (const x of blows ?? []) {
      if (!x.physical || !x.type || x.miss || now < x.at - 150 || now >= x.at + 700) continue;
      for (const [j, p] of physicalParts(x.type, cx, midY0, ground - 2, x.dir, x.at % 100000, x.style, x.name).entries()) {
        const t = x.at + p.at;
        if (now >= t && now < t + p.ms + 60) marks.push(fxSig(`pm-${key}-${x.at}-${j}`, p, this.fxFirst(`pm-${key}-${x.at}-${j}`)));
      }
    }
    if (!b) return marks.length ? div().absolute().left(0).top(0).child(wrap).children(marks) : wrap;
    // A miss: it hops aside, "Missed!" over it, nothing else.
    if (b.miss) {
      const id = `${key}-${b.at}`;
      return div().absolute().left(0).top(0).child(wrap)
        .child(fxWord(`word-${id}`, MISS_WORD, cx, Math.max(2, headY - 30), this.fxFirst(`word-${id}`) ? 0 : now < b.at + 900 ? 1 : 2));
    }
    // Knocked back hard: dust kicked up at its feet.
    if (k.px >= 10 && now < b.at + 650) {
      const f = this.fxFirst(`kd-${key}-${b.at}`);
      wrap.child(div().absolute().left(0).top(0).children([[-6, 0], [4, -2], [12, 0]].map(([dx, dy], j) =>
        fxOnce(`kd-${key}-${b.at}-${j}`, f, { x: cx - b.dir * 4 + dx, y: ground - 3 + dy, w: 4, h: 3, o: 0.8 },
          { x: cx - b.dir * (14 + j * 6) + dx, y: ground - 7 + dy, w: 12, h: 8, o: 0 }, 550, (el) => el.rounded_full().bg("#c8bca8")))));
    }
    // What the move leaves on it, for a moment after (fx.js residueOf).
    const res = b.type && residueOf(b.type);
    const rt = now - (b.at + RESIDUE_FROM);
    if (res && rt >= 0 && rt < RESIDUE_MS) wrap.child(fxResidue(`res-${key}-${b.at}`, res, b.style, cx, headY, ground, rt, this.fxFirst(`res-${key}-${b.at}`)));
    const id = `${key}-${b.at}`;
    const midY = Math.round((headY + ground) / 2);
    return div().absolute().left(0).top(0)
      .child(wrap)
      .when(now < b.at + 470, (el) => el.child(fxBurst(`burst-${id}`, b.style, b.physical && b.type ? b.p * 0.5 : b.p, cx - b.dir * 6, midY, this.fxFirst(`burst-${id}`), b.at % 100000)))
      .children(marks)
      // A plain strike: claw marks across it, fading (a named physical move has its own, above).
      .when(!!b.physical && !b.type && !!b.style && now < b.at + 520, (el) => {
        const f = this.fxFirst(`slash-${id}`);
        return el.child(div().id(`slash-${id}`).absolute().left(0).top(0).opacity(f ? 1 : 0).transition("opacity", { duration: 480, easing: "ease-in" })
          .children(slashParts(b.style, b.dir, b.p).map((p) => fxPart(p, cx - b.dir * 4, midY - 4))));
      })
      .when(!!b.word, (el) => el.child(fxWord(`word-${id}`, b.word, cx, Math.max(2, headY - 30),
        this.fxFirst(`word-${id}`) ? 0 : now < b.at + 560 ? 1 : 2))) // gone before a move named over it
      .when(!!b.num && now < b.at + 1000, (el) => el.child(fxNumber(`num-${id}`, b.num, cx + b.dir * 40, Math.max(2, headY + 8), this.fxFirst(`num-${id}`))));
  }

  // A move from x0 to x1 at height y: gathering at x0 (CHARGE_MS before `launch`), then its flight
  // (a shot; a beam for ice, steel, electric, fairy) landing at `land` (fx.js).
  // `noDash`: one that can't rush in (the boss) fires a shot instead.
  fxMove(id, move, x0, x1, y, launch, land, now, noDash = false) {
    const style = move ? moveStyle(move.type, move.blue) : MOVE.normal;
    const out = [];
    let kind = travelOf(move?.type, move?.physical);
    if (kind === "dash" && noDash) kind = "orb";
    if (now >= launch - CHARGE_MS && now < launch) out.push(fxCharge(`${id}-c`, style, x0, y, this.fxFirst(`${id}-c`)));
    // A signature move: its own look (fx.js signatureParts), timed to land when it's hit.
    if (move?.ultimate) {
      for (const [k, p] of signatureParts(move.type, x0, x1, y, land % 100000, style).entries()) {
        const t = land + p.at;
        if (now >= t && now < t + p.ms + 60) out.push(fxSig(`${id}-g${k}`, p, this.fxFirst(`${id}-g${k}`)));
      }
      return out;
    }
    // A special move: its own look as it flies (fx.js specialParts).
    if (move?.type && kind !== "dash") {
      for (const [k, p] of specialParts(move.type, x0, x1, y, land % 100000, style, move.name).entries()) {
        const t = land + p.at;
        if (now >= t && now < t + p.ms + 60) out.push(fxSig(`${id}-s${k}`, p, this.fxFirst(`${id}-s${k}`)));
      }
      return out;
    }
    if (kind === "beam") {
      if (now >= launch && now < land + 280) out.push(fxBeam(`${id}-b`, style, x0, x1, y, Math.max(1, land - launch), this.fxFirst(`${id}-b`) ? 0 : now < land ? 1 : 2));
    } else if (kind === "arc") {
      // Thrown up and over, coming down on it.
      const mid = launch + (land - launch) / 2, xm = (x0 + x1) / 2, ym = y - ARC_PEAK;
      if (now >= launch && now < mid) out.push(fxArcLeg(`${id}-a1`, style, x0, y, xm, ym, mid - now, this.fxFirst(`${id}-a1`), "ease-out"));
      else if (now >= mid && now < land + 60) out.push(fxArcLeg(`${id}-a2`, style, xm, ym, x1, y, land - now, this.fxFirst(`${id}-a2`), "ease-in"));
    } else if (kind === "volley") {
      // Three, one after another, a little above and below.
      for (const [k, [delay, dy]] of VOLLEY.entries()) {
        const a = launch + delay, b = land + delay;
        if (now >= a && now < b + 60) out.push(fxShot(`${id}-v${k}`, style, x0, x1, y + dy, Math.max(1, b - now), this.fxFirst(`${id}-v${k}`)));
      }
    } else if (kind === "orb" && now >= launch && now < land + 60) {
      out.push(fxShot(`${id}-o`, style, x0, x1, y, Math.max(1, land - now), this.fxFirst(`${id}-o`)));
    }
    return out;
  }
  // A move's name over the one using it, from when it gathers to just after it flies; a signature
  // move in gold.
  moveLabel(key, move, x, top, launch, now) {
    if (!move?.name || now < launch - CHARGE_MS || now >= launch + 560) return null;
    const phase = this.fxFirst(key) ? 0 : now < launch + 280 ? 1 : 2; // fading as the word over the other pops up
    return fxWord(key, [`${move.name}!${move.boosted ? ` ${move.boosted}` : ""}`, move.ultimate ? "#ffd23f" : "#ffffff"], x, top, phase);
  }
  // The weather now (weather.js): the strip's rain, night, season.
  boostNow(now = new Date()) {
    const hour = now.getHours() + now.getMinutes() / 60;
    return weatherNow(this.weather ?? "clear", seasonAt(now), nightness(hour));
  }
  // A move with the weather's boost: ×WEATHER_HIT and the weather's icon by its name.
  boosted(move) {
    const w = this.boostNow();
    return move && boosts(w, move.type) ? { ...move, mul: move.mul * WEATHER_HIT, boosted: w.icon } : move;
  }
  // How many notes stand in the top-left corner (the raid's, the outbreak's, the boosts'): the
  // next one goes under them.
  leftNotes(now) {
    const st = settingsNow();
    const raidUp = st.raids && !!raidPhase(loadRaid(shared(RAID_KEY)), now);
    const obUp = st.outbreaks && VISIT_EVERY[st.visitors] && !!outbreakAt(now, shared(OUTBREAK_KEY));
    const boosts = Object.keys(loadBoosts(shared(BOOSTS_KEY), now)).length > 0;
    return (raidUp ? 1 : 0) + (obUp ? 1 : 0) + (boosts ? 1 : 0);
  }
  // How wide a Pokémon is drawn on the strip (px): its sprite's box at its scale (a sub-agent's
  // smaller, an Alpha bigger); 40 before its sprite is in.
  drawnWidth(pick, status) {
    const meta = pick && this.spriteFor(pick, status);
    const box = (meta?.idleR ?? meta?.idleL)?.box;
    if (!box) return 40;
    return box.w * scaleOf() * (pick.young ? 0.75 : pick.alpha ? ALPHA_SIZE : 1) * drawSize(pick.size);
  }
  // The white of a health bar's loss, for a moment after it's hit (`l`: { prev, at }).
  lostOf(key, l, now) {
    if (!l || now - l.at > 1000) return null;
    const id = `${key}-${l.at}`;
    return { id, prev: l.prev, first: this.fxFirst(id) };
  }

  // True the first time an effect is drawn (it starts small, here, faded…; next frame it moves).
  fxFirst(id) {
    this.fxSeen ??= new Map();
    if (this.fxSeen.has(id)) return false;
    this.fxSeen.set(id, Date.now());
    this.fxKick = true;
    return true;
  }

  // Effects move between frames, and the strip draws four a second: a frame is asked for right
  // when a blow lands, a shot sets off, a ball lands or shakes, so nothing waits a quarter second.
  fxSchedule(cx, now) {
    const times = [];
    const sounds = []; // [key, when, name]: the battle's sounds (fx.js SOUNDS), on the leading strip
    const blowTimes = (b, key) => {
      const st = stopOf(b);
      if (st) times.push(b.at + st, b.at + st + KNOCK_OUT + 5, b.at + st + SHAKE_MS + 5);
      if (b.physical && b.type && !b.miss) for (const t of physicalTimes(b.type, b.name)) times.push(b.at + t);
      times.push(b.at, b.at + 40, b.at + KNOCK_OUT + 5, b.at + SHAKE_MS + 5, b.at + 470, b.at + 560, b.at + 900, b.at + 1000, b.at + 1300,
        b.at + RESIDUE_FROM, b.at + RESIDUE_FROM + 40, b.at + RESIDUE_FROM + RESIDUE_MS - RESIDUE_FADE, b.at + RESIDUE_FROM + RESIDUE_MS);
      if (!b.miss) sounds.push([`${key}-hit-${b.at}`, b.at, hitSound(b.p)]);
    };
    // A move: it gathers (a frame as it starts, one to set it moving), fires, lands.
    const moveTimes = (key, type, launch, land, physical = false, ultimate = false, name = null) => {
      times.push(launch - CHARGE_MS, launch - CHARGE_MS + 40, launch, launch + 40, launch + 280, launch + 560, land, land + 70, land + 290);
      if (ultimate) for (const t of signatureTimes(type)) times.push(land + t);
      else if (!physical && type) for (const t of specialTimes(type, name)) times.push(land + t);
      sounds.push([`${key}-c`, launch - CHARGE_MS, "charge"], [`${key}-l`, launch, launchSound(type, physical)]);
    };
    for (const [addr, m] of Object.entries(this.mons ?? {})) {
      if (m.sparWin) times.push(m.sparWin.at, m.sparWin.at + 40, m.sparWin.at + 1200, m.sparWin.at + 1500);
      for (const n of m.sparNotes ?? []) times.push(n.at, n.at + 40, n.until - 300, n.until);
      if (m.sparHp) times.push(m.sparHp.until);
      for (const b of m.blows ?? []) blowTimes(b, addr);
      if (m.react && now < m.react.until + 400) for (const sh of shotsOf(m)) moveTimes(`shot-${addr}-${sh.at}`, sh.move?.type, sh.at, sh.until, sh.move?.physical, sh.move?.ultimate, sh.move?.name);
    }
    const v = this.visitor;
    if (v?.start) times.push(v.start + APPEAR_MS); // its "appeared!" goes
    if (v?.fainted) { times.push(v.fainted + 40); sounds.push([`faint-${v.id}`, v.fainted, "faint"]); }
    const egg = loadRaid(shared(RAID_KEY));
    if (egg) times.push(egg.hatch - HATCH_SHAKE, egg.hatch, egg.hatch + 40, egg.hatch + 480, egg.hatch + HATCH_MS);
    for (const m of Object.values(this.mons ?? {})) {
      if (m.evolveFx) times.push(m.evolveFx.at + 40, m.evolveFx.at + EVOLVE_WHITE, ...EVOLVE_SWAPS.map((s) => m.evolveFx.at + s), m.evolveFx.at + EVOLVE_BURST - 60, m.evolveFx.at + EVOLVE_BURST, m.evolveFx.at + EVOLVE_BURST + 40, m.evolveFx.at + EVOLVE_MS - 300, m.evolveFx.at + EVOLVE_MS);
      if (m.megaFx) for (const t of m.megaFx.on ? [...megaTimes(m.megaFx.full), megaTiming(m.megaFx.full).total, megaTiming(m.megaFx.full).total - 300] : [40, 470]) times.push(m.megaFx.at + t);
    }
    for (const [addr, m] of Object.entries(this.mons ?? {})) if (m.faintAt) sounds.push([`faint-${addr}-${m.faintAt}`, m.faintAt, "faint"]);
    if (v?.fight) {
      const f = v.fight;
      times.push(f.at, f.hitAt, f.backAt);
      if (f.back && f.wildMove) moveTimes(`wild-${f.at}`, f.wildMove.type, f.backLaunch, f.backHit, f.wildMove.physical, f.wildMove.ultimate, f.wildMove.name);
      if (f.blow) blowTimes(f.blow, `wild-${v.id}`);
    }
    // A raid's blows: each hit, the boss's answer, the push back.
    for (const b of this.bossBlows ?? []) blowTimes(b, "boss");
    const raid = loadRaid(shared(RAID_KEY));
    for (const h of raid?.hits ?? []) {
      times.push(h.at);
      if (h.back) moveTimes(`boss-${h.at}`, h.back.type, h.at + COUNTER_MS, h.at + COUNTER_MS + 320, false, h.back.ultimate, h.back.physical ? null : h.back.name);
    }
    for (const m of Object.values(this.mons ?? {})) if (m.raidPush) times.push(m.raidPush.at);
    if (v?.throw) {
      const a = v.throw.at, th = v.throw, end = a + throwEnd(th.shakes);
      times.push(a + 40, a + THROW_UP, a + THROW_UP + 40, a + THROW_UP + THROW_DOWN, a + THROW_UP + THROW_DOWN + 40, a + SHAKE_FROM + 40, end, end + 40, end + 520);
      for (let k = 0; k < 3; k++) times.push(a + SHAKE_FROM + k * SHAKE_EVERY, a + SHAKE_FROM + k * SHAKE_EVERY + WOBBLE);
      sounds.push([`throw-${a}`, a, "throw"], [`absorb-${a}`, a + THROW_UP + THROW_DOWN, "absorb"],
        ...Array.from({ length: th.shakes }, (_, k) => [`shake-${a}-${k}`, a + SHAKE_FROM + k * SHAKE_EVERY, "shake"]),
        [`end-${a}`, end, th.caught ? "gotcha" : "break"]);
    }
    this.wakes ??= new Set();
    for (const t of times) {
      if (!Number.isFinite(t) || t <= now || t > now + 300 || this.wakes.has(t)) continue;
      this.wakes.add(t);
      cx.timer.after(t - now, (c) => { this.wakes.delete(t); c.notify(); });
    }
    // Sounds (Settings → Sound → Battle sounds; the 🔇 on the strip): each once, right on time.
    if (this.leader && settingsNow().battleSounds) {
      this.sounded ??= new Map();
      for (const [key, t, name] of sounds) {
        if (!Number.isFinite(t) || t < now - 120 || t > now + 300 || this.sounded.has(key)) continue;
        this.sounded.set(key, t);
        const play = () => { try { playSound(`mods/${MOD}/sfx/${name}.mp3`); } catch {} };
        if (t <= now) play(); else cx.timer.after(t - now, play);
      }
    }
    // Forget old ones: blows, effects drawn, sounds played.
    for (const m of Object.values(this.mons ?? {})) if (m.blows?.length) m.blows = m.blows.filter((b) => now < b.at + 3000);
    if (this.bossBlows?.length) this.bossBlows = this.bossBlows.filter((b) => now < b.at + 3000);
    if (this.fxSeen) for (const [id, at] of this.fxSeen) if (now - at > 15000) this.fxSeen.delete(id);
    if (this.sounded) for (const [k, t] of this.sounded) if (now - t > 15000) this.sounded.delete(k);
  }


  // ---- raids (events.js) ----
  // A fighter's key for a pick, as it looks in a battle (its Mega, its regional form).
  keyFor(pick) {
    return fighterKey(pick.dex, { form: pick.form, mega: megaShown(pick, "working") ? (megaForm(pick.dex, pick.megaKind)?.kind ?? "") : null });
  }
  // The day's work went from `before` to `after` minutes (the counting strip): every 2½ hours of
  // work per agent (2 a day at most), with none on, an egg; its boss as sturdy as the agents working.
  raidEgg(before, after, now) {
    if (!settingsNow().raids) return;
    const r = loadRaid(shared(RAID_KEY));
    const day = dayOf(now), laid = eggsOn(r, day); // the day's eggs so far: 2 at most, however many agents
    if (!laysEgg(before, after, raidPhase(r, now), herdAgents().filter((x) => x.pane).length, laid)) return;
    const agentsNow = herdAgents().filter((x) => x.pane && x.status === "working").length; // its bulk: by the agents working
    setShared(RAID_KEY, newRaid(now, Math.random, { caught: new Set(pokedex().caught), agents: agentsNow, day, eggs: laid }));
  }
  // One of yours (`a`, its agent; `pick`) hits the boss at `at` (harder while its agent works).
  // Strikes held for a Mega Evolution, each made when its time comes (tick).
  pendingRaid(now) {
    if (!this.pendingStrikes?.length) return;
    const due = this.pendingStrikes.filter((x) => now >= x.at - 320);
    this.pendingStrikes = this.pendingStrikes.filter((x) => now < x.at - 320);
    for (const x of due) this.raidStrike(x.a, x.pick, x.at);
  }
  raidStrike(a, pick, at) {
    const r = loadRaid(shared(RAID_KEY));
    if (raidPhase(r, at) !== "battle" || !pick || !a.pane) return;
    const key = this.keyFor(pick);
    const live = savedPicks()[a.pane] ?? pick;
    const move = this.boosted(pickMove(key, r.boss.dex, Math.random, { moves: live.moves }));
    const { raid } = raidHit(r, key, a.pane, move.type, at, Math.random, { alpha: !!live.alpha, shadow: !!live.shadow, hearts: live.hearts ?? 0, working: a.status === "working", drop: true, move, effort: effortOf(live), nature: live.nature });
    setShared(RAID_KEY, raid);
    if (raid.beaten) this.raidWon(raid);
  }
  // Beaten: paid once (money, Ultra Balls), wherever the last blow landed.
  raidWon(r) {
    if (r.paid) return;
    payOut(raidReward(r.boss));
    setShared(RAID_KEY, { ...r, paid: true });
  }
  // Every strip: its boss's sprite fetched; each hit played out (yours fires its type at the boss,
  // which flinches; then the boss fires back, and yours is knocked away from it and loses health);
  // beaten, the boss walks off weakened, to be caught. Returns whether to redraw.
  raidTick(list, ids, now, cx) {
    const r = loadRaid(shared(RAID_KEY));
    const ph = raidPhase(r, now);
    if (!ph) return false;
    const pick = bossPick(r.boss);
    this.want(pick, cx);
    const bx = this.width / 2;
    // The egg's picture (PokeAPI), fetched once.
    if (!ART_ASKED.has(EGG_ART)) { ART_ASKED.add(EGG_ART); ensureArt(EGG_ART).then(() => { ART_READY.add(EGG_ART); }).catch(() => null); }
    const hiX = Math.max(EDGE, this.width - EDGE);
    this.raidSeen ??= new Set();
    for (const h of r.hits) {
      const k = `${r.id}-${h.at}`;
      if (this.raidSeen.has(k)) continue;
      this.raidSeen.add(k);
      if (now - h.at > 2500) continue;
      const a = list.find((x) => x.pane === h.pane);
      const m = a && this.mons[a.address];
      if (!m) continue;
      // It stops where it is (or where it's headed), faces the boss and lets fly.
      const x = m.moving ? m.target : m.x;
      m.x = m.from = m.target = x;
      m.moving = false;
      m.dur = 150;
      m.dir = bx > x ? "r" : "l";
      const meta = this.spriteFor(ids[a.address], a.status);
      const has = new Set(Object.keys(meta?.react ?? {}));
      const sp = reactionAnim("special", has) ?? reactionAnim("spar", has);
      const ms = sp && meta?.react?.[sp] ? Math.max(600, meta.react[sp].ms) : 700;
      const launch = h.at + CHARGE_MS, land = launch + 260; // it gathers, then fires
      const seq = [{ at: h.at, until: h.at + ms, anim: sp }];
      const blue = h.key === "6mX";
      (this.bossBlows ??= []).push({ at: land, dir: bx > x ? 1 : -1, p: h.ultimate || h.crit ? Math.max(0.85, power(h.eff)) : power(h.eff), style: moveStyle(h.type, blue), word: blowWord(h.eff, h.crit), num: damageText(h.dmg, h.eff), type: h.type, miss: h.miss, physical: h.physical });
      if (h.back) {
        // The boss's answer lands on it; it's thrown back, away from the boss.
        const hitBackAt = h.at + COUNTER_MS + 320;
        seq.push({ at: hitBackAt, until: hitBackAt + 600, anim: reactionAnim("startle", has) });
        (m.blows ??= []).push({ at: hitBackAt, dir: bx > x ? -1 : 1, p: Math.max(0.85, power(h.back.eff)), style: moveStyle(h.back.type), word: blowWord(h.back.eff, h.back.crit), num: damageText(h.back.dmg, h.back.eff, true), type: h.back.type, miss: h.back.miss });
        // Away from the boss: to BOSS_PUSH from it, or 30 px further if it stood further off already.
        const away = x < bx ? Math.min(x - 30, bx - BOSS_PUSH) : Math.max(x + 30, bx + BOSS_PUSH);
        m.raidPush = { at: hitBackAt + 120, to: clamp(away, EDGE, hiX), back: h.back.dmg };
      }
      m.react = { seq, until: (h.back ? h.at + COUNTER_MS + 1100 : h.at + ms + 200), face: m.dir, shot: { at: launch, until: land, from: x, to: bx, move: { type: h.type, eff: h.eff, blue, name: h.name, physical: h.physical, ultimate: h.ultimate, boosted: h.boosted } } };
      m.pauseUntil = h.at + 6000;
      m.battleUntil = h.at + 6000; // it Mega Evolves for it
    }
    // Thrown back: it slides away from the boss and loses health (at 0 it faints and rests).
    for (const m of Object.values(this.mons)) {
      const p = m.raidPush;
      if (!p || now < p.at) continue;
      m.raidPush = null;
      clearWalk(m);
      m.from = m.x;
      m.target = p.to;
      m.start = now;
      m.dur = 420;
      m.moving = true;
      m.backstep = true;
      const hp = Math.max(0, ownHp(m, now) - p.back);
      m.hpLost = { prev: ownHp(m, now), at: now };
      m.hp = hp;
      m.hpAt = now;
      if (hp <= 0.001) { m.restUntil = now + RAID_REST; m.faintAt = now; m.react = { anim: null, until: now + 3000, icon: "💫" }; }
      keepHp(agents().find((x) => this.mons[x.address] === m)?.pane, { hp, at: now, ...(hp <= 0.001 ? { rest: m.restUntil } : {}) });
    }
    // Beaten: the boss walks off slowly, a sliver of health, for the Ultra Balls it paid.
    if (ph === "beaten" && !r.caught && this.raidVisitor !== r.id && this.leader) { // one boss to catch, not one per window
      this.raidVisitor = r.id;
      const dir = Math.random() < 0.5 ? "r" : "l";
      const to = dir === "r" ? this.width + OFF : -OFF;
      this.visitor = { id: `raid-${r.id}`, purse: 0, pick, dir, row: 0, from: bx, to, start: 0, dur: (Math.abs(to - bx) / (VISIT_SPEED / 2)) * 1000, asked: now,
        gift: "ultra-ball", giftN: 0, giftAt: now - 5000, raid: r.id };
      const seen = withSeen(pokedex(), [pick.dex]);
      if (seen) saveDex(seen);
    }
    return true;
  }

  // The boss's picture; just hatched (HATCH_MS), it grows from a third of its size, feet on the
  // ground.
  bossImage(r, s, mid, ground, k, now) {
    const growing = now - r.hatch < HATCH_MS;
    const first = growing && this.fxFirst(`boss-grow-${r.id}`);
    const kk = first ? k * 0.3 : k;
    const ms = 450;
    return image(s.path).id(`boss-img-${r.id}`).absolute().left(mid - (s.box.x + s.box.w / 2) * kk).top(ground - (s.box.y + s.box.h) * kk).w(s.w * kk).h(s.h * kk)
      .when(growing, (el) => el.transition("left", { duration: ms, easing: "ease-out" }).transition("top", { duration: ms, easing: "ease-out" })
        .transition("width", { duration: ms, easing: "ease-out" }).transition("height", { duration: ms, easing: "ease-out" }));
  }
  // The egg hatching (`t` ms in): a flash and a burst, rays of light, the shell flying apart.
  fxHatch(r, bx, ground, t) {
    const y = ground - 22, key = `hatch-${r.id}`;
    const f = this.fxFirst(`${key}-shell`);
    const ray = (j, w, h) => fxOnce(`${key}-ray${j}`, f, { x: bx, y, w: w * 0.2, h: h * 0.2, o: 1 }, { x: bx, y, w, h, o: 0 }, 700, (el) => el.rounded(3).bg("#fff6c8"));
    return div().absolute().left(0).top(0)
      .when(t < 470, (el) => el.child(fxBurst(`${key}-b`, GOLD_STYLE, 1, bx, y, this.fxFirst(`${key}-b`), 41)))
      .child(ray(0, 150, 4)).child(ray(1, 4, 90)).child(ray(2, 100, 3)).child(ray(3, 3, 70))
      .children([[-34, -26], [30, -30], [-22, 10], [26, 6], [0, -40]].map(([dx, dy], j) =>
        fxOnce(`${key}-s${j}`, f, { x: bx, y, w: 9, h: 7, o: 1 }, { x: bx + dx, y: y + dy + 26, w: 7, h: 5, o: 0 }, 650 + j * 40, (el) => el.rounded(2).bg(j % 2 ? "#f4efe4" : "#a8d88a"))));
  }

  // The raid in the strip: the egg (wobbling as it's about to hatch), or the boss (big, its health
  // bar, its blows), and a note in the corner.
  renderRaid(root, grounds, scale, now, t) {
    const r = loadRaid(shared(RAID_KEY));
    const ph = settingsNow().raids ? raidPhase(r, now) : null;
    if (!ph) return 0;
    const ground = grounds[0];
    const bx = this.width / 2;
    const name = `${r.boss.alpha ? "Alpha " : ""}${r.boss.shiny ? "✨ " : ""}${fullName(r.boss.dex)}`;
    const mins = (ms) => `${Math.max(1, Math.ceil(ms / 60000))}m`;
    const note = ph === "egg" ? `🥚 Raid egg · hatches in ${mins(r.hatch - now)}`
      : ph === "battle" ? `⚔ Raid: ${name} · ${mins(r.until - now)} left` // how: the Guide, the Today tab
      : ph === "beaten" ? (r.caught ? `⚔ Raid won: ${name} caught!` : `⚔ Raid won! ${money(raidReward(r.boss).money)}, 3 Ultra Balls · catch it before it's gone`)
      : `${name} got away…`;
    root.child(div().id("pokemon-raid").absolute().left(6).top(4).h(16).px(6).rounded(8).max_w(Math.max(120, this.width - 70)).overflow_hidden()
      .flex().items_center().text_size(10).font_semibold().bg("#000000a0").text_color(ph === "gone" ? "#c8ccd4" : "#ffd23f")
      .child(sparkled(note)));
    if (ph === "egg") {
      // The games' Egg (PokeAPI's sprite: 96 px, the egg itself 28×30 at 34,34), on the ground.
      const soon = r.hatch - now < 30000, hatching = r.hatch - now < HATCH_SHAKE;
      const k = 1.2 * scale, d = 96 * k, x0 = bx - 48 * k;
      root.child(div().id(`raid-egg-${r.id}`).absolute().left(x0).top(ground - 64 * k).w(d).h(d)
        .when(soon, (el) => el.loop("left", hatching ? { from: x0 - 4, to: x0 + 4, period: 120 } : { from: x0 - 2, to: x0 + 2, period: 260 }))
        // About to hatch: cracks across it, glowing.
        .when(hatching, (el) => el.child(div().absolute().left(0).top(0).size_full()
          .children([[40, 46, 7, 2], [45, 44, 2, 6], [50, 50, 6, 2], [42, 56, 5, 2]].map(([cx2, cy2, w2, h2], j) =>
            div().absolute().left(cx2 * k).top(cy2 * k).w(w2 * k).h(h2 * k).bg(j % 2 ? "#fff6c8" : "#3a3328")
              .loop("opacity", { from: 0.4, to: 1, period: 180 + j * 40 })))))
        .child(ART_READY.has(EGG_ART) ? image(artPath(EGG_ART)).w(d).h(d)
          : div().absolute().left(34 * k).top(34 * k).w(28 * k).h(30 * k).rounded_full().bg("#f4efe4").border_1().border_color("#3a3328")));
      return 1;
    }
    if (ph !== "battle") return 1;
    if (now - r.hatch < HATCH_MS) root.child(this.fxHatch(r, bx, ground, now - r.hatch));
    const meta = this.spriteFor(bossPick(r.boss), "idle");
    if (!meta?.walkR) return 1;
    // It faces whoever hit it last; flinches as a blow lands; turns and strikes as it answers.
    const xOf = (pane) => { const a = herdAgents().find((x) => x.pane === pane); const m = a && this.mons[a.address]; return m ? (m.moving ? m.target : m.x) : null; };
    const last = [...r.hits].reverse().find((h) => h.at <= now);
    const lx = last ? xOf(last.pane) : null;
    const face = lx === null ? null : lx > bx ? "R" : "L";
    const answering = last?.back && now >= last.at + COUNTER_MS - 250 && now < last.at + COUNTER_MS + 450;
    const flinching = last && now >= last.at + 450 && now < last.at + 1000;
    const pickAnim = (...names) => names.map((n) => meta.react?.[`${n}${face ?? ""}`] ?? meta.react?.[n]).find(Boolean);
    const s = (answering && face ? pickAnim("SpAttack", "Shoot", "Attack") : flinching && face ? pickAnim("Hurt") : null)
      ?? (face ? meta[`idle${face}`] : null) ?? meta.idleD ?? meta.idleL;
    const k = scale * BOSS_SIZE;
    const mid = SLOT / 2;
    const headY = ground - s.box.h * k;
    // Its other poses drawn unseen, so turning to strike or flinch never blinks while one loads.
    const poses = ["SpAttack", "Shoot", "Attack", "Hurt"].flatMap((n) => ["L", "R"].map((f) => meta.react?.[`${n}${f}`])).filter((p) => p && p !== s);
    const body = div()
      .children(poses.map((p) => image(p.path).absolute().left(0).top(0).w(p.w * k).h(p.h * k).opacity(0)))
      .child(div().absolute().left(mid - s.box.w * 0.4 * k).top(ground - 3 * k).w(s.box.w * 0.8 * k).h(6 * k).rounded_full().bg("#00000035"))
      .when(!!r.boss.alpha, (el) => el.child(alphaGlow(mid, ground, s.box, k)))
      .child(this.bossImage(r, s, mid, ground, k, now))
      .when(true, (el) => {
        for (const n of ["HurtL", "HurtR", "Hurt"]) this.wantWhite(meta.react?.[n]?.path);
        const lb = (this.bossBlows ?? []).filter((b) => !b.miss && now >= b.at - 1500 && now < b.at + 200).at(-1);
        const wf = lb && this.whiteFlash(`boss-${r.id}`, s.path, mid - (s.box.x + s.box.w / 2) * k, ground - (s.box.y + s.box.h) * k, s.w * k, s.h * k, lb.at, now);
        return wf ? el.child(wf) : el;
      });
    // Its health as the blows land (not as they're thrown), the last one's loss white, draining.
    const barW = 80;
    const landAt = (h) => h.at + CHARGE_MS + 260;
    const shown = Math.min(1, r.hp + r.hits.filter((h) => landAt(h) > now).reduce((s, h) => s + h.dmg, 0));
    const landed = r.hits.filter((h) => landAt(h) <= now && now - landAt(h) < 1000).at(-1);
    const lost = landed ? this.lostOf(`boss-${r.id}`, { prev: Math.min(1, shown + landed.dmg), at: landAt(landed) }, now) : null;
    const hpColor = shown > 0.5 ? "#46c46a" : shown > 0.2 ? "#e8b062" : "#e5484d";
    root.child(div().id(`raid-boss-${r.id}`).absolute().top(0).h(ground + 10).w(SLOT).left(bx - mid)
      .child(this.withBlows(`boss-${r.id}`, this.bossBlows, body, mid, headY, ground, now))
      .child(div().absolute().left(mid - barW / 2).top(Math.max(2, headY - 10)).w(barW).h(6).rounded(3).bg("#00000088").overflow_hidden()
        .when(!!lost, (el) => el.child(div().id(lost.id).absolute().left(0).top(0).h_full().w(Math.round(barW * (lost.first ? lost.prev : shown))).bg("#ffffff").opacity(0.85)
          .transition("width", { duration: 450, delay: 250, easing: "ease-in" })))
        .child(div().absolute().left(0).top(0).h_full().w(Math.max(2, Math.round(barW * shown))).bg(hpColor))));
    // The boss's answers, flying at whoever hit it.
    for (const h of r.hits) {
      if (!h.back) continue;
      const a = herdAgents().find((x) => x.pane === h.pane);
      const m = a && this.mons[a.address];
      const from = h.at + COUNTER_MS, until = from + 320;
      if (!m || now < from - CHARGE_MS || now >= until + 280) continue;
      const tx = m.moving ? m.from : m.x;
      const dir = tx > bx ? 1 : -1;
      const lb = this.moveLabel(`mvb-${r.id}-${h.at}`, h.back, bx, Math.max(2, headY - 26), from, now);
      if (lb) root.child(lb);
      root.children(this.fxMove(`bossshot-${r.id}-${h.at}`, { type: h.back.type, eff: h.back.eff, ultimate: h.back.ultimate, name: h.back.physical ? null : h.back.name }, bx + dir * 22, tx - dir * 12, Math.round((headY + ground) / 2), from, until, now, true));
    }
    return 1;
  }

  // White silhouettes (sprites.js ensureWhite), made the first time one is wanted.
  wantWhite(path) {
    if (!path) return;
    this.whites ??= {};
    if (this.whites[path]) return;
    this.whites[path] = "loading";
    ensureWhite(path).then(() => { this.whites[path] = "ready"; }, () => { this.whites[path] = "failed"; });
  }
  // As a blow lands (`at`), the sprite drawn at (left, top) flashes white and fades (170 ms).
  // Its silhouette not made yet: asked for, and no flash this once.
  whiteFlash(key, path, left, top, w, h, at, now) {
    if (at === undefined || now < at - 1500 || now >= at + 200) return null;
    if (this.whites?.[path] !== "ready") { this.wantWhite(path); return null; }
    if (now < at) return null;
    const id = `wf-${key}-${at}`;
    const first = this.fxFirst(id);
    return image(whitePath(path)).id(id).absolute().left(left).top(top).w(w).h(h).opacity(first ? 0.95 : 0)
      .transition("opacity", { duration: 170, easing: "ease-in" });
  }

  // The raid's boss in battle, on the first row, near enough to `m` (dropped there) to be hit.
  raidNear(m, row, now) {
    if (!settingsNow().raids || row !== 0) return false;
    return raidPhase(loadRaid(shared(RAID_KEY)), now) === "battle" && Math.abs(m.x - this.width / 2) <= 90;
  }

  // A wild one walking by on `row`, near enough to `m` (dropped there) to be attacked; not while
  // a ball shakes, it's already being hit, or it has fainted.
  wildNear(m, row, now) {
    const v = this.visitor;
    if (!v?.start || v.throw || v.fight || v.fainted || !Number.isFinite(v.x)) return false;
    const rows = this.grid(herdAgents().length)?.rows ?? 1;
    return Math.min(v.row, rows - 1) === row && Math.abs(v.x - m.x) <= 70;
  }

  // A wild Pokémon caught: into the Box (a heart, a nature), the Pokédex, the day's Research, and
  // the Pokédex's goals paid.
  caught(v) {
    const now = Date.now();
    const pick = caughtPick(v.pick, now, Math.random, v.throw?.ball);
    v.nature = pick.nature;
    savePicks({ [`box-${now}-${pick.dex}`]: pick });
    if (v.raid) { const r = loadRaid(shared(RAID_KEY)); if (r?.id === v.raid) setShared(RAID_KEY, { ...r, caught: Date.now() }); }
    v.recordTag = recordSize(pokedex().sizes, pick); // an XXL/XXS beating its species' record
    const dx = withCaught(pokedex(), pick);
    v.record = withRecord(dx.sizes, pick); // its species' biggest or smallest yet
    saveDex(v.record ? { ...dx, sizes: v.record } : dx);
    research("catch");
    payDexGoals();
    // A Pinap Berry: it brings a second gift.
    if (BAIT[v.throw?.bait]?.double) { v.extra = pickup(); saveBag(addItem(bag(), v.extra)); }
  }

  // A ball thrown at the visitor (the best one for it in the Bag): it stops, the ball shakes.
  throwAt(v) {
    // Not one already gone (a click on an old element of it): the ball would be spent for nothing.
    if (v !== this.visitor || v.throw || v.fight || !v.start) return;
    const ball = ballFor(bag().items, v.pick, shared(BALL_KEY));
    if (!ball) return;
    // The Berry set in the Bag goes first, while there are some (none for a Master Ball: no need).
    const b0 = bag();
    const bait = baitFor(b0.items, v.pick, ball, shared(BAIT_KEY)); // the one set, or Auto's pick
    saveBag(addItem(bait ? addItem(b0, bait, -1) : b0, ball, -1));
    v.throws = (v.throws ?? 0) + 1;
    if (bait) research("berry"); // a Berry fed to a wild one counts too
    const now = Date.now();
    const f = clamp((now - v.start) / v.dur, 0, 1);
    v.throw = { ball, bait, at: now, x: v.from + (v.to - v.from) * f, ...throwBall(ball, v.pick, Math.random, bait) };
    // Caught: into the Box now, as the ball decides it; the shakes are only for show (the strip
    // could drop the visitor meanwhile: an update reloading it, the window narrowed, Visitors off).
    if (v.throw.caught) { v.throw.saved = true; this.caught(v); }
  }

  // The visitor, drawn as the herd is but with no name: hovering it says what it is.
  renderVisitor(root, grounds, scale) {
    const v = this.visitor;
    if (v?.pick.alpha) scale *= ALPHA_SIZE; // an Alpha: bigger
    if (v) scale *= drawSize(v.pick.size); // its size (weather.js): an XXL bigger, an XXS smaller
    const meta = v?.start && this.spriteFor(v.pick, "idle");
    if (!meta?.walkR) return;
    const t = theme();
    const s = meta[v.dir === "r" ? "walkR" : "walkL"];
    const ground = grounds[Math.min(v.row, grounds.length - 1)];
    // Drawn as the herd is (a box SLOT wide that slides to it, its picture placed inside): a
    // picture inside a box that sized itself by it sometimes never showed (a lone 🎁 crossing).
    const sw = SLOT, mid = sw / 2;
    const imgLeft = mid - (s.box.x + s.box.w / 2) * scale;
    const imgTop = ground - (s.box.y + s.box.h) * scale;
    const shadowW = Math.max(14, Math.round(s.box.w * 0.7)) * scale;
    const headY = ground - s.box.h * scale;
    const hit = { left: mid - (s.box.w / 2) * scale - 2, top: headY - 2, w: s.box.w * scale + 4, h: s.box.h * scale + 4 };
    const now = Date.now();
    const th = v.throw;
    // Its health, once one of yours has hit it: a thin bar over its head (green, amber, red).
    const hp = Number.isFinite(v.pick.hp) ? v.pick.hp : 1;
    const hpBar = (x) => healthBar(x, headY - 6, hp, this.lostOf(`wild-${v.id}`, v.hpLost, now));
    if (v.fight) {
      // Standing where it was hit, flinching; fainted: fading, and a word.
      const x = v.fight.x;
      const fx = v.fight;
      // Facing yours throughout: hit (flinching, knocked back), then its own move back at yours.
      const toward = (fx.ownX ?? x) > x ? "R" : "L";
      const hitAt = fx.hitAt ?? fx.at, backAt = fx.backAt ?? fx.at + 1000;
      const striking = fx.back && now >= backAt && now < backAt + 700;
      const hurting = now >= hitAt && now < hitAt + 600;
      const cur = (striking ? meta.react?.[`SpAttack${toward}`] ?? meta.react?.[`Shoot${toward}`] ?? meta.react?.[`Attack${toward}`] ?? meta.react?.Attack
        : hurting ? meta.react?.[`Hurt${toward}`] ?? meta.react?.Hurt : null) ?? meta[`idle${toward}`] ?? s;
      const cl = mid - (cur.box.x + cur.box.w / 2) * scale, ct = ground - (cur.box.y + cur.box.h) * scale;
      const wildBody = div()
        .child(div().absolute().left(mid - shadowW / 2).top(ground - 2 * scale).w(shadowW).h(6 * scale).rounded_full().bg("#00000030"))
        .when(!!v.pick.alpha, (el) => el.child(alphaGlow(mid, ground, cur.box, scale, !!v.pick.shadow)))
        .child(image(cur.path).absolute().left(cl).top(ct).w(cur.w * scale).h(cur.h * scale))
        .when(true, (el) => {
          if (fx.blow) for (const n of ["HurtL", "HurtR", "Hurt"]) this.wantWhite(meta.react?.[n]?.path);
          const wf = fx.blow && !fx.blow.miss && this.whiteFlash(`w-${v.id}`, cur.path, cl, ct, cur.w * scale, cur.h * scale, fx.blow.at, now);
          return wf ? el.child(wf) : el;
        });
      // Fainted: it sinks and fades, smoke rising from where it was.
      const fainting = !!v.fainted;
      const ff = fainting && this.fxFirst(`faint-${v.id}`);
      if (fainting) {
        root.child(div().absolute().left(0).top(0).children([[-14, 0], [0, -6], [13, -2], [-5, -12]].map(([dx, dy], k) => {
          const d = ff ? 6 : 18;
          return div().id(`faint-${v.id}-${k}`).absolute().left(x + dx - d / 2).top(ground - 10 + dy - (ff ? 0 : 14) - d / 2).w(d).h(d).rounded_full().bg("#9aa0a8")
            .opacity(ff ? 0.7 : 0).transition("left", { duration: 900, easing: "ease-out" }).transition("top", { duration: 900, easing: "ease-out" })
            .transition("width", { duration: 900, easing: "ease-out" }).transition("height", { duration: 900, easing: "ease-out" }).transition("opacity", { duration: 1000 });
        })));
      }
      root.child(div().id(`visitor-fight-${v.id}-${v.leg ?? 0}`).absolute().h(ground + 10).w(sw).left(x - mid)
        .top(fainting && !ff ? 8 : 0).opacity(fainting && !ff ? 0 : 1)
        .transition("top", { duration: 700, easing: "ease-in" }).transition("opacity", { duration: 900, delay: 150 })
        .child(this.withBlows(`wild-${v.id}`, fx.blow ? [fx.blow] : [], wildBody, mid, headY, ground, now,
          fx.back && travelOf(fx.wildMove?.type, fx.wildMove?.physical) === "dash" ? lungeOf(dashAt(x, fx.ownX, fx.backLaunch, fx.backHit, now, stopOfMove(fx.wildMove)), fx.wildMove, fx.backLaunch) : null)));
      // Its move, flying back at yours (fx.js: its type's look).
      if (fx.back && fx.wildMove && now >= fx.backLaunch - CHARGE_MS && now < fx.backHit + 280) {
        const dir = fx.ownX > x ? 1 : -1;
        const lb = this.moveLabel(`mvw-${v.id}-${fx.at}`, fx.wildMove, x, Math.max(2, headY - 30), fx.backLaunch, now);
        if (lb) root.child(lb);
        root.children(this.fxMove(`wildshot-${v.id}-${fx.at}`, fx.wildMove, x + dir * 14, fx.ownX - dir * 12,
          Math.round((headY + ground) / 2) - 2, fx.backLaunch, fx.backHit, now));
      }
      root.child(hpBar(x));
      // What happened, as the games say it: its hit's effect, then the hit back and its effect.
      const wildName = fullName(v.pick.dex, v.pick.form);
      const said = v.fainted ? `${wildName} fainted…`
        : now >= backAt && fx.back ? `${wildName} hit back!${fx.back.text ? ` ${fx.back.text}` : ""}${fx.back.fainted && now >= (fx.backHit ?? fx.at + 1500) ? ` ${fx.ownName} fainted!` : ""}`
        : now >= hitAt && fx.text ? fx.text.replace("it…", `${wildName}…`) : "";
      if (said) {
        const tagW = 330;
        root.child(div().absolute().left(Math.max(4, Math.min(this.width - tagW - 10, x - tagW / 2))).top(ground + 6).w(tagW).h(LABEL_H)
          .flex().items_center().justify_center().rounded(4).bg(t.chrome).text_size(10.5).text_color(t.foreground).child(said));
      }
      return;
    }
    // Its gift first; then, with a ball in the Bag, a ball over its head: click to throw it.
    const ball = !th && v.gift && now - v.giftAt > 2500 ? ballFor(bag().items, v.pick, shared(BALL_KEY)) : null;
    const showGift = !th && ((!v.gift && now - v.start > 1000) || (v.gift && now - v.giftAt < 2500));
    if (th) {
      // The ball flies up from the strip's roomier side and down onto it (fx.js THROW_UP,
      // THROW_DOWN); the Pokémon flashes into it, a burst; the ball drops to the ground and
      // wobbles once for each shake (up to three), resting between; then clicks shut ("Gotcha!",
      // gold stars) or bursts open.
      const x = th.x;
      const tt = now - th.at;
      const end = throwEnd(th.shakes);
      const settled = tt >= end;
      const size = Math.round(20 * Math.max(0.8, scale));
      const from = Math.max(size, Math.min(this.width - size, x + (x > this.width / 2 ? -170 : 170)));
      const peak = Math.max(2, headY - 34), hitY = Math.round((headY + ground) / 2 - size / 2);
      const leg = (id, x0, y0, x1, y1, ms, ease) => {
        const first = this.fxFirst(id);
        return div().id(id).absolute().left(first ? x0 - size / 2 : x1 - size / 2).top(first ? y0 : y1)
          .transition("left", { duration: ms, easing: "linear" }).transition("top", { duration: ms, easing: ease })
          .child(this.itemMark(th.ball, size));
      };
      const key = `${v.id}-${th.at}`;
      if (tt < THROW_UP) root.child(leg(`ball-up-${key}`, from, ground - size, (from + x) / 2, peak, THROW_UP, "ease-out"));
      else if (tt < THROW_UP + THROW_DOWN) root.child(leg(`ball-down-${key}`, (from + x) / 2, peak, x, hitY, THROW_DOWN, "ease-in"));
      else if (tt < SHAKE_FROM) root.child(div().absolute().left(x - size / 2).top(hitY).child(this.itemMark(th.ball, size)));
      else {
        root.child(leg(`ball-rest-${key}`, x, hitY, x, ground - size, 150, "ease-in")
          .when(!settled && wobbling(tt, th.shakes), (el) => el.loop("left", { from: x - size / 2 - 3, to: x - size / 2 + 3, period: 110 })));
      }
      // The Pokémon: standing till the ball reaches it, then flashing into it.
      if (tt < THROW_UP + THROW_DOWN) {
        root.child(div().id(`visitor-held-${v.id}`).absolute().left(x - mid).top(0).w(sw).h(ground + 10)
          .child(image(s.path).absolute().left(imgLeft).top(imgTop).w(s.w * scale).h(s.h * scale)));
      } else if (tt < SHAKE_FROM) {
        root.child(div().id(`visitor-flash-${v.id}`).absolute().left(x - mid).top(0).w(sw).h(ground + 10)
          .loop("opacity", { from: 0.15, to: 0.9, period: 120 })
          .child(image(s.path).absolute().left(imgLeft).top(imgTop).w(s.w * scale).h(s.h * scale)));
        root.child(fxBurst(`ball-hit-${key}`, MOVE.normal, 0.5, x, hitY + size / 2, this.fxFirst(`ball-hit-${key}`), th.at % 100000));
      }
      if (settled && tt < end + 520) {
        const caughtFx = th.caught ? GOLD : MOVE.normal;
        root.child(fxBurst(`ball-end-${key}`, caughtFx, th.caught ? 0.9 : 0.6, x, ground - size / 2, this.fxFirst(`ball-end-${key}`), th.at % 99991));
      }
      // Caught: the ball clicks shut (a ring snapping in), glows, and gold stars float up from it.
      if (settled && th.caught && tt < end + 1600) {
        const by = ground - size / 2, f1 = this.fxFirst(`ball-lock-${key}`), f2 = this.fxFirst(`ball-stars-${key}`);
        root.child(fxOnce(`ball-lock-${key}`, f1, { x, y: by, w: size * 3, h: size * 3, o: 0.9 }, { x, y: by, w: size, h: size, o: 0 }, 220,
          (el) => el.rounded_full().border_2().border_color("#fff2c0")));
        root.child(div().id(`ball-glow-${key}`).absolute().left(x - size).top(by - size).size(size * 2).rounded_full().bg("#ffe9a8")
          .opacity(tt < end + 1300 ? 0.45 : 0).transition("opacity", { duration: 300 }).loop("opacity", { from: 0.15, to: 0.5, period: 500 }));
        root.child(div().absolute().left(0).top(0).children([[-16, 46, 900], [-6, 58, 1100], [6, 52, 1000], [16, 42, 850], [0, 66, 1200]].map(([dx, rise, ms], k) =>
          fxOnce(`ball-star-${key}-${k}`, f2, { x: x + dx * 0.3, y: by, w: 5, h: 5, o: 1 }, { x: x + dx, y: by - rise, w: 3, h: 3, o: 0 }, ms,
            (el) => el.rounded_full().bg(k % 2 ? "#ffd75e" : "#ffffff")))));
      }
      if (settled && (th.caught || th.fled)) {
        const tagW = 260;
        root.child(div().absolute().left(Math.max(4, Math.min(this.width - tagW - 10, x - tagW / 2))).top(Math.max(2, ground - size - 22)).w(tagW).h(LABEL_H)
          .flex().items_center().justify_center().rounded(4).bg(t.chrome).text_size(10.5).font_semibold().text_color(t.foreground)
          .child(sparkled(th.fled ? `${fullName(v.pick.dex, v.pick.form)} ran away!` : `✨ Gotcha! ${v.pick.alpha ? (v.pick.shadow ? "Shadow Alpha " : "Alpha ") : ""}${fullName(v.pick.dex, v.pick.form)}${v.pick.gender ? ` ${genderMark(v.pick.gender)}` : ""} → Box${v.recordTag ? ` · ${v.recordTag}, the ${v.recordTag === "XXL" ? "biggest" : "smallest"} yet!` : ""}${v.extra ? ` · +${ITEMS[v.extra].name}` : ""}`)));
      }
      return;
    }
    // It walks as the herd does: drawn first where it sets off, then sent to the far edge under one
    // transition lasting the rest of its walk. A short transition re-aimed every tick drew nothing
    // at all, or only its 🎁 (a lone gift crossing the sky). (A new leg after a ball: new ids.)
    const placed = v.walkFrom !== undefined;
    v.walkFrom ??= now;
    const left = placed ? v.to : v.from;
    const leg = v.leg ?? 0;
    const baitNow = baitFor(bag().items, v.pick, ball, shared(BAIT_KEY));
    const rate = Math.round(100 * catchChance(ball ?? "poke-ball", v.pick, baitNow));
    root.child(div().id(`visitor-${v.id}-${leg}`).absolute().top(0).h(ground + 10).w(sw).left(left - mid)
      .transition("left", { duration: Math.max(1, Math.round(v.dur - (v.walkFrom - v.start))), easing: "linear" })
      .child(div()
        .child(div().absolute().left(mid - shadowW / 2).top(ground - 2 * scale).w(shadowW).h(6 * scale).rounded_full().bg("#00000030"))
        .when(!!v.pick.alpha, (el) => el.child(alphaGlow(mid, ground, s.box, scale, !!v.pick.shadow)))
        .child(image(s.path).absolute().left(imgLeft).top(imgTop).w(s.w * scale).h(s.h * scale))
        // An Alpha: a name tag under its feet as the herd's have: α and its species.
        .when(!!v.pick.alpha, (el) => el.child(h_flex().absolute().left(0).w(sw).top(ground + 6).justify_center()
          .child(h_flex().h(LABEL_H).px(5).gap(4).rounded(4).items_center().bg(t.chrome)
            .child(alphaTag())
            .child(div().text_size(10.5).text_color(v.pick.shadow ? "#c08aff" : t.muted).child(`${v.pick.shadow ? "Shadow " : ""}${fullName(v.pick.dex, v.pick.form)}`)))))
        // An XXL or XXS that would be its species' biggest or smallest yet: that, under its feet.
        // Any other's size is only in the Box.
        .when(!v.pick.alpha && !!(v.sizeTag ??= recordSize(pokedex().sizes, v.pick) ?? ""), (el) => el.child(h_flex().absolute().left(0).w(sw).top(ground + 6).justify_center()
          .child(div().h(LABEL_H).px(5).rounded(4).flex().items_center().bg("#000000b0").text_size(10.5).font_bold().text_color("#ffd23f").child(`${v.sizeTag} · ${v.sizeTag === "XXL" ? "biggest" : "smallest"} yet`))))
        .when(hp < 1, (el) => el.child(hpBar(mid))))
      // Hover: what it is; a click: its gift (once), then a ball, if you have one.
      .child(div().id(`visitor-hit-${v.id}-${leg}`).absolute().left(hit.left).top(hit.top).w(hit.w).h(hit.h).cursor_pointer()
        // Hovered (it walks under the pointer, so hover comes and goes): its tag stays up while
        // the pointer is on it and 2.5 s after, for this visitor only.
        .on_hover((h, cx) => { this.visitorHover = { id: v.id, until: h ? Infinity : Date.now() + 2500 }; cx.notify(); })
        // Right-click: the next ball to throw (Auto, then each kind you have).
        .on_mouse_down("right", (_e, cx) => {
          cx.stop_propagation();
          const items = bag().items;
          const ways = [null, ...BALLS.filter((id) => items[id])];
          const cur = ways.indexOf(BALLS.includes(shared(BALL_KEY)) && items[shared(BALL_KEY)] ? shared(BALL_KEY) : null);
          setShared(BALL_KEY, ways[(cur + 1) % ways.length]);
          this.ballSwitched = Date.now();
          cx.notify();
        })
        .on_click((_e, cx) => {
          if (!v.gift) {
            const g = visitorGift();
            v.gift = g.id;
            v.giftN = g.n * (v.pick.alpha ? 2 : 1); // an Alpha leaves twice as much
            v.giftAt = Date.now();
            saveBag(addItem(bag(), g.id, v.giftN));
            research("gift");
            if (v.purse) v.paid = earn("purse", v.purse);
          } else if (Date.now() - v.giftAt > 800) this.throwAt(v);
          cx.notify();
        }))
      // Every visitor carries a gift: 🎁 over its head, pulsing, until you click it; then what it
      // left; then a ball to throw. A legendary one glows.
      .when(!!v.pick.legend, (el) => el.child(div().absolute().left(mid - 9).top(Math.max(2, headY - 34)).text_size(12)
        .child("✦")))
      // Over its head, side by side and centred: the gift (🎁, then what it left: "×3" for a few)
      // and its purse ("₽25", then "+₽25" once taken). One row, so neither covers the other.
      .when(showGift, (el) => el.child(h_flex().absolute().left(0).w(sw).top(Math.max(2, headY - 18)).h(18).justify_center().items_center().gap(4)
        .child(div().text_size(13)
          
          .child(v.gift ? h_flex().items_center().gap(1).child(this.itemMark(v.gift, 18)).when((v.giftN ?? 1) > 1, (e2) => e2.child(div().text_size(10).font_semibold().text_color("#ffffff").child(`×${v.giftN}`))) : "🎁"))
        .when(!v.gift ? v.purse > 0 : v.paid > 0, (e2) => e2.child(div().h(14).px(3).rounded(3).flex().items_center()
          .bg("#00000055").text_size(10).font_semibold().text_color(v.pick.legend || v.purse >= 60 ? "#f2c94c" : "#ffffff")
          .child(v.gift ? `+${money(v.paid)}` : money(v.purse))))))
      .when(!!ball, (el) => el.child(div().absolute().left(mid - 8).top(Math.max(2, headY - 18))
        
        .child(this.itemMark(ball, 18)))));
    const broke = v.broke && now - v.broke < 2500;
    const hovered = this.visitorHover?.id === v.id && now < this.visitorHover.until;
    // Not once it's walked off the strip (its tag stuck at the edge, saying "click it").
    const onStrip = v.x >= 0 && v.x <= this.width;
    if (onStrip && (hovered || broke || now - (this.ballSwitched ?? 0) < 1500)) {
      const tagW = Math.min(420, this.width - 12); // never past a narrow strip's edges
      const what = `${v.pick.legend ? "A legendary" : v.pick.alpha ? (v.pick.shadow ? "A Shadow Alpha" : "An Alpha") : "A wild"} ${v.pick.shiny ? "✨ " : ""}${fullName(v.pick.dex, v.pick.form)}${v.pick.gender ? ` ${genderMark(v.pick.gender)}` : ""}`;
      const tail = broke ? " broke free!"
        : !v.gift ? `: click it${v.purse ? ` (${money(v.purse)} and a gift)` : ""}`
        : now - v.giftAt < 2500 ? ` left you ${(v.giftN ?? 1) > 1 ? `${v.giftN} ${ITEMS[v.gift].name}s` : `${/^[AEIOU]/.test(ITEMS[v.gift].name) ? "an" : "a"} ${ITEMS[v.gift].name}`}${v.paid ? ` and ${money(v.paid)}` : ""}`
        : ball ? `: click to throw ${an(ITEMS[ball].name)}${shared(BALL_KEY) === ball ? "" : " (Auto)"}${baitNow ? ` + ${ITEMS[baitNow].name}` : ""}, ${rate}% to catch${v.pick.legend ? ` · ${LEGEND_THROWS - (v.throws ?? 0)} balls before it runs away` : ""}`
        : ": no Poké Balls (the Shop has them)";
      root.child(div().absolute().left(Math.max(4, Math.min(this.width - tagW - 6, v.x - tagW / 2))).top(ground + 6).w(tagW).h(LABEL_H)
        .flex().items_center().justify_center().overflow_hidden().rounded(4).bg(t.chrome).text_size(10.5).text_color(t.foreground)
        .child(sparkled(`${what}${hp < 1 ? ` · HP ${Math.round(hp * 100)}%` : ""}${tail}`)));
    }
  }

  // An icon beside its head for a few seconds: a find, a heart, a berry eaten.
  // `item`: an item's id, drawn as its sprite (once downloaded) instead of the emoji.
  note(m, icon, now, ms = 5000, item = null) {
    m.note = { icon, until: now + ms, ...(item ? { item } : {}) };
  }

  // An item's look on the strip: its sprite once it's in, else its emoji (size px).
  itemMark(id, size) {
    const art = ITEMS[id]?.art;
    if (art && !ART_READY.has(art) && !ART_ASKED.has(art)) {
      ART_ASKED.add(art);
      ensureArt(art).then(() => ART_READY.add(art)).catch(() => null);
    }
    return art && ART_READY.has(art) ? image(artPath(art)).size(size).flex_none() : div().child(ITEMS[id]?.icon ?? "");
  }

  // Friendship and Pickup, each tick. Waiting on you: after HUNGRY_MS it's hungry (a heart down);
  // answered within QUICK_MS, a heart up; answered when hungry, it eats a Berry from the Bag if
  // there is one (a heart back). Idle (its agent not working nor waiting): now and then it finds
  // an item (items.js pickup) for the Bag.
  care(a, m, now) {
    // Fed a Berry (the Bag, the Box: HP_KEY kept higher than it has): it heals, 💚.
    const kept = a.pane && shared(HP_KEY)?.[a.pane];
    if (kept && kept.at > (m.hpAt ?? 0) && now >= (m.restUntil ?? 0)) {
      const before = ownHp(m, now);
      m.hp = kept.hp;
      m.hpAt = kept.at;
      if (ownHp(m, now) > before + 0.01) { m.hpLost = { prev: before, at: now }; this.note(m, "💚", now, 2500); }
    }
    if (!this.leader) { if (m.note && now >= m.note.until) m.note = null; return; } // another strip counts
    // Hunger, Berries and quick-answer hearts are for agents with a pane (a sub-agent's Pokémon
    // is its agent's, younger: it has no friendship of its own to feed).
    if (!a.pane) { m.blockedAt = undefined; m.hungry = false; }
    else if (a.status === "blocked") {
      m.blockedAt ??= now;
      // Leftovers: never hungry, however long its agent waits.
      if (!m.hungry && now - m.blockedAt >= HUNGRY_MS && savedPicks()[a.pane]?.held !== "leftovers") {
        m.hungry = true;
        updatePick(a.pane, (p) => withFriend(p, FRIEND.hungry));
      }
    } else if (m.blockedAt !== undefined) {
      if (m.hungry) {
        if (bag().items.berry) {
          saveBag(addItem(bag(), "berry", -1));
          updatePick(a.pane, (p) => withFriend(p, FRIEND.meal));
          this.note(m, ITEMS.berry.icon, now, 5000, "berry");
          research("berry");
        }
      } else if (now - m.blockedAt < QUICK_MS && now - (petAt[a.pane] ?? 0) > PET_MS / 3) {
        petAt[a.pane] = now;
        if (updatePick(a.pane, (p) => withFriend(p, FRIEND.quick))) this.note(m, "💗", now);
        research("quick");
      }
      m.blockedAt = undefined;
      m.hungry = false;
    }
    // An Amulet Coin: finds come twice as often.
    const every = () => pickupDelay() / (a.pane && savedPicks()[a.pane]?.held === "amulet-coin" ? 2 : 1);
    m.pickupAt ??= now + every();
    if (now >= m.pickupAt) {
      m.pickupAt = now + every();
      if (a.status !== "working" && a.status !== "blocked" && settingsNow().pickup) {
        const id = pickup();
        saveBag(addItem(bag(), id));
        this.note(m, ITEMS[id].icon, now, 8000, id);
      }
    }
    if (m.note && now >= m.note.until) m.note = null;
  }

  // Rows: grows or shrinks this block to hold them (props.block names it, default the mod id).
  fitHeight(g) {
    const want = g.rows * g.rowH;
    if (want === this.asked) return;
    this.asked = want;
    run("layout.resize", { id: props()?.block ?? MOD, px: want });
  }

  tick(cx) {
    const now = Date.now();
    dev?.tick?.(this, devApi, now); // dev.js, on this machine only
    const list = herdAgents();
    const tabs = tabsById();
    // One strip counts (jobs, finds, hunger, Berries, gifts, new agents' Pokémon): the leader.
    this.me ??= `${now}-${Math.random().toString(36).slice(2, 8)}`;
    this.leader = leaderOf(COPIES, this.me, now);
    // A new player (no Pokémon saved yet, the first time): their agents as cards in the sidebar.
    if (this.leader && !shared(CARDS_KEY)) {
      setShared(CARDS_KEY, now);
      if (!Object.keys(savedPicks()).length) this.firstCards = now;
    }
    if (this.firstCards) this.defaultCards(now);
    if (this.leader && !this.firstCards && this.sidebarMod && !shared(MOVED_KEY)) this.moveToPokemonSidebar(now);
    if (this.leader && !this.paidBack) { this.paidBack = true; this.backPayOnce(); }
    const { ids, fresh, family } = assignAll(list, { write: this.leader });
    if (this.leader && Object.keys(fresh).length) {
      // A new agent given a species raised before (the Box): that very Pokémon, moved over.
      const onScreen = new Set(list.map((a) => a.pane).filter(Boolean));
      const saved = savedPicks();
      const forget = [];
      for (const [pane, p] of Object.entries(fresh)) {
        const boxed = fromBox(p, saved, onScreen, pane);
        if (!boxed || forget.includes(boxed.slot)) continue;
        fresh[pane] = boxed.pick;
        ids[list.find((a) => a.pane === pane)?.address] = boxed.pick;
        forget.push(boxed.slot);
      }
      savePicks(fresh); // keeps new agents' Pokémon stable
      forgetPanes(forget);
    }
    if (this.leader) this.publishIcons(list, ids, cx); // agent-icons / agent-cards for the sidebar
    // Every 6 hours: is a newer version out (latestVersion reads GitHub once a day at most)? Then,
    // Settings → Updates → Update by itself, install it (one window does: the counting one).
    if (this.leader && now - (this.latestAt ?? now - 6 * 3600000 + 60000) >= 6 * 3600000) {
      this.latestAt = now;
      cx.spawn(async (cx) => {
        try { this.latest = await latestVersion(); } catch {}
        this.autoUpdate();
        cx.notify();
      });
    }
    // Once a minute: the Pokédex has seen the herd; a new day's Research is drawn (yesterday summed up).
    if (this.leader && now - (this.dexAt ?? 0) > 60000) {
      this.dexAt = now;
      const seen = withSeen(pokedex(), Object.values(ids).map((p) => p.dex));
      if (seen) saveDex(seen);
      // Caught ones that evolved since (with an agent or in the Box): their new species caught too.
      const evolved = withEvolved(pokedex(), Object.values(savedPicks()));
      if (evolved) { saveDex(evolved); payDexGoals(); }
      const day = dailyNow(now);
      if (shared(DAILY_KEY)?.day !== day.day) setShared(DAILY_KEY, day);
    }
    if (this.magick) {
      for (const a of list) {
        const p = ids[a.address];
        this.want(p, cx);
        if (megaShown(p, this.megaStatus(a))) this.want(p, cx, true); // its Mega, fetched when first needed
      }
    }

    const g = this.grid(list.length);
    if (g) this.fitHeight(g);
    if (!this.sized) return; // placing them in a guessed width would pile them at the edge
    let changed = false;
    // Shop boosts on now (items.js), for the whole herd.
    const boosts = loadBoosts(shared(BOOSTS_KEY), now);
    // A Festival Ticket just used: everyone celebrates under the fireworks.
    const fest = shared(FESTIVAL_KEY) ?? 0;
    const festNew = this.festSeen !== undefined && fest > this.festSeen && now - fest < 10000;
    this.festSeen = fest;
    if (now - fest < FESTIVAL_MS) changed = true;
    if (this.resume) { this.resume = false; changed = true; } // after a gap: walk on (renderStrip)
    const live = new Set();
    // Where the resting others on agent i's row are, or are headed (read live, so one move frees
    // the next). Working ones are left out: they keep walking, so nobody makes room for them.
    const rowAt = (b, j) => (g ? Math.min(this.mons[b.address]?.row ?? j % g.rows, g.rows - 1) : 0);
    const othersOnRow = (i) => list
      .filter((b, j) => j !== i && this.mons[b.address] && this.mons[b.address].mood !== "working" && rowAt(b, j) === rowAt(list[i], i))
      .map((b) => { const o = this.mons[b.address]; return o.moving ? o.target : o.x; });
    const rowCounts = [];
    list.forEach((b, j) => { const r = rowAt(b, j); rowCounts[r] = (rowCounts[r] ?? 0) + 1; });
    const hiFor = (w) => Math.max(EDGE, w - EDGE);
    const walk = (m, target, speed) => {
      // Already there: no walk (a zero-length walk would divide 0 by 0 and lose the Pokémon).
      if (!(Math.abs(target - m.x) >= 1)) return;
      if (this.tired) speed *= 0.6;
      if (boosts["x-speed"]) speed *= 1.6;
      m.from = m.x;
      m.target = target;
      m.dir = target > m.x ? "r" : "l";
      m.start = now;
      m.dur = (Math.abs(target - m.x) / speed) * 1000;
      m.moving = true;
    };
    // The clock: night makes them sleep sooner; with Scenery on, the season gives idle ones
    // something to react to (the season it mostly is now).
    const date = new Date(now);
    const after = sleepAfter(nightness(date.getHours() + date.getMinutes() / 60));
    const s = seasonAt(date);
    const season = props()?.background !== "plain" ? (s.t < 0.5 ? s.a : s.b) : null;
    // The weather: how long each agent waiting on you has waited (care() notes when it started).
    const waits = list.filter((a) => a.status === "blocked").map((a) => now - (this.mons[a.address]?.blockedAt ?? now));
    const weather = season !== null && settingsNow().weather ? weatherOf(waits) : "clear";
    if (weather !== this.weather) {
      // The rain stops (nobody waits on you any more): a rainbow, somewhere in the middle of the sky.
      if ((this.weather === "rain" || this.weather === "storm") && weather === "clear") this.rainbow = { at: now, x: rand(0.25, 0.75) };
      if (weather === "storm") { this.stormAt = now; cx.timer.after(260, (c) => c.notify()); } // its one flash, then gone
      this.weather = weather;
      changed = true;
    }
    if (this.rainbow && now - this.rainbow.at >= RAINBOW_MS) { this.rainbow = null; changed = true; }
    // Rivals: agents working in one folder at once (they may edit each other's files): ⚔️ over them.
    const rivals = rivalsOf(list, foldersNow());
    this.rivals = rivals;
    // Tired: the 5-hour window nearly used up (Usage Limits): slower steps, and working ones sweat.
    const tired = settingsNow().tired && (sessionUsed(shared("usage-limits.state")) ?? 0) >= TIRED_AT;
    if (tired !== !!this.tired) { this.tired = tired; changed = true; }
    // Campfire: at night, nobody working or waiting on you: a fire in the middle of each row and
    // the herd round it, each on its own side as it was, asleep and facing the fire.
    const camp = settingsNow().campfire && season !== null && nightness(date.getHours() + date.getMinutes() / 60) >= 0.5
      && list.length > 0 && list.every((a) => a.status !== "working" && a.status !== "blocked");
    if (camp !== !!this.campfire) {
      this.campfire = camp ? { n: -1 } : null;
      for (const m of Object.values(this.mons)) m.seat = undefined;
      changed = true;
    }
    const unseated = this.campfire && list.some((a) => this.mons[a.address] && this.mons[a.address].seat === undefined);
    if (this.campfire && (unseated || this.campfire.n !== list.length || this.campfire.w !== this.width) && hiFor(this.width) > EDGE) {
      // Seats, per row, given out left to right: again when an agent comes or goes, one turns
      // up without a seat (the strip had just started), or the strip changes width.
      this.campfire.n = list.length;
      this.campfire.w = this.width;
      const rows = g ? g.rows : 1;
      for (let r = 0; r < rows; r++) {
        const members = list.filter((a, j) => rowAt(a, j) === r && this.mons[a.address]).map((a) => this.mons[a.address]).sort((x, y) => x.x - y.x);
        const seats = campSeats(members.length, this.width / 2, CAMP_GAP, EDGE, hiFor(this.width));
        members.forEach((m, k) => { m.seat = seats[k]; });
      }
    }
    // Whose agent you just focused: that Pokémon wakes up and looks at you.
    const focus = focusEdge(this.lastFocus, list);
    this.lastFocus = focus.addr;
    // One agent throwing must not stop the others.
    forEachSafe(list, (a, i) => {
      live.add(a.address);
      if (this.drag?.moved && this.drag.addr === a.address) return; // the pointer moves this one
      const lo = EDGE;
      const hi = Math.max(lo, this.width - EDGE);
      let m = this.mons[a.address];
      // Never lose one to a bad number: back inside the strip, standing.
      if (m && !Number.isFinite(m.x)) { m.x = m.from = m.target = clamp(Number.isFinite(m.target) ? m.target : (lo + hi) / 2, lo, hi); m.moving = false; m.dur = 150; }
      if (!m) {
        // Spread over its own row: agent i is the k-th of `inRow` on row i % rows.
        const rows = g ? g.rows : 1;
        const k = Math.floor(i / rows);
        const inRow = Math.ceil((list.length - (i % rows)) / rows);
        const x = clamp(((k + 0.5) / inRow) * this.width + rand(-20, 20), lo, hi);
        m = this.mons[a.address] = { x, from: x, target: x, dir: Math.random() < 0.5 ? "l" : "r", moving: false, start: 0, dur: 0, pauseUntil: now + rand(300, 2500), mood: null, status: a.status, react: null, awakeUntil: 0, sparkleUntil: ids[a.address]?.shiny ? now + 2500 : 0 };
        m.run = statusChange({}, undefined, a.status, now).run; // already working: counts from now
        changed = true;
      }
      // Reactions (react.js): to its agent's status changing, and to you focusing it.
      const meta = this.spriteFor(ids[a.address], this.megaStatus(a));
      // Mega Evolution (or back): a flash of sparkles.
      const mega = meta?.megaShown === true;
      // In full as its agent starts working; the short one for a battle (it shouldn't wait on it).
      // (No ✨ flash with it: the effect is its own.)
      if (m.mega !== undefined && mega !== m.mega) {
        const full = mega && (m.battleUntil ?? 0) <= now;
        m.megaFx = { at: now, on: mega, full };
        changed = true;
      }
      m.mega = mega;
      // It just evolved (here, or in the picker): sparkles.
      const evolvedAt = ids[a.address]?.evolvedAt ?? 0;
      if (now - evolvedAt < 3000 && (m.flashUntil ?? 0) < evolvedAt + 3000) { m.flashUntil = evolvedAt + 3000; changed = true; }
      if (now - evolvedAt < EVOLVE_MS && m.evolveFx?.at !== evolvedAt) {
        // What it was (the species it evolved from, in the same regional form if that one has it):
        // drawn till the burst, its white shape switching with the new one's.
        const p = ids[a.address], prevDex = EVOLVES_FROM[p?.dex];
        const from = prevDex ? { ...p, dex: prevDex, form: p.form && hasForm(prevDex, p.form) ? p.form : undefined } : null;
        if (from && !from.form) delete from.form;
        if (from) this.want(from, cx);
        m.evolveFx = { at: evolvedAt, from };
        changed = true;
      }
      if (m.flashUntil && now >= m.flashUntil) { m.flashUntil = 0; changed = true; }
      const rival = !!rivals[a.address];
      if (rival !== !!m.rival) { m.rival = rival; changed = true; }
      const noted = !!m.note;
      this.care(a, m, now);
      if (noted !== !!m.note) changed = true;
      const has = new Set(Object.keys(meta?.react ?? {}));
      const msOf = (name) => meta.react[name].ms;
      // A caught Pokémon's nature (trainer.js): a Lazy one naps sooner, a Calm one later.
      const pk = ids[a.address];
      const raw = moodOf(a, tabs, now, after * natureMul(pk, "sleep"));
      if (m.status !== a.status) {
        // When it changed, for the Party list's "3m" (200 agents at most, the oldest forgotten).
        if (this.leader) {
          const since = { ...(shared(SINCE_KEY) ?? {}), [a.address]: now };
          const keys = Object.keys(since);
          for (let k = 0; k < keys.length - 200; k++) delete since[keys[k]];
          setShared(SINCE_KEY, since);
          // One cry, from the counting strip only.
          const st = settingsNow();
          if ((a.status === "blocked" && st.cryBlocked) || (a.status === "done" && st.cryDone)) cry(ids[a.address].dex);
        }
        onStatus(m, m.status, a.status, now, has, msOf); this.count(a, ids[a.address], m, a.status, now); m.status = a.status; changed = true; }
      if (focus.react === a.address) { onFocus(m, effectiveMood(raw, m, now), now, has, msOf); changed = true; }
      // Poké Flute: those asleep wake now (once per use), and all stay up while it lasts.
      const flute = boosts["poke-flute"];
      if (flute && m.fluted !== flute) {
        m.fluted = flute;
        if (effectiveMood(raw, m, now) === "sleep") { onFocus(m, "sleep", now, has, msOf); changed = true; }
        m.awakeUntil = Math.max(m.awakeUntil ?? 0, flute);
      }
      if (festNew) { onCelebrate(m, now, has, msOf); m.pauseUntil = m.react.until + rand(500, 2000); changed = true; }
      // Asleep, it stirs now and then: up a little while, then back to sleep.
      if (onStir(m, effectiveMood(raw, m, now), now, nightness(date.getHours() + date.getMinutes() / 60) >= 0.5, has, msOf)) changed = true;
      const mood = effectiveMood(raw, m, now);
      if (mood !== m.mood) { m.mood = mood; changed = true; }
      const reacting = !!m.react && now < m.react.until;
      if (reacting) changed = true; // its sprite goes from the animation to facing you
      else if (m.react) { m.react = null; changed = true; }
      if (m.sparkleUntil && now >= m.sparkleUntil) { m.sparkleUntil = 0; changed = true; }
      // A sub-agent's Pokémon on top of its agent's (it turned up there, or they both stopped):
      // it steps to one side, so both show.
      const leadM = family[a.address] && this.mons[family[a.address]];
      if (leadM && !m.moving && !leadM.moving && !reacting && Math.abs(m.x - leadM.x) < 30 && hi > lo) {
        // Its own side, or the other when the edge leaves no room there.
        const side = m.x <= leadM.x ? -1 : 1;
        const spot = [side, -side].map((d) => clamp(leadM.x + d * 44, lo, hi)).find((x) => Math.abs(x - m.x) >= 8);
        if (spot !== undefined) { walk(m, spot, SPEED.idle); changed = true; }
      }
      // At the campfire: walk to its seat (asleep or not), then stay there facing the fire.
      if (this.campfire && m.seat !== undefined && !m.moving && !m.entering && !reacting) {
        if (Math.abs(m.x - m.seat) >= 8) { walk(m, m.seat, SPEED.idle); m.shuffle = true; m.wrap = false; changed = true; }
        else { m.dir = this.width / 2 > m.x ? "r" : "l"; m.pauseUntil = now + 60000; }
      }
      if (m.moving) {
        const f = clamp((now - m.start) / m.dur, 0, 1);
        if (!m.wrap && (m.target < lo || m.target > hi)) {
          // The strip got narrower mid-walk: stop inside it instead of walking off the edge.
          m.x = m.target = clamp(m.from + (m.target - m.from) * f, lo, hi);
          m.moving = false;
          m.dur = 150;
          m.pauseUntil = now + rand(1000, 3000);
          changed = true;
        } else if (f >= 1 && m.wrap && g) {
          // Off the edge: it turns up just outside the other edge of the next row, and walks in.
          m.row = wrapRow(rowAt(a, i), m.dir, g.rows);
          m.x = m.from = m.target = entryX(m.dir, this.width, OFF);
          m.moving = false;
          m.dur = 1; // a jump, not a slide
          m.wrap = false;
          m.entering = true;
          m.pauseUntil = now;
          changed = true;
        } else if (f >= 1) {
          m.moving = false;
          m.x = m.target;
          if (!m.backstep) m.pauseUntil = m.shuffle ? now + 5000 : family[a.address] ? now + rand(600, 1500) : now + (mood === "working" ? rand(300, 1800) : boosts["x-speed"] ? rand(800, 2500) : rand(4000, 12000));
          m.shuffle = false;
          m.backstep = false;
          changed = true;
        } else if (!m.backstep && ((mood !== "working" && mood !== "idle" && !m.shuffle) || reacting)) {
          m.shuffle = false;
          m.wrap = false;
          // Stop where it is: something needs the person, or it fell asleep.
          m.x = m.target = m.from + (m.target - m.from) * f;
          m.moving = false;
          m.dur = 150;
          changed = true;
        }
      } else if (mood === "idle" && !reacting && now >= m.pauseUntil && season !== null && Math.random() < SEASON_CHANCE
        && onSeason(m, season, now, has, msOf)) {
        // Instead of strolling on, it sniffs the flowers, basks, looks up at the leaves or shivers.
        m.pauseUntil = m.react.until + rand(3000, 8000);
        changed = true;
      } else if (mood === "idle" && !reacting && now >= m.pauseUntil && Math.random() < (boosts["soda-pop"] ? 0.45 : FIDGET_CHANCE * natureMul(pk, "fidget")) && onFidget(m, now, has, msOf, Math.random, !!boosts["soda-pop"])) {
        // Whatever the season: it nods, sits, looks up, twirls… (whatever its sprite can do).
        m.pauseUntil = m.react.until + rand(3000, 8000);
        changed = true;
      } else if ((mood === "working" || mood === "idle") && !reacting && now >= m.pauseUntil && hi > lo) {
        let target = rand(lo, hi);
        if (!m.entering && Math.abs(target - m.x) < 60) target = m.x + (target >= m.x ? 60 : -60);
        target = clamp(target, lo, hi);
        // Stop somewhere with room for a name, clear of those resting (working ones too, so
        // they don't make a sleeper shuffle aside).
        target = restSpot(target, othersOnRow(i), lo, hi, REST_GAP);
        // A sub-agent's Pokémon keeps close to its agent's: just behind it, whichever side it is on.
        const lead = family[a.address] && this.mons[family[a.address]];
        if (lead) target = clamp((lead.moving ? lead.target : lead.x) + (m.x < lead.x ? -1 : 1) * rand(36, 56), lo, hi);
        // With rows, now and then it walks off the edge and carries on along the next row.
        const way = Math.random() < 0.5 ? "l" : "r";
        const wrap = !!g && g.rows > 1 && !m.entering && Math.random() < WRAP_CHANCE
          && wrapOk(rowCounts, wrapRow(rowAt(a, i), way, g.rows), list.length, g.rows) && !lead;
        if (wrap) target = exitX(way, this.width, OFF);
        m.entering = false;
        if (Math.abs(target - m.x) >= 8) {
          walk(m, target, SPEED[mood] * natureMul(pk, "speed")); // a Hasty one walks faster
          m.wrap = wrap;
          changed = true;
        } else {
          m.pauseUntil = now + rand(1000, 3000);
        }
      } else if (!m.moving && mood !== "blocked" && !reacting && now >= m.pauseUntil && hi > lo) {
        // Resting on top of another resting one (asleep, done, or dropped there long ago): shuffle aside.
        const others = othersOnRow(i);
        const spot = restSpot(m.x, others, lo, hi, REST_GAP);
        if (Math.abs(spot - m.x) >= 8 && roomAt(spot, others) >= roomAt(m.x, others) + 8) {
          walk(m, spot, SPEED.idle);
          m.shuffle = true;
          changed = true;
        } else {
          m.pauseUntil = now + 5000; // look again in a while
        }
      }
      if (m.entering && !m.moving && (mood !== "working" && mood !== "idle")) m.entering = false; // walks in below
      // Outside the strip and not walking in (or no room to walk in): step back inside.
      if (!m.moving && (!m.entering || !(hi > lo)) && (m.x < lo || m.x > hi)) {
        m.entering = false;
        m.x = m.target = clamp(m.x, lo, hi);
        m.dur = 150;
        changed = true;
      }
    }, console.log, now, this.errSeen);
    const hasOf = (meta) => new Set(Object.keys(meta?.react ?? {}));
    const msFor = (meta) => (name) => meta.react[name].ms;
    // A battle between two agents' Pokémon (react.js battle): what each can do, and its type.
    // `friend`: friendship both gain besides (a spar of their own, one set up by a drop), saved
    // with the result in one write (each write redraws every mod in every window).
    const fight = (a1, m1, a2, m2, friend = 0) => {
      // Each fights as it will look (its Mega, for a battle; its regional form): its special move is
      // its type that does most to the other (fx.js draws it; Mega Charizard X's fire is blue).
      const keyOf = (a) => {
        const p = ids[a.address];
        return p ? fighterKey(p.dex, { form: p.form, mega: megaShown(p, "working") ? (megaForm(p.dex, p.megaKind)?.kind ?? "") : null }) : 0;
      };
      const [k1, k2] = [keyOf(a1), keyOf(a2)];
      const side = (a, k, o) => {
        const meta = this.spriteFor(ids[a.address], a.status);
        const move = k && o ? { ...this.boosted(pickMove(k, o, Math.random, { targetSize: ids[(a === a1 ? a2 : a1).address]?.size, moves: ids[a.address]?.moves })), blue: k === "6mX" } : null; // its move (moves.js), named
        return { has: hasOf(meta), msOf: msFor(meta), icon: TYPE_ICON[typeOf(ids[a.address]?.dex)] ?? "⭐", ...(move ? { move } : {}) };
      };
      // Too close: they hop apart first (a quick slide, facing each other), then battle, room
      // between them for their moves by their sizes (fx.js fightGap).
      const spots = battleSpots(m1.x, m2.x, EDGE, hiFor(this.width),
        fightGap(this.drawnWidth(ids[a1.address], a1.status), this.drawnWidth(ids[a2.address], a2.status)));
      const BACK = 350;
      const back = Math.abs(spots.ax - m1.x) >= 4 || Math.abs(spots.bx - m2.x) >= 4;
      for (const [m, to] of [[m1, spots.ax], [m2, spots.bx]]) {
        if (Math.abs(to - m.x) < 1) continue;
        clearWalk(m);
        m.from = m.x;
        m.target = to;
        m.start = now;
        m.dur = BACK;
        m.moving = true;
        m.backstep = true;
      }
      // Either Mega Evolving for it: the battle waits till that's done (it was fought under it),
      // longer when its Mega sprites aren't in yet (asked for now).
      let wait = 0;
      for (const [a, m] of [[a1, m1], [a2, m2]]) {
        const p = ids[a.address];
        if (!p || !megaShown(p, "working") || m.mega) continue;
        const ready = !!this.sprites[spriteKey(dressed(p), true)]?.walkR;
        if (!ready) this.want(p, cx, true);
        wait = Math.max(wait, MEGA_SHORT.burst + (ready ? 500 : 1800));
      }
      // A real battle (spar.js): turns of named moves, health, a winner (react.js duel plays it).
      if (k1 && k2) {
        const sideOf = (a, k) => { const p = ids[a.address] ?? {}; return { key: k, alpha: !!p.alpha, shadow: !!p.shadow, hearts: p.hearts ?? 0, size: p.size, effort: effortOf(p), nature: p.nature, moves: p.moves }; };
        const result = sparTurns(sideOf(a1, k1), sideOf(a2, k2), Math.random, (mv) => this.boosted(mv));
        for (const tn of result.turns) if (tn.move) tn.move.blue = (tn.by === "a" ? k1 : k2) === "6mX"; // Mega Charizard X's blue fire (a turn it lost has no move)
        duel(m1, m2, side(a1, k1, k2), side(a2, k2, k1), now + wait, result, back ? { ...spots, back: BACK } : spots);
        for (const [m, a, o] of [[m1, a1, a2], [m2, a2, a1]]) {
          const [mine, theirs] = [ids[a.address], ids[o.address]];
          const steps = m.react.seq.filter((st) => st.blow && st.move);
          for (const st of steps) {
            const mv = st.move, eff = st.eff ?? 1;
            (m.blows ??= []).push({ at: st.at, dir: m.react.face === "r" ? -1 : 1, p: mv.ultimate || mv.crit ? Math.max(0.85, power(eff)) : power(eff), kb: knockMul(theirs?.size, mine?.size),
              style: moveStyle(mv.type, mv.blue), word: blowWord(eff, mv.crit), num: damageText(st.dmg, eff), type: mv.type, name: mv.name, miss: mv.miss, physical: mv.physical });
          }
          // Its health through the battle: full, then what each blow (or its burn) leaves it.
          m.sparHp = { until: m.react.until, steps: m.react.seq.filter((st) => st.hp !== undefined).map((st) => ({ at: st.at, hp: st.hp })) };
          // The game's words over it: "It's paralyzed!", "It flinched!", "Hurt by its burn!".
          m.sparNotes = m.react.seq.filter((st) => st.note).map((st) => ({ at: st.at, until: st.until, text: NOTE_TEXT[st.note[0]][st.note[1]], color: STATUS_COLOR[st.note[1]] ?? "#ffffff" }));
        }
        // The winner: a little more friendship, the pair's record, its "won!" (with the record).
        const [wa, la] = result.winner === "a" ? [a1, a2] : [a2, a1];
        const wm = this.mons[wa.address], wp = ids[wa.address];
        const rec = wa.pane && la.pane ? withResult(shared(SPAR_KEY) ?? {}, wa.pane, la.pane) : null;
        if (this.leader && rec) {
          setShared(SPAR_KEY, rec);
          const saved = savedPicks(), w = saved[wa.pane], l = saved[la.pane];
          if (w && l) {
            const nw = withFriend({ ...w, sparW: (w.sparW ?? 0) + 1 }, FRIEND.spar + friend), nl = withFriend({ ...l, sparL: (l.sparL ?? 0) + 1 }, friend);
            savePicks({ [wa.pane]: nw, [la.pane]: nl });
            if (Math.max(nw.hearts ?? 0, nl.hearts ?? 0) >= MAX_HEARTS && !bag().marks.fullHearts) saveBag(mark(bag(), { fullHearts: true }));
          }
        }
        const [w, l] = rec ? recordOf(rec, wa.pane, la.pane) : [0, 0];
        const winStep = wm.react.seq.find((st) => st.result === "win");
        wm.sparWin = { at: winStep?.at ?? now, text: `${wp ? nameFor(wp) : "It"} won!${w + l > 1 ? ` ${w}–${l}` : ""}` };
        // Those idle nearby on its row turn to watch.
        const mid = (spots.ax + spots.bx) / 2;
        list.forEach((b, j) => {
          const o = this.mons[b.address];
          if (!o || o === m1 || o === m2 || o.moving || o.mood !== "idle" || rowAt(b, j) !== rowAt(a1, list.indexOf(a1)) || Math.abs(o.x - mid) > 220) return;
          o.dir = mid > o.x ? "r" : "l";
        });
      } else battle(m1, m2, side(a1, k1, k2), side(a2, k2, k1), now + wait, Math.random, back ? { ...spots, back: BACK } : spots);
      // (The old script's blows: a plain strike each, then one special.)
      for (const [m, o] of k1 && k2 ? [] : [[m1, m2], [m2, m1]]) {
        for (const st of m.react.seq) {
          if (!st.blow) continue;
          const mv = o.react.shot?.move;
          const special = st.blow === "special";
          const [mine, theirs] = m === m1 ? [ids[a1.address], ids[a2.address]] : [ids[a2.address], ids[a1.address]];
          (m.blows ??= []).push({ at: st.at, dir: m.react.face === "r" ? -1 : 1, p: special ? power(st.eff ?? 1) : power(1, false), kb: knockMul(theirs?.size, mine?.size),
            style: special && mv ? moveStyle(mv.type, mv.blue) : STRIKE, word: special ? blowWord(st.eff ?? 1, mv?.crit) : null, ...(special && mv ? { type: mv.type, miss: mv.miss, physical: mv.physical } : { physical: true }) });
        }
      }
      // Both Mega Evolve for it (those that can, Mega not Off), and a few seconds after.
      m1.battleUntil = m2.battleUntil = Math.max(m1.react.until, m2.react.until) + 3000;
      m1.pauseUntil = m1.react.until + rand(2000, 5000);
      m2.pauseUntil = m2.react.until + rand(2000, 5000);
    };
    // A combo: an agent and its sub-agent, both working, now and then attack together.
    if (Math.random() < COMBO_CHANCE) {
      for (const [child, parent] of Object.entries(family)) {
        const [a, b] = [list.find((x) => x.address === child), list.find((x) => x.address === parent)];
        const [mc, mp] = [this.mons[child], this.mons[parent]];
        if (!a || !b || !mc || !mp || a.status !== "working" || b.status !== "working") continue;
        if (now - (mp.lastCombo ?? -Infinity) < COMBO_GAP || (mc.react && now < mc.react.until) || (mp.react && now < mp.react.until)) continue;
        const dir = Math.random() < 0.5 ? "l" : "r";
        [[b, mp, "💪"], [a, mc, null]].forEach(([ag, m, icon]) => {
          const meta = this.spriteFor(ids[ag.address], ag.status);
          if (m.moving) {
            // Stop where it is now, mid-walk (not back where the walk began).
            m.x = m.target = m.from + (m.target - m.from) * clamp((now - m.start) / m.dur, 0, 1);
            m.moving = false;
            m.dur = 150;
          }
          onCombo(m, dir, now, new Set(Object.keys(meta?.react ?? {})), (name) => meta.react[name].ms, icon);
          m.pauseUntil = m.react.until + rand(1000, 3000);
        });
        changed = true;
        break;
      }
    }
    // Sparring: now and then two idle ones standing close have a go, and like each other more.
    const attack = !!boosts["x-attack"]; // X Attack: ten times as often, again after 30 s
    // A Brave one on screen (a caught Pokémon's nature) makes sparring more likely.
    const brave = list.some((a) => natureOf(ids[a.address])?.spar);
    if (settingsNow().spar && Math.random() < SPAR_CHANCE * (attack ? 10 : 1) * (brave ? 3 : 1)) {
      const ready = list.filter((a) => {
        const m = this.mons[a.address];
        return m && m.mood === "idle" && !m.moving && !(m.react && now < m.react.until);
      });
      const pair = sparPair(ready.map((a) => ({ a, addr: a.address, x: this.mons[a.address].x, row: rowAt(a, list.indexOf(a)), lastSpar: this.mons[a.address].lastSpar })), now, attack ? BOOST_GAP : undefined);
      if (pair) {
        fight(pair[0].a, this.mons[pair[0].addr], pair[1].a, this.mons[pair[1].addr], FRIEND.spar);
        if (this.leader) { research("spar"); earn("tip", TIP.spar); }
        changed = true;
      }
    }
    // Dropped by you: shaken, it reels (💫); on one asleep, it pokes it awake and they spar; on
    // one awake, they spar now (a heart each, as sparring, when neither sparred in 10 min).
    const drop = this.dropAt;
    this.dropAt = null;
    const dj = drop ? list.findIndex((a) => a.address === drop.addr) : -1;
    const dm = dj >= 0 && this.mons[drop.addr];
    const dMeta = dm && this.spriteFor(ids[drop.addr], list[dj].status);
    const stopHere = (o) => {
      if (!o.moving) return;
      o.x = o.target = o.from + (o.target - o.from) * clamp((now - o.start) / o.dur, 0, 1);
      clearWalk(o);
      o.moving = false;
      o.dur = 150;
    };
    const onBoss = dm && dMeta && this.raidNear(dm, rowAt(list[dj], dj), now); // a quick drag onto the boss isn't a shake
    if (dm && dMeta && drop.dizzy && !onBoss) {
      dm.tease = null;
      onDizzy(dm, now, hasOf(dMeta), msFor(dMeta));
      dm.pauseUntil = dm.react.until + rand(1000, 3000);
      changed = true;
    } else if (onBoss) {
      // Dropped on the raid's boss: it steps off and hits it, once a minute each (one whose agent
      // is working, harder); the boss answers (raidTick). Too soon: how long to wait; resting: 💫.
      const r = loadRaid(shared(RAID_KEY));
      const pane = list[dj].pane;
      const wait = pane ? cooldownLeft(r, pane, now) : 0;
      const resting = now < (dm.restUntil ?? 0);
      if (!pane || resting || wait > 0) {
        // Not now: it says why, and hops back off the boss (no need to drag it away).
        this.note(dm, resting ? `💫 rests ${Math.ceil((dm.restUntil - now) / 60000)}m` : `⏳ ${Math.ceil(wait / 1000)}s`, now, 3000);
        const bx = this.width / 2;
        clearWalk(dm);
        dm.from = dm.x;
        dm.target = clamp(bx + (dm.x < bx ? -1 : 1) * BOSS_PUSH, EDGE, hiFor(this.width));
        dm.start = now;
        dm.dur = 350;
        dm.moving = true;
        dm.backstep = true;
      } else {
        const spot = wildSpot(dm.x, this.width / 2, EDGE, hiFor(this.width), FX_GAP + 30);
        clearWalk(dm);
        dm.from = dm.x;
        dm.target = spot;
        dm.start = now;
        dm.dur = 300;
        dm.moving = true;
        dm.backstep = true;
        // Mega Evolving for it: it does that first, then strikes (the hit is written then: the
        // boss's health doesn't drop before the blow lands).
        const pk = ids[drop.addr];
        const willMega = !!pk && megaShown(pk, "working") && !dm.mega;
        if (!willMega) this.raidStrike(list[dj], pk, now + 320);
        else {
          const ready = !!this.sprites[spriteKey(dressed(pk), true)]?.walkR;
          if (!ready) this.want(pk, cx, true);
          const at = now + 320 + MEGA_SHORT.burst + (ready ? 500 : 1800);
          dm.battleUntil = at + 6000; // it Mega Evolves now (megaStatus)
          dm.pauseUntil = at + 6000;
          (this.pendingStrikes ??= []).push({ a: list[dj], pick: pk, at });
        }
      }
      changed = true;
    } else if (dm && dMeta && this.wildNear(dm, rowAt(list[dj], dj), now)) {
      // Dropped by a wild one: it attacks it (trainer.js hitWild), facing it, its type flying; the
      // wild one hits back (hitBack). Not while yours rests after fainting. A hit twice its health
      // or more knocks it out, half again in the red (trainer.js OVERKILL_GREEN, OVERKILL).
      const v = this.visitor;
      const pk = ids[drop.addr];
      const hp = Number.isFinite(v.pick.hp) ? v.pick.hp : 1;
      if (now < (dm.restUntil ?? 0)) {
        this.note(dm, "💫", now, 2500);
      } else {
        // It Mega Evolves for the fight: a Mega with its own stats and types (base-stats.js
        // FORM_BASE) fights as itself; one without, as its species ×1.2 (trainer.js MEGA_HIT).
        const mega = megaShown(pk, "working");
        const ownKey = fighterKey(pk.dex, { form: pk.form, mega: mega ? (megaForm(pk.dex, pk.megaKind)?.kind ?? "") : null });
        const wildKey = fighterKey(v.pick.dex, { form: v.pick.form });
        const bonus = mega && !isFormKey(ownKey);
        const wild = { ...v.pick, dex: wildKey };
        const om = this.boosted(pickMove(ownKey, wildKey, Math.random, { targetSize: v.pick.size, moves: pk.moves })), wm = this.boosted(pickMove(wildKey, ownKey, Math.random, { targetSize: pk.size })); // each one's move (moves.js), the weather's boost on it
        // Its nature, and how it's been raised (effort: +1% a heart; its hearts already soften
        // what it takes, hitBack).
        const hit = hitWild(wild, ownKey, Math.random, !!pk.alpha, bonus, !!pk.shadow, om.mul, om.type, om, { na: pk.nature, ea: effortOf(pk) });
        if (om.miss) hit.text = `${fullName(pk.dex, pk.form)}'s attack missed!`;
        const back = hit.fainted ? null : hitBack({ dex: ownKey, hp: ownHp(dm, now), alpha: !!pk.alpha, shadow: !!pk.shadow, hearts: pk.hearts ?? 0, mega: bonus }, wild, Math.random, wm.mul, wm.type, wm, { nb: pk.nature });
        if (back && wm.miss) back.text = "It missed!";
        // It steps off to battle from a little way (fx.js fightGap: by their sizes), so the two
        // never stand on each other and their moves have room to fly.
        const spot = wildSpot(dm.x, v.x, EDGE, hiFor(this.width), fightGap(this.drawnWidth(pk, "working"), this.drawnWidth(v.pick, "idle")));
        if (Math.abs(spot - dm.x) >= 1) {
          clearWalk(dm);
          dm.from = dm.x;
          dm.target = spot;
          dm.start = now;
          dm.dur = 300;
          dm.moving = true;
          dm.backstep = true;
        }
        // Then: its move (its type that does most) flies over and lands; the wild one flinches,
        // knocked back; then it lets fly back with its own, and yours takes it.
        // It Mega Evolves for the fight (megaStatus): the fight waits till that's over (its form shown
        // after the cocoon bursts), not played under it.
        // Its Mega set not in yet (the first time): asked for now, and the wait is longer, as its
        // Mega Evolution begins once that's in.
        const willMega = mega && !dm.mega;
        const megaReady = !!this.sprites[spriteKey(dressed(pk), true)]?.walkR;
        if (willMega && !megaReady) this.want(pk, cx, true);
        const at = now + 340 + (willMega ? MEGA_SHORT.burst + (megaReady ? 500 : 1800) : 0);
        dm.dir = v.x > spot ? "r" : "l";
        const sp = reactionAnim("special", hasOf(dMeta)) ?? reactionAnim("spar", hasOf(dMeta));
        const ms = sp ? Math.max(600, msFor(dMeta)(sp)) : 700;
        const launch = at + CHARGE_MS + 20; // it gathers power, then fires
        const fly = Math.round(Math.min(320, Math.max(200, Math.abs(v.x - spot) * 3)));
        const hitAt = launch + fly, backAt = hitAt + 650, backLaunch = backAt + CHARGE_MS, backHit = backLaunch + fly;
        const ownMove = { ...om, eff: hit.eff, blue: ownKey === "6mX" };
        const wildMove = { ...wm, eff: back?.eff ?? 1 };
        const away = v.x > spot ? 1 : -1; // from yours toward the wild one
        v.fight = {
          at, hitAt, backAt, backLaunch, backHit, until: back ? backHit + 900 : hitAt + 1100,
          x: v.x, own: drop.addr, ownX: spot, ownName: fullName(pk.dex, pk.form), back, ownMove, wildMove, ...hit,
          blow: { at: hitAt, dir: away, p: hit.fainted ? 1 : om.ultimate || om.crit ? Math.max(0.85, power(hit.eff)) : power(hit.eff), style: moveStyle(ownMove.type, ownMove.blue), word: blowWord(hit.eff, om.crit), miss: om.miss, physical: om.physical, kb: knockMul(pk.size, v.pick.size), num: damageText(hit.dmg, hit.eff), type: ownMove.type, name: om.name },
        };
        const seq = [{ at, until: at + ms, anim: sp }];
        if (back) seq.push({ at: backHit, until: backHit + 600, anim: reactionAnim("startle", hasOf(dMeta)) });
        dm.react = { seq, until: back ? backHit + 700 : at + ms + 300, face: dm.dir, shot: { at: launch, until: hitAt, from: spot, to: v.x, move: ownMove } };
        if (back) (dm.blows ??= []).push({ at: backHit, dir: -away, p: back.fainted ? 1 : wm.ultimate || wm.crit ? Math.max(0.85, power(back.eff)) : power(back.eff), style: moveStyle(wildMove.type), word: blowWord(back.eff, wm.crit), miss: wm.miss, physical: wm.physical, kb: knockMul(v.pick.size, pk.size), num: damageText(back.dmg, back.eff, true), type: wildMove.type, name: wm.name });
        dm.pauseUntil = v.fight.until + 1500;
        dm.battleUntil = v.fight.until + 3000; // it Mega Evolves for the fight (megaStatus)
      }
      changed = true;
    } else if (dm && dMeta) {
      const row = rowAt(list[dj], dj);
      const hit = dropTarget(list.flatMap((b, j) => (b.address === drop.addr || !this.mons[b.address] ? [] : [{ addr: b.address, b, x: this.mons[b.address].x, row: rowAt(b, j) }])), dm.x, row);
      const s = hit && this.mons[hit.addr];
      const sMeta = s && this.spriteFor(ids[hit.addr], hit.b.status);
      if (s && sMeta) {
        stopHere(s);
        // Right on top: it steps beside the other first.
        if (Math.abs(dm.x - s.x) < 30) { dm.x = dm.from = dm.target = teaseSpot(dm.x, s.x, EDGE, hiFor(this.width)); dm.dur = 1; }
        for (const o of list) if (this.mons[o.address]?.tease?.victim === hit.addr) this.mons[o.address].tease = null;
        if (s.mood === "sleep") {
          const sparAt = onPoke(dm, s, now, hasOf(dMeta), hasOf(sMeta), msFor(dMeta), msFor(sMeta));
          dm.tease = { victim: hit.addr, phase: "poke", sparAt };
          dm.pauseUntil = s.pauseUntil = sparAt + 3000;
        } else {
          const hearts = now - (dm.lastSpar ?? -Infinity) >= SPAR_GAP && now - (s.lastSpar ?? -Infinity) >= SPAR_GAP;
          dm.tease = null;
          fight(list[dj], dm, hit.b, s, hearts ? FRIEND.spar : 0);
          if (hearts && this.leader) { research("spar"); earn("tip", TIP.drop); }
        }
        changed = true;
      }
    }
    // Teasing: now and then an idle one walks over to one asleep on its row, pokes it awake and
    // they spar (react.js teasePair, onPoke). One at a time; off with Sparring, and at the campfire.
    if (settingsNow().spar && !this.campfire && Math.random() < TEASE_CHANCE * (attack ? 10 : 1) && !list.some((a) => this.mons[a.address]?.tease)) {
      const cands = list.flatMap((a, j) => {
        const m = this.mons[a.address];
        if (!m || m.moving || family[a.address] || (m.react && now < m.react.until)) return [];
        return [{ addr: a.address, x: m.x, row: rowAt(a, j), mood: m.mood, lastSpar: m.lastSpar }];
      });
      // X Attack: any two (attackPair), the other held where it is till the attacker gets there.
      const pair = attack ? attackPair(cands, now, BOOST_GAP) : teasePair(cands, now);
      if (pair) {
        const m = this.mons[pair[0].addr];
        m.tease = { victim: pair[1].addr, phase: "walk", any: attack };
        m.lastSpar = now;
        if (attack) this.mons[pair[1].addr].pauseUntil = now + 8000;
        walk(m, teaseSpot(m.x, pair[1].x, EDGE, hiFor(this.width)), SPEED.idle * 1.5);
        changed = true;
      }
    }
    for (const a of list) {
      const m = this.mons[a.address];
      const t = m?.tease;
      if (!t) continue;
      const b = list.find((x) => x.address === t.victim);
      const s = b && this.mons[b.address];
      const meta = this.spriteFor(ids[a.address], a.status);
      const sMeta = b && this.spriteFor(ids[b.address], b.status);
      if (!s || !meta || !sMeta) { m.tease = null; continue; }
      if (t.phase === "walk") {
        if (m.moving) continue;
        // Got there: still idle, and the other still asleep where it was? Otherwise it lets it be.
        // (X Attack: anyone not needing you, asleep or awake.)
        const ok = t.any ? m.mood !== "blocked" && s.mood !== "blocked" : m.mood === "idle" && s.mood === "sleep";
        if (!ok || s.moving || Math.abs(m.x - s.x) > TEASE_GAP + 20) { m.tease = null; continue; }
        if (s.mood !== "sleep") { m.tease = null; fight(a, m, b, s); changed = true; continue; }
        t.sparAt = onPoke(m, s, now, hasOf(meta), hasOf(sMeta), msFor(meta), msFor(sMeta));
        t.phase = "poke";
        m.pauseUntil = s.pauseUntil = t.sparAt + 3000;
        changed = true;
      } else if (now >= t.sparAt) {
        m.tease = null;
        if (m.moving || s.moving) continue;
        fight(a, m, b, s);
        changed = true;
      }
    }
    if (this.visit(list, ids, g, now, cx)) changed = true;
    this.pendingRaid(now); // strikes held for a Mega Evolution
    if (this.raidTick(list, ids, now, cx)) changed = true;
    if (this.leader && now - (this.giftsAt ?? 0) > 30000) { this.giftsAt = now; this.giveBadgeGifts(); }
    for (const k of Object.keys(this.mons)) if (!live.has(k)) { delete this.mons[k]; changed = true; }
    this.fxSchedule(cx, now);
    // Snow, leaves and a rainbow's fade: a redraw once a second (AMBIENT_MS), no more.
    // (Its own clock: `drawnAt` is when a frame was really drawn, which a hidden strip doesn't do;
    // set here, a strip back from another tab seemed drawn a moment ago, so a wild one wasn't put
    // where it is now and dashed across to catch up.)
    if (changed || ((this.snowing || this.rainbow) && now - (this.ambientAt ?? 0) >= AMBIENT_MS)) { this.ambientAt = now; cx.notify(); }
  }

  // ---- the menu (right-click on the strip; a popup with props { menu }) ----

  // Moves the strip to `place` with `rows` rows, by rewriting the shown layout.
  // `place` null: only the rows change, wherever it is (e.g. where Herdr docked it on install).
  applyLayout(place, rows, close = true) {
    const tree = layout();
    const px = rows * rowHeight(scaleIn(blockProps(tree, MOD)));
    const next = place ? placeBlock(tree, MOD, place, rows, px) : setRows(tree, MOD, rows, px);
    // The right panel stays the Files/Changes buttons' to open and close (they remember it per
    // space): the strip shows there whenever that panel is open.
    if (next) run("layout.set", { layout: next });
    if (close) closeOverlay(props()?.overlay);
  }

  // Settings → Strip → Size: the Pokémon's scale, and the block's height to match.
  applySize(scale) {
    const tree = layout();
    const withScale = setBlockProps(tree, MOD, { scale });
    const next = withScale && setRows(withScale, MOD, rowsOf(tree, MOD), rowsOf(tree, MOD) * rowHeight(scale));
    if (next) run("layout.set", { layout: next });
  }

  // Update by itself: the newer version, once (a failed one waits for Update now, by hand).
  autoUpdate() {
    if (!this.leader || this.autoUpdating) return;
    if (!shouldAutoUpdate(settingsNow().autoUpdate, this.latest, VERSION, shared(AUTO_KEY))) return;
    this.autoUpdating = true;
    const to = this.latest;
    // Noted before: the copy reloads as soon as the new files land, maybe before this goes on.
    // The new one shows "Updated to" only if it is that version (so it did update).
    setShared(AUTO_KEY, { tried: to, at: Date.now() });
    setShared(UPDATED_KEY, { from: VERSION, to, at: Date.now() });
    // Failed (a write refused halfway?): tried again in a few hours (update.js RETRY_MS).
    updateNow().catch(() => setShared(AUTO_KEY, { tried: to, at: Date.now(), failed: true })).finally(() => { this.autoUpdating = false; });
  }

  // The update waiting on GitHub (its version), or null.
  update() {
    return isNewer(this.latest, VERSION) ? this.latest : null;
  }

  openMenu() {
    const update = this.update();
    const m = menuParts();
    // Rows of 30, the chip sections 46 each, a divider, the update note.
    const height = 16 + 30 * (3 + m.calls.length) + (m.balls.length ? 46 : 0) + (m.baits.length ? 46 : 0) + 10 + (m.balls.length || m.baits.length ? 10 : 0) + (update ? 56 : 0);
    openOverlay({ mod: MOD, kind: "popup", width: 380, height, props: { menu: true, update } }); // room for every ball and Berry, with icons
  }

  // The right-click menu: the Box (with the Bag, Shop, Today and Pokédex) and Settings, each a
  // dialog of its own; the ball and the Berry to throw, switched there and then; Honey and the
  // Azure Flute at hand; and a newer release when there is one.
  renderMenu() {
    const t = theme();
    const b = bag();
    const n = Object.values(b.items).reduce((x, y) => x + y, 0);
    const got = badges(summary(stats(), 0), b.marks, liveForBadges()).filter((x) => x.earned).length;
    const daily = dailyNow();
    const done = daily.tasks.filter((x) => x.n >= x.goal).length;
    const m = menuParts(b);
    const row = (id, txt, note, on, close = true) => h_flex()
      .id(id).h(28).px(8).rounded(6).items_center().justify_between()
      .text_size(12.5).text_color(t.foreground).cursor_pointer().hover((st) => st.bg(t.hover))
      .on_click((_e, cx) => { if (close) closeOverlay(props()?.overlay); on(); cx.notify(); })
      .child(txt)
      .child(div().text_size(11.5).text_color(t.muted).child(note));
    // A row of chips under a label: one on (the ball or the Berry in use); a click switches to it.
    const chips = (id, label, opts, cur, pick) => v_flex().h(44).px(8).gap(3).justify_center()
      .child(div().text_size(11).text_color(t.muted).child(label))
      .child(h_flex().gap(3).items_center().children(opts.map(([v, txt]) => div().id(`${id}-${v ?? "none"}`)
        .h(22).px(6).rounded(5).flex().items_center().flex_none().text_size(11.5).border_1()
        .border_color(v === cur ? t.accent : t.border).bg(v === cur ? t.selected : "#00000000")
        .text_color(v === cur ? t.foreground : t.muted).cursor_pointer().hover((st) => st.bg(t.hover))
        .on_click((_e, cx) => { pick(v); cx.notify(); })
        .when(!!ITEMS[v], (e2) => e2.gap(3).pl(4).child(this.itemMark(v, 16)))
        .child(txt))));
    // The chips show each one's picture and count; the label says which is set.
    const named = (v, auto) => (v && ITEMS[v] ? ITEMS[v].name : v === null && !auto ? "None" : "Auto");
    return v_flex()
      .id("pokemon-menu").size_full().p(8).gap(2).bg(t.popover)
      .child(row("open-bag", "Box", `${boxCount()} Pokémon · ${n} item${n === 1 ? "" : "s"} · ${got}/8`, () => openBag("box")))
      .child(row("open-today", "Today", `Research ${done}/${daily.tasks.length} · ${money(b.money)}`, () => openBag("today")))
      .when(m.balls.length > 0 || m.baits.length > 0, (el) => el.child(div().h(1).mx(8).my(4).bg(t.border)))
      .when(m.balls.length > 0, (el) => el.child(chips("menu-ball", `Ball to throw · ${named(m.ball, true)}`, [[null, "Auto"], ...m.balls.map((id) => [id, String(b.items[id])])], m.ball,
        (v) => setShared(BALL_KEY, v))))
      .when(m.baits.length > 0, (el) => el.child(chips("menu-bait", `Berry before each ball · ${named(m.bait)}`, [[AUTO_BAIT, "Auto"], [null, "None"], ...m.baits.map((id) => [id, String(b.items[id])])], m.bait,
        (v) => setShared(BAIT_KEY, v))))
      .children(m.calls.map((id) => row(`menu-${id}`, id === "honey" ? "Call a wild Pokémon" : "Call a legendary", `${ITEMS[id].name} · ${b.items[id]} left`, () => {
        if (!hasItem(id)) return;
        saveBag(addItem(bag(), id, -1));
        setShared(id === "honey" ? HONEY_KEY : LEGEND_KEY, Date.now());
      })))
      .child(div().h(1).mx(8).my(4).bg(t.border))
      .child(row("open-settings", "Settings", "", () => openSettings(props()?.update)))
      // A newer release: an installed copy never updates by itself.
      .when(!!props()?.update, (el) => el
        .child(div().h(4))
        .child(div().px(8).text_size(11).text_color(t.dim).child(`Update: ${props().update} (you have ${VERSION})`))
        .child(div().px(8).text_size(11.5).text_color(t.muted)
          .child("Settings → Updates → Update now. Your Pokémon are kept.")));
  }

  initSettings(cx) {
    // The Update pill opens Updates; the very first time, the Guide (how to play), then the Strip.
    const firstTime = !shared(GUIDE_KEY);
    if (firstTime) setShared(GUIDE_KEY, Date.now());
    this.settingsTab = props()?.tab ?? (props()?.update ? "updates" : firstTime ? "guide" : "strip");
    this.unlocking = false; // Trainer → Unlock all, asked once: "Sure?"
    this.updating = null; // null | "running" | "done" | an error message
    this.sidebar = null; // Better Sidebar: "missing" | "patched" | "outdated" | "unpatched" (null: checking)
    this.patching = null; // null | "running" | an error message
    cx.spawn(async (cx) => {
      this.sidebarMod = await sidebarModHere();
      this.sidebar = await sidebarState().catch(() => "missing");
      cx.notify();
    });
    // Opening Settings checks GitHub for a newer release once, now (the strip only does daily).
    this.checking = true;
    cx.spawn(async (cx) => {
      try { this.latestNow = await latestVersion(Date.now(), true); } catch {}
      this.checking = false;
      cx.notify();
    });
  }

  // Agent cards: Off, Sidebar or Right panel. Undoes whatever there was, then: in the sidebar,
  // Pokémon Sidebar when it is installed, else the Agents list drawn as cards when the layout has one, else Better Sidebar's rows (patched
  // if need be), else a Party panel there; or a Party panel in the right panel.
  setCards(v, tree, betterHere) {
    let next = placeParty(unswapAgents(fromPokemonSidebar(tree)), MOD, null);
    let better = false;
    if (v === "sidebar") {
      if (this.sidebarMod && toPokemonSidebar(next)) next = toPokemonSidebar(next); // Pokémon Sidebar, when installed
      else if (hasAgentsList(next)) next = swapAgents(next, MOD);
      else if (betterHere) better = true;
      else next = placeParty(next, MOD, "sidebar") ?? next;
    } else if (v === "panel") next = placeParty(next, MOD, "panel") ?? next;
    if (settingsNow().sidebar !== better) setSetting("sidebar", better);
    if (better && (this.sidebar === "unpatched" || this.sidebar === "outdated")) {
      this.patching = "running";
      patchSidebar(this.sidebar === "outdated").then(async () => { this.patching = null; this.sidebar = await sidebarState(); }).catch((e) => { this.patching = String(e?.message ?? e); });
    }
    if (JSON.stringify(next) !== JSON.stringify(tree)) run("layout.set", { layout: next });
  }

  // Once, after an update brings Pokémon Sidebar: a player whose agents are cards in the sidebar
  // (the Agents list drawn as cards, a Party list there, or Better Sidebar's patched rows) gets
  // Pokémon Sidebar in its place, as a new player does. Anyone else (cards off, in the right
  // panel, a built-in layout) is left as they are: Settings → Agent cards → Sidebar does it.
  moveToPokemonSidebar(now) {
    const tree = layout();
    if (!tree) return;
    setShared(MOVED_KEY, now);
    if (SHIPPED.includes(shared("layout")) || usesPokemonSidebar(tree) || !toPokemonSidebar(tree)) return;
    const betterHere = usesMod(tree, "better-sidebar");
    const inSidebar = agentsSwapped(tree) || partyPlace(tree) === "sidebar" || (settingsNow().sidebar && betterHere);
    if (inSidebar) this.setCards("sidebar", tree, betterHere);
  }

  // A new player's first run: Agent cards in the sidebar, and Pokémon in notifications. On a built-in layout, a copy of it is
  // made first (as Settings' "Make it mine"), which Herdr shows at once; ticks wait for it (30 s at
  // most). Better Sidebar's rows are left alone (cards there need its patch: an opt-in).
  defaultCards(now) {
    if (now - this.firstCards > 30000) { this.firstCards = null; return; }
    if (this.sidebarMod === undefined) return; // still looking for Pokémon Sidebar
    const name = shared("layout");
    if (SHIPPED.includes(name)) {
      if (!this.cloning) { this.cloning = true; run("layout.clone", { name }); }
      return;
    }
    this.firstCards = null;
    let tree = layout();
    if (!tree) return;
    // Notifications too: each agent's leads with its Pokémon (unless another mod draws them).
    if (!toastMod(tree)) { tree = setToast(tree, MOD); run("layout.set", { layout: tree }); }
    if (partyPlace(tree) || agentsSwapped(tree) || usesPokemonSidebar(tree)) return;
    if (this.sidebarMod && toPokemonSidebar(tree)) { run("layout.set", { layout: toPokemonSidebar(tree) }); return; }
    if (hasAgentsList(tree) || (placesIn(tree).includes("sidebar") && !usesMod(tree, "better-sidebar"))) this.setCards("sidebar", tree, false);
  }

  // The Settings dialog, in tabs: Strip (where and how it's drawn, the cards), Herd (the games'
  // mechanics), Trainer (catching, legendaries), Sound and Updates. Every change applies at once;
  // it stays open (Esc closes it).
  renderSettings() {
    const t = theme();
    const st = settingsNow();
    const tab = this.settingsTab ?? "strip";
    const kit = this.settingsKit(t, st);
    const TABS = [["guide", "Guide"], ["strip", "Strip"], ["herd", "Herd"], ["trainer", "Trainer"], ["sound", "Sound"], ["updates", "Updates"], ["about", "About"]];
    const body = tab === "guide" ? this.settingsGuide(kit, t)
      : tab === "herd" ? this.settingsHerd(kit, st)
      : tab === "trainer" ? this.settingsTrainer(kit, st, t)
      : tab === "sound" ? this.settingsSound(kit)
      : tab === "updates" ? this.settingsUpdates(kit)
      : tab === "about" ? this.settingsAbout(kit, t)
      : this.settingsStrip(kit, st);
    const upd = this.newerVersion();
    // The title and the tabs stay; the tab's page scrolls (a short window shows it all, a step at a time).
    return v_flex().id("pokemon-settings").size_full().min_h(0).pt(18).bg(t.popover)
      .child(h_flex().px(18).pb(10).justify_between().items_center().flex_none()
        .child(div().text_size(15).font_semibold().text_color(t.foreground).child("Settings"))
        .child(div().text_size(11).text_color(t.dim).child("Esc")))
      .child(h_flex().px(14).pb(10).gap(4).flex_none().children(TABS.map(([k, txt]) => {
        const on = tab === k;
        return h_flex().id(`set-tab-${k}`).h(28).px(10).gap(4).rounded(6).items_center().cursor_pointer()
          .bg(on ? t.selected : "#00000000").hover((s2) => s2.bg(on ? t.selected : t.hover))
          .when(k === "trainer", (el) => el.border_1().border_color(on ? t.accent : "#f2c94c80"))
          .on_click((_e, cx) => { this.settingsTab = k; this.unlocking = false; cx.notify(); })
          .when(k === "trainer", (el) => el.child(div().text_size(12).text_color(SHINY_GOLD).child("✨")))
          .child(div().text_size(12.5).text_color(on ? t.foreground : t.muted).when(on, (e2) => e2.font_semibold()).child(txt))
          .when(k === "updates" && !!upd, (el) => el.child(div().size(6).rounded_full().bg(t.accent)));
      })))
      .child(v_flex().id(`settings-${tab}`).flex_1().min_h(0).overflow_y_scrollbar().px(18).pb(18).gap(8).children(body));
  }

  // Guide: how to play at a glance: a tile a topic, an icon, a title and a line.
  settingsGuide({ heading }, t) {
    const TIPS = [
      ["☰", "The menu", "☰ in the strip's corner, or right-click the ground: Box, Today, Shop, Settings."],
      ["👆", "Your herd", "Click one: go to its agent. Right-click: choose another."],
      ["🎁", "Wild Pokémon", "Click one walking by for its gift and ₽, again to throw a ball."],
      ["⚔️", "Weaken it", "Drop one of yours on it (a Mega Evolves, and hits harder). Stop at red."],
      ["🍒", "Berries", "Razz before a ball: easier catch. Oran, Sitrus: hearts."],
      ["✨", "Rare ones", "Shiny 1 in 64 · Alpha α 1 in 40 · Legendary 1 in 150."],
      ["📋", "Today", "3 tasks a day. All three: 5 Ultra Balls and a legendary."],
      ["₽", "Pokédollars", "Jobs pay by the minute. Shop: ☰ → Box → Shop."],
      ["🥚", "Raids", "Work lays an egg (twice a day at most). Drag yours onto its boss, once a minute each."],
      ["🌈", "Weather", "Rain, night or the season boosts some types: their moves hit harder, more walk by (Today)."],
      ["🔒", "Box", "Lock the ones you keep; Select… to release the rest for ₽."],
      ["💗", "Hearts & evolution", "Pats, quick answers, spars, Berries. Most evolve after 15 jobs, then 30."],
    ];
    return [h_flex().flex_wrap().gap(8).children(TIPS.map(([icon, title, line]) => h_flex()
      .w(234).min_h(62).p(10).gap(10).items_start().rounded(10).bg(t.raised)
      .child(div().w(22).flex_none().text_size(18).text_center().child(sparkled(icon)))
      .child(v_flex().flex_1().min_w(0).gap(2)
        .child(div().text_size(12.5).font_semibold().text_color(t.foreground).child(title))
        .child(div().text_size(11.5).text_color(t.muted).child(line))))),
      div().id("guide-readme").pt(4).text_size(11.5).text_color(t.dim).cursor_pointer().hover((st) => st.text_color(t.foreground))
        .on_click((_e, cx) => cx.open_url(`https://github.com/${REPO}#readme`)).child("More in the README on GitHub →")];
  }

  // A newer release: what Settings just read from GitHub, else what the strip knew.
  newerVersion() {
    return this.latestNow !== undefined && this.latestNow !== null ? (isNewer(this.latestNow, VERSION) ? this.latestNow : null) : props()?.update;
  }

  // The pieces every Settings tab is built of.
  settingsKit(t, st) {
    const heading = (txt) => div().pt(6).text_size(11.5).text_color(t.muted).child(txt);
    // A row of choices, one of them on.
    const choices = (id, opts, cur, enabled, pick) => h_flex().gap(4).flex_none().children(opts.map(([v, txt]) => div()
      .id(`${id}-${v}`).h(26).px(10).rounded(6).flex().items_center().text_size(12).border_1()
      .border_color(v === cur ? t.accent : t.border)
      .bg(v === cur ? t.selected : "#00000000")
      .text_color(enabled(v) ? t.foreground : t.dim)
      .when(enabled(v), (el) => el.cursor_pointer().hover((s2) => s2.bg(v === cur ? t.selected : t.hover)).on_click((_e, cx) => { pick(v); cx.notify(); }))
      .child(txt)));
    const line = (title, note, control) => h_flex().min_h(38).py(5).gap(16).items_center().justify_between()
      .child(v_flex().flex_1().min_w(0).gap(1)
        .child(div().text_size(12.5).text_color(t.foreground).child(title))
        .when(!!note, (el) => el.child(div().text_size(11.5).text_color(t.muted).child(note))))
      .child(control);
    // An on/off switch: a setting's (`key`), or any (`on`, `flip`, `enabled`).
    const swtch = (id, on, flip, enabled = true) => div().id(id).w(34).h(20).rounded_full().flex_none().relative()
      .bg(on ? t.accent : t.border).opacity(enabled ? 1 : 0.4)
      .when(enabled, (el) => el.cursor_pointer().on_click((_e, cx) => { flip(); cx.notify(); }))
      .child(div().absolute().top(2).left(on ? 16 : 2).size(16).rounded_full().bg(on ? t.accent_foreground : t.foreground));
    const toggle = (key) => swtch(`set-${key}`, st[key], () => setSetting(key, !st[key]));
    // A pill; ink on paper when it can be pressed, dim when not.
    const button = (id, txt, enabled, onPress) => div().id(id).h(26).px(12).rounded_full().flex().items_center().flex_none()
      .text_size(12).font_semibold()
      .bg(enabled ? t.solid : t.border).text_color(enabled ? t.solid_foreground : t.dim)
      .when(enabled, (el) => el.cursor_pointer().on_click((_e, cx) => { onPress(cx); cx.notify(); }))
      .child(txt);
    const panel = (...kids) => v_flex().px(14).py(4).rounded(10).bg(t.raised).children(kids);
    // Switches two to a row: a title, a short note, the switch.
    const tiles = (rows) => h_flex().flex_wrap().gap(8).children(rows.map(([key, title, note]) => v_flex()
      .w(234).min_h(66).p(10).gap(3).rounded(10).bg(t.raised)
      .child(h_flex().justify_between().items_center().gap(8)
        .child(div().text_size(12.5).text_color(t.foreground).child(title))
        .child(toggle(key)))
      .child(div().text_size(11).text_color(t.muted).child(note))));
    return { heading, choices, line, swtch, toggle, button, panel, tiles };
  }

  // Strip: where it sits, its size, rows and background; the agent cards.
  settingsStrip({ heading, choices, line, button, panel }, st) {
    const tree = layout();
    const name = shared("layout");
    const shipped = SHIPPED.includes(name);
    const have = placesIn(tree);
    const place = placeOf(tree, MOD);
    const rows = rowsOf(tree, MOD);
    const inLayout = !!setRows(tree, MOD, rows, 0);
    const movable = inLayout && !shipped;
    const background = blockProps(tree, MOD).background === "plain" ? "plain" : "scenery";
    const NAMES = { sidebar: "Sidebar", bottom: "Bottom", panel: "Right panel" };
    // Agent cards: where they are now. In the sidebar: Pokémon Sidebar, the Agents list drawn as
    // cards, the Party panel there, or Better Sidebar's own rows (patched); or the Party panel in the right panel.
    const betterHere = usesMod(tree, "better-sidebar");
    const party = partyPlace(tree);
    const cardsNow = usesPokemonSidebar(tree) || agentsSwapped(tree) || party === "sidebar" || (st.sidebar && betterHere) ? "sidebar" : party === "panel" ? "panel" : "off";
    const cardsNote = usesPokemonSidebar(tree) ? "Pokémon Sidebar: each space with its agents as cards; collapsed, their Pokémon."
      : cardsNow === "sidebar" && agentsSwapped(tree) ? "The sidebar's Agents list, as cards."
      : cardsNow === "sidebar" && betterHere ? (this.sidebar === "patched" || this.sidebar === "outdated" ? "Better Sidebar's rows, as cards." : "Better Sidebar's rows: needs its patch (Updates).")
      : cardsNow === "sidebar" ? "A Party list in the sidebar."
      : cardsNow === "panel" ? "A Party list in the right panel."
      : "The agent's name large, its status as the card's edge, its Pokémon and hearts.";
    return [
      // A built-in layout can't be changed: one click makes a copy of it, shown at once.
      ...(shipped ? [panel(line("Make this layout yours", `"${name}" is built in. A copy you own can hold the cards and move the strip.`,
        button("clone-layout", "Make it mine", true, () => run("layout.clone", { name }))))] : []),
      heading("Where and how"),
      panel(
        line("Place", null, choices("place", ["sidebar", "bottom", "panel"].map((p) => [p, NAMES[p]]), place, (p) => have.includes(p) && !shipped, (p) => this.applyLayout(p, rows, false))),
        line("Size", null, choices("size", SIZES, scaleIn(blockProps(tree, MOD)), () => movable, (v) => this.applySize(v))),
        line("Rows", null, choices("rows", [[1, "1"], [2, "2"], [3, "3"]], rows, () => movable, (n) => this.applyLayout(place, n, false))),
      ),
      heading("Background"),
      panel(
        line("Background", null, choices("bg", [["plain", "Plain"], ["scenery", "Scenery"]], background, () => movable, (v) => {
          const next = setBlockProps(layout(), MOD, { background: v });
          if (next) run("layout.set", { layout: next });
        })),
        line("Sky", "Muted sits quietly in a dark app; Bright is a real day, a sunset, and the sun.",
          choices("sky", [["muted", "Muted"], ["bright", "Bright"]], blockProps(tree, MOD).sky === "bright" ? "bright" : "muted",
            () => movable && background === "scenery", (v) => {
              const next = setBlockProps(layout(), MOD, { sky: v });
              if (next) run("layout.set", { layout: next });
            })),
      ),
      heading("Agent cards"),
      panel(line("Each agent as its Pokémon's card", cardsNote,
        choices("cards", [["off", "Off"], ["sidebar", "Sidebar"], ["panel", "Right panel"]], cardsNow,
          (v) => !shipped && (v === "off" || (v === "sidebar" ? (this.sidebarMod && !!toPokemonSidebar(tree)) || hasAgentsList(tree) || betterHere || have.includes("sidebar") : have.includes("panel"))),
          (v) => this.setCards(v, tree, betterHere)))),
    ];
  }

  // Herd: what the Pokémon do, each a switch; then visitors and who new agents get.
  settingsHerd({ heading, choices, line, panel, tiles }, st) {
    return [
      heading("What they do"),
      tiles([
        ["evolve", "Evolution", "They evolve as their agents work. Off: jobs still count."],
        ["pickup", "Pickup", "Idle ones find Berries, stones, balls and Rare Candy."],
        ["spar", "Sparring", "Two idle ones spar now and then, and like each other more."],
        ["family", "Sub-agents", "A sub-agent is its agent's Pokémon, younger, following it."],
        ["weather", "Weather", "Rain while agents wait on you; a storm when they wait long."],
        ["campfire", "Campfire", "At night, all resting: they sleep round a fire."],
        ["tired", "Tired near the limit", "Usage Limits at 90%: they sweat and walk slower."],
      ]),
      heading("Who comes"),
      panel(
        line("Visitors", "A wild Pokémon walks across with a gift, to catch. Rare: every 10–25 min; Often: 3–8; Lots: 1–3.",
          choices("visitors", [["off", "Off"], ["rare", "Rare"], ["often", "Often"], ["lots", "Lots"]], st.visitors, () => true, (v) => setSetting("visitors", v))),
        line("New agents' Pokémon", st.trainer ? "Trainer mode is on: the ones you caught (Trainer tab)."
          : st.newFrom === "favorites" && !favs().length ? "No favourites yet: in the picker, right-click one you like and ☆ Favorite it." : "Any species, or one of your favourites (★ in the picker).",
          choices("new-from", [["any", "Any"], ["favorites", "Favorites"]], st.newFrom, () => !st.trainer, (v) => setSetting("newFrom", v))),
      ),
    ];
  }

  // Trainer: Trainer mode (off by default, and it shows: it twinkles), the legendaries, the Pokédex.
  settingsTrainer({ heading, line, swtch, button, panel }, st, t) {
    const d = pokedex();
    const legends = d.caught.filter(isLegendary).length;
    const stars = [[14, 10, 1100], [430, 16, 1500], [60, 92, 1300], [400, 86, 900], [236, 6, 1700]];
    const hero = div().relative().p(16).rounded(12).bg(t.raised).border_1().border_color(st.trainer ? t.accent : "#f2c94c")
      // Little stars around the card (still: a page you read).
      .children(stars.map(([x, y], i) => div().absolute().left(x).top(y).text_size(i % 2 ? 10 : 12).text_color("#f2c94c")
        .opacity(0.4 + 0.15 * i).child(i % 2 ? "✦" : "✨")))
      .child(v_flex().gap(8)
        .child(h_flex().justify_between().items_center().gap(12)
          .child(v_flex().gap(2)
            .child(div().text_size(15).font_semibold().text_color(t.foreground).child("Trainer mode"))
            .child(div().text_size(11.5).text_color(t.muted).child(st.trainer ? "On: you're a trainer now." : "Off. Turn it on for a real journey.")))
          .child(swtch("set-trainer", st.trainer, () => setSetting("trainer", !st.trainer))))
        .child(div().text_size(12).text_color(t.foreground)
          .child("Only the Pokémon you catch can be chosen in the picker or come to new agents, with the three Kanto starters to begin. Catch wild ones as they walk by: each joins your Box with a heart and a nature of its own."))
        .child(div().text_size(11.5).text_color(t.muted).child(`You caught ${d.caught.length} species so far${d.caught.length ? "" : ": buy Poké Balls in the Shop (Bag)"}.`)));
    const sure = this.unlocking;
    return [
      hero,
      heading("Legendary Pokémon"),
      panel(
        line(st.legendsOpen ? "Open to everyone" : "Locked until caught",
          st.legendsOpen ? "Every legendary can be chosen, and come to new agents, without catching one."
            : `Mewtwo, Rayquaza and the others: catch one (the day's Research calls one over) to use it. ${legends} caught.`,
          st.legendsOpen ? button("legends-lock", "Lock again", true, () => { setSetting("legendsOpen", false); this.unlocking = false; })
            : div().id("legends-open").h(26).px(12).rounded_full().flex().items_center().flex_none().text_size(12).font_semibold().cursor_pointer()
              .border_1().border_color(sure ? t.blocked : t.border).text_color(sure ? t.blocked : t.foreground).hover((s2) => s2.bg(t.hover))
              .on_click((_e, cx) => {
                if (!sure) { this.unlocking = true; cx.notify(); return; }
                setSetting("legendsOpen", true);
                this.unlocking = false;
                cx.notify();
              })
              .child(sure ? "Sure? Unlock them all" : "Unlock all")),
      ),
      heading("Events"),
      panel(
        line("Raids", "Every 2½ hours of work per agent in a day (2 at most), an egg; 5 minutes on, a boss: drag your Pokémon onto it, each once a minute (harder while its agent works). Beat it to catch it.",
          swtch("set-raids", st.raids, () => setSetting("raids", !st.raids))),
        line("Mass Outbreaks", "Once a day, one species walks by again and again for 20 minutes, shinies likelier.",
          swtch("set-outbreaks", st.outbreaks, () => setSetting("outbreaks", !st.outbreaks))),
      ),
      heading("Pokédex"),
      panel(line(`${d.caught.length} caught · ${d.seen.length} seen · ${d.shiny.length} shiny`, "A shiny caught can be chosen shiny in the picker. Goals pay balls and Master Balls.",
        button("open-dex", "Open Pokédex", true, () => openBag("dex")))),
    ];
  }

  // Sound: Pokémon in notifications, and the cries.
  settingsSound({ line, swtch, toggle, panel, heading }) {
    const tree = layout();
    const shipped = SHIPPED.includes(shared("layout"));
    const herd = agents();
    const focused = herd.find((a) => a.focused) ?? herd[0];
    const sample = focused ? assignAll(herd).ids[focused.address] : { dex: 25 };
    const t = theme();
    const on = toastMod(tree) === MOD;
    return [
      heading("Notifications"),
      panel(line("Pokémon in notifications", shipped ? "Needs a layout of your own (Strip → Make it mine)." : "An agent's notification leads with its Pokémon.",
        swtch("set-toast", on, () => run("layout.set", { layout: setToast(layout(), on ? null : MOD) }), !shipped))),
      heading("Cries"),
      panel(
        line("When an agent needs you", null, toggle("cryBlocked")),
        line("When an agent finishes", "Herdr's own sound plays too; it can be turned off in Herdr's settings.", toggle("cryDone")),
        line("When a rare one walks by", "A shiny, an Alpha or a legendary: its cry, and a note in the strip's corner.", toggle("cryRare")),
        line("Battle sounds", "Moves gathering and flying, blows landing, a ball's shakes. The 🔇 in the strip's corner too.", toggle("battleSounds")),
        line("Hear one", `${fullName(sample.dex)}'s cry`, div().id("cry-test").h(26).px(12).rounded_full().flex().items_center().flex_none()
          .bg(t.solid).text_color(t.solid_foreground).text_size(12).font_semibold().cursor_pointer()
          .on_click(() => { lastCry = 0; cry(sample.dex); })
          .child("Play")),
      ),
    ];
  }

  // Updates: this mod (and Pokémon Sidebar with it), and Better Sidebar's patch when it's installed.
  settingsUpdates({ line, button, panel, swtch }) {
    const upd = this.newerVersion();
    return [
      panel(
        line("Pokerdr", this.updating === "running" ? "Downloading…"
          : this.updating === "done" ? `Updated ${(this.updated ?? []).map((u) => `mods/${u.dir.split("/").pop()} to ${u.version}`).join(", ")}. It reloads by itself; if this still says ${VERSION}, restart Herdr.`
          : this.updating ? `Couldn't update: ${this.updating}`
          : upd ? `${upd} is out; you have ${VERSION}. Your Pokémon, Bag and badges stay.`
          : this.checking ? "Checking for a newer version…"
          : `${VERSION}, the latest (checked once a day).`,
          button("update-now", "Update now", !!upd && this.updating !== "running" && this.updating !== "done", (cx) => {
            this.updating = "running";
            cx.spawn(async (cx) => {
              try {
                const done = await updateNow();
                this.updated = done; // shown: which folder, to which version
                this.updating = "done";
              } catch (e) { this.updating = String(e?.message ?? e); }
              cx.notify();
            });
          })),
        line("Update by itself", "A newer version, checked every few hours, installs itself (Herdr reloads the mod). Off: the Update pill, and Update now.",
          swtch("set-autoUpdate", settingsNow().autoUpdate, () => setSetting("autoUpdate", !settingsNow().autoUpdate))),
        ...(this.sidebar === "missing" ? [] : [line("Cards in Better Sidebar", this.sidebar === null ? "Checking…"
          : this.sidebar === "patched" ? "Patched: each agent shows as its Pokémon's card, and as its Pokémon on the collapsed rail."
          : this.sidebar === "outdated" && !this.patching ? "Patched for the cards; Patch again for Pokémon on the collapsed rail."
          : this.patching && this.patching !== "running" ? `Couldn't patch: ${this.patching}`
          : "Not patched (a reinstall of Better Sidebar undoes it).",
          button("patch-sidebar", "Patch", (this.sidebar === "unpatched" || this.sidebar === "outdated") && this.patching !== "running", (cx) => {
            this.patching = "running";
            cx.spawn(async (cx) => {
              try { await patchSidebar(this.sidebar === "outdated"); this.patching = null; this.sidebar = await sidebarState(); } catch (e) { this.patching = String(e?.message ?? e); }
              cx.notify();
            });
          }))]),
      ),
    ];
  }

  // About: what this is, where it lives, and a word for those who like it (a star, an idea).
  settingsAbout({ line, button, panel }, t) {
    const url = `https://github.com/${REPO}`;
    const star = () => div().flex_none().text_color(SHINY_GOLD).child("★"); // in gold: the font draws ⭐ in one colour
    return [
      panel(
        line(`Pokerdr ${VERSION}`, "Your coding agents as Pokémon: a free, open-source Herdr mod (MIT).",
          button("about-github", "Open on GitHub", true, (cx) => cx.open_url(url))),
        line(h_flex().gap(5).items_center().child(star()).child("Like it? Star it on GitHub"), "A star helps others find it, and keeps it going. Thank you!",
          button("about-star", h_flex().gap(4).items_center().child(star()).child("Star"), true, (cx) => cx.open_url(url))),
        line("Ideas, bugs, a Pokémon you want", "Open an issue, or send a pull request: they're very welcome.",
          button("about-issues", "Open an issue", true, (cx) => cx.open_url(`${url}/issues`))),
      ),
      div().pt(4).text_size(11.5).text_color(t.dim)
        .child("Built on mathieucroset's original Pokémon mod for Herdr. Sprites: PMD SpriteCollab (CC BY-NC 4.0); data: PokeAPI. An unofficial fan project, not affiliated with Nintendo, Game Freak or The Pokémon Company."),
    ];
  }

  openPicker(a, pick, tag) {
    openOverlay({
      mod: MOD,
      kind: "dialog",
      width: 640,
      height: 760, // room for the type filter too
      props: { picker: true, slot: slotOf(a), current: pick, tag },
    });
  }

  render(cx) {
    if (this.toastView) return this.renderToast();
    if (this.menu) return this.renderMenu();
    if (this.bagView) return this.renderBagDialog();
    if (this.settingsView) return this.renderSettings();
    if (this.partyView) return this.renderParty();
    return this.picker ? this.renderPicker(cx) : this.renderStrip(cx);
  }

  renderStrip(cx) {
    const t = theme();
    const scale = scaleOf();
    const now = Date.now();
    const list = herdAgents();
    const tabs = tabsById();
    const { ids } = assignAll(list);
    const g = this.grid(list.length);
    // with rows: per row, from the row's top; below it the name tags, on as many lines as they need
    const ground = (g ? g.rowH : this.height) - FEET - (TAG_LINES - 1) * LABEL_H;
    const grounds = g ? Array.from({ length: g.rows }, (_, r) => r * g.rowH + ground) : [ground];
    const sceneryOn = props()?.background !== "plain";
    this.snowing = false; // scenery() turns it on while it snows
    // Back after a while undrawn (the window was hidden or covered: no frames, while they kept
    // walking): this frame puts each one straight where it is now, with no slide from where it was
    // last drawn; the next tick redraws and those walking go on from there (`resume`).
    const lastDrawn = this.drawnAt;
    const gap = lastDrawn !== undefined && now - lastDrawn > 3000;
    this.drawnAt = now;
    if (gap) this.resume = true;
    // The visitor too: its slide (one transition over its whole walk) stood still while undrawn,
    // so its picture lagged behind where it is (its tag and the spot to click). It sets off again
    // from where it is now, as a new leg.
    const wv = this.visitor;
    // (A walking visitor redraws every tick, so a second without frames already means a pause.)
    if (lastDrawn !== undefined && now - lastDrawn > 1000 && wv?.start && !wv.throw && !wv.fight) {
      const f = clamp((now - wv.start) / wv.dur, 0, 1);
      wv.from = wv.from + (wv.to - wv.from) * f;
      wv.start = now;
      wv.dur = Math.max(1, (Math.abs(wv.to - wv.from) / walkSpeed(wv.pick)) * 1000);
      wv.walkFrom = undefined;
      wv.leg = (wv.leg ?? 0) + 1;
    }

    const root = div()
      .id("pokemon-strip")
      .relative()
      .size_full()
      .overflow_hidden()
      .bg(t.chrome)
      .on_size_change((size, cx) => {
        // The size comes in zoomed px, but everything here is drawn in unzoomed units.
        const width = size.width / zoom();
        const height = size.height / zoom();
        if (!this.sized || Math.abs(width - this.width) > 1 || Math.abs(height - this.height) > 1) {
          this.width = width;
          this.height = height;
          this.sized = true;
          cx.notify();
        }
      })
      // Dragging a Pokémon: it follows the pointer (and changes row), then stays put a while.
      .on_mouse_move((e, cx) => this.dragTo(e, g, cx))
      .on_mouse_up("left", (_e, cx) => this.dragEnd(cx))
      // Right-click on the ground (not on a Pokémon): rows and where the strip sits.
      .on_mouse_down("right", () => this.openMenu())
      .on_hover((h, cx) => { if (!h) this.dragEnd(cx); })
      // Scenery (the default): sky, hills and grass above each ground line. Plain: a faint line.
      .children(sceneryOn
        ? grounds.map((y, r) => this.scenery(y - ground, ground, r))
        : grounds.map((y) => div().absolute().left(0).right(0).top(y + 4).h(1).bg(t.border)));

    // The campfire, in the middle of each row's ground: crossed logs, a flickering flame, a glow.
    if (this.campfire && sceneryOn) {
      const fx = this.width / 2;
      for (const y of grounds) {
        const k = scale;
        root.child(div().absolute().left(fx - 40 * k).top(y - 46 * k).size(80 * k).rounded_full().bg("#ff9a3c").loop("opacity", { from: 0.08, to: 0.16, period: 1300 }))
          .child(div().absolute().left(fx - 9 * k).top(y - 3 * k).w(18 * k).h(4 * k).rounded(2).bg("#6b4528"))
          .child(div().absolute().left(fx - 6 * k).top(y - 5 * k).w(12 * k).h(3 * k).rounded(2).bg("#8a5a33"))
          .child(div().absolute().left(fx - 6 * k).top(y - 16 * k).w(12 * k).h(12 * k).rounded_full().bg("#f2702a").loop("opacity", { from: 0.7, to: 1, period: 420 }))
          .child(div().absolute().left(fx - 4 * k).top(y - 21 * k).w(8 * k).h(12 * k).rounded_full().bg("#ffb23c").loop("opacity", { from: 0.5, to: 1, period: 310 }))
          .child(div().absolute().left(fx - 2 * k).top(y - 17 * k).w(4 * k).h(7 * k).rounded_full().bg("#fff1a8").loop("opacity", { from: 0.6, to: 1, period: 230 }));
      }
    }
    if (list.length === 0) {
      return root.child(
        div().absolute().inset_0().flex().items_center().justify_center()
          .text_size(12).text_color(t.dim)
          .child("No agents yet. Each agent you start shows up here as a Pokémon."),
      );
    }
    if (this.magick === false) {
      root.child(
        div().absolute().top(8).right(12).text_size(11).text_color(t.muted)
          .child("Install ImageMagick (magick) to see the Pokémon"),
      );
    }

    // Left to right; the hovered one last, so its full name is drawn over the others.
    const order = [...list].sort((a, b) => (a.address === this.hover) - (b.address === this.hover)
      || (this.mons[a.address]?.x ?? 0) - (this.mons[b.address]?.x ?? 0));
    // Name tags are never hidden: per row, crowded ones shrink and use the second line (tags.js).
    // The ones that matter most (needs you, focused) keep their full width first. Hovering
    // doesn't re-lay them: the hovered one's full name floats over the others.
    const rank = (a) => (a.status === "blocked" ? 1 : a.status === "done" ? 2 : a.focused ? 3 : 4);
    // A dragged Pokémon keeps the row it was dropped on; the others take turns.
    const rowOf = (a) => (g ? Math.min(this.mons[a.address]?.row ?? list.indexOf(a) % g.rows, g.rows - 1) : 0);
    const label = (a, full) => {
      const pick = ids[a.address];
      // Hovered: this one's own jobs ("Pikachu · api · ♥2 · 7 jobs"), not its species' totals
      // (a new Rayquaza showed every Rayquaza's "13 done", as if it had kept them).
      const line = full ? `${pick.jobs ?? 0} job${pick.jobs === 1 ? "" : "s"}` : "";
      const hearts = full && pick.hearts ? ` · ♥${pick.hearts}` : ""; // its nature, size…: in the Box
      const holds = full && pick.held ? ` · ${ITEMS[pick.held].icon}` : ""; // just the icon: the label stays short
      const rivalTags = full && this.rivals?.[a.address] ? ` · ⚔ same folder as ${this.rivals[a.address].map((x) => { const b = list.find((y) => y.address === x); return b ? tagOf(b, tabs) : x; }).join(", ")}` : "";
      // What it says it's doing stays on the cards: here it ran across the whole strip.
      const text = full ? `${nameFor(pick)}${pick.gender ? ` ${genderMark(pick.gender)}` : ""} · ${tagOf(a, tabs)}${hearts}${holds}${rivalTags}${line ? ` · ${line}` : ""}` : tagOf(a, tabs);
      return this.showsShiny(pick) ? `✨ ${text}` : text;
    };
    // Tags are laid out where each Pokémon is headed: they move with it.
    const headedTo = (a) => { const m = this.mons[a.address]; return m ? (m.moving ? m.target : m.x) : this.width / 2; };
    const isAt = (a) => {
      const m = this.mons[a.address];
      if (!m?.moving) return headedTo(a);
      return m.from + (m.target - m.from) * clamp((now - m.start) / m.dur, 0, 1);
    };
    const tags = new Map();
    const byRow = [];
    // Settled: standing still since the last frame (tags.js lets these keep their lines).
    const was = this.standing ?? new Set();
    this.standing = new Set(list.filter((a) => !this.mons[a.address]?.moving).map((a) => a.address));
    // Since when each has stood still: settled tags keep their lines in that order.
    this.since ??= {};
    for (const a of list) {
      if (this.standing.has(a.address)) this.since[a.address] ??= now;
      else delete this.since[a.address];
    }
    for (const a of list) {
      (byRow[rowOf(a)] ??= []).push({ id: a.address, cx: headedTo(a), from: isAt(a), text: label(a), extra: ids[a.address]?.alpha ? 16 : 0, rank: rank(a), settled: was.has(a.address) && this.standing.has(a.address), since: this.since[a.address] });
    }
    for (const row of byRow) if (row) for (const [id, spot] of layoutTags(row, this.width, { maxLines: TAG_LINES })) tags.set(id, spot);
    // A raid's battle on: over each of yours, how long till it can hit again, or its rest.
    const raidNow = settingsNow().raids ? loadRaid(shared(RAID_KEY)) : null;
    const raidBattle = raidPhase(raidNow, now) === "battle";
    const raidBadge = (pane, m) => {
      if (!raidBattle || !pane) return null;
      if (now < (m.restUntil ?? 0)) return `💫 ${Math.ceil((m.restUntil - now) / 60000)}m`;
      const w = cooldownLeft(raidNow, pane, now);
      return w > 0 ? `⏳ ${Math.ceil(w / 1000)}s` : null;
    };
    const heads = []; // per row, where each head and its bubble is: clouds and the moon fade there
    const outer = scale;
    for (const a of order) {
      const pick = ids[a.address];
      const scale = (pick.young ? outer * 0.75 : pick.alpha ? outer * ALPHA_SIZE : outer) * drawSize(pick.size); // a sub-agent's Pokémon is smaller, an Alpha bigger; an XXL a little bigger
      const id = pick.dex;
      const m = this.mons[a.address] ?? { x: this.width / 2, target: this.width / 2, dir: "r", moving: false, dur: 0 };
      const mood = m.mood ?? moodOf(a, tabs, now);
      // Mega Evolving: its own form till the cocoon bursts, then its Mega form (it showed the Mega
      // form from the start, under the beams).
      // (And before its Mega Evolution has even begun: dropped on a wild one, it hopped off in its
      // Mega form for a tick before the effect started.)
      const want = this.spriteFor(pick, this.megaStatus(a));
      const base = this.sprites[spriteKey(dressed(pick))];
      const preMega = (m.megaFx?.on && now - m.megaFx.at < megaTiming(m.megaFx.full).burst) || (want?.megaShown && m.mega === false);
      // Evolving: its old form till the burst (it showed the new one from the start).
      const evoT = m.evolveFx ? now - m.evolveFx.at : Infinity;
      const oldMeta = evoT < EVOLVE_BURST && m.evolveFx.from ? this.sprites[spriteKey(dressed(m.evolveFx.from))] : null;
      const meta = oldMeta?.walkR ? oldMeta : preMega && base?.walkR ? base : want;
      const tag = tagOf(a, tabs);
      const x = m.moving ? m.target : m.x;
      const spot = tags.get(a.address);
      const hovered = this.hover === a.address;
      const sw = SLOT;
      const SLOT_MID = sw / 2;

      let body;
      let headY = ground - 40 * scale;
      let hit; // the area that takes the mouse: just its visible body (boxes overlap a lot)
      if (meta && meta.walkR) {
        const p = pose(m, mood, now, hovered, x < this.width / 2 ? "r" : "l");
        const s = (p.sprite === "react" ? (p.face && meta.react?.[`${p.anim}${p.face.toUpperCase()}`]) || meta.react?.[p.anim] : meta[p.sprite]) ?? meta.idleR;
        // Stand the sprite's visible feet on the ground line, centered on its visible body.
        const left = SLOT_MID - (s.box.x + s.box.w / 2) * scale;
        const top = ground - (s.box.y + s.box.h) * scale;
        headY = ground - s.box.h * scale;
        hit = { left: SLOT_MID - (s.box.w / 2) * scale - 2, top: headY - 2, w: s.box.w * scale + 4, h: s.box.h * scale + 4 };
        const shadowW = Math.max(14, Math.round(s.box.w * 0.7)) * scale;
        body = div()
          .child(div().absolute().left(SLOT_MID - shadowW / 2).top(ground - 2 * scale).w(shadowW).h(6 * scale).rounded_full().bg("#00000030"))
          .when(!!pick.alpha, (el) => el.child(alphaGlow(SLOT_MID, ground, s.box, scale, !!pick.shadow, true))) // over its shadow, not darkened by it; still
          .child(image(s.path).absolute().left(left).top(top).w(s.w * scale).h(s.h * scale))
          // A blow landing: it flashes white (and the hurt pose's silhouette is made ahead).
          .when(true, (el) => {
            const lb = (m.blows ?? []).filter((b) => !b.miss && now >= b.at - 1500 && now < b.at + 200).at(-1);
            if (lb) for (const n of ["HurtL", "HurtR", "Hurt"]) this.wantWhite(meta.react?.[n]?.path);
            const wf = lb && this.whiteFlash(`m-${a.address}`, s.path, left, top, s.w * scale, s.h * scale, lb.at, now);
            return wf ? el.child(wf) : el;
          })
          // Evolving: its white silhouette pulses over it, as in the games, till the burst.
          .when(!!m.evolveFx && evoT < EVOLVE_BURST, (el) => {
            // The same pose of the new form (its own box: feet and middle where the old one's were).
            const pose = Object.keys(meta).find((k) => meta[k] === s) ?? "idleR";
            const n = (oldMeta?.walkR ? want : null)?.[pose] ?? (oldMeta?.walkR ? want?.idleR : null);
            this.wantWhite(s.path);
            if (n) this.wantWhite(n.path);
            const key = `evow-${a.address}-${m.evolveFx.at}`;
            const shape = evoT < EVOLVE_WHITE || !n ? "old" : evolveShape(evoT);
            const c = shape === "new" ? n : s;
            if (this.whites?.[c.path] !== "ready") return el;
            const cl = SLOT_MID - (c.box.x + c.box.w / 2) * scale, ct = ground - (c.box.y + c.box.h) * scale;
            // First its old form whitening; then each shape at full white as it comes.
            const id = evoT < EVOLVE_WHITE ? `${key}-in` : `${key}-${shape}`, first = evoT < EVOLVE_WHITE && this.fxFirst(id);
            return el.child(image(whitePath(c.path)).id(id).absolute().left(cl).top(ct).w(c.w * scale).h(c.h * scale)
              .opacity(first ? 0 : 0.97).transition("opacity", { duration: EVOLVE_WHITE - 50, easing: "ease-in" }));
          })
          // Mega Evolving: white light in its cocoon, till the cocoon bursts and it fades off its new form.
          .when(!!m.megaFx?.on && now - m.megaFx.at < megaTiming(m.megaFx.full).burst, (el) => {
            const T = megaTiming(m.megaFx.full), t = now - m.megaFx.at, key = `megaw-${a.address}-${m.megaFx.at}`;
            // Every pose it may take meanwhile (it turns, sleeps, walks), made ahead: a pose without
            // its white let its colours show through mid-cocoon.
            for (const c of [s, meta.idleR, meta.idleL, meta.idleD, meta.walkR, meta.walkL, meta.sleep]) if (c?.path) this.wantWhite(c.path);
            if (this.whites?.[s.path] !== "ready" || t < T.cocoon) return el;
            const id = `${key}-1`, first = this.fxFirst(id);
            return el.child(image(whitePath(s.path)).id(id).absolute().left(left).top(top).w(s.w * scale).h(s.h * scale)
              .opacity(first ? 0 : 0.95).transition("opacity", { duration: 280, easing: "ease-out" }));
          })
          // Hurt by a wild one: its health, till it's back (resting after fainting: 💫 too).
          .when(ownHp(m, now) < 1 && !(m.sparHp && now < m.sparHp.until), (el) => el.child(healthBar(SLOT_MID, headY - 6, ownHp(m, now), this.lostOf(`own-${a.address}`, m.hpLost, now))))
          // Sparring: its health in the battle (full, then what each blow leaves it), drained white.
          .when(!!m.sparHp && now < m.sparHp.until, (el) => {
            const done = m.sparHp.steps.filter((st) => now >= st.at);
            const cur = done.at(-1), prev = done.at(-2)?.hp ?? 1;
            return el.child(healthBar(SLOT_MID, headY - 6, cur?.hp ?? 1, cur ? this.lostOf(`spar-${a.address}`, { prev, at: cur.at }, now) : null));
          });
      } else {
        // Loading (or no ImageMagick): a little Poké Ball waits in its place.
        const r = 9 * scale;
        headY = ground - 2 * r;
        hit = { left: SLOT_MID - r, top: headY, w: 2 * r, h: 2 * r };
        body = div()
          .absolute().left(SLOT_MID - r).top(ground - 2 * r).size(2 * r)
          .rounded_full().overflow_hidden().border_1().border_color(t.foreground)
          .when(meta === "loading" || meta === undefined, (el) => el.loop("opacity", { from: 0.35, to: 1, period: 1200 }))
          .child(div().absolute().left(0).top(0).w(2 * r).h(r).bg("#e3350d"))
          .child(div().absolute().left(0).top(r).w(2 * r).h(r).bg("#f4f4f4"))
          .child(div().absolute().left(r - 3 * scale).top(r - 3 * scale).size(6 * scale).rounded_full().bg("#f4f4f4").border_1().border_color(t.foreground));
      }

      const bubble =
        mood === "blocked" ? div().px(6).rounded(7).bg(t.blocked).text_color("#ffffff").font_bold().child("!")
            .loop("opacity", { from: 0.7, to: 1, period: 900 })
        : mood === "done" ? div().px(6).rounded(7).bg(t.done).text_color("#ffffff").font_bold().child("✓")
        : mood === "sleep" ? div().text_color(t.muted).frames(["z", "zZ", "zZz", "zZ"], 700)
        : null;
      const x0 = isAt(a) - sw / 2 + hit.left;
      (heads[g ? rowOf(a) : 0] ??= []).push({ x0, x1: x0 + hit.w, top: bubble ? headY - 24 : headY - 4 });

      // Its tag, in this box's coordinates. Walking, it stays centred under its feet (its laid-out
      // spot is where it will stop, which the edge may have pushed in, or past the edge when it
      // walks onto the next row); standing, it may be pushed in from the strip's edge.
      const tagLeft = (left, w) => (m.moving ? sw / 2 - w / 2 : left - x + sw / 2);
      // Hover, click (focus its agent), drag, right-click (picker): on its body and its name only.
      const interact = (el, id) => el
        .id(id)
        .cursor_pointer()
        .on_hover((h, cx) => {
          const next = h ? a.address : this.hover === a.address ? null : this.hover;
          if (next !== this.hover) { this.hover = next; cx.notify(); }
        })
        .on_mouse_down("left", (e) => {
          this.drag = { addr: a.address, start: e.position, moved: false };
          this.dropped = null;
        })
        .on_click(() => {
          if (this.dropped === a.address) { this.dropped = null; return; } // that press was a drag
          // A pat: a heart, now and then.
          const now2 = Date.now();
          if (a.pane && now2 - (petAt[a.pane] ?? 0) > PET_MS && updatePick(a.pane, (p) => (friendOf(p) < FRIEND_MAX ? withFriend(p, FRIEND.pat) : null))) {
            petAt[a.pane] = now2;
            const mm = this.mons[a.address];
            research("pet");
            const tip = earn("tip", TIP.pat); // a little, while the day's tips last
            if (mm) this.note(mm, tip ? `💗+${money(tip)}` : "💗", now2, 3000);
          }
          a.pane ? run("pane.focus", { pane: a.pane }) : run("agent.focus", { terminal: a.address });
        })
        .on_mouse_down("right", (_e, cx) => {
          cx.stop_propagation();
          this.openPicker(a, pick, tag);
        });

      root.child(
        div()
          .id(`mon-${a.address}`)
          .absolute()
          .top(g ? rowOf(a) * g.rowH : 0)
          .h(g ? g.rowH : this.height)
          .w(sw)
          .left((gap && m.moving ? m.from + (m.target - m.from) * clamp((now - m.start) / m.dur, 0, 1) : x) - sw / 2)
          // Walking: over what is left of its walk (from where it is drawn now); standing: its own
          // short move (a step aside, a jump), or none at all after a gap.
          .transition("left", { duration: gap ? 1 : Math.max(1, Math.round(m.moving ? m.start + m.dur - now : m.dur || 150)), easing: "linear" })
          .child(this.withBlows(`mon-${a.address}`, m.blows,
            m.evolveFx && now - m.evolveFx.at >= EVOLVE_WHITE && now - m.evolveFx.at < EVOLVE_BURST && m.evolveFx.from ? body.opacity(0) : body, SLOT_MID, headY, ground, now,
            ((sh) => sh && travelOf(sh.move?.type, sh.move?.physical) === "dash" ? lungeOf(dashAt(sh.from, sh.to, sh.at, sh.until, now, stopOfMove(sh.move)), sh.move, sh.at) : null)(shotsOf(m).find((x) => now >= x.at && now < x.until + 260 + HITSTOP))))
          .child(interact(div().absolute().left(hit.left).top(hit.top).w(hit.w).h(hit.h), `hit-${a.address}`))
          .when(!!bubble, (el) =>
            el.child(h_flex().absolute().left(0).w(sw).top(Math.max(2, headY - 22)).justify_center().text_size(12.5).child(bubble)))
          // Reacting to the season: its icon (🌸 ☀️ 🍂 ❄️) beside its head.
          .when(!!reactIcon(m, now), (el) =>
            el.child(div().absolute().left(sw / 2 + 8).top(Math.max(2, headY - 12)).text_size(12)
              .child(reactIcon(m, now)))) // still: GPUI drew a looping emoji without its colours
          // A battle's special move: its type's icon flies across to the other (one transition,
          // set once: from where it starts on the first frame, to the other on the next ones).
          // (fx.js: its type's colours and look, a glow, a tail), landing as the other is hit.
          .when(!!shotAt(m, now), (el) => {
            const sh = shotAt(m, now);
            const dir = sh.to >= sh.from ? 1 : -1;
            return el.children(this.fxMove(`shot-${a.address}-${sh.at}`, sh.move, sw / 2 + dir * 14, sw / 2 + (sh.to - sh.from) - dir * 12,
              Math.round((headY + ground) / 2) - 2, sh.at, sh.until, now));
          })
          // A note in a spar ("It's burned!"), over it while it lasts.
          .children((m.sparNotes ?? []).filter((n) => now >= n.at && now < n.until).map((n) => fxWord(`note-${a.address}-${n.at}`, [n.text, n.color], SLOT_MID,
            Math.max(2, headY - 30), this.fxFirst(`note-${a.address}-${n.at}`) ? 0 : now < n.until - 300 ? 1 : 2)))
          // It won a spar: "Charizard won! 3–1" (the pair's record) over it while it celebrates.
          .when(!!m.sparWin && now >= m.sparWin.at && now < m.sparWin.at + 1500, (el) => el.child(fxWord(`win-${a.address}-${m.sparWin.at}`,
            [m.sparWin.text, "#ffd23f"], SLOT_MID, Math.max(2, headY - 30), this.fxFirst(`win-${a.address}-${m.sparWin.at}`) ? 0 : now < m.sparWin.at + 1200 ? 1 : 2)))
          // Its move's name over its head as it gathers and lets fly ("Flamethrower!").
          .when(!!shotAt(m, now, 700)?.move?.name, (el) => {
            const sh = shotAt(m, now, 700);
            const lb = this.moveLabel(`mv-${a.address}-${sh.at}`, sh.move, SLOT_MID, Math.max(2, headY - 30), sh.at, now);
            return lb ? el.child(lb) : el;
          })
          // A raid on: whether it can hit the boss yet (⏳ 35s) or rests after fainting (💫 1m).
          .when(!!raidBadge(a.pane, m), (el) => el.child(h_flex().absolute().left(0).w(sw).top(Math.max(2, headY - 30)).justify_center()
            .child(div().px(5).h(15).rounded(5).bg("#000000a8").flex().items_center().text_size(10).font_semibold().text_color("#ffd23f").child(raidBadge(a.pane, m)))))
          // A find, a heart, a berry; or hungry, waiting on you too long.
          .when(!!m.note || !!m.hungry, (el) =>
            el.child(div().absolute().left(sw / 2 - 30).top(Math.max(2, headY - 14)).text_size(13)
              
              .child(m.note?.item ? this.itemMark(m.note.item, 18) : (m.note?.icon ?? "🥺"))))
          // Tired (the 5-hour limit is near): working ones sweat.
          .when(!!this.tired && mood === "working", (el) =>
            el.child(div().absolute().left(sw / 2 + 12).top(Math.max(2, headY - 4)).text_size(11)
              .child("💦")))
          // Working in the same folder as another agent: crossed swords, pulsing, over its head.
          .when(!!m.rival, (el) =>
            el.child(div().absolute().left(sw / 2 - 8).top(Math.max(2, headY - 30)).text_size(13)
              .child("⚔️")))
          // Evolving: a column of light, motes, rings; then a burst and "Evolved!" (fx.js EVOLVE_MS).
          .when(!!m.evolveFx && now - m.evolveFx.at < EVOLVE_MS, (el) => {
            const t = now - m.evolveFx.at, key = `evo-${a.address}-${m.evolveFx.at}`;
            return el.child(fxEvolve(key, SLOT_MID, headY, ground, t, this.fxFirst(`${key}-r`)))
              .when(t >= EVOLVE_BURST && t < EVOLVE_BURST + 470, (e2) => e2.child(fxBurst(`${key}-b`, GOLD_STYLE, 1, SLOT_MID, (headY + ground) / 2, this.fxFirst(`${key}-b`), 31)))
              // A flare of white the new form comes out of (the switch from one shape to the other hidden).
              .when(t >= EVOLVE_BURST - 60 && t < EVOLVE_BURST + 420, (e2) => {
                const fid = `${key}-flare${t >= EVOLVE_BURST ? 2 : 1}`, f = this.fxFirst(fid), after = t >= EVOLVE_BURST;
                const w = Math.max(30, (ground - headY) * 1.1), h = Math.max(34, (ground - headY) * 1.25), mid = (headY + ground) / 2;
                const d = after && !f ? 1.5 : 1;
                return e2.child(div().id(fid).absolute().left(SLOT_MID - (w * d) / 2).top(mid - (h * d) / 2).w(w * d).h(h * d).rounded_full().bg("#ffffff")
                  .opacity(after ? (f ? 1 : 0) : 1).transition("opacity", { duration: 380, easing: "ease-in" })
                  .transition("width", { duration: 380 }).transition("height", { duration: 380 }).transition("left", { duration: 380 }).transition("top", { duration: 380 }));
              })
              .when(t >= EVOLVE_BURST, (e2) => e2.child(fxWord(`${key}-w`, ["✨ Evolved!", "#ffd23f"], SLOT_MID, Math.max(2, headY - 30),
                this.fxFirst(`${key}-w`) ? 0 : t < EVOLVE_MS - 300 ? 1 : 2)));
          })
          // Mega Evolving: a sphere, the Key Stone's colours orbiting; then a burst.
          .when(!!m.megaFx && now - m.megaFx.at < (m.megaFx.on ? megaTiming(m.megaFx.full).total : 600), (el) => {
            const t = now - m.megaFx.at, key = `mega-${a.address}-${m.megaFx.at}`;
            const mid = (headY + ground) / 2;
            // Out of its Mega: a small flash, no more.
            if (!m.megaFx.on) return el.when(t < 470, (e2) => e2.child(fxBurst(`${key}-b`, MEGA_STYLE, 0.5, SLOT_MID, mid, this.fxFirst(`${key}-b`), 17)));
            const T = megaTiming(m.megaFx.full);
            const r = Math.max(22, (ground - headY) * 0.62);
            const parts = megaParts(m.megaFx.full, SLOT_MID, mid, r).map((p, k) => [p, k]).filter(([p]) => t >= p.at && t < p.at + p.ms + 60);
            const name = `Mega ${nameOf(pick.dex)}${megaForm(pick.dex, pick.megaKind)?.kind ? ` ${megaForm(pick.dex, pick.megaKind).kind}` : ""}`;
            return el.children(parts.map(([p, k]) => fxSig(`${key}-p${k}`, p, this.fxFirst(`${key}-p${k}`))))
              // The Mega symbol, shining over it, then gone as it bursts.
              .when(T.symbol !== null && t >= T.symbol && t < T.burst + 300 && MEGA_MARK.ready, (e2) => {
                const sid = `${key}-sym${t >= T.burst ? 2 : 1}`, f = this.fxFirst(sid), after = t >= T.burst;
                return e2.child(image(MEGA_MARK_REL).id(sid).absolute().left(SLOT_MID - 14).top(Math.max(0, headY - 34)).size(28)
                  .opacity(after ? (f ? 1 : 0) : (f ? 0 : 1)).transition("opacity", { duration: after ? 280 : 220 }));
              })
              .when(t >= T.burst && t < T.burst + 470, (e2) => e2.child(fxBurst(`${key}-b`, MEGA_STYLE, 1, SLOT_MID, mid, this.fxFirst(`${key}-b`), 17)))
              // Its Mega form's name over it, as the games announce it.
              .when(m.megaFx.full && t >= T.burst, (e2) => e2.child(fxWord(`${key}-name`, [`${name}!`, "#ffd23f"], SLOT_MID, Math.max(2, headY - 30),
                this.fxFirst(`${key}-name`) ? 0 : t < T.total - 300 ? 1 : 2)));
          })
          // A shiny shows off when it first turns up.
          .when((m.sparkleUntil > now && this.showsShiny(pick)) || m.flashUntil > now, (el) =>
            el.child(div().absolute().left(sw / 2 + 10).top(Math.max(2, headY - 10)).text_size(13)
              .loop("opacity", { from: 0.2, to: 1, period: 500 }).child("✨")))
          // Its name, right under it (tags.js keeps tags apart by stacking lines); it moves with it.
          .when(!!spot && !hovered, (el) => el.child(
            interact(h_flex(), `tag-${a.address}`)
              .absolute().left(tagLeft(spot.left, spot.w)).w(spot.w).top(ground + 6 + spot.line * LABEL_H).h(LABEL_H)
              // A background, so a tag passing over another covers it instead of mixing letters.
              .overflow_hidden().justify_center().items_center().gap(4).rounded(4).bg(t.chrome)
              .child(div().flex_none().size(6).rounded_full().bg(t[a.status] ?? t.idle))
              .when(!!pick.alpha, (e2) => e2.child(alphaTag()))
              .child(
                div().min_w(0).truncate().text_size(10.5)
                  .text_color(hovered || a.focused ? t.foreground : t.muted)
                  .child(sparkled(label(a))),
              ),
          ))
          // Hovered: its full name ("Pikachu · api") floats over its neighbours' tags.
          .when(!!spot && hovered, (el) => {
            const full = label(a, true);
            const w = Math.min(this.width, full.length * 6.2 + 26 + (pick.alpha ? 16 : 0));
            const left = m.moving ? x - w / 2 : clamp(x - w / 2, 0, Math.max(0, this.width - w));
            return el.child(
              interact(h_flex(), `tag-${a.address}`)
                .absolute().left(left - x + sw / 2).w(w).top(ground + 6 + spot.line * LABEL_H).h(LABEL_H)
                .overflow_hidden().justify_center().items_center().gap(4).px(4)
                .rounded(5).bg(t.popover).border_1().border_color(t.border)
                .child(div().flex_none().size(6).rounded_full().bg(t[a.status] ?? t.idle))
                .when(!!pick.alpha, (e2) => e2.child(alphaTag()))
                .child(div().min_w(0).truncate().text_size(10.5).text_color(t.foreground).child(sparkled(full))),
            );
          })
      );
    }
    this.heads = heads;
    // Just updated by itself: "✓ Updated to 2.5.6" in the corner for two minutes.
    const done = shared(UPDATED_KEY);
    if (done?.to === VERSION && now - done.at < 120000) {
      root.child(div().id("pokemon-updated").absolute().right(50).top(4).h(16).px(6).rounded(8)
        .flex().items_center().text_size(10).bg("#00000059").text_color("#ffffff").child(`✓ Updated to ${VERSION}`));
    }
    // Battle sounds, on or off at a click (Settings → Sound too).
    const loud = !!settingsNow().battleSounds;
    root.child(div().id("pokemon-sfx").absolute().right(6).top(4).size(18).rounded(5).bg("#00000066")
      .flex().items_center().justify_center().text_size(10.5).opacity(loud ? 0.95 : 0.55).cursor_pointer()
      .hover((st) => st.opacity(1))
      .on_mouse_down("left", (_e, cx) => { cx.stop_propagation(); setSetting("battleSounds", !loud); cx.notify(); })
      .child(loud ? "🔊" : "🔇"));
    // The menu (the Box, Today, Settings…), as a right-click on the ground opens it: a button for
    // it, so it can be found.
    root.child(div().id("pokemon-menu-button").absolute().right(28).top(4).size(18).rounded(5).bg("#00000066")
      .flex().items_center().justify_center().text_size(11).text_color("#ffffff").opacity(0.7).cursor_pointer()
      .hover((st) => st.opacity(1))
      .on_mouse_down("left", (_e, cx) => { cx.stop_propagation(); this.openMenu(); cx.notify(); })
      .child("☰"));
    // A newer release on GitHub: a small pill in the corner; it opens Settings → Updates.
    const update = this.update();
    if (update) {
      root.child(div().id("pokemon-update").absolute().right(50).top(4).h(16).px(6).rounded(8)
        .flex().items_center().text_size(10).bg(t.accent).text_color(t.accent_foreground)
        .cursor_pointer().on_click(() => openSettings(update))
        .child(`Update ${update}`));
    }
    // Shop boosts on now: a small pill each in the top-left corner, with the minutes left.
    const on = Object.entries(loadBoosts(shared(BOOSTS_KEY), now));
    if (on.length) {
      // Under the raid's and the outbreak's notes, when they're up (it was drawn over them).
      root.child(h_flex().absolute().left(6).top(4 + 18 * (this.leftNotes(now) - 1)).gap(4).children(on.map(([id, until]) =>
        div().id(`boost-${id}`).h(16).px(6).rounded(8).flex().items_center().gap(3).text_size(10)
          .bg("#00000059").text_color("#ffffff").tooltip(`${ITEMS[id].name}: ${Math.ceil((until - now) / 60000)} min left`)
          .child(`${ITEMS[id].icon} ${Math.ceil((until - now) / 60000)}m`))));
    }
    // A Festival Ticket: bursts of fireworks over the strip, one after another (where and when
    // from the moment it was used, so every strip and frame agrees).
    const fest = shared(FESTIVAL_KEY) ?? 0;
    if (now - fest < FESTIVAL_MS) {
      const top = g ? g.rows * g.rowH : this.height;
      for (let k = 0; k < 9; k++) {
        const seed = Math.sin(fest / 1000 + k * 12.9898) * 43758.5453;
        const r = seed - Math.floor(seed);
        const at = fest + k * 550;
        if (now < at || now > at + 1400) continue;
        const left = 20 + r * Math.max(40, this.width - 60);
        const y = 6 + ((r * 7) % 1) * Math.max(10, top * 0.45);
        root.child(div().id(`firework-${fest}-${k}`).absolute().left(left).top(y).text_size(k % 3 === 0 ? 22 : 16)
          .loop("opacity", { from: 0.2, to: 1, period: 400 })
          .child(["🎆", "🎇", "✨"][k % 3]));
      }
    }
    // One just come in: "A wild Pikachu appeared!" on the side it walks in from, for APPEAR_MS (a
    // rare one has its own note on the right, below).
    const av = this.visitor;
    if (av?.start && !av.leg && now - av.start < APPEAR_MS && !(rareOf(av.pick) && settingsNow().cryRare && av.dir === "l")) {
      const who = av.pick.legend ? "A legendary" : av.pick.alpha ? (av.pick.shadow ? "A Shadow Alpha" : "An Alpha") : "A wild";
      const text = `${who} ${av.pick.shiny ? "✨ " : ""}${fullName(av.pick.dex, av.pick.form)} appeared!`;
      const note = div().id(`appear-${av.id}`).absolute().top(av.dir === "r" ? this.leftNotes(now) * 18 + 4 : 4).h(16).px(6).rounded(8)
        .flex().items_center().text_size(10).font_semibold().bg("#000000a0").text_color(rareOf(av.pick)?.color ?? "#ffffff").child(sparkled(text));
      root.child(av.dir === "r" ? note.left(6) : note.right(update ? 134 : 50));
    }
    // A rare one walking by (shiny, Alpha, legendary): a note in the corner while it's here.
    const rv = this.visitor;
    if (rv?.start && !rv.fainted && !(rv.throw && (rv.throw.caught || rv.throw.fled)) && rareOf(rv.pick) && settingsNow().cryRare && !this.coming) {
      root.child(div().id("pokemon-rare").absolute().right(update ? 134 : 50).top(4).h(16).px(6).rounded(8)
        .flex().items_center().text_size(10).font_semibold().bg("#000000a0").text_color(rareOf(rv.pick).color)
        .child(`${rareOf(rv.pick).mark} ${rareOf(rv.pick).what} ${fullName(rv.pick.dex, rv.pick.form)} is walking by!`));
    }
    // A Mass Outbreak on: its species and how long it lasts (under the raid's note, if one is on).
    const ob = settingsNow().outbreaks && VISIT_EVERY[settingsNow().visitors] ? outbreakAt(now, shared(OUTBREAK_KEY)) : null;
    if (ob) {
      const under = settingsNow().raids && raidPhase(loadRaid(shared(RAID_KEY)), now);
      root.child(div().id("pokemon-outbreak").absolute().left(6).top(under ? 22 : 4).h(16).px(6).rounded(8).max_w(Math.max(120, this.width - 70)).overflow_hidden()
        .flex().items_center().text_size(10).font_semibold().bg("#000000a0").text_color("#8fd3ff")
        .child(`🌊 Outbreak: ${fullName(ob.dex)} · ${Math.max(1, Math.ceil((ob.until - now) / 60000))}m left`)); // shinies 1 in 16: Today
    }
    // Called with Honey or the Azure Flute: on its way (the first time a species comes, its
    // sprite is fetched, which can take half a minute).
    if (this.coming) {
      const txt = this.coming === "legend" ? "✦ A legendary Pokémon is on its way…" : "🍯 A wild Pokémon is on its way…";
      root.child(div().id("pokemon-coming").absolute().right(update ? 112 : 28).top(4).h(16).px(6).rounded(8)
        .flex().items_center().text_size(10).bg("#00000059").text_color(this.coming === "legend" ? "#f2c94c" : "#ffffff")
        .loop("opacity", { from: 0.5, to: 1, period: 900 })
        .child(this.visitor?.start && this.coming === "legend" ? "✦ A legendary Pokémon comes after this one…" : txt));
    }
    this.renderRaid(root, grounds, scale, now, t);
    this.renderVisitor(root, grounds, scale);
    // An effect drawn for the first time (where it starts): a frame right after sets it moving.
    if (this.fxKick) {
      this.fxKick = false;
      try { cx.timer.after(35, (c) => c.notify()); } catch (e) { logOnce(e, console.log, now, this.errSeen); }
    }
    return root;
  }

  // ---- notifications (Settings → "Pokémon in notifications": the layout root's toast) ----
  // Herdr's own (an agent needs you, finished) and every notify(): about an agent, its Pokémon's
  // portrait and name lead; anything else looks as Herdr's own toast does. Click: its action.

  initToast(cx) {
    this.portraitReady = false;
    const a = agentOfToast(props(), agents());
    const pick = a && assignAll(agents()).ids[a.address];
    if (!pick) return;
    cx.spawn(async (cx) => {
      try { await ensureIcon(pick.dex, pick.form); this.portraitReady = true; } catch {}
      cx.notify();
    });
  }

  renderToast() {
    const t = theme();
    const p = props() ?? {};
    const list = agents();
    const a = agentOfToast(p, list);
    const pick = a && assignAll(list).ids[a.address];
    const DOT = { error: "blocked", warning: "working", success: "done", info: "accent" };
    const lead = pick && this.portraitReady
      ? div().size(40).flex_none().rounded(8).overflow_hidden().child(image(iconPath(pick.dex, pick.form)).size(40))
      : p.icon ? image(p.icon).w(18).h(18).flex_none() : div().size(8).rounded(4).flex_none().bg(t[DOT[p.level] ?? "accent"]);
    return h_flex().id("toast").size_full().px(14).gap(12).items_center().bg(t.popover).cursor_pointer()
      .hover((st) => st.bg(t.hover))
      .on_click(() => {
        if (p.action?.name) run(p.action.name, p.action.args ?? {});
        closeOverlay(p.overlay);
      })
      .child(lead)
      .child(v_flex().flex_1().min_w(0).gap(1)
        .child(div().truncate().font_semibold().text_size(13).text_color(t.foreground).child(p.title ?? ""))
        .when(!!pick || !!p.body, (el) => el.child(div().truncate().text_size(12).text_color(t.muted)
          .child(sparkled(pick ? `${pick.shiny ? "✨ " : ""}${fullName(pick.dex, pick.form)}${p.body ? ` · ${p.body}` : ""}` : p.body)))));
  }

  // ---- the Party panel (a block with props { view: "party" }; Settings → Party panel) ----
  // Every agent as its Pokémon's card, for any layout (Better Sidebar's patched cards are the
  // same idea inside its own list). Read at a glance: the agent's name, large; the card's edge in
  // its status colour (pulsing while it needs you); its portrait; its Pokémon, hearts and how
  // close it is to evolving. Click: focus the agent.

  initParty(cx) {
    this.portraits = {};
    this.partyHover = null;
    cx.timer.every(1000, (cx) => {
      for (const p of Object.values(assignAll(agents()).ids)) {
        const key = entryKey(p);
        if (this.portraits[key]) continue;
        this.portraits[key] = "loading";
        cx.spawn(async (cx) => {
          try { await ensureIcon(p.dex, p.form); this.portraits[key] = "ready"; } catch { this.portraits[key] = "failed"; }
          cx.notify();
        });
      }
      cx.notify();
    });
  }

  // Its status, small, at the end of its name's line.
  partyStatus(t, status) {
    if (status === "blocked") return div().size(16).flex_none().rounded(4).bg(t.blocked + "26").text_size(10.5).font_bold()
      .text_color(t.blocked).flex().items_center().justify_center().child("!");
    if (status === "done") return div().flex_none().text_size(12).font_bold().text_color(t.done).child("✓");
    if (status === "working") return div().size(8).flex_none().rounded_full().bg(t.working).loop("opacity", { from: 0.35, to: 1, period: 900 });
    return div().size(6).flex_none().rounded_full().bg(t.border);
  }

  renderParty() {
    const t = theme();
    // In place of the sidebar's Agents list (props.was: what it was), it is that list: titled
    // "Agents", in its sections (Needs you, Done, Working, Idle; the latest change first), each
    // with when it last changed, and it sets the order agent.next / agent.prev walk.
    const asAgents = !!props()?.was;
    const RANK = { blocked: 4, done: 3, working: 2, idle: 1 };
    const SECTION = { blocked: "Needs you", done: "Done", working: "Working", idle: "Idle" };
    // When each last changed status, as the strip noted it (terminals()' status_ms runs stale).
    const changedAt = shared(SINCE_KEY) ?? {};
    const list = agents().filter((a) => a.pane)
      .sort((x, y) => (RANK[y.status] ?? 0) - (RANK[x.status] ?? 0) || (changedAt[y.address] ?? 0) - (changedAt[x.address] ?? 0));
    const order = list.map((a) => a.address).join(" ");
    if (asAgents && order !== this.lastOrder) { this.lastOrder = order; setAgentOrder(list.map((a) => a.address)); }
    const tabs = tabsById();
    const { ids } = assignAll(list);
    const now = Date.now();
    const rivals = rivalsOf(list, foldersNow());
    const sayings = sayingsNow();
    const warnOf = (a) => (rivals[a.address] ?? []).map((x) => list.find((b) => b.address === x)).filter(Boolean).map((b) => tagOf(b, tabs));
    // Narrow (a collapsed sidebar): just each portrait, framed in its status colour.
    const narrow = (this.partyWidth ?? 300) < 120;
    const mini = (a) => {
      const pick = ids[a.address];
      const ready = this.portraits[entryKey(pick)] === "ready";
      const ring = a.status === "idle" ? (a.focused ? t.accent : t.border) : t[a.status] ?? t.border;
      return div().py(3).flex_none().flex().justify_center().child(div()
        .id(`party-${a.address}`).relative().size(36).rounded(9).border_2().border_color(ring).overflow_hidden()
        .bg(a.focused ? t.selected : t.raised).cursor_pointer()
        .when(a.status === "blocked", (el) => el.loop("opacity", { from: 0.45, to: 1, period: 900 }))
        .on_click(() => run("pane.focus", { pane: a.pane }))
        .when(ready, (el) => el.child(image(iconPath(pick.dex, pick.form)).size(32))));
    };
    const card = (a) => {
      const pick = ids[a.address];
      const c = cardOf(pick);
      const ring = a.status === "idle" ? null : t[a.status] ?? null;
      const hovered = this.partyHover === a.address;
      const ready = this.portraits[entryKey(pick)] === "ready";
      const bar = c.progress !== null;
      return div().py(2).flex_none().child(h_flex()
        .id(`party-${a.address}`).relative().px(8).py(7).gap(10).items_center().rounded(10)
        .border_2().border_color(a.status === "blocked" ? t.blocked + "55" : ring ?? "#00000000")
        .when(a.status === "blocked", (el) => el.child(
          div().absolute().top(-2).left(-2).right(-2).bottom(-2).rounded(10).border_2().border_color(t.blocked)
            .loop("opacity", { from: 0.15, to: 1, period: 900 })))
        .bg(a.focused ? t.selected : hovered ? t.hover : t.raised)
        .cursor_pointer()
        .on_hover((h, cx) => { this.partyHover = h ? a.address : this.partyHover === a.address ? null : this.partyHover; cx.notify(); })
        .on_click(() => run("pane.focus", { pane: a.pane }))
        .child(div().size(40).flex_none().rounded(8).overflow_hidden().bg(t.border)
          .when(ready, (el) => el.child(image(iconPath(pick.dex, pick.form)).size(40))))
        .child(v_flex().flex_1().min_w(0).gap(2)
          .child(h_flex().gap(6).items_center()
            .child(div().flex_1().min_w(0).truncate().text_size(14.5).font_semibold().text_color(t.foreground).child(tagOf(a, tabs)))
            .child(this.partyStatus(t, a.status)))
          .child(h_flex().gap(6).items_center().text_size(11)
            .child(div().flex_1().min_w(0).truncate().text_color(t.muted).child(sparkled(`${pick.shiny ? "✨ " : ""}${nameFor(pick)}${pick.held ? ` ${ITEMS[pick.held].icon}` : ""}`)))
            .child(h_flex().flex_none().gap(2).items_center()
              .child(div().text_color(c.hearts ? HEART : t.border).child("♥"))
              .child(div().text_color(t.muted).child(String(c.hearts))))
            .when(!!changedAt[a.address], (el) => el.child(div().flex_none().text_color(t.dim).child(ago(now - changedAt[a.address])))))
          .when(bar, (el) => el.child(h_flex().gap(6).items_center()
            .child(div().flex_1().h(3).rounded_full().bg(t.border).overflow_hidden()
              .child(div().h_full().w(`${Math.round(c.progress * 100)}%`).bg(t.accent)))
            .child(div().flex_none().text_size(11).text_color(t.dim).child(c.note))))
          .when(!bar && !!c.note, (el) => el.child(div().truncate().text_size(11).text_color(t.dim).child(c.note)))
          // What it says it's doing, while it works.
          .when(a.status === "working" && !!sayings[a.address], (el) => el.child(div().truncate().text_size(11).text_color(t.muted).child(`“${sayings[a.address]}”`)))
          // Working in the same folder as another agent: they may edit each other's files.
          .when(warnOf(a).length > 0, (el) => el.child(div().truncate().text_size(11).text_color(t.working).child(`⚔ same folder as ${warnOf(a).join(", ")}`)))));
    };
    return v_flex().id("pokemon-party").size_full().min_h(0).bg(t.chrome)
      .on_size_change((size, cx) => {
        const w = size.width / zoom();
        if (Math.abs(w - (this.partyWidth ?? 0)) > 1) { this.partyWidth = w; cx.notify(); }
      })
      .when(narrow, (el) => el.child(v_flex().id("party-list").flex_1().min_h(0).overflow_y_scrollbar().py(4).children(list.map(mini))))
      .when(!narrow, (el) => el.child(h_flex().h(30).px(14).flex_none().items_center().justify_between()
        .child(div().text_size(11.5).text_color(t.muted).child(asAgents ? "Agents" : "Party"))
        .child(div().text_size(11).text_color(t.dim).child(list.length ? String(list.length) : "")))
      .child(v_flex().id("party-list").flex_1().min_h(0).overflow_y_scrollbar().px(8).pb(8)
        .when(!list.length, (el) => el.child(div().px(6).py(8).text_size(12).text_color(t.dim).child("No agents yet: each one that starts gets a Pokémon here.")))
        .children(list.flatMap((a, i) => {
          // A section's heading before its first agent: "Working 2", in its colour.
          const first = i === 0 || list[i - 1].status !== a.status;
          const n = list.filter((b) => b.status === a.status).length;
          return first ? [h_flex().px(6).pt(i ? 8 : 2).pb(2).gap(6).items_center()
            .child(div().text_size(11).text_color(a.status === "idle" ? t.muted : t[a.status] ?? t.muted).child(SECTION[a.status] ?? a.status))
            .child(div().text_size(11).text_color(t.dim).child(String(n))), card(a)] : [card(a)];
        }))));
  }

  // ---- the Bag (a dialog with props { bag }) ----
  // Its question: what do I have, and who can use it now? Items on the left (all twelve, zeros
  // too, a dot on those someone on screen can use now); the chosen one on the right with who can
  // take it and what they'd become; the badge case along the bottom. Flat: the panels are one
  // lightness step up (raised), no borders; the one primary control is ink on paper (solid).

  initBag(cx) {
    this.bagTab = ["box", "shop", "today", "dex"].includes(props()?.tab) ? props().tab : "items";
    const sel = props()?.sel && savedPicks()[props().sel];
    if (sel) { this.boxSel = props().sel; this.sprites ??= {}; this.want(boxLook(sel), cx); }
    // Renaming one in the Box: its slot, and the field (Enter saves; empty clears the name).
    this.renaming = null;
    this.nickInput = InputState.new({ placeholder: "Nickname (16 letters)" });
    // The Box's search: by name, nickname or the agent it's with.
    this.boxInput = InputState.new({ placeholder: "Search the Box…" });
    this.boxInput.on("change", (_e, cx) => { this.boxQuery = this.boxInput.value(); cx.notify(); });
    this.nickInput.on("submit", (_e, cx) => {
      const slot = this.renaming;
      const nick = cleanNick(this.nickInput.value());
      if (slot) updatePick(slot, (p) => { const { nick: _n, ...rest } = p; return nick ? { ...rest, nick } : rest; });
      this.renaming = null;
      cx.notify();
    });
    this.sel = null; // the chosen item, or null: the first one usable now (else the first owned)
    this.badgeHover = null;
    this.art = {}; // art key -> "ready" | "failed"
    const keys = [...Object.values(ITEMS).map((x) => x.art), ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `badges/${n}`), CHARM_ART];
    // Known at once when cached (every one looked up together, not one after another); one redraw.
    for (const k of keys) if (ART_READY.has(k)) this.art[k] = "ready";
    cx.spawn(async (cx) => {
      await Promise.all(keys.map((k) => ensureArt(k).then(() => { this.art[k] = "ready"; ART_READY.add(k); }, () => { this.art[k] = "failed"; })));
      cx.notify();
    });
    this.icons = {}; // the herd's portraits: entry key -> "loading" | "ready" | "failed"
    // The herd changes under it (agents finish, Pokémon evolve): redraw, and fetch new portraits.
    cx.timer.every(1000, (cx) => {
      // The herd's portraits, and those of Pokémon holding an item whose agents are gone ("Held by").
      const holders = boxList(savedPicks(), new Set(agents().map((a) => a.pane).filter(Boolean))).map((x) => x.pick)
        .concat(Object.values(savedPicks()).filter((p) => p.held));
      for (const pick of [...this.herd().map((h) => h.pick), ...holders]) {
        const key = entryKey(pick);
        if (this.icons[key]) continue;
        this.icons[key] = "loading";
        cx.spawn(async (cx) => {
          try { await ensureIcon(pick.dex, pick.form); this.icons[key] = "ready"; } catch { this.icons[key] = "failed"; }
          cx.notify();
        });
      }
      cx.notify();
    });
  }

  // The Bag's Today tab: the day's Research (three tasks, each paying when done; all three call a
  // legendary Pokémon over) and yesterday in one line.
  renderToday(daily, h, t, art) {
    const bar = (frac, w) => div().w(w).h(6).rounded_full().bg(t.border).overflow_hidden()
      .child(div().h_full().w(Math.round(w * Math.min(1, frac))).bg(t.accent));
    const reward = (p) => h_flex().gap(6).items_center().flex_none()
      .when(!!p.item, (el) => el.child(art(ITEMS[p.item]?.art, 20)))
      .child(div().text_size(12).text_color(t.foreground).child(p.money ? money(p.money) : `${p.count > 1 ? `${p.count} × ` : ""}${ITEMS[p.item]?.name ?? p.item}`));
    const all = daily.tasks.every((x) => x.n >= x.goal);
    const shown = (x) => (x.id === "work" ? `${Math.floor(x.n / 60)}h${String(Math.floor(x.n % 60)).padStart(2, "0")} of ${x.goal / 60}h` : `${Math.floor(x.n)} of ${x.goal}`);
    return v_flex().flex_none().h(h).gap(10)
      .child(div().text_size(12).text_color(daily.yesterday ? t.foreground : t.muted)
        .child(daily.yesterday ? recapText(daily.yesterday) : "Today's Research: three tasks from your day's work. New ones at midnight."))
      .children(daily.tasks.map((x, i) => {
        const done = x.n >= x.goal;
        return h_flex().id(`task-${i}`).h(58).px(14).gap(12).items_center().rounded(10).bg(t.raised)
          .child(div().size(26).rounded_full().flex().items_center().justify_center().flex_none()
            .bg(done ? t.accent : t.border).text_color(done ? t.accent_foreground : t.muted).text_size(13)
            .child(done ? "✓" : String(i + 1)))
          .child(v_flex().flex_1().min_w(0).gap(5)
            .child(div().text_size(13).text_color(done ? t.muted : t.foreground).truncate().child(taskText(x)))
            .child(h_flex().gap(8).items_center()
              .child(bar(x.n / x.goal, 160))
              .child(div().text_size(11.5).text_color(t.muted).child(done ? "Done, paid" : shown(x)))))
          .child(reward(taskPay(x)));
      }))
      .child(h_flex().h(58).px(14).gap(12).items_center().rounded(10).bg(t.raised).border_1().border_color(all ? t.accent : t.raised)
        .child(div().size(26).rounded_full().flex().items_center().justify_center().flex_none().text_size(14)
          .child("✦"))
        .child(v_flex().flex_1().min_w(0).gap(3)
          .child(div().text_size(13).text_color(t.foreground).child(all ? "All three done: a legendary Pokémon is on its way" : "All three: a legendary Pokémon walks by"))
          .child(div().text_size(11.5).text_color(t.muted).child(settingsNow().visitors === "off" ? "Visitors are off (Settings): it can't come." : "Have a Master Ball or an Ultra Ball ready.")))
        .child(reward(BONUS)))
      // The day's events: how far to the next raid egg (or the raid on), and the day's outbreak.
      .children(this.todayEvents(daily).map(([icon, title, sub, frac, live], k) => h_flex().id(`event-${k}`).h(50).px(14).gap(12).items_center().rounded(10).bg(t.raised)
        .child(div().size(26).rounded_full().flex().items_center().justify_center().flex_none().text_size(14)
          .when(!!live, (el) => el.loop("opacity", { from: 0.5, to: 1, period: 1100 })).child(icon))
        .child(v_flex().flex_1().min_w(0).gap(4)
          .child(div().text_size(12.5).text_color(t.foreground).truncate().child(title))
          .child(h_flex().gap(8).items_center()
            .when(frac !== null, (el) => el.child(bar(frac, 120)))
            .child(div().flex_1().min_w(0).truncate().text_size(11.5).text_color(t.muted).child(sub))))))
      .child(div().flex_1())
      .child(div().text_size(11.5).text_color(t.muted).child("Tasks change at midnight; each pays the moment it's done."));
  }

  // Today's events, each [icon, title, what's next, progress 0..1 or null, on now?].
  todayEvents(daily) {
    const now = Date.now();
    const st = settingsNow();
    const hm = (min) => `${Math.floor(min / 60)}h${String(Math.floor(min % 60)).padStart(2, "0")}`;
    const left = (ms) => `${Math.max(1, Math.ceil(ms / 60000))}m`;
    const out = [];
    // The weather (weather.js): which types it boosts.
    const w = this.boostNow();
    out.push([w.icon, weatherText(w).replace(/^\S+ /, ""), "Their moves hit ×1.2, and more of them walk by", null, false]);
    // Raids: the egg's hatching, the boss's health, or the work (per agent) to the next egg.
    const r = loadRaid(shared(RAID_KEY));
    const ph = raidPhase(r, now);
    const boss = r ? `${r.boss.alpha ? "Alpha " : ""}${fullName(r.boss.dex)}` : "";
    const agentsN = Math.max(1, herdAgents().filter((x) => x.pane).length);
    const per = (daily.count.work ?? 0) / agentsN;
    const laid = Math.min(MAX_EGGS, eggsOn(r, dayOf(now))); // the eggs laid today (kept with the raid)
    if (!st.raids) out.push(["⚔", "Raids are off", "Settings → Trainer → Events", null, false]);
    else if (ph === "egg") out.push(["🥚", `A raid egg: it hatches in ${left(r.hatch - now)}`, "Then drag your Pokémon onto its boss", 1 - (r.hatch - now) / EGG_MS, true]);
    else if (ph === "battle") out.push(["⚔", `Raid on: ${boss} · ${left(r.until - now)} left`, `${Math.round(100 * r.hp)}% of its health left · drag yours onto it`, 1 - r.hp, true]);
    else if (laid >= MAX_EGGS) out.push(["🥚", `Raids: both of today's eggs laid`, "More tomorrow", 1, false]);
    else out.push(["🥚", `Next raid egg: egg ${laid + 1} of ${MAX_EGGS} today`, `${hm(per % RAID_WORK)} of ${hm(RAID_WORK)} of work per agent`, (per % RAID_WORK) / RAID_WORK, false]);
    // The outbreak: called or on now, coming at a time today, or over.
    const on = st.outbreaks ? outbreakAt(now, shared(OUTBREAK_KEY)) : null;
    const d = new Date(now);
    const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const o = outbreakOfDay(dayOf(now));
    const at = new Date(midnight + o.from);
    const clock = `${at.getHours()}:${String(at.getMinutes()).padStart(2, "0")}`;
    if (!st.outbreaks || !VISIT_EVERY[st.visitors]) out.push(["🌊", "Outbreaks are off", st.outbreaks ? "Visitors are off (Settings)" : "Settings → Trainer → Events", null, false]);
    else if (on) out.push(["🌊", `Outbreak now: ${fullName(on.dex)}`, `${left(on.until - now)} left · shinies 1 in 16`, (now - on.from) / (on.until - on.from), true]);
    else if (now < midnight + o.from) out.push(["🌊", `Today's outbreak: ${fullName(o.dex)} at ${clock}`, `In ${hm((midnight + o.from - now) / 60000)} · 20 minutes, shinies 1 in 16`, null, false]);
    else out.push(["🌊", `Today's outbreak (${fullName(o.dex)}) is over`, "Another tomorrow", 1, false]);
    return out;
  }

  // The Bag's Pokédex tab: species seen and caught, by region; what the next goal gives.
  renderDex(h, t, art) {
    const d = pokedex();
    const regions = dexByRegion(d);
    const next = nextGoal(d);
    const legends = d.caught.filter(isLegendary).length;
    const bars = (r, w) => div().relative().w(w).h(8).rounded_full().bg(t.border).overflow_hidden()
      .child(div().absolute().left(0).top(0).h_full().w(Math.round(w * r.seen / r.total)).bg(t.dim))
      .child(div().absolute().left(0).top(0).h_full().w(Math.round(w * r.caught / r.total)).bg(t.accent));
    return v_flex().flex_none().h(h).gap(10)
      .child(h_flex().gap(12).items_stretch()
        .children([["Seen", d.seen.length], ["Caught", d.caught.length], ["Legendary", legends], ["Shiny", d.shiny.length], ["Alpha", (d.alpha ?? []).length], ["♂ and ♀", (d.male ?? []).filter((x) => (d.female ?? []).includes(x)).length]].map(([k, n]) => v_flex().flex_1().p(10).gap(2).rounded(10).bg(t.raised)
          .child(div().text_size(18).font_semibold().text_color(t.foreground).child(String(n)))
          .child(div().text_size(11.5).text_color(t.muted).child(k === "Caught" ? `Caught of ${DEX_TOTAL}` : sparkled(k))))))
      // The goals: reached ones ticked; the next with how many to go.
      .child(v_flex().p(12).gap(8).rounded(10).bg(t.raised)
        .child(div().text_size(12).text_color(t.foreground).child(next ? `Next: ${next.n} caught → ${goalText(next)} (${next.n - d.caught.length} to go)` : "Every Pokédex goal reached"))
        .child(h_flex().gap(6).flex_wrap().children(DEX_GOALS.map((g) => {
          const got = d.caught.length >= g.n;
          return h_flex().h(24).px(8).gap(5).rounded(6).items_center().border_1().border_color(got ? t.accent : t.border)
            .text_size(11.5).text_color(got ? t.foreground : t.muted)
            .when(!!g.item, (el) => el.child(div().opacity(got ? 1 : 0.4).child(art(ITEMS[g.item].art, 18))))
            .child(`${g.n}: ${goalText(g)}${got ? " ✓" : ""}`);
        }))))
      .child(v_flex().id("dex-regions").flex_1().min_h(0).p(12).gap(7).rounded(10).bg(t.raised).overflow_y_scrollbar()
        .child(h_flex().gap(10).items_center()
          .child(div().w(70).text_size(11).text_color(t.muted).child("Region"))
          .child(h_flex().flex_1().gap(10).items_center().text_size(11).text_color(t.muted)
            .child(h_flex().gap(4).items_center().child(div().size(8).rounded_full().bg(t.accent)).child("caught"))
            .child(h_flex().gap(4).items_center().child(div().size(8).rounded_full().bg(t.dim)).child("seen"))))
        .children(regions.map((r) => h_flex().h(22).gap(10).items_center()
          .child(div().w(70).text_size(12).text_color(t.foreground).child(r.region))
          .child(bars(r, 260))
          .child(div().text_size(11.5).text_color(t.muted).child(`${r.caught} / ${r.total}`)))))
      .child(div().text_size(11.5).text_color(t.muted)
        .child("Catch: click a wild Pokémon for its gift, then again to throw a ball. It goes to your Box with a heart and a nature. A shiny caught can be chosen shiny in the picker; a legendary caught can be chosen at all."));
  }

  // The Bag's Shop tab: every item and its price; the chosen one, what it does, and Buy.
  // Pokédollars come from finished jobs (by how long each took).
  renderShop(b, LIST_H, t, art) {
    const ids = grouped(Object.keys(PRICE));
    const sel = ids.includes(this.shopSel) ? this.shopSel : "poke-ball";
    const price = PRICE[sel];
    const have = b.items[sel] ?? 0;
    const most = maxBuy(b, sel);
    // How many: the stepper's count, kept within what can be bought (at least 1 to show).
    const qty = Math.max(1, Math.min(this.shopQty ?? 1, Math.max(1, most)));
    const can = most >= qty;
    const setQty = (q) => { this.shopQty = q; };
    const step = (id, label, q, enabled) => div().id(id).h(26).min_w(30).px(8).rounded(6).flex().items_center().justify_center().flex_none()
      .text_size(12).border_1().border_color(q === qty && label.startsWith("×") ? t.accent : t.border)
      .bg(q === qty && label.startsWith("×") ? t.selected : "#00000000")
      .text_color(enabled ? t.foreground : t.dim)
      .when(enabled, (el) => el.cursor_pointer().hover((st) => st.bg(t.hover)).on_click((_e, cx) => { setQty(q); cx.notify(); }))
      .child(label);
    let last = null;
    return h_flex().flex_none().h(LIST_H).gap(12).items_stretch()
      .child(v_flex().id("shop-items").w(230).flex_none().min_h(0).overflow_y_scrollbar().p(4).gap(0).rounded(10).bg(t.raised)
        .children(ids.flatMap((id) => {
          const on = id === sel;
          const afford = (b.money ?? 0) >= PRICE[id];
          const g = groupOf(id);
          const head = g !== last ? [div().px(8).pt(last ? 8 : 2).pb(2).text_size(10.5).text_color(t.dim).child(g)] : [];
          last = g;
          return [...head, h_flex().id(`shop-${id}`).h(26).px(8).gap(8).rounded(7).items_center()
            .bg(on ? t.selected : "#00000000").cursor_pointer().hover((st) => st.bg(on ? t.selected : t.hover))
            .on_click((_e, cx) => { this.shopSel = id; this.shopQty = 1; cx.notify(); })
            .child(art(ITEMS[id].art, 22))
            .child(div().flex_1().min_w(0).truncate().text_size(12.5).text_color(t.foreground).child(ITEMS[id].name))
            .when(!!b.items[id], (el) => el.child(div().text_size(10.5).text_color(t.dim).child(`×${b.items[id]}`)))
            .child(div().text_size(12).text_color(afford ? t.foreground : t.dim).child(money(PRICE[id])))];
        })))
      .child(v_flex().flex_1().min_w(0).p(14).gap(10).rounded(10).bg(t.raised).overflow_hidden()
        .child(h_flex().gap(12).items_center()
          .child(art(ITEMS[sel].art, 56))
          .child(v_flex().min_w(0).gap(2)
            .child(div().text_size(14).font_semibold().text_color(t.foreground).child(ITEMS[sel].name))
            .child(div().text_size(12).text_color(t.muted).child(`${money(price)} each · ${have} in the Bag`))))
        .child(div().text_size(12).text_color(t.foreground).child(itemAbout(sel)))
        .child(div().h(2))
        // How many: − n +, then ×1 ×5 ×10 and Max (what the money and the Bag allow).
        .child(h_flex().flex_wrap().gap(4).items_center()
          .child(step("shop-less", "−", Math.max(1, qty - 1), qty > 1))
          .child(div().w(36).text_center().text_size(13).font_semibold().text_color(t.foreground).child(String(qty)))
          .child(step("shop-more", "+", qty + 1, qty < most))
          .child(div().w(6))
          .children([1, 5, 10].map((q) => step(`shop-x${q}`, `×${q}`, q, most >= q)))
          .child(step("shop-max", most > 0 ? `Max ${most}` : "Max", Math.max(1, most), most > 1)))
        .child(h_flex().gap(10).items_center()
          .child(div().id("shop-buy").h(28).px(16).rounded_full().flex().items_center().flex_none()
            .text_size(12.5).font_semibold().bg(can ? t.solid : t.border).text_color(can ? t.solid_foreground : t.dim)
            .when(can, (e2) => e2.cursor_pointer().on_click((_e, cx) => {
              const next = buy(bag(), sel, qty);
              if (next) { saveBag(next); this.bought = { id: sel, n: qty, at: Date.now() }; }
              cx.notify();
            }))
            .child(`Buy ${qty} for ${money(price * qty)}`))
          .child(div().flex_1().min_w(0).text_size(11.5).text_color(this.bought?.id === sel && Date.now() - this.bought.at < 3000 ? t.accent : t.dim)
            .child(this.bought?.id === sel && Date.now() - this.bought.at < 3000 ? `Bought ${this.bought.n}.`
              : have >= MAX_ITEM ? `The Bag holds ${MAX_ITEM} at most.`
              : can ? `You have ${money(b.money)}.` : `${money(price * qty - (b.money ?? 0))} more to go.`)))
        .child(div().flex_1())
        .child(div().text_size(11.5).text_color(t.muted)
          .child("Pokédollars come from jobs (₽1 and ₽5 a minute each took, ₽300 at most; twice with an Amulet Coin), the day's Research, visitors' purses and pats. Anything sells back for half.")));
  }


  // The herd as the Bag sees it: agents with a pane, their saved Pokémon and tags.
  herd(saved = savedPicks()) {
    const tabs = tabsById();
    return agents().filter((a) => a.pane && saved[a.pane]).map((a) => ({ slot: a.pane, tag: tagOf(a, tabs), pick: saved[a.pane] }));
  }

  renderBagDialog() {
    const t = theme();
    const b = bag();
    const s = summary(stats(), 3);
    const saved = savedPicks(); // read once per frame
    const herd = this.herd(saved);
    const tab = this.bagTab ?? "items";
    const daily = dailyNow();
    const boxed = boxList(saved, new Set(agents().map((a) => a.pane).filter(Boolean)));
    const how = { night: isNight(), day: dayOf(Date.now()), hpOf }; // Berries: three a day each (and they heal one hurt)
    const ids = Object.keys(ITEMS);
    const takers = Object.fromEntries(ids.map((id) => [id, b.items[id] ? takersOf(id, herd, how) : []]));
    // Usable now: an evolution first (that's news), then hearts.
    const herdBySlot = Object.fromEntries(herd.map((h) => [h.slot, h]));
    const heldAll = Object.fromEntries(ids.filter((id) => ITEMS[id].kind === "held").map((id) => [id, holdersOf(id, saved)]));
    const usable = ids.filter((id) => takers[id].length).sort((x, y) => (takers[y][0].use === "evolve") - (takers[x][0].use === "evolve"));
    const sel = this.sel ?? usable[0] ?? ids.find((id) => b.items[id]) ?? ids[0];
    const held = heldAll[sel] ?? [];
    const LIST_H = 18 * 26 + 8; // the items list (it scrolls); the panel beside it is held to the same height
    const SHOW = held.length ? 2 : 4; // takers listed (fewer when "Held by" comes first); the rest as "and n more"
    // Badges, each with how far along it is (from the Pokémon on screen now, where it depends on them).
    const all = badgeProgress(s, b.marks, liveForBadges(saved));
    const next = nextBadge(all);
    const got = all.filter((x) => x.earned).length;
    const art = (key, size) => this.art[key] === "ready" ? image(artPath(key)).size(size).flex_none() : div().size(size).flex_none();
    const icon = (p, size) => this.icons[entryKey(p)] === "ready" ? image(iconPath(p.dex, p.form)).size(size).flex_none() : div().size(size).flex_none();
    // The finding: what can be done right now, in one line.
    const first = usable[0] && takers[usable[0]][0];
    const finding = !first ? "Nothing to use right now"
      : first.use === "evolve" ? `${ITEMS[usable[0]].name} can evolve ${fullName(first.pick.dex, first.pick.form)} (${first.tag}) now`
      : first.use === "jobs" ? `${ITEMS[usable[0]].name} brings ${fullName(first.pick.dex, first.pick.form)} (${first.tag}) ${CANDY_JOBS} jobs closer to evolving`
      : first.use === "hold" ? `${ITEMS[usable[0]].name} can be held by ${fullName(first.pick.dex, first.pick.form)} (${first.tag})`
      : first.use === "heal" ? `${ITEMS[usable[0]].name} can heal ${fullName(first.pick.dex, first.pick.form)} (${first.tag})`
      : `${ITEMS[usable[0]].name} can give ${fullName(first.pick.dex, first.pick.form)} (${first.tag}) ${usable[0] === "sitrus-berry" ? "half a heart" : "a quarter of a heart"}`;
    const use = (id, h) => {
      const live = savedPicks()[h.slot]; // as saved now: never a stale copy (it may have moved since)
      if (!live || !hasItem(id)) return;
      const r = useItem(live, h.slot, id, { night: isNight(), day: dayOf(Date.now()), hpOf }, Date.now());
      if (!r) return;
      savePicks({ [h.slot]: r.pick });
      healBy(h.slot, r.heal);
      saveBag(addItem(addItem(bag(), id, -1), r.back ?? id, r.back ? 1 : 0)); // what it held goes back in
      if (r.evolved) noteEvolved();
      if ((r.pick.hearts ?? 0) >= MAX_HEARTS && !bag().marks.fullHearts) saveBag(mark(bag(), { fullHearts: true }));
      if (id === "berry" || id === "sitrus-berry") research("berry");
    };
    const shown = all.find((x) => x.id === this.badgeHover);
    const charm = s.jobs >= CHARM_JOBS;

    return v_flex().id("pokemon-bag").size_full().min_h(0).p(18).gap(14).bg(t.popover)
      // Title row: the name, the finding under it; the trainer's totals at the right.
      .child(h_flex().items_start().justify_between().gap(12).flex_none()
        .child(v_flex().min_w(0).gap(3)
          // Items | Box: what's in the Bag, or the Pokémon raised whose agents are gone.
          .child(h_flex().gap(14).items_center().children([["items", "Bag"], ["box", `Box ${boxed.length}`], ["shop", "Shop"], ["today", `Today ${daily.tasks.filter((x) => x.n >= x.goal).length}/${daily.tasks.length}`], ["dex", "Pokédex"]].map(([k, txt]) => div()
            .id(`bag-tab-${k}`).text_size(15).cursor_pointer()
            .when(tab === k, (el) => el.font_semibold().text_color(t.foreground))
            .when(tab !== k, (el) => el.text_color(t.dim).hover((st) => st.text_color(t.muted)))
            .on_click((_e, cx) => { this.bagTab = k; this.releasing = null; cx.notify(); })
            .child(txt))))
          .child(div().text_size(12).text_color(first ? t.foreground : t.muted).truncate().child(finding)))
        .child(v_flex().gap(3).items_end().flex_none()
          .child(h_flex().gap(12).items_center()
            .child(div().text_size(12.5).font_semibold().text_color(t.foreground).child(money(b.money)))
            .child(div().text_size(11.5).text_color(t.muted).child(`${s.jobs} jobs · ${duration(s.ms)} worked`))
            .child(div().text_size(11).text_color(t.dim).child("Esc")))
          // Who did the most: the three species with the most jobs.
          .when(s.top.length > 0, (el) => el.child(div().text_size(11.5).text_color(t.muted)
            .child(`Most jobs: ${s.top.map((x) => `${nameOf(x.dex)} ${x.jobs}`).join(" · ")}`)))))
      // Just released or sold: Undo, for 10 s (not once the money's been spent).
      .when(!!this.undo && Date.now() - this.undo.at < UNDO_MS, (el) => {
        const u = this.undo, can = (b.money ?? 0) >= u.money;
        return el.child(h_flex().h(28).px(10).gap(10).items_center().rounded(8).bg(t.raised).flex_none()
          .child(div().flex_1().min_w(0).truncate().text_size(12).text_color(t.foreground).child(sparkled(u.text)))
          .child(div().text_size(11).text_color(t.dim).child(`${Math.ceil((UNDO_MS - (Date.now() - u.at)) / 1000)}s`))
          .child(div().id("undo").h(22).px(10).rounded_full().flex().items_center().text_size(12).font_semibold()
            .bg(can ? t.solid : t.border).text_color(can ? t.solid_foreground : t.dim)
            .when(can, (e2) => e2.cursor_pointer().on_click((_e, cx) => { undoLast(this); cx.notify(); }))
            .child(can ? "Undo" : "Spent: can't undo")));
      })
      .when(tab === "box", (el) => el.child(this.renderBox(boxed, LIST_H, t, icon, herd)))
      .when(tab === "shop", (el) => el.child(this.renderShop(b, LIST_H, t, art)))
      .when(tab === "today", (el) => el.child(this.renderToday(daily, LIST_H, t, art)))
      .when(tab === "dex", (el) => el.child(this.renderDex(LIST_H, t, art)))
      .when(tab === "items", (el) => el.child(h_flex().flex_none().h(LIST_H).gap(12).items_stretch()
        // Items: every one, in the Bag's order.
        .child(v_flex().id("bag-items").w(218).flex_none().min_h(0).overflow_y_scrollbar().p(4).gap(0).rounded(10).bg(t.raised)
          .children(grouped(ids).flatMap((id, i, all) => {
            const n = b.items[id] ?? 0;
            const on = id === sel;
            // A quiet heading where each group starts (Balls, Berries, Evolution…).
            const head = !i || groupOf(all[i - 1]) !== groupOf(id) ? [div().px(8).pt(i ? 8 : 2).pb(2).text_size(10.5).text_color(t.dim).child(groupOf(id))] : [];
            return [...head, h_flex().id(`item-${id}`).h(26).px(8).gap(8).rounded(7).items_center()
              .bg(on ? t.selected : "#00000000").cursor_pointer().hover((st) => st.bg(on ? t.selected : t.hover))
              .on_click((_e, cx) => { this.sel = id; cx.notify(); })
              .child(div().opacity(n ? 1 : 0.35).child(art(ITEMS[id].art, 22)))
              .child(div().flex_1().min_w(0).truncate().text_size(12.5).text_color(n ? t.foreground : t.dim).child(ITEMS[id].name))
              .when(takers[id].length > 0, (el) => el.child(div().size(6).rounded_full().bg(t.accent)))
              .when((heldAll[id]?.length ?? 0) > 0, (el) => el.child(div().text_size(11).text_color(t.muted).child(`${heldAll[id].length} held`)))
              .child(div().w(28).text_right().text_size(12.5).text_color(n ? t.foreground : t.dim).child(String(n)))]; // up to 999
          })))
        // The chosen item: what it does, and who on screen can take it now.
        .child(v_flex().flex_1().min_w(0).p(14).gap(10).rounded(10).bg(t.raised).overflow_hidden()
          .child(h_flex().gap(12).items_center()
            .child(art(ITEMS[sel].art, 56))
            .child(v_flex().min_w(0).gap(2)
              .child(div().text_size(14).font_semibold().text_color(t.foreground).child(ITEMS[sel].name))
              .child(div().text_size(12).text_color(t.muted).child(`${b.items[sel] ?? 0} in the Bag`))))
          .child(div().text_size(12).text_color(t.foreground).child(itemAbout(sel)))
          // Sell: one, or all of them (twice: "Sure?"), for half the Shop's price.
          // Buy more: the Shop, on this item.
          .when(sellPrice(sel) > 0, (el) => {
            const n = b.items[sel] ?? 0;
            const sure = this.sellingAll === sel;
            const pill = (id, label, click, danger = false) => div().id(id).h(24).px(10).rounded_full().flex().items_center().flex_none().text_size(11.5).border_1()
              .border_color(danger ? t.blocked : t.border).text_color(danger ? t.blocked : t.muted).cursor_pointer().hover((st) => st.bg(t.hover))
              .on_click((_e, cx) => { click(); cx.notify(); }).child(label);
            return el.child(h_flex().flex_wrap().gap(6).items_center()
              .child(pill("buy-more", `Buy more · ${money(PRICE[sel])}`, () => { this.bagTab = "shop"; this.shopSel = sel; this.shopQty = 1; }))
              .when(n > 0, (e2) => e2.child(pill("sell-one", `Sell 1 · ${money(sellPrice(sel))}`, () => { sellSome(this, sel, 1); this.sellingAll = null; })))
              .when(n > 10, (e2) => e2.child(pill("sell-ten", `Sell 10 · ${money(10 * sellPrice(sel))}`, () => { sellSome(this, sel, 10); this.sellingAll = null; })))
              .when(n > 1, (e2) => e2.child(pill("sell-all", sure ? `Sure? ${n} for ${money(n * sellPrice(sel))}` : `Sell all ${n}`, () => {
                if (!sure) { this.sellingAll = sel; this.armedAt = Date.now(); return; }
                if (Date.now() - (this.armedAt ?? 0) < ARM_MS) return;
                sellSome(this, sel, bag().items[sel] ?? 0); // all there are now
                this.sellingAll = null;
              }, sure))));
          })
          // An item to hold: first who holds one now (their agent open or not), each with a way to
          // take it back into the Bag; then who on screen could be given one.
          .when(held.length > 0, (el) => el
            .child(div().h(2))
            .child(div().text_size(11.5).text_color(t.muted).child("Held by"))
            .child(v_flex().gap(4).children(held.slice(0, 3).map((h) => {
              const a = herdBySlot[h.slot];
              return h_flex().id(`holder-${h.slot}`).h(38).gap(10).items_center()
                .child(icon(h.pick, 32))
                .child(div().flex_1().min_w(0).truncate().text_size(12.5).text_color(t.foreground)
                  .child(`${fullName(h.pick.dex, h.pick.form)} · ${a ? a.tag : "not on screen"}`))
                .child(div().id(`take-${h.slot}`).h(26).px(14).rounded_full().flex().items_center().flex_none()
                  .border_1().border_color(t.border).text_color(t.foreground).text_size(12).cursor_pointer()
                  .hover((st) => st.bg(t.hover))
                  .on_click((_e, cx) => {
                    const saved1 = savedPicks()[h.slot]; // as saved now, or nothing to take
                    const r = saved1 && takeHeld(saved1);
                    if (!r) return;
                    savePicks({ [h.slot]: r.pick });
                    saveBag(addItem(bag(), r.back));
                    cx.notify();
                  })
                  .child("Take"));
            }))))
          // A boost (X Speed, Poké Flute…): one button, for the whole herd.
          .when(ITEMS[sel].kind === "boost", (el) => {
            const until = loadBoosts(shared(BOOSTS_KEY), Date.now())[sel];
            const has = !!b.items[sel];
            return el.child(div().h(2)).child(h_flex().gap(10).items_center()
              .child(div().id("use-boost").h(26).px(14).rounded_full().flex().items_center().flex_none()
                .text_size(12).font_semibold().bg(has ? t.solid : t.border).text_color(has ? t.solid_foreground : t.dim)
                .when(has, (e2) => e2.cursor_pointer().on_click((_e, cx) => {
                  const now = Date.now();
                  if (!hasItem(sel)) return cx.notify();
                  saveBag(addItem(bag(), sel, -1));
                  setShared(BOOSTS_KEY, withBoost(loadBoosts(shared(BOOSTS_KEY), now), sel, now));
                  cx.notify();
                }))
                .child(until ? "Use another (+10 min)" : "Use it"))
              .child(div().flex_1().min_w(0).text_size(11.5).text_color(t.dim)
                .child(until ? `On: ${Math.ceil((until - Date.now()) / 60000)} min left.` : has ? `For ${BOOST_MS / 60000} minutes, the whole herd.` : "None in the Bag: the Shop has them.")));
          })
          // A Poké Ball: thrown from the strip, at a wild Pokémon walking by; this one, or Auto.
          .when(ITEMS[sel].kind === "ball", (el) => {
            const on = shared(BALL_KEY) === sel;
            const has = !!b.items[sel];
            return el.child(div().h(2)).child(h_flex().gap(10).items_center()
              .child(div().id("use-ball").h(26).px(14).rounded_full().flex().items_center().flex_none()
                .text_size(12).font_semibold().bg(on || has ? t.solid : t.border).text_color(on || has ? t.solid_foreground : t.dim)
                .when(on || has, (e2) => e2.cursor_pointer().on_click((_e, cx) => { setShared(BALL_KEY, on ? null : sel); cx.notify(); }))
                .child(on ? "Back to Auto" : "Throw this one"))
              .child(div().flex_1().min_w(0).text_size(11.5).text_color(t.dim).child(on ? "Thrown at every wild Pokémon, till you run out (then Auto)." : "Auto: the cheapest; an Ultra Ball for a shiny, an Alpha or a legendary; never the Master Ball (choose it yourself). Right-click a wild one to switch.")));
          })
          .when(ITEMS[sel].kind === "ball", (el) => el
            .child(div().text_size(12).text_color(t.muted).child(`Odds a throw: ${Math.round(100 * catchChance(sel, { dex: 1 }))}% for a first stage (Bulbasaur), ${Math.round(100 * catchChance(sel, { dex: 3 }))}% for a final one (Venusaur), ${Math.round(100 * catchChance(sel, { dex: 150 }))}% for a legendary. A miss: 1 in 20 run away.`))
            .child(div().text_size(11.5).text_color(t.dim).child(b.items[sel] ? "Click a wild Pokémon on the strip once you have its gift: a ball over its head means one is ready." : "None in the Bag: the Shop has them, and the day's Research gives some.")))
          // A Berry for catching: set it to be fed before each ball (one each time, while there are some).
          .when(ITEMS[sel].kind === "bait", (el) => {
            const on = shared(BAIT_KEY) === sel;
            const has = !!b.items[sel];
            return el.child(div().h(2)).child(h_flex().gap(10).items_center()
              .child(div().id("use-bait").h(26).px(14).rounded_full().flex().items_center().flex_none()
                .text_size(12).font_semibold().bg(on || has ? t.solid : t.border).text_color(on || has ? t.solid_foreground : t.dim)
                .when(on || has, (e2) => e2.cursor_pointer().on_click((_e, cx) => { setShared(BAIT_KEY, on ? AUTO_BAIT : sel); cx.notify(); }))
                .child(on ? "Stop feeding" : "Feed before each ball"))
              .child(div().flex_1().min_w(0).text_size(11.5).text_color(t.dim)
                .child(on ? (has ? "On: one goes before each ball you throw." : "On, but none left.") : has ? "One goes before each ball, till you stop or run out. (Auto, the default: a Golden Razz for a rare one, a Razz when the ball alone would likely miss.)" : "None in the Bag: the Shop has them.")));
          })
          // A Festival Ticket: fireworks now.
          .when(sel === "festival-ticket", (el) => {
            const has = !!b.items[sel];
            return el.child(div().h(2)).child(h_flex().gap(10).items_center()
              .child(div().id("use-festival").h(26).px(14).rounded_full().flex().items_center().flex_none()
                .text_size(12).font_semibold().bg(has ? t.solid : t.border).text_color(has ? t.solid_foreground : t.dim)
                .when(has, (e2) => e2.cursor_pointer().on_click((_e, cx) => {
                  if (!hasItem(sel)) return cx.notify();
                  saveBag(addItem(bag(), sel, -1));
                  setShared(FESTIVAL_KEY, Date.now());
                  cx.notify();
                }))
                .child("Start the festival"))
              .child(div().flex_1().min_w(0).text_size(11.5).text_color(t.dim).child(has ? "Look at the strip." : "None in the Bag: the Shop has them.")));
          })
          // An item to use (Honey): one button, no Pokémon to choose.
          .when(sel === "honey" || sel === "azure-flute", (el) => {
            const off = settingsNow().visitors === "off";
            return el.child(div().h(2)).child(h_flex().gap(10).items_center()
              .child((() => {
                const on = !!b.items[sel] && !off;
                return div().id("use-honey").h(26).px(14).rounded_full().flex().items_center().flex_none()
                  .text_size(12).font_semibold().bg(on ? t.solid : t.border).text_color(on ? t.solid_foreground : t.dim)
                  .when(on, (e2) => e2.cursor_pointer().on_click((_e, cx) => {
                    if (!hasItem(sel)) return cx.notify();
                    saveBag(addItem(bag(), sel, -1));
                    setShared(sel === "honey" ? HONEY_KEY : LEGEND_KEY, Date.now());
                    cx.notify();
                  }))
                  .child(sel === "honey" ? "Call one now" : "Call a legendary");
              })())
              .child(div().flex_1().min_w(0).text_size(11.5).text_color(t.dim)
                .child(off ? "Visitors are off (Settings)." : !b.items[sel] ? "None in the Bag yet." : "It walks across within a few seconds.")));
          })
          .when(!["use", "boost", "ball", "bait"].includes(ITEMS[sel].kind), (el) => el.child(div().h(2))
          .child(div().text_size(11.5).text_color(t.muted).child("On screen")))
          .when(!["use", "boost", "ball", "bait"].includes(ITEMS[sel].kind) && !(b.items[sel] ?? 0) && !held.length, (el) => el.child(div().text_size(12).text_color(t.dim)
            .child(sel === "rare-candy" ? "None yet. A job over 30 minutes earns one; idle Pokémon sometimes find one; the Shop sells them."
              : "None yet. Idle Pokémon find these now and then, and the Shop sells them.")))
          .when(!["use", "boost", "ball", "bait"].includes(ITEMS[sel].kind) && !!b.items[sel] && !takers[sel].length, (el) => el.child(div().text_size(12).text_color(t.dim)
            .child(herd.length ? "No one here can use it now." : "No agents on screen.")))
          .child(v_flex().gap(4).children((b.items[sel] ? takers[sel] : []).slice(0, SHOW).map((h) => h_flex().id(`taker-${h.slot}`).h(38).gap(10).items_center()
            .child(icon(h.pick, 32))
            .child(v_flex().flex_1().min_w(0).gap(1)
              .child(div().text_size(12.5).text_color(t.foreground).truncate().child(`${nameFor(h.pick)} · ${h.tag}`))
              .child(div().text_size(11.5).text_color(t.muted).truncate().child(h.use === "evolve"
                ? `becomes ${fullName(h.after.dex, h.after.form)}`
                : h.use === "hold" ? (h.pick.held ? `holds it; its ${ITEMS[h.pick.held].name} comes back` : "holds it")
                : h.use === "jobs" ? `${h.pick.jobs ?? 0} → ${h.after.jobs}/${evolveJobs(h.pick.dex)} jobs`
                : h.use === "heal" ? `health ${Math.round(100 * (hpOf(h.slot) ?? 1))}% → ${Math.round(100 * Math.min(1, (hpOf(h.slot) ?? 1) + HEAL[sel]))}%`
                : `♥ ${heartsText(friendOf(h.pick))} → ${heartsText(friendOf(h.after))}${(hpOf(h.slot) ?? 1) < 1 ? ` · heals ${Math.round(100 * HEAL[sel])}%` : ""}`)))
            .child(div().id(`use-${h.slot}`).h(26).px(14).rounded_full().flex().items_center().flex_none()
              .bg(t.solid).text_color(t.solid_foreground).text_size(12).font_semibold()
              .cursor_pointer()
              .on_click((_e, cx) => { use(sel, h); cx.notify(); })
              .child(h.use === "hold" ? "Give" : "Use")))))
          .when((b.items[sel] ? takers[sel].length : 0) > SHOW, (el) => el.child(div().text_size(11.5).text_color(t.muted)
            .child(`and ${takers[sel].length - SHOW} more`))))))
      // The badge case, and the Shiny Charm.
      .child(v_flex().flex_none().gap(6)
        .child(h_flex().justify_between().items_center()
          .child(div().text_size(11.5).text_color(t.muted).child(`Badges ${got} of 8`))
          .child(div().text_size(11.5).text_color(t.muted).truncate()
            // Hovered: what it takes and what's left; else the badge nearest to earning.
            .child(shown ? `${shown.name}: ${shown.how}${shown.earned ? ", earned" : ` · ${shown.left}`}`
              : next ? `Next: ${next.name} · ${next.left}` : "All eight earned")))
        .child(h_flex().h(64).px(12).gap(4).items_center().rounded(10).bg(t.raised)
          .children(all.map((x, i) => v_flex().id(`badge-${x.id}`).w(40).flex_none().items_center().gap(4)
            .on_hover((h, cx) => { this.badgeHover = h ? x.id : this.badgeHover === x.id ? null : this.badgeHover; cx.notify(); })
            .child(div().opacity(x.earned ? 1 : 0.18).child(art(`badges/${i + 1}`, 34)))
            // Not yet earned: how far along, as a thin bar under it (earned: the same height, empty).
            .child(div().w(28).h(3)
              .when(!x.earned, (el) => el.rounded_full().bg(t.border).overflow_hidden()
                .child(div().h_full().w(Math.round(28 * x.fraction)).bg(t.accent))))))
          .child(div().flex_1())
          .child(h_flex().gap(8).items_center().flex_none()
            .child(div().opacity(charm ? 1 : 0.3).child(art(CHARM_ART, 40)))
            .child(v_flex().gap(1)
              .child(div().text_size(12).text_color(charm ? t.foreground : t.muted).child("Shiny Charm"))
              .child(div().text_size(11).text_color(t.muted).child(charm ? "Shinies 1 in 32" : `At ${CHARM_JOBS} jobs · ${s.jobs} so far`))))));
  }

  // The Bag's Box tab: every Pokémon you have, as a grid (those with agents and those waiting),
  // narrowed by the chips and the search. Click one: what it is, and what can be done with it
  // (Rename, Take what it holds, Bring out for an agent, Release: twice, "Sure?").
  renderBox(boxed, h, t, icon, herd = []) {
    const active = herd.filter((x) => raised(x.pick)).map((x) => ({ slot: x.slot, pick: x.pick, tag: x.tag }));
    const everyone = [...active, ...boxed];
    const q = fold((this.boxQuery ?? "").trim()); // accents folded: "flabebe" finds Flabébé
    const FILTERS = [
      ["all", "All", () => true],
      ["waiting", "Waiting", (x) => !x.tag],
      ["agents", "With agents", (x) => !!x.tag],
      ["caught", "Caught", (x) => !!x.pick.caught],
      ["shiny", "✨ Shiny", (x) => !!x.pick.shiny],
      ["legend", "Legendary", (x) => isLegendary(x.pick.dex)],
      ["alpha", "Alpha", (x) => !!x.pick.alpha],
      ["shadow", "Shadow", (x) => !!x.pick.shadow],
    ];
    const filter = FILTERS.find((f) => f[0] === this.boxFilter) ?? FILTERS[0];
    const shown = sortBox(everyone.filter(filter[2]).filter((x) => !q || fold(nameFor(x.pick)).includes(q) || fold(x.tag ?? "").includes(q) || fold(natureOf(x.pick)?.name ?? "").includes(q)), this.boxSort ?? "new");
    // Releasing (one, or a batch picked in Select): what it holds back to the Bag, and a little
    // money each (box.js releasePay). Never one with an agent or locked (box.js releasable).
    const releaseSlots = (slots) => {
      const all = savedPicks();
      let b = bag();
      const gone = [], picks = {};
      let pay = 0;
      for (const s of slots) {
        const p = all[s];
        const x = everyone.find((e) => e.slot === s);
        if (!p || !x || !releasable({ ...x, pick: p })) continue;
        if (p.held) b = addItem(b, p.held);
        b = addMoney(b, releasePay(p));
        pay += releasePay(p);
        gone.push(s);
        picks[s] = p;
      }
      if (!gone.length) return;
      saveBag(b);
      forgetPanes(gone);
      // Undo, for 10 s: they come back (their held items with them).
      const one = gone.length === 1 ? nameFor(picks[gone[0]]) : `${gone.length} Pokémon`;
      this.undo = { at: Date.now(), text: `Released ${one} (+${money(pay)})`, picks, money: pay, items: {} };
    };
    const picking = this.boxPicking ?? null; // Select: the slots picked for a batch release
    const dupes = picking ? duplicates(everyone) : [];
    const sel = everyone.find((x) => x.slot === this.boxSel) ?? null;
    const chip = (id, label, on, click) => div().id(id).h(24).px(8).rounded(6).flex().items_center().flex_none().text_size(11.5).border_1()
      .border_color(on ? t.accent : t.border).bg(on ? t.selected : "#00000000")
      .text_color(on ? t.foreground : t.muted).cursor_pointer().hover((st) => st.bg(t.hover))
      .on_click((_e, cx) => { click(); cx.notify(); }).child(sparkled(label));
    const pill = (id, label, click, danger = false) => div().id(id).h(26).px(12).rounded_full().flex().items_center().flex_none().text_size(12).border_1()
      .border_color(danger ? t.blocked : t.border).text_color(danger ? t.blocked : t.foreground).cursor_pointer().hover((st) => st.bg(t.hover))
      .on_click((_e, cx) => { click(); cx.notify(); }).child(sparkled(label));
    const CELL = 84;
    const cell = (x) => {
      const picked = !!picking?.has(x.slot);
      const on = picking ? picked : x.slot === this.boxSel;
      const can = releasable(x);
      // (No id, hover or click of its own: the virtual list draws rows in a pass of its own; a click
      // comes through on_item_click, the pointer's x saying which cell: clickCell.)
      return v_flex().relative().w(CELL).h(104).flex_none().items_center().justify_center().gap(1)
        .rounded(8).border_1().border_color(on ? t.accent : "#00000000").bg(on ? t.selected : "#00000000")
        .when(!!picking && !can, (el) => el.opacity(0.4))
        .when(picked, (el) => el.child(div().absolute().bottom(4).right(4).size(16).rounded_full().bg(t.accent).flex().items_center().justify_center()
          .text_size(10).font_bold().text_color("#ffffff").child("✓")))
        .when(!!x.pick.locked, (el) => el.child(div().absolute().top(22).left(5).text_size(10).child("🔒")))
        .child(icon(x.pick, 48))
        .child(div().mt(2).child(typeBadges(x.pick, 11, 7.5)))
        .child(div().w_full().px(3).text_center().truncate().text_size(11).text_color(t.foreground).child(x.pick.nick ?? nameOf(x.pick.dex)))
        .child(div().w_full().px(3).text_center().truncate().text_size(10).text_color(x.tag ? t.accent : t.muted)
          .child(x.tag ? x.tag : `♥ ${heartsText(friendOf(x.pick))}`))
        .when(!!x.pick.shiny, (el) => el.child(div().absolute().top(3).left(5).text_size(11).text_color(SHINY_GOLD).child("✨")))
        .when(!!x.pick.alpha, (el) => el.child(alphaMark(x.pick.shiny ? 20 : 5, 4)))
        .when(!!x.pick.shadow, (el) => el.child(div().absolute().top(38).left(5).size(8).rounded_full().bg("#9a5aff")))
        .when(!!x.pick.gender, (el) => el.child(div().absolute().top(40).left(x.pick.shadow ? 16 : 5).text_size(11).font_bold().text_color(GENDER_COLOR[x.pick.gender]).child(genderMark(x.pick.gender))))
        .when(!!sizeClass(x.pick.size), (el) => el.child(div().absolute().top(40).right(4).px(3).rounded(3).bg("#000000a0").text_size(8.5).font_bold().text_color("#ffd23f").child(sizeClass(x.pick.size))))
        .when(!!x.pick.caught, (el) => el.child(div().absolute().top(3).right(4).child(this.itemArt(x.pick.ball ?? "poke-ball", 14))))
        .when(!!x.pick.held, (el) => el.child(div().absolute().top(22).right(4).child(this.itemArt(x.pick.held, 16))));
    };
    const clickCell = (x, cx) => {
      const picked = !!picking?.has(x.slot), on = x.slot === this.boxSel;
      if (picking) {
        if (releasable(x)) picked ? picking.delete(x.slot) : picking.add(x.slot);
        this.releasingAll = false;
      } else {
        this.boxSel = on ? null : x.slot; this.releasing = null; this.bringing = null; this.renaming = null;
        if (!on) { this.sprites ??= {}; this.want(boxLook(x.pick), cx); } // its animations, for the card
      }
      cx.notify();
    };
    // The chosen one: who it is, and its actions.
    const detail = () => {
      if (!sel) return div().text_size(12).text_color(t.dim).child(everyone.length
        ? "Click a Pokémon to see it and what you can do with it."
        : "None yet. Close an agent whose Pokémon you raised, or catch a wild one as it walks by (click it for its gift, then again with a Poké Ball).");
      const { slot, pick, tag } = sel;
      const c = cardOf(pick);
      const sure = this.releasing === slot;
      const nat = natureOf(pick);
      const facts = [pick.alpha ? (pick.shadow ? `Shadow Alpha: hits and takes ×1.2; purify at ♥${PURIFY_HEARTS}` : "Alpha") : "", `♥ ${heartsText(friendOf(pick))}`, `${pick.jobs ?? 0} job${pick.jobs === 1 ? "" : "s"}`, Number.isFinite(pick.size) ? sizeText(pick.size, pokedex().sizes?.[pick.dex]) : "", (pick.sparW || pick.sparL) ? `sparring ${pick.sparW ?? 0}–${pick.sparL ?? 0}` : "", nat ? `${nat.name}: ${nat.about}` : "", c.note, pick.stay ? "Everstone" : "",
        pick.caught ? `caught in ${an(ITEMS[pick.ball ?? "poke-ball"].name)}, ${new Date(pick.caught).toLocaleDateString()}` : ""].filter(Boolean).join(" · ");
      return v_flex().gap(8)
        .child(h_flex().gap(12).items_center()
          // It walking, as the picker's preview shows it (its icon till that's in).
          .child((() => {
            const meta = this.sprites?.[spriteKey(dressed(boxLook(pick)))];
            return meta?.walkR ? this.spriteStage(meta, "walkR", null, t, 96, 76, 66) : icon(pick, 48);
          })())
          .child(v_flex().flex_1().min_w(0).gap(2)
            .child(this.renaming === slot
              ? Input.new(this.nickInput).h(26).px(8).rounded(6).border_1().border_color(t.accent).bg(t.background).text_size(12.5).text_color(t.foreground)
              : div().text_size(13.5).font_semibold().text_color(t.foreground).truncate().child(sparkled(`${pick.shiny ? "✨ " : ""}${nameFor(pick)}${pick.gender ? ` ${genderMark(pick.gender)}` : ""}${tag ? ` · with ${tag}` : ""}`)))
            .child(typeBadges(pick, 15, 9.5))
            .child(div().text_size(11.5).text_color(t.muted).child(facts)))) // all of it, wrapped: the Box is where the details are
        .child(this.moveRow(pick, t, slot))

        .child(h_flex().gap(6).flex_wrap().items_center()
          // Shadow: purified once it has PURIFY_HEARTS hearts (still an Alpha, a heart more, ₽100).
          .when(!!pick.shadow && canPurify(pick), (el) => el.child(pill(`box-purify-${slot}`, `✨ Purify (+${money(PURIFY_PAY)})`, () => {
            const live = savedPicks()[slot];
            if (!live || !canPurify(live)) return;
            savePicks({ [slot]: purified(live) });
            saveBag(addMoney(bag(), PURIFY_PAY));
            this.purifiedAt = { slot, at: Date.now() };
          })))
          .when(this.purifiedAt?.slot === slot && Date.now() - this.purifiedAt.at < 4000, (el) => el.child(div().text_size(12).font_semibold().text_color("#ffd23f").child("✨ Purified! It trusts you now.")))
          // Locked: never released, alone or in a batch.
          .child(pill(`box-lock-${slot}`, pick.locked ? "🔒 Unlock" : "Lock", () => {
            const live = savedPicks()[slot];
            if (live) savePicks({ [slot]: { ...live, locked: !live.locked } });
            this.releasing = null;
          }))
          .child(pill(`box-rename-${slot}`, this.renaming === slot ? "Cancel" : "Rename", () => {
            if (this.renaming === slot) { this.renaming = null; return; }
            this.renaming = slot;
            this.nickInput.set_value(pick.nick ?? "");
            this.nickInput.focus();
          }))
          // Feed it a Berry (a heart, half or whole), with it or waiting in the Box.
          .children(["berry", "sitrus-berry"].filter((id) => bag().items[id] && ["hearts", "heal"].includes(itemUse(pick, slot, id, { day: dayOf(Date.now()), hpOf }))).map((id) =>
            pill(`box-feed-${id}-${slot}`, `Feed ${ITEMS[id].name.replace(" Berry", "")} ×${bag().items[id]}`, () => {
              const live = hasItem(id) && savedPicks()[slot];
              const r = live && useItem(live, slot, id, { day: dayOf(Date.now()), hpOf }, Date.now());
              if (!r) return;
              savePicks({ [slot]: r.pick });
              healBy(slot, r.heal);
              saveBag(addItem(bag(), id, -1));
              if ((r.pick.hearts ?? 0) >= MAX_HEARTS && !bag().marks.fullHearts) saveBag(mark(bag(), { fullHearts: true }));
              research("berry");
            })))
          .when(!!pick.held, (el) => el.child(pill(`box-take-${slot}`, `Take its ${ITEMS[pick.held].name}`, () => {
            const now = savedPicks()[slot];
            const r = now && takeHeld(now);
            if (!r) return;
            savePicks({ [slot]: r.pick });
            saveBag(addItem(bag(), r.back));
          })))
          .when(!tag && herd.length > 0, (el) => el.child(pill(`box-bring-${slot}`, this.bringing === slot ? "Cancel" : "Bring out", () => { this.bringing = this.bringing === slot ? null : slot; this.releasing = null; })))
          .when(!tag && !pick.locked, (el) => el.child(pill(`box-release-${slot}`, sure ? `Sure? Release it (+${money(releasePay(pick))})` : "Release", () => {
            if (!sure) { this.releasing = slot; this.armedAt = Date.now(); return; }
            if (Date.now() - (this.armedAt ?? 0) < ARM_MS) return; // a double click: not a yes
            releaseSlots([slot]);
            this.releasing = null;
            this.boxSel = null;
          }, sure))))
        // Bring out: which agent gets it (the agents on screen, with what they have now).
        .when(this.bringing === slot, (el) => el.child(h_flex().flex_wrap().gap(6).items_center()
          .child(div().text_size(11).text_color(t.muted).child("Give it to:"))
          .children(herd.map((x) => div().id(`box-to-${slot}-${x.slot}`)
            .h(26).px(8).gap(6).rounded(6).flex().items_center().flex_none().border_1().border_color(t.border)
            .text_size(11.5).text_color(t.foreground).cursor_pointer().hover((st) => st.bg(t.hover))
            .on_click((_e, cx) => { bringOut(slot, x.slot); this.bringing = null; this.boxSel = null; cx.notify(); })
            .child(icon(x.pick, 20))
            .child(sparkled(`${x.tag}: ${x.pick.shiny ? "✨ " : ""}${nameFor(x.pick)}`))))));
    };
    return v_flex().id("bag-box").flex_none().h(h).gap(8)
      .child(h_flex().flex_wrap().gap(6).items_center().flex_none()
        .child(Input.new(this.boxInput).w(150).h(26).px(8).rounded(6).border_1().border_color(t.border).bg(t.background).text_size(12).text_color(t.foreground))
        .children(FILTERS.map(([k, label, f]) => chip(`box-f-${k}`, `${label} ${everyone.filter(f).length}`, filter[0] === k, () => { this.boxFilter = k; }))))
      // Its order, and Select: pick many to release at once.
      .child(h_flex().gap(6).items_center().flex_none()
        .child(div().text_size(11).text_color(t.muted).child("Sort"))
        .children(SORTS.map(([k, label]) => chip(`box-s-${k}`, label, (this.boxSort ?? "new") === k, () => { this.boxSort = k; })))
        .child(div().flex_1())
        .child(chip("box-select", picking ? "Done" : "Select…", !!picking, () => {
          this.boxPicking = picking ? null : new Set();
          this.releasingAll = false;
          this.boxSel = null;
          this.releasing = null;
        })))
      .when(!!picking, (el) => {
        const sel = [...picking].map((s) => everyone.find((x) => x.slot === s)).filter((x) => x && releasable(x));
        const pay = sel.reduce((n, x) => n + releasePay(x.pick), 0);
        const sure = !!this.releasingAll;
        return el.child(h_flex().flex_wrap().gap(6).items_center().flex_none()
          .child(div().text_size(12).font_semibold().text_color(t.foreground).child(`${sel.length} picked`))
          .child(chip("box-pick-shown", "All shown", false, () => { for (const x of shown) if (releasable(x)) picking.add(x.slot); this.releasingAll = false; }))
          .child(chip("box-pick-dupes", `Duplicates ${dupes.length}`, false, () => { for (const s of dupes) picking.add(s); this.releasingAll = false; }))
          .child(chip("box-pick-none", "Clear", false, () => { picking.clear(); this.releasingAll = false; }))
          .child(div().flex_1())
          .when(sel.length > 0, (e2) => e2.child(pill("box-release-all", sure ? `Sure? Release ${sel.length}${rareIn(sel)} (+${money(pay)})` : `Release ${sel.length}`, () => {
            if (!sure) { this.releasingAll = true; this.armedAt = Date.now(); return; }
            if (Date.now() - (this.armedAt ?? 0) < ARM_MS) return;
            releaseSlots(sel.map((x) => x.slot));
            picking.clear();
            this.releasingAll = false;
          }, true))));
      })
      // A virtual list of rows of BOX_COLS: only those in view are drawn (all 200-odd at once took
      // ~2,400 elements, and Herdr gave up re-rendering: "interrupted").
      .child(div().flex_1().min_h(0).p(6).rounded(10).bg(t.raised)
        .when(!shown.length && everyone.length > 0, (el) => el.child(div().p(8).text_size(12).text_color(t.dim).child("None matches.")))
        .when(shown.length > 0, (el) => el.child(div().size_full().relative()
          .on_mouse_move((e) => { this.boxX = e.local_position.x / zoom(); })
          .child(v_virtual_list("box", Math.ceil(shown.length / BOX_COLS), BOX_ROW, (i) => `r${i}`, (range) => {
            const rows = [];
            for (let r = range.start; r < range.end; r++) rows.push(h_flex().h(BOX_ROW).gap(6).children(shown.slice(r * BOX_COLS, (r + 1) * BOX_COLS).map(cell)));
            return rows;
          }).size_full().cursor_pointer()
            .on_item_click((key, cx) => {
              const col = Math.floor((this.boxX ?? 0) / (CELL + 6));
              const x = shown[Number(key.slice(1)) * BOX_COLS + col];
              if (col >= 0 && col < BOX_COLS && x) clickCell(x, cx);
            }))
          .child(Scrollbar.vertical("box").absolute().inset_0()))))
      .child(div().flex_none().min_h(96).p(12).rounded(10).bg(t.raised).child(picking
        ? div().text_size(12).text_color(t.dim).child("Click Pokémon to pick them, then Release (twice). Ones with agents and 🔒 locked ones stay. Duplicates picks every one but the best of each species, never a shiny, an Alpha or a legendary. Each pays ₽10; a shiny or an Alpha ₽50, a legendary ₽100.")
        : detail()));
  }

  // An item's sprite in the Bag (its emoji till it's in).
  itemArt(id, size) {
    const art = ITEMS[id]?.art;
    return art && this.art?.[art] === "ready" ? image(artPath(art)).size(size).flex_none() : div().text_size(size * 0.7).child(ITEMS[id]?.icon ?? "");
  }

  // ---- the picker (opened as a dialog with props { picker, slot, current, tag }) ----

  initPicker(cx) {
    // The icons on disk already: ready from the first frame (no blank cell while each is checked).
    cx.spawn(async (cx) => {
      for (const key of await cachedIcons()) this.icons[key] ??= "ready";
      this.fetchIcons(cx);
      cx.notify();
    });
    cx.spawn(async (cx) => { await readyArt(); cx.notify(); }); // items' art, for the Box rows in a preview
    this.filter = "";
    this.only = {}; // the filter chips: { region?, mega? }
    this.megaMode = props()?.current?.mega ?? "auto";
    this.megaKind = props()?.current?.megaKind ?? null; // "X" | "Y", for a species with both
    this.icons = {}; // dex -> "loading" | "ready" | "failed"
    this.iconQueue = [];
    this.iconActive = 0;
    this.input = InputState.new({ placeholder: "Search by name or number…" });
    this.input.on("change", (_e, cx) => {
      this.filter = this.input.value();
      this.fetchIcons(cx);
      cx.notify();
    });
    // Enter with one match: its preview (Replace there chooses it).
    this.input.on("submit", (_e, cx) => {
      const { entries, total } = searchEntries(this.input.value(), 2, this.searchOnly());
      if (total === 1) this.showPreview(entries[0], cx);
    });
    this.input.focus();
    cx.timer.after(300, () => this.input.focus());
    this.visible = searchEntries("", PICK_COLS * 6).entries; // what the list shows; updated as it scrolls
    this.pickX = 0; // the pointer's x over the list: which column a click was in
    this.sprites ??= {}; // the preview's animations (want / spriteFor)
    this.preview = null; // right-clicked in the list: { dex, form?, shiny }, shown in the card's place
    // The list's renderer can't start downloads; this picks up what scrolled into view.
    cx.timer.every(300, (cx) => {
      this.fetchIcons(cx);
      if (this.iconsDirty) { this.iconsDirty = false; cx.notify(); }
    });
  }

  // The filter chips as searchEntries takes them: the ★ chip is the favourites' keys, read live.
  // Trainer mode (Settings): only what you caught, and the starters.
  // The Legendary chip: legendary and mythical species only (caught or not).
  searchOnly() {
    const { fav, legend, ...rest } = this.only;
    const mine = settingsNow().trainer ? trainerKeys(pokedex()) : null;
    let keys = fav ? new Set(favs().filter((k) => !mine || mine.has(k))) : mine;
    if (legend) keys = new Set([...LEGENDARY].map(String).filter((k) => !keys || keys.has(k)));
    // A type picked: its types as it fights (its regional form's, Rotom's appliance's…).
    const typed = rest.types?.length ? { ...rest, typesOf: entryTypes } : rest;
    return keys ? { ...typed, keys } : typed;
  }

  // A legendary not caught yet (and not opened in Settings): shown, but can't be chosen.
  locked(e) {
    return !e.form && isLocked(e.dex, pokedex(), settingsNow().legendsOpen);
  }

  // Icons for what the picker shows, downloaded on demand, a few at a time.
  // What's shown first (its line, the preview's, the rows in view), then every other one still
  // missing, in the background: scrolling then meets icons already there.
  fetchIcons(cx) {
    this.iconQueue = [...this.chainEntries().flat(), ...(this.preview ? this.lineOf(this.preview).flat() : []), ...this.visible]
      .filter((e) => !this.icons[entryKey(e)]);
    while (this.iconActive < ICON_JOBS && this.iconQueue.length) {
      const e = this.iconQueue.shift();
      const key = entryKey(e);
      this.icons[key] = "loading";
      this.iconActive++;
      cx.spawn(async (cx) => {
        try {
          await ensureIcon(e.dex, e.form);
          this.icons[key] = "ready";
        } catch {
          this.icons[key] = "failed";
        }
        this.iconActive--;
        this.fetchIcons(cx);
        // A redraw blanks the grid for a frame (Herdr's virtual list): only for an icon in view
        // (or its line, or the preview's), and a few at once by the timer. Those fetched in the
        // background show when scrolled to, with no redraw of their own.
        // A redraw blanks the grid for a frame (Herdr's virtual list): only for an icon in view
        // (or its line, or the preview's), and a few at once by the timer.
        const inView = (x) => x.some((f) => entryKey(f) === key);
        if (inView(this.visible) || inView(this.chainEntries().flat()) || (this.preview && inView(this.lineOf(this.preview).flat()))) this.iconsDirty = true;
      });
    }
  }

  // The pick as saved now (it may have evolved since the picker opened), else as it was then.
  livePick() {
    const p = props() ?? {};
    return savedPicks()[p.slot] ?? p.current ?? null;
  }

  // Its evolution line as picker entries, stage by stage; a regional form's line stays in its region.
  chainEntries() {
    return this.lineOf(this.livePick());
  }

  lineOf(cur) {
    if (!cur?.dex) return [];
    const label = cur.form && formsOf(cur.dex).find((f) => f.form === cur.form)?.label;
    return chainOf(cur.dex).map((stage) => stage.map((dex) => {
      const form = label ? formsOf(dex).find((f) => f.label === label)?.form : undefined;
      return form ? { dex, form } : { dex };
    }));
  }

  // `entry`: { dex, form? }, a species or one of its regional forms. `how.fresh` (Box it): the
  // one it is goes to the Box whatever it is, and this is a new one, not one from the Box (the
  // same species too: a plain one after a shiny, or another try for a shiny). `how.slot` (Bring
  // out): that boxed one, the one it is going to the Box if raised (the same species too).
  choose(entry, how = {}) {
    const p = props();
    const cur = this.livePick() ?? p.current;
    // The one it is already: keep it as it is (choosing it again would start its hearts and jobs over).
    if (how.slot) {
      const onScreen = new Set(agents().map((a) => a.pane).filter(Boolean));
      if (!onScreen.has(how.slot) && bringOut(how.slot, p.slot, this.megaMode)) closeOverlay(p.overlay);
      return;
    }
    const same = cur && cur.dex === entry.dex && (cur.form ?? null) === (entry.form ?? null);
    if (same && !how.fresh) return closeOverlay(p.overlay);
    // A new one: what it holds and its Everstone stay with the pane, its Mega setting carries
    // over (X or Y if it stays the same species), and it rolls for a shiny of its own.
    // Shiny on purpose: a species you caught shiny can be chosen shiny (the preview's ✨).
    if (this.locked(entry)) return;
    let next = switchedPick(cur, entry, this.megaMode, this.megaKind, (how.shiny && shinyUnlocked(pokedex(), entry.dex)) || rollShiny(entry, charmOdds()));
    // The Box: that species raised before by an agent now gone comes back as it was (its hearts,
    // jobs, item, shiny); if both hold something, this pane's item goes back into the Bag.
    const onScreen = new Set(agents().map((a) => a.pane).filter(Boolean));
    const saved = savedPicks();
    const boxed = how.fresh ? null : fromBox(entry, saved, onScreen, p.slot);
    if (boxed) {
      if (cur?.held && boxed.pick.held) saveBag(addItem(bag(), cur.held));
      next = { ...boxed.pick, mega: this.megaMode, ...(boxed.pick.held || !cur?.held ? {} : { held: cur.held }), ...(cur?.stay ? { stay: true } : {}) };
    }
    // The one it was, if raised (any, with Box it), waits in the Box (not overwritten).
    const away = boxOnSwitch(cur, entry, Date.now(), { same: !!how.fresh, all: !!how.fresh });
    savePicks({ ...(away ? { [away.key]: away.pick } : {}), [p.slot]: next });
    if (boxed) forgetPanes([boxed.slot]);
    closeOverlay(p.overlay);
  }

  // 🎲: a random one, previewed (Replace there chooses it; 🎲 again for another).
  chooseRandom(entries, cx) {
    const p = props();
    const taken = new Set(Object.entries(savedPicks()).filter(([slot]) => slot !== p.slot).map(([, x]) => x.dex));
    const e = randomEntry(entries.filter((x) => !this.locked(x) && !(this.preview && x.dex === this.preview.dex && (x.form ?? null) === (this.preview.form ?? null))), p.current, taken);
    if (e) this.showPreview(e, cx);
  }

  // Saves the picker's Mega mode and X/Y on the current pick, together (one never drops the other).
  saveMega(p) {
    savePicks({ [p.slot]: { ...this.livePick(), mega: this.megaMode, ...(this.megaKind ? { megaKind: this.megaKind } : {}) } });
  }

  // The card on top of the picker: who it is now, what its species has done, its evolution line
  // (click one to switch) and how close it is to evolving, with the Everstone to stop that.
  renderCurrent(cur, t) {
    const chain = this.chainEntries();
    const isCur = (e) => e.dex === cur.dex && (e.form ?? null) === (cur.form ?? null);
    const need = needsText(cur);
    const progress = cur.stay ? "Holds an Everstone: won't evolve"
      : need ? `Evolves ${need}`
      : chain.length > 1 ? "Fully evolved" : "Doesn't evolve";
    // The job count shows as a bar when jobs are one of its ways.
    const byJobs = !cur.stay && evolveNeeds(cur).some((n) => n.ways.some((w) => w === "jobs" || w === "day" || w === "night"));
    const hearts = cur.hearts ?? 0;
    const line = statLine(stats().species[cur.dex]);
    const icon = (e, size) => this.icons[entryKey(e)] === "ready" ? image(iconPath(e.dex, e.form)).size(size).flex_none() : div().size(size).flex_none();
    const branchy = chain.some((st) => st.length > 2);
    return v_flex().gap(8).p(10).rounded(8).border_1().border_color(t.border).flex_none()
      .child(
        h_flex().gap(12).items_center()
          .child(icon(cur, 56))
          .child(
            v_flex().flex_1().min_w(0).gap(2)
              .child(h_flex().gap(6).items_center()
                .child(div().text_size(14).font_semibold().text_color(t.foreground).truncate().child(sparkled(`${cur.shiny ? "✨ " : ""}${nameFor(cur)}`)))
                .child(div().text_size(11).text_color(t.dim).child(`${dexNo(cur.dex)} · ${regionOf(cur) ?? ""}`))
                .children(entryTypes(cur).map((ty) => div().h(15).px(5).rounded(4).flex().items_center().bg(TYPE_COLOR[ty]).text_size(9.5).font_bold().text_color(typeText(ty)).child(typeLabel(ty)))))
              // Hearts: red ones it has, grey ones to go (the emoji hearts draw all alike here).
              .child(h_flex().min_w(0).gap(1).items_center()
                .children(Array.from({ length: MAX_HEARTS }, (_, i) => div().flex_none().text_size(12.5).text_color(i < hearts ? HEART : t.border).child("♥")))
                .child(div().ml(8).min_w(0).truncate().text_size(11.5).text_color(t.muted).child(line ? `All ${nameOf(cur.dex)} so far: ${line}` : `No ${nameOf(cur.dex)} has finished a job yet`)))
              .child(h_flex().gap(8).items_center()
                .child(div().min_w(0).text_size(11.5).text_color(t.foreground).child(progress))
                .when(byJobs, (el) => el.child(
                  div().w(80).h(5).rounded_full().bg(t.border).overflow_hidden()
                    .child(div().h_full().w(80 * Math.min(1, (cur.jobs ?? 0) / evolveJobs(cur.dex))).bg(t.accent))))),
          )
          // A favourite (★): the picker's ★ chip lists them; new agents can be given one.
          .child((() => {
            const on = isFavorite(favs(), cur);
            return div().id("favorite").h(26).px(10).rounded(6).flex().items_center().flex_none().text_size(12).border_1()
              .border_color(on ? "#f2c94c" : t.border).bg(on ? t.selected : "#00000000")
              .text_color(t.foreground).cursor_pointer().hover((st) => st.bg(t.hover))
              .on_click((_e, cx) => { setFavs(toggleFavorite(favs(), cur.form ? { dex: cur.dex, form: cur.form } : { dex: cur.dex })); cx.notify(); })
              .child(on ? "★ Favorite" : "☆ Favorite");
          })())
          // Box it: this one goes to the Box (as it is, raised or not); the next pick is a new one.
          .child(div().id("box-it").h(26).px(10).rounded(6).flex().items_center().flex_none().text_size(12).border_1()
            .border_color(this.boxing ? t.accent : t.border).bg(this.boxing ? t.selected : "#00000000")
            .text_color(t.foreground).cursor_pointer().hover((st) => st.bg(t.hover))
            .on_click((_e, cx) => { this.boxing = !this.boxing; cx.notify(); })
            .child(this.boxing ? "Cancel" : "📦 Box it"))
          // The Everstone: its Pokémon stays as it is.
          .when(chain.length > 1, (el) => el.child(div()
            .id("everstone").h(26).px(10).rounded(6).flex().items_center().flex_none().text_size(12).border_1()
            .border_color(cur.stay ? t.accent : t.border).bg(cur.stay ? t.selected : "#00000000")
            .text_color(t.foreground).cursor_pointer().hover((st) => st.bg(t.hover))
            .on_click((_e, cx) => {
              const { stay, ...rest } = this.livePick();
              savePicks({ [props().slot]: cur.stay ? rest : { ...rest, stay: true } });
              cx.notify();
            })
            .child(cur.stay ? "🪨 Everstone: on" : "🪨 Everstone"))),
      )
      // The evolution line: click one to become it.
      .when(chain.length > 1, (el) => el.child(
        h_flex().gap(4).items_center().overflow_hidden()
          .children(chain.flatMap((st, i) => [
            ...(i ? [div().text_size(12).text_color(t.dim).px(2).child("›")] : []),
            ...st.map((e) => v_flex()
              .id(`evo-${entryKey(e)}`).items_center().flex_none().rounded(6).px(branchy ? 0 : 4).py(2)
              .border_1().border_color(isCur(e) ? t.accent : "#00000000").bg(isCur(e) ? t.selected : "#00000000")
              .cursor_pointer().hover((s2) => s2.bg(t.hover))
              .on_click((_e, cx) => { if (!isCur(e)) this.showPreview(e, cx); })
              .child(icon(e, branchy ? 30 : 36))
              .when(!branchy, (el2) => el2.child(div().text_size(10.5).text_color(t.muted).child(fullName(e.dex, e.form))))),
          ])),
      ))
      .child(this.moveRow(cur, t, props()?.slot))
      .child(this.renderBagRow(cur, t));
  }

  // Shows `e` ({ dex, form? }) in the preview, loading its animations.
  showPreview(e, cx, shiny = false) {
    this.preview = { dex: e.dex, ...(e.form ? { form: e.form } : {}), shiny: shiny && hasShiny(e.dex, e.form) };
    this.want({ ...this.preview, mega: "off" }, cx);
    this.fetchIcons(cx);
    cx.notify();
  }

  // Its four moves as chips in their types' colours, each with its power, and the signature moves
  // it may turn them into now and then. For one of yours (`slot`), "Change": every move it can
  // really learn (moves.js learnableOf: weak ones and signature moves too), click to take or drop
  // one, four at most; "Default" goes back to its own four. Saved on its pick (`moves`).
  moveRow(e, t, slot = null) {
    const key = fighterKey(e.dex, e.form ? { form: e.form } : {});
    const set = movesetOf(key, e.moves);
    const chosen = !!chosenOf(key, e.moves);
    const sigs = [...new Set(set.filter((m) => !m.sig).map((m) => MOVES[m.type]?.[2]).filter((n) => n && !set.some((m) => m.name === n)))];
    const chip = (m, on = true) => h_flex().h(18).px(6).gap(4).rounded(4).items_center().flex_none().bg(TYPE_COLOR[m.type]).opacity(on ? 1 : 0.4)
      .when(!!m.sig, (el) => el.border_1().border_color("#ffd23f"))
      .child(div().text_size(10.5).font_semibold().text_color(typeText(m.type)).child(m.name))
      .child(div().text_size(9).text_color(typeText(m.type)).opacity(0.75).child(String(powerOf(m.name))));
    const pill = (id, label, click) => div().id(id).h(18).px(7).rounded(4).flex().items_center().flex_none().text_size(10.5).border_1()
      .border_color(t.border).text_color(t.foreground).cursor_pointer().hover((st) => st.bg(t.hover)).on_click((_e, cx) => { click(); cx.notify(); }).child(label);
    const save = (moves) => {
      const live = savedPicks()[slot];
      if (!live) return;
      const { moves: _m, ...rest } = live;
      savePicks({ [slot]: moves?.length ? { ...rest, moves } : rest });
    };
    const editing = !!slot && this.editingMoves === slot;
    const row = h_flex().gap(4).flex_wrap().items_center()
      .child(div().text_size(11).text_color(t.muted).mr(2).child(chosen ? "Moves (chosen)" : "Moves"))
      .children(set.map((m) => chip(m)))
      .when(sigs.length > 0 && !editing, (el) => el.child(div().ml(4).text_size(10.5).text_color(t.dim).child(`now and then ${sigs.join(" or ")}`)))
      .when(!!slot, (el) => el.child(pill(`moves-edit-${slot}`, editing ? "Done" : "Change", () => { this.editingMoves = editing ? null : slot; })));
    if (!editing) return row;
    const names = set.map((m) => m.name);
    const all = learnableOf(key);
    return v_flex().gap(6)
      .child(row)
      .child(div().text_size(10.5).text_color(t.dim).child(`What it can learn (${all.length}): click to take or drop one, ${MAX_MOVES} at most. Gold: a signature move (it fires, and misses 1 in 5).`))
      .child(h_flex().gap(4).flex_wrap()
        .children(all.map((m, i) => {
          const on = names.includes(m.name);
          return div().id(`learn-${slot}-${i}`).cursor_pointer().on_click((_e, cx) => {
            const cur = movesetOf(key, savedPicks()[slot]?.moves).map((x) => x.name);
            const next = on ? (cur.length > 1 ? cur.filter((n) => n !== m.name) : cur) : cur.length < MAX_MOVES ? [...cur, m.name] : cur;
            save(next);
            cx.notify();
          }).child(chip(m, on));
        })))
      .when(chosen, (el) => el.child(h_flex().child(pill(`moves-default-${slot}`, "Default: its own four", () => save(null)))));
  }

  // One of its animations (sprites.js meta: idleD, walkR, sleep) on a bit of ground, 150 × 104,
  // a label under it; "Loading…" till it's in (the picker's preview, the Box).
  spriteStage(meta, key, label, t, STAGE_W = 150, STAGE_H = 104, GROUND = 88) {
    const s = meta?.[key];
    let art = null;
    if (s) {
      const sc = Math.min(meta.scale >= 2 ? 1.5 : 1, (GROUND - 8) / Math.max(1, s.box.h), (STAGE_W - 10) / Math.max(1, s.box.w));
      art = image(s.path).absolute()
        .left(STAGE_W / 2 - (s.box.x + s.box.w / 2) * sc).top(GROUND - (s.box.y + s.box.h) * sc)
        .w(s.w * sc).h(s.h * sc);
    }
    return v_flex().items_center().gap(3).flex_none()
      .child(div().relative().w(STAGE_W).h(STAGE_H).rounded(6).overflow_hidden().bg(t.background)
        .child(div().absolute().left(0).top(GROUND).w(STAGE_W).h(STAGE_H - GROUND).bg("#3f8f3a40"))
        .when(!!art, (el) => el.child(art))
        .when(!art, (el) => el.child(div().absolute().left(0).top(GROUND / 2 - 8).w(STAGE_W).text_center().text_size(11).text_color(t.muted)
          .child(meta?.error ? "Can't be had" : "Loading…").when(!meta?.error, (e2) => e2.loop("opacity", { from: 0.4, to: 1, period: 1000 })))))
      .when(!!label, (el) => el.child(div().text_size(10.5).text_color(t.muted).child(label)));
  }

  // The preview card: its idle, walk and sleep animations on a bit of ground, its line (click one
  // to preview it), the shiny look, and Choose (as a left click in the list) or ✕ (back to the card).
  renderPreview(t, cx) {
    const pv = this.preview;
    const meta = this.sprites[spriteKey(dressed(pv))];
    const icon = (e, size) => this.icons[entryKey(e)] === "ready" ? image(iconPath(e.dex, e.form)).size(size).flex_none() : div().size(size).flex_none();
    const isPv = (e) => e.dex === pv.dex && (e.form ?? null) === (pv.form ?? null);
    const line = this.lineOf(pv);
    // Its kind waiting in the Box (raised, agent gone), latest first: Bring out takes one.
    const onScreen = new Set(agents().map((a) => a.pane).filter(Boolean));
    const inBox = Object.entries(savedPicks()).filter(([slot, b]) => slot !== props()?.slot && !onScreen.has(slot)
      && b.dex === pv.dex && (b.form ?? null) === (pv.form ?? null) && raised(b)).reverse();
    const stage = (key, label) => this.spriteStage(meta, key, label, t);
    const button = (id, label, on, click) => div()
      .id(id).h(26).px(10).rounded(6).flex().items_center().flex_none().text_size(12).border_1()
      .border_color(on ? t.accent : t.border).bg(on ? t.selected : "#00000000")
      .text_color(t.foreground).cursor_pointer().hover((st) => st.bg(t.hover))
      .on_click(click).child(label);
    return v_flex().gap(8).p(10).rounded(8).border_1().border_color(t.accent).flex_none()
      .child(h_flex().gap(10).items_center()
        .child(v_flex().flex_1().min_w(0).gap(2)
          .child(h_flex().gap(6).items_center()
            .child(div().text_size(14).font_semibold().text_color(t.foreground).truncate().child(sparkled(`${pv.shiny ? "✨ " : ""}${fullName(pv.dex, pv.form)}`)))
            .child(div().text_size(11).text_color(t.dim).child(`${dexNo(pv.dex)} · ${regionOf(pv) ?? ""}`)))
          .child(div().text_size(11.5).text_color(t.muted).child(this.locked(pv) ? "Legendary: catch one as it walks by (the day's Research calls one), or open them all in Settings."
            : hasShiny(pv.dex, pv.form) && !pv.form && shinyUnlocked(pokedex(), pv.dex) ? "You caught a shiny one: ✨ Shiny, then Choose, and it's shiny."
            : "Preview: click another to see it, or Replace to take this one")))
        // Favourites are starred here (or on the card, for the one it is).
        .child((() => {
          const on = isFavorite(favs(), pv);
          return button("preview-fav", on ? "★ Favorite" : "☆ Favorite", on, (_e, cx) => { setFavs(toggleFavorite(favs(), pv.form ? { dex: pv.dex, form: pv.form } : { dex: pv.dex })); cx.notify(); });
        })())
        .when(hasShiny(pv.dex, pv.form), (el) => el.child(button("preview-shiny", "✨ Shiny", pv.shiny, (_e, cx) => this.showPreview(pv, cx, !pv.shiny))))
        .when(this.locked(pv), (el) => el.child(div().h(26).px(10).rounded(6).flex().items_center().flex_none().text_size(12).text_color(t.muted).border_1().border_color(t.border)
          .child("🔒 Catch one to use it")))
        // The one control that changes the agent's Pokémon: ink on paper.
        .when(!this.locked(pv), (el) => {
          const cur = this.livePick();
          const same = cur && cur.dex === pv.dex && (cur.form ?? null) === (pv.form ?? null);
          const label = this.boxing ? "Choose a new one" : same ? "Keep it" : cur?.dex ? `Replace ${cur.nick ?? nameOf(cur.dex)}` : "Choose";
          return el.child(div().id("preview-choose").h(26).px(12).rounded_full().flex().items_center().flex_none()
            .text_size(12).font_semibold().bg(t.solid).text_color(t.solid_foreground).cursor_pointer()
            .on_click(() => {
              const e = { dex: pv.dex, ...(pv.form ? { form: pv.form } : {}) };
              const shiny = pv.shiny && !pv.form;
              this.preview = null;
              this.choose(e, { ...(this.boxing ? { fresh: true } : {}), shiny });
            })
            .child(`${label}${pv.shiny && shinyUnlocked(pokedex(), pv.dex) && !pv.form ? " ✨" : ""}`));
        })
        .child(button("preview-close", "✕", false, (_e, cx) => { this.preview = null; cx.notify(); })))
      .when(inBox.length > 0, (el) => el.child(v_flex().gap(4)
        .child(div().text_size(11).text_color(t.muted).child(`In the Box (${inBox.length})`))
        // Each one there as the Box shows it: Alpha, shiny, its name, hearts, nature, jobs, what it
        // holds and the ball it was caught in.
        .children(inBox.map(([slot, b]) => h_flex().gap(6).items_center().h(26)
          .when(!!b.alpha, (el) => el.child(div().h(16).px(4).rounded(4).flex().items_center().flex_none()
            .bg(ALPHA_RED).text_size(10).font_bold().text_color("#ffffff").child("α Alpha")))
          .child(div().flex_1().min_w(0).truncate().text_size(12).text_color(t.foreground)
            .child(sparkled([`${b.shiny ? "✨ " : ""}${nameFor(b)}`, `♥ ${heartsText(friendOf(b))}`, natureOf(b)?.name, `${b.jobs ?? 0} jobs`].filter(Boolean).join(" · "))))
          .when(!!b.held, (el) => el.child(this.itemMark(b.held, 18)))
          .when(!!b.caught, (el) => el.child(this.itemMark(b.ball ?? "poke-ball", 16)))
          .child(button(`bring-${slot}`, "Bring out", false, () => { this.preview = null; this.choose(pv, { slot }); }))))))
      .child(h_flex().gap(8).items_start()
        .child(stage("idleD", "Standing"))
        .child(stage("walkR", "Walking"))
        .child(stage("sleep", "Asleep")))
      .child(this.moveRow(pv, t))
      .when(line.length > 1, (el) => el.child(
        h_flex().gap(4).items_center().overflow_hidden()
          .children(line.flatMap((st, i) => [
            ...(i ? [div().text_size(12).text_color(t.dim).px(2).child("›")] : []),
            ...st.map((e) => v_flex()
              .id(`pv-evo-${entryKey(e)}`).items_center().flex_none().rounded(6).px(2).py(1)
              .border_1().border_color(isPv(e) ? t.accent : "#00000000").bg(isPv(e) ? t.selected : "#00000000")
              .cursor_pointer().hover((s2) => s2.bg(t.hover))
              .on_click((_e, cx) => { if (!isPv(e)) this.showPreview(e, cx, pv.shiny); })
              .child(icon(e, 30))),
          ])),
      ));
  }

  // The Bag, for this Pokémon: Berries (a heart), Rare Candy (evolve now) and the stones it can
  // take. What does nothing for it now is greyed out.
  renderBagRow(cur, t) {
    const b = bag();
    const slot = props()?.slot;
    const night = isNight();
    const mine = new Set(evolveNeeds(cur).flatMap((n) => n.ways).filter((w) => w.startsWith("stone:")).map((w) => `${w.slice(6)}-stone`));
    const ids = ["berry", "sitrus-berry", "rare-candy", ...STONES.map((k) => `${k}-stone`).filter((id) => mine.has(id)), ...HELD_IDS].filter((id) => b.items[id]);
    // Wraps onto a second line when there are many (a long Bag ran past the card's edge).
    return h_flex().flex_wrap().w_full().gap(6).items_center().flex_none()
      // What it holds: click to take it back into the Bag.
      .when(!!cur.held, (el) => el.child(div()
        .id("take-held").h(24).px(8).rounded(6).flex().items_center().flex_none().text_size(11.5).border_1()
        .border_color(t.accent).text_color(t.foreground).cursor_pointer().hover((st) => st.bg(t.hover))
        .on_click((_e, cx) => {
          const r = takeHeld(this.livePick());
          if (!r) return;
          savePicks({ [slot]: r.pick });
          saveBag(addItem(bag(), r.back));
          cx.notify();
        })
        .child(`Holds ${ITEMS[cur.held].icon} ${ITEMS[cur.held].name} · take`)))
      .child(div().text_size(11.5).text_color(t.muted).mr(2).child("Bag"))
      .when(!ids.length, (el) => el.child(div().text_size(11).text_color(t.dim)
        .child("Nothing for it yet. Idle Pokémon find Berries and stones; a long job earns a Rare Candy.")))
      .children(ids.map((id) => {
        const use = itemUse(cur, slot, id, { night, day: dayOf(Date.now()), hpOf });
        return div()
          .id(`use-${id}`).h(24).px(8).rounded(6).flex().items_center().flex_none().gap(4).text_size(11.5).border_1()
          .border_color(t.border).text_color(use ? t.foreground : t.dim)
          .when(!!use, (el) => el.cursor_pointer().hover((st) => st.bg(t.hover)).on_click((_e, cx) => {
            if (!hasItem(id)) return cx.notify();
            const r = useItem(this.livePick(), slot, id, { night: isNight(), day: dayOf(Date.now()), hpOf }, Date.now());
            if (r && (id === "berry" || id === "sitrus-berry")) research("berry"); // the day's Research
            if (!r) return;
            savePicks({ [slot]: r.pick });
            healBy(slot, r.heal);
            saveBag(addItem(addItem(bag(), id, -1), r.back ?? id, r.back ? 1 : 0));
            if (r.evolved) noteEvolved();
            if ((r.pick.hearts ?? 0) >= MAX_HEARTS && !bag().marks.fullHearts) saveBag(mark(bag(), { fullHearts: true }));
            this.fetchIcons(cx);
            cx.notify();
          }))
          .child(`${ITEMS[id].icon} ${ITEMS[id].name} ×${b.items[id]}`);
      }));
  }

  renderPicker(cx) {
    const t = theme();
    const p = props() ?? {};
    const all = searchEntries(this.filter, Infinity, this.searchOnly()).entries; // every match: scroll to browse them all
    const narrowed = !!(this.filter.trim() || this.only.region || this.only.mega || this.only.fav || this.only.legend || this.only.types);
    const favKeys = favs();
    const dexNow = pokedex();
    // Read here, not in the list's renderer: shared state read in there (Herdr's layout pass)
    // left the whole grid blank.
    const legendsOpen = settingsNow().legendsOpen;
    const lockedHere = (e) => !e.form && isLocked(e.dex, dexNow, legendsOpen);
    const activeFilters = [this.only.fav, this.only.mega, this.only.legend, this.only.region].filter(Boolean).length + (this.only.types?.length ?? 0);
    // A small toggle: the filter row's chips.
    const chip = (id, label, on, flip) => div()
      .id(id).h(22).px(6).rounded(5).flex().items_center().flex_none().text_size(11).border_1()
      .border_color(on ? t.accent : t.border)
      .bg(on ? t.selected : "#00000000")
      .text_color(on ? t.foreground : t.muted).cursor_pointer().hover((st) => st.bg(t.hover))
      .on_click((_e, cx) => { flip(); this.fetchIcons(cx); cx.notify(); })
      .child(sparkled(label));
    const cur = this.livePick();
    return v_flex()
      .id("pokemon-picker")
      .size_full()
      .min_h(0)
      .p(18)
      .gap(12)
      .bg(t.popover)
      .child(
        h_flex().items_center().justify_between()
          .child(
            v_flex().min_w(0).gap(2)
              .child(div().text_size(15).font_semibold().text_color(t.foreground).child("Choose a Pokémon"))
              .child(div().text_size(11.5).text_color(t.muted).truncate().child(this.boxing ? `${nameFor(cur ?? {})} goes to the Box: pick a new one (1 in ${charmOdds()} shiny)`
                : settingsNow().trainer ? `for ${p.tag ?? "this agent"} · Trainer mode: the ones you caught` : `for ${p.tag ?? "this agent"}`)),
          )
          .child(
            h_flex().gap(10).items_center().flex_none()
              // Any Pokémon (of those the search shows), preferring one nobody else on screen has.
              .child(div()
                .id("pick-random").h(26).px(10).rounded(6).flex().items_center().text_size(12).border_1()
                .border_color(t.border).text_color(t.foreground).cursor_pointer().hover((st) => st.bg(t.hover))
                .on_click((_e, cx) => this.chooseRandom(all, cx))
                .child(narrowed ? "🎲 Random match" : "🎲 Random"))
              .child(div().text_size(11).text_color(t.dim).child("Esc")),
          ),
      )
      .when(!!this.preview, (el) => el.child(this.renderPreview(t, cx)))
      .when(!this.preview && !!cur?.dex, (el) => el.child(this.renderCurrent(cur, t)))
      // Mega: Off / On / Auto (Mega while its agent works), for a Pokémon that has one.
      .when(!!megaForm(p.current?.dex) && !p.current?.form, (el) => el.child(
        h_flex().gap(6).items_center()
          .child(div().text_size(11.5).text_color(t.muted).mr(4).child("Mega"))
          .children([["off", "Off"], ["on", "Always"], ["auto", "Auto: working & battles"]].map(([mode, txt]) => div()
            .id(`mega-${mode}`).h(26).px(10).rounded(6).flex().items_center().text_size(12).border_1()
            .border_color(this.megaMode === mode ? t.accent : t.border)
            .bg(this.megaMode === mode ? t.selected : "#00000000")
            .text_color(t.foreground).cursor_pointer().hover((st) => st.bg(t.hover))
            .on_click((_e, cx) => {
              this.megaMode = mode;
              this.saveMega(p);
              cx.notify();
            })
            .child(txt))),
      ))
      // Mega X or Y, for a species with both drawn (Charizard, Mewtwo, Raichu as SpriteCollab adds them).
      .when(megaForms(p.current?.dex).length > 1 && !p.current?.form, (el) => el.child(
        h_flex().gap(6).items_center()
          .child(div().text_size(11.5).text_color(t.muted).mr(4).child("Form"))
          .children(megaForms(p.current?.dex).map(({ kind }) => {
            const on = (this.megaKind ?? megaForm(p.current?.dex).kind) === kind;
            return div()
              .id(`mega-kind-${kind}`).h(26).px(10).rounded(6).flex().items_center().text_size(12).border_1()
              .border_color(on ? t.accent : t.border)
              .bg(on ? t.selected : "#00000000")
              .text_color(t.foreground).cursor_pointer().hover((st) => st.bg(t.hover))
              .on_click((_e, cx) => {
                this.megaKind = kind;
                this.saveMega(p);
                cx.notify();
              })
              .child(`Mega ${kind}`);
          })),
      ))
      .child(
        Input.new(this.input).h(34).flex_none().px(10).rounded(8).border_1().border_color(t.accent)
          .bg(t.background).text_size(12.5).text_color(t.foreground),
      )
      // Filters: one button (how many are on), opening a panel with them all: ★, Mega, Legendary,
      // a region, and up to two types (both: Fire + Flying; a third replaces the first picked).
      .child(h_flex().gap(6).items_center().flex_none()
        .child(chip("filters", `Filters${activeFilters ? ` · ${activeFilters}` : ""} ${this.filtersOpen ? "▴" : "▾"}`, this.filtersOpen || activeFilters > 0, () => { this.filtersOpen = !this.filtersOpen; }))
        .when(activeFilters > 0, (el) => el.child(chip("filters-clear", "Clear", false, () => { this.only = {}; })))
        // What's on, at a glance, when the panel is shut.
        .when(!this.filtersOpen, (el) => el.child(div().flex_1().min_w(0).truncate().text_size(11).text_color(t.muted).child([
          this.only.fav && "★", this.only.mega && "Mega", this.only.legend && "Legendary", this.only.region, ...(this.only.types ?? []).map(typeLabel)].filter(Boolean).join(" · ")))))
      .when(!!this.filtersOpen, (el) => el.child(v_flex().gap(6).p(8).rounded(8).bg(t.raised).flex_none()
        .child(h_flex().flex_wrap().gap(4).items_center()
          .child(chip("only-fav", favKeys.length ? `★ ${favKeys.length}` : "★", !!this.only.fav, () => { this.only = { ...this.only, fav: !this.only.fav }; }))
          .child(chip("only-mega", "Mega", !!this.only.mega, () => { this.only = { ...this.only, mega: !this.only.mega }; }))
          .child(chip("only-legend", "✦ Legendary", !!this.only.legend, () => { this.only = { ...this.only, legend: !this.only.legend }; })))
        .child(h_flex().flex_wrap().gap(4).items_center().children(REGIONS.map((r) => chip(`only-${r}`, r, this.only.region === r, () => {
          this.only = { ...this.only, region: this.only.region === r ? undefined : r };
        }))))
        .child(h_flex().flex_wrap().gap(3).items_center().children(TYPES.map((ty) => {
          const picked = this.only.types ?? [], on = picked.includes(ty);
          return div().id(`only-type-${ty}`).h(20).px(7).rounded(10).flex().items_center().flex_none().text_size(10.5).font_semibold()
            .bg(TYPE_COLOR[ty]).text_color(typeText(ty)).opacity(on || !picked.length ? 1 : 0.45)
            .border_1().border_color(on ? t.foreground : "#00000000").cursor_pointer()
            .on_click((_e, cx) => {
              const types = on ? picked.filter((x) => x !== ty) : [...picked, ty].slice(-2); // two at most
              this.only = { ...this.only, types: types.length ? types : undefined };
              this.fetchIcons(cx);
              cx.notify();
            })
            .child(typeLabel(ty));
        })))))
      // A virtual list of grid rows: only what's on screen is drawn, so all ~974 scroll smoothly.
      // It reports only the row clicked; the pointer's x says which cell.
      .child(
        div().flex_1().min_h(0).relative()
          .on_mouse_move((e) => { this.pickX = e.local_position.x / zoom(); })
          .child(v_virtual_list("picks", Math.ceil(all.length / PICK_COLS), PICK_ROW, (i) => `r${i}`, (range) => {
            this.visible = all.slice(range.start * PICK_COLS, range.end * PICK_COLS);
            const rows = [];
            for (let r = range.start; r < range.end; r++) {
              // No ids or handlers on these rows or cells: the list draws them in a pass of its own,
              // and a row with an on_hover left the whole grid empty (1.6.0). Clicks come through
              // on_item_click, with the pointer's x for the column.
              rows.push(h_flex().h(PICK_ROW).gap(PICK_GAP)
                .children(all.slice(r * PICK_COLS, (r + 1) * PICK_COLS).map((e) => {
                const current = e.dex === p.current?.dex && (e.form ?? null) === (p.current?.form ?? null);
                return v_flex()
                  .relative()
                  .w(PICK_W).h(96).flex_none()
                  .items_center().justify_center().gap(2)
                  .rounded(8).border_1()
                  .border_color(current ? t.accent : "#00000000")
                  .bg(current ? t.selected : "#00000000")
                  .child(this.icons[entryKey(e)] === "ready" ? image(iconPath(e.dex, e.form)).size(48).flex_none() : div().size(48).flex_none())
                  .child(div().text_size(9.5).text_color(t.dim).child(dexNo(e.dex)))
                  // Its types, as badges in their colours.
                  .child(h_flex().gap(2).flex_none().children(entryTypes(e).map((ty) => div().h(11).px(3).rounded(3).flex().items_center()
                    .bg(TYPE_COLOR[ty]).text_size(7.5).font_bold().text_color(typeText(ty)).child(typeLabel(ty)))))
                  .child(div().w_full().px(2).text_center().truncate().text_size(11).text_color(t.foreground).child(fullName(e.dex, e.form)))
                  .when(isFavorite(favKeys, e), (el) => el.child(div().absolute().top(4).right(6).text_size(12).text_color("#f2c94c").child("★")))
                  .when(lockedHere(e), (el) => el.opacity(0.4).child(div().absolute().top(4).left(6).text_size(11).child("🔒")))
                  .when(!lockedHere(e) && !e.form && shinyUnlocked(dexNow, e.dex), (el) => el.child(div().absolute().top(4).left(6).text_size(11).text_color(SHINY_GOLD).child("✨")));
              })));
            }
            return rows;
          }).size_full().cursor_pointer()
          // A click (or a right-click): a preview of that one (how it stands, walks and sleeps) in the card's place.
          .on_item_secondary_click((key, _e, cx) => {
            const col = Math.floor(this.pickX / (PICK_W + PICK_GAP));
            const e = all[Number(key.slice(1)) * PICK_COLS + col];
            if (col >= 0 && col < PICK_COLS && e) this.showPreview(e, cx);
          })
          .on_item_click((key, cx) => {
            const col = Math.floor(this.pickX / (PICK_W + PICK_GAP));
            const e = all[Number(key.slice(1)) * PICK_COLS + col];
            if (!(col >= 0 && col < PICK_COLS && e)) return;
            this.showPreview(e, cx); // a click previews it; Replace there chooses it
          }))
          .child(Scrollbar.vertical("picks").absolute().inset_0()),
      )
      .when(all.length === 0, (el) => el.child(div().text_size(11.5).text_color(t.muted).child(this.only.region || this.only.mega || this.only.legend || this.only.types ? "No Pokémon matches the search and filters." : settingsNow().trainer ? "None you caught by that name. Catch wild ones as they walk by (Trainer mode, Settings)." : "No Pokémon by that name or number.")));
  }
}

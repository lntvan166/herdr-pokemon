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
import { isNewer } from "./update.js";
import { hasShiny, dexNo, megaForm, megaForms, setMegas, fullName, nameOf, searchEntries, REGIONS, regionOf, chainOf, formsOf, coatOf } from "./dex.js";
import { MOD, LEGACY_KEY, VERSION, REPO, STATS_KEY, BAG_KEY, SETTINGS_KEY, FOLDERS_KEY, SINCE_KEY, FAVORITES_KEY } from "./id.js";
const LEADER_KEY = `${MOD}-leader`; // which strip counts (electLeader)
import { loadFavorites, toggleFavorite, isFavorite, favoriteEntries } from "./favorites.js";
import { loadSettings, withSetting, VISIT_EVERY } from "./settings.js";
import { updateNow, sidebarState, patchSidebar } from "./selfupdate.js";
import { loadPicks, assign, randomEntry, gainJob, EVOLVE_JOBS, MAX_HEARTS, withHearts, itemUse, useItem, needsText, evolveNeeds, takeHeld, HELD_IDS, familyOf, youngOf, subAgents, cardOf, withFriend, friendOf, FRIEND, FRIEND_MAX, fromFolders, electLeader, boxList, raised, rivalsOf, agentOfToast, switchedPick, trimPanes, fromBox, boxOnSwitch, rollShiny, nameFor, cleanNick, sessionUsed, sayingOf, TIRED_AT, heartsText, holdersOf, visitorPick, expShareTarget } from "./picks.js";
import { ITEMS, STONES, loadBag, addItem, mark, PRICE, money, sell, sellPrice, jobPay, backPay, addMoney, buy, loadBoosts, withBoost, BOOST_MS, pickup, pickupDelay, CANDY_JOB_MS, shinyOdds, badges, CHARM_JOBS, CHARM_ART, itemAbout, takersOf, badgeGifts, badgeProgress, nextBadge } from "./items.js";
import { forEachSafe, logOnce } from "./safe.js";
import { layoutTags } from "./tags.js";
import { restSpot, roomAt, campSeats } from "./rest.js";
import { typeOf, TYPE_ICON } from "./types.js";
import { BALLS, BAIT, LEGEND_THROWS, purse, TIP, allowance, isLegendary, isLocked, wildPick, throwBall, ballFor, catchChance, natureOf, natureMul, caughtPick, loadDex, withSeen, withCaught, shinyUnlocked, dueGoals, nextGoal, goalText, dexByRegion, DEX_TOTAL, DEX_GOALS, trainerEntries, trainerKeys, openEntries, loadDaily, progress, taskText, taskPay, payText, recapText, BONUS, NATURES } from "./trainer.js";
import { wrapRow, exitX, entryX, wrapOk, clearWalk } from "./wrap.js";
import { focusEdge, onFocus, onStatus, onSeason, onFidget, onCelebrate, battle, battleSpots, reactIcon, sparPair, teasePair, attackPair, teaseSpot, onPoke, TEASE_GAP, shaken, dropTarget, onDizzy, SPAR_GAP, onCombo, COMBO_GAP, onStir, sleepAfter, effectiveMood, pose, megaShown } from "./react.js";
import { loadSprite, ensureIcon, iconPath, ensureArt, artPath, ensureCry, imageMagick, savedMegas, refreshMegas, latestVersion } from "./sprites.js";

const SLOT = 128; // width of one Pokémon's box (sprite, bubble)
const REST_GAP = 60; // a resting Pokémon keeps this far from the others on its row: room for a name
const WRAP_CHANCE = 0.3; // with rows: how often a walk goes off the edge onto the next row
const OFF = 40; // how far past the edge it walks before it turns up on the next row
const EDGE = 28; // how close to the strip's edges a Pokémon walks (its tag has its own layer)
const LABEL_H = 18; // name tag under the feet
const TAG_LINES = 2; // lines kept under each row for names: fixed, so the ground lines never move
const FEET = 24; // ground line, px above the strip's bottom
const SPEED = { working: 70, idle: 32 }; // px per second
const SEASON_CHANCE = 0.3;
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
const BALL_KEY = `${MOD}-ball`; // the ball chosen to throw (Bag, or right-click a visitor); none: Auto
const BAIT_KEY = `${MOD}-bait`; // the Berry fed before each ball (Bag), while there are some
const LEGEND_KEY = `${MOD}-legend`; // when the Research last called a legendary Pokémon over
const HONEY_KEY = `${MOD}-honey`; // when Honey was last used (the strip calls a visitor over)
const VISIT_SPEED = 45; // px per second
const SPAR_CHANCE = 1 / 240;
const TEASE_CHANCE = 1 / 480; // per tick: about every 2 minutes while one is asleep near an idle one
const FIDGET_CHANCE = 0.15; // idle, about to stroll: how often it fidgets instead (nods, sits, twirls…)
const COMBO_CHANCE = 1 / 480; // per tick: about every 2 minutes while an agent and its sub-agent both work
const CAMP_GAP = 46; // px between seats round the campfire // per tick (4 a second): about once a minute while a pair is ready // idle, about to stroll: how often it reacts to the season instead
// props.rows (> 1): agents take turns across that many rows; each roams its whole row, passing
// the others, and the block grows to fit the rows.

// ---- who is which Pokémon -------------------------------------------------------

const slotOf = (a) => a.pane || a.address;
const entryKey = (e) => `${e.dex}${e.form ? `-${e.form}` : ""}`;
// (A Mega is keyed by the X or Y really shown, so a Mega Y drawn later replaces the X stand-in.)
const spriteKey = (pick, mega = false) => `${pick.dex}${pick.form ? `f${pick.form}` : ""}${mega ? `m${megaForm(pick.dex, pick.megaKind)?.kind ?? ""}` : ""}${pick.shiny ? "s" : ""}`;

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
  if (!loadSettings(shared(SETTINGS_KEY)).family) return list;
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
  const back = fromFolders(list, savedPicks(), folders, cwdOf);
  let panesNow = savedPicks();
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
  const st = loadSettings(shared(SETTINGS_KEY));
  const d = pokedex();
  const open = (e) => !isLocked(e.dex, d, st.legendsOpen);
  const pool = st.trainer ? trainerEntries(d)
    : st.newFrom === "favorites" ? favoriteEntries(favs()).filter(open)
    : st.legendsOpen ? null : openEntries(d);
  const r = assign(list, write ? savedPicks() : panesNow, paneless, charmOdds(), pool);
  // Sub-agents (Settings: on): their agent's Pokémon, younger. `family`: child -> parent address.
  r.family = {};
  if (loadSettings(shared(SETTINGS_KEY)).family) {
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
const settingsNow = () => loadSettings(shared(SETTINGS_KEY));
const setSetting = (key, value) => setShared(SETTINGS_KEY, withSetting(settingsNow(), key, value));
const openSettings = (update) => openOverlay({ mod: MOD, kind: "dialog", width: 520, height: 600, props: { settings: true, update } });
// A Pokémon's cry (downloaded and converted once); at most one every 2 s, so a burst of agents
// finishing together doesn't turn into a chorus.
let lastCry = 0;
function cry(dex) {
  const now = Date.now();
  if (now - lastCry < 2000) return;
  lastCry = now;
  ensureCry(dex).then((path) => { if (path) playSound(path); }).catch(() => null);
}
// The Bag: a dialog of its own (menu, or keys.json "pokemon-herd.bag").
// How many Pokémon wait in the Box (the right-click menu's count).
const boxCount = () => { try { return boxList(savedPicks(), new Set(agents().map((a) => a.pane).filter(Boolean))).length; } catch { return 0; } };
const openBag = (tab) => openOverlay({ mod: MOD, kind: "dialog", width: 600, height: 672, props: { bag: true, ...(typeof tab === "string" ? { tab } : {}) } });

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
    if (this.menu) return;
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
        if (c === "settings") { openSettings(this.update()); continue; }
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
    // The tick redraws four times a second, so snow, leaves and rain fall.
    this.snowing = p.snow > 0.05 || p.leaves > 0.05 || weather !== "clear";
    const sec = now.getTime() / 1000;
    const key = `v4|${Math.round(this.width)}|${ground}|${row}`; // bump when features() changes shape
    // Clouds and the moon fade over a Pokémon's head (its bubble stays readable): where heads were
    // on the last frame, which is a quarter second at most.
    const heads = this.heads?.[row] ?? [];
    const fade = (box) => (overHead(box, heads) ? 0.15 : 1);
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
        .transition("top", { duration: 300, easing: "linear" })
        .transition("left", { duration: 300, easing: "linear" }))))
      // Weather (agents waiting on you): the sky darkens, rain falls; a storm slants it and flashes.
      .when(weather !== "clear", (el) => el
        .child(div().absolute().left(0).top(0).w(this.width).h(line + 6).bg("#0b1020").opacity(storm ? 0.32 : 0.18))
        .children(rainAt(f.drops, sec, line - 2, storm).map((d) => div()
          .absolute().left(d.x).top(d.y).w(1).h(storm ? 7 : 5).bg("#a9c3ff").opacity(light ? 0.8 : 0.55)))
        .when(storm && lightning(sec), (e2) => e2.child(div().absolute().left(0).top(0).w(this.width).h(line + 6).bg("#ffffff").opacity(0.35))));
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
    const form = mega ? megaForm(pick.dex, pick.megaKind)?.form : (pick.form ?? null); // its Mega (X or Y), or its regional form
    const cur = this.sprites[key];
    if (cur === "loading" || (cur && !cur.error)) return;
    if (cur?.error && Date.now() - cur.at < 60000) return;
    this.sprites[key] = "loading";
    cx.spawn(async (cx) => {
      try {
        this.sprites[key] = await loadSprite(pick.dex, pick.shiny, form).catch((e) => {
          if (!pick.shiny) throw e;
          return loadSprite(pick.dex, false, form);
        });
      } catch (e) {
        this.sprites[key] = { error: String(e?.message ?? e), at: Date.now() };
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
    if (c.ms && a.pane) research("work", c.ms / 60000);
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
    const every = VISIT_EVERY[settingsNow().visitors]; // [from, to] minutes; null: off
    if (!every || !this.sized || this.width < 200) { this.visitor = null; return false; }
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
    // The day's Research all done: a legendary Pokémon comes next (once per call).
    const legend = shared(LEGEND_KEY) ?? 0;
    if (this.legendSeen !== undefined && legend > this.legendSeen) { this.legendNext = true; if (!v) this.visitAt = now; }
    this.legendSeen = legend;
    if (!v && now >= this.visitAt) {
      const pick = wildPick(new Set(Object.values(ids).map((p) => p.dex)), Math.random, { legend: !!this.legendNext, shinyOdds: charmOdds() });
      this.legendNext = false;
      const seen = withSeen(pokedex(), [pick.dex]); // the Pokédex has seen it
      if (seen) saveDex(seen);
      const dir = (Math.random() < 0.5 ? "r" : "l");
      const [from, to] = dir === "r" ? [-OFF, this.width + OFF] : [this.width + OFF, -OFF];
      // `id`: its own, for every element drawn for it (a second visitor under the first one's ids
      // kept that one's picture: only its 🎁 showed).
      // Its purse, shown over its head while the day's purses last.
      v = this.visitor = { id: `${now}-${pick.dex}`, purse: allowance(dailyNow(now), "purse", purse(pick)), pick, dir, row: g ? Math.floor(Math.random() * g.rows) : 0, from, to, start: 0, dur: (Math.abs(to - from) / VISIT_SPEED) * 1000, asked: now };
      this.want(pick, cx);
    }
    if (!v) return false;
    // A ball thrown: it holds still while the ball shakes; then caught (gone in a moment), or it
    // breaks out and walks on from there.
    if (v.throw) {
      const th = v.throw;
      const end = th.at + 600 + th.shakes * 700;
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
      v.dur = (Math.abs(v.to - v.from) / VISIT_SPEED) * 1000;
      v.walkFrom = undefined;
      v.leg = (v.leg ?? 0) + 1;
      v.broke = now;
      v.throw = null;
    }
    const meta = this.spriteFor(v.pick, "idle");
    if (!v.start) {
      // It sets off once its sprite is in; one that can't be had in a minute doesn't come.
      // A moment after its sprite is in, so the picture is up when it shows.
      if (meta?.walkR) { v.ready ??= now; if (now - v.ready >= 500) v.start = now; }
      else if (now - v.asked > 60000) { this.visitor = null; this.visitAt = next(); }
      return false;
    }
    const f = (now - v.start) / v.dur;
    if (f >= 1) { this.visitor = null; this.visitAt = this.honeyNext || this.legendNext ? now : next(); this.honeyNext = false; return true; }
    v.x = v.from + (v.to - v.from) * f;
    // Idle ones on its row, standing within 220 px, turn to watch it.
    list.forEach((a, i) => {
      const m = this.mons[a.address];
      const row = g ? Math.min(m?.row ?? i % g.rows, g.rows - 1) : 0;
      if (m && !m.moving && m.mood === "idle" && row === v.row && Math.abs(m.x - v.x) < 220) m.dir = v.x > m.x ? "r" : "l";
    });
    return true;
  }

  // A wild Pokémon caught: into the Box (a heart, a nature), the Pokédex, the day's Research, and
  // the Pokédex's goals paid.
  caught(v) {
    const now = Date.now();
    const pick = caughtPick(v.pick, now);
    v.nature = pick.nature;
    savePicks({ [`box-${now}-${pick.dex}`]: pick });
    saveDex(withCaught(pokedex(), pick));
    research("catch");
    payDexGoals();
    // A Pinap Berry: it brings a second gift.
    if (BAIT[v.throw?.bait]?.double) { v.extra = pickup(); saveBag(addItem(bag(), v.extra)); }
  }

  // A ball thrown at the visitor (the best one for it in the Bag): it stops, the ball shakes.
  throwAt(v) {
    if (v.throw || !v.start) return;
    const ball = ballFor(bag().items, v.pick, shared(BALL_KEY));
    if (!ball) return;
    // The Berry set in the Bag goes first, while there are some (none for a Master Ball: no need).
    const b0 = bag();
    const bait = ball !== "master-ball" && BAIT[shared(BAIT_KEY)] && b0.items[shared(BAIT_KEY)] ? shared(BAIT_KEY) : null;
    saveBag(addItem(bait ? addItem(b0, bait, -1) : b0, ball, -1));
    v.throws = (v.throws ?? 0) + 1;
    const now = Date.now();
    const f = clamp((now - v.start) / v.dur, 0, 1);
    v.throw = { ball, bait, at: now, x: v.from + (v.to - v.from) * f, ...throwBall(ball, v.pick, Math.random, bait) };
  }

  // The visitor, drawn as the herd is but with no name: hovering it says what it is.
  renderVisitor(root, grounds, scale) {
    const v = this.visitor;
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
    // Its gift first; then, with a ball in the Bag, a ball over its head: click to throw it.
    const ball = !th && v.gift && now - v.giftAt > 2500 ? ballFor(bag().items, v.pick, shared(BALL_KEY)) : null;
    const showGift = !th && ((!v.gift && now - v.start > 1000) || (v.gift && now - v.giftAt < 2500));
    if (th) {
      // Held in the ball where it stood: it shakes (left and right) up to three times, then
      // clicks shut ("Gotcha!") or opens. Before its first shake, the Pokémon flashes into it.
      const x = th.x;
      const settled = now >= th.at + 600 + th.shakes * 700;
      const size = Math.round(20 * Math.max(0.8, scale));
      const shaking = now >= th.at + 600 && !settled;
      const ballEl = this.itemMark(th.ball, size);
      root.child(div().id(`visitor-ball-${v.id}-${v.leg ?? 0}`).absolute().left(x - size / 2).top(ground - size)
        .when(shaking, (el) => el.loop("left", { from: x - size / 2 - 3, to: x - size / 2 + 3, period: 350 }))
        .child(ballEl));
      if (now < th.at + 600) {
        root.child(div().id(`visitor-flash-${v.id}`).absolute().left(x - mid).top(0).w(sw).h(ground + 10)
          .loop("opacity", { from: 0.2, to: 0.9, period: 200 })
          .child(image(s.path).absolute().left(imgLeft).top(imgTop).w(s.w * scale).h(s.h * scale)));
      }
      if (settled && (th.caught || th.fled)) {
        const tagW = 260;
        root.child(div().absolute().left(Math.max(4, Math.min(this.width - tagW - 10, x - tagW / 2))).top(Math.max(2, ground - size - 22)).w(tagW).h(LABEL_H)
          .flex().items_center().justify_center().rounded(4).bg(t.chrome).text_size(10.5).font_semibold().text_color(t.foreground)
          .child(th.fled ? `${fullName(v.pick.dex, v.pick.form)} fled!` : `✨ Gotcha! ${fullName(v.pick.dex, v.pick.form)}${v.nature ? ` (${NATURES[v.nature].name})` : ""} → Box${v.extra ? ` · +${ITEMS[v.extra].name}` : ""}`));
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
    const baitNow = ball && ball !== "master-ball" && BAIT[shared(BAIT_KEY)] && bag().items[shared(BAIT_KEY)] ? shared(BAIT_KEY) : null;
    const rate = Math.round(100 * catchChance(ball ?? "poke-ball", v.pick, baitNow));
    root.child(div().id(`visitor-${v.id}-${leg}`).absolute().top(0).h(ground + 10).w(sw).left(left - mid)
      .transition("left", { duration: Math.max(1, Math.round(v.dur - (v.walkFrom - v.start))), easing: "linear" })
      .child(div()
        .child(div().absolute().left(mid - shadowW / 2).top(ground - 2 * scale).w(shadowW).h(6 * scale).rounded_full().bg("#00000030"))
        .child(image(s.path).absolute().left(imgLeft).top(imgTop).w(s.w * scale).h(s.h * scale)))
      // Hover: what it is; a click: its gift (once), then a ball, if you have one.
      .child(div().id(`visitor-hit-${v.id}-${leg}`).absolute().left(hit.left).top(hit.top).w(hit.w).h(hit.h).cursor_pointer()
        .on_hover((h, cx) => { this.visitorHover = h; cx.notify(); })
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
            v.gift = pickup();
            v.giftAt = Date.now();
            saveBag(addItem(bag(), v.gift));
            research("gift");
            if (v.purse) v.paid = earn("purse", v.purse);
          } else if (Date.now() - v.giftAt > 800) this.throwAt(v);
          cx.notify();
        }))
      // Every visitor carries a gift: 🎁 over its head, pulsing, until you click it; then what it
      // left; then a ball to throw. A legendary one glows.
      .when(!!v.pick.legend, (el) => el.child(div().absolute().left(mid - 9).top(Math.max(2, headY - 34)).text_size(12)
        .loop("opacity", { from: 0.3, to: 1, period: 600 }).child("✦")))
      .when(showGift, (el) => el.child(div().absolute().left(mid - 8).top(Math.max(2, headY - 18)).text_size(13)
        .when(!v.gift, (e2) => e2.loop("opacity", { from: 0.45, to: 1, period: 800 }))
        .child(v.gift ? this.itemMark(v.gift, 18) : "🎁")))
      // Its purse beside the gift ("₽25"), then what it paid ("+₽25").
      .when(showGift && (!v.gift ? v.purse > 0 : v.paid > 0), (el) => el.child(div().absolute().left(mid + 10).top(Math.max(2, headY - 16)).h(14).px(3).rounded(3)
        .bg("#00000055").text_size(10).font_semibold().text_color(v.pick.legend || v.purse >= 60 ? "#f2c94c" : "#ffffff")
        .child(v.gift ? `+${money(v.paid)}` : money(v.purse))))
      .when(!!ball, (el) => el.child(div().absolute().left(mid - 8).top(Math.max(2, headY - 18))
        .loop("opacity", { from: 0.5, to: 1, period: 700 })
        .child(this.itemMark(ball, 18)))));
    const broke = v.broke && now - v.broke < 2500;
    if (this.visitorHover || broke || now - (this.ballSwitched ?? 0) < 1500) {
      const tagW = 250;
      const what = `${v.pick.legend ? "A legendary" : "A wild"} ${v.pick.shiny ? "✨ " : ""}${fullName(v.pick.dex, v.pick.form)}`;
      const tail = broke ? " broke free!"
        : !v.gift ? `: click it${v.purse ? ` (${money(v.purse)} and a gift)` : ""}`
        : now - v.giftAt < 2500 ? ` left you ${/^[AEIOU]/.test(ITEMS[v.gift].name) ? "an" : "a"} ${ITEMS[v.gift].name}${v.paid ? ` and ${money(v.paid)}` : ""}`
        : ball ? `: ${shared(BALL_KEY) === ball ? "" : "(Auto) "}click to throw a ${ITEMS[ball].name}${baitNow ? ` with a ${ITEMS[baitNow].name}` : ""} (${rate}%)${v.pick.legend ? ` · ${LEGEND_THROWS - (v.throws ?? 0)} balls before it flees` : ""}`
        : ": no Poké Balls (the Shop has them)";
      root.child(div().absolute().left(Math.max(4, Math.min(this.width - tagW - 10, v.x - tagW / 2))).top(ground + 6).w(tagW).h(LABEL_H)
        .flex().items_center().justify_center().rounded(4).bg(t.chrome).text_size(10.5).text_color(t.foreground)
        .child(`${what}${tail}`));
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
    this.artReady ??= new Set();
    if (art && !this.artReady.has(art) && !(this.artAsked ??= new Set()).has(art)) {
      this.artAsked.add(art);
      ensureArt(art).then(() => this.artReady.add(art)).catch(() => null);
    }
    return art && this.artReady.has(art) ? image(artPath(art)).size(size).flex_none() : div().child(ITEMS[id]?.icon ?? "");
  }

  // Friendship and Pickup, each tick. Waiting on you: after HUNGRY_MS it's hungry (a heart down);
  // answered within QUICK_MS, a heart up; answered when hungry, it eats a Berry from the Bag if
  // there is one (a heart back). Idle (its agent not working nor waiting): now and then it finds
  // an item (items.js pickup) for the Bag.
  care(a, m, now) {
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
          updatePick(a.pane, (p) => withFriend(p, FRIEND.berry));
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
    const list = herdAgents();
    const tabs = tabsById();
    // One strip counts (jobs, finds, hunger, Berries, gifts, new agents' Pokémon): the leader.
    this.me ??= `${now}-${Math.random().toString(36).slice(2, 8)}`;
    const el = electLeader(shared(LEADER_KEY), this.me, now);
    this.leader = el.leader;
    if (el.write && now - (this.leaderWrote ?? 0) >= 1000) { this.leaderWrote = now; setShared(LEADER_KEY, el.write); }
    // A new player (no Pokémon saved yet, the first time): their agents as cards in the sidebar.
    if (this.leader && !shared(CARDS_KEY)) {
      setShared(CARDS_KEY, now);
      if (!Object.keys(savedPicks()).length) this.firstCards = now;
    }
    if (this.firstCards) this.defaultCards(now);
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
    // Once a minute: the Pokédex has seen the herd; a new day's Research is drawn (yesterday summed up).
    if (this.leader && now - (this.dexAt ?? 0) > 60000) {
      this.dexAt = now;
      const seen = withSeen(pokedex(), Object.values(ids).map((p) => p.dex));
      if (seen) saveDex(seen);
      const day = dailyNow(now);
      if (shared(DAILY_KEY)?.day !== day.day) setShared(DAILY_KEY, day);
    }
    if (this.magick) {
      for (const a of list) {
        const p = ids[a.address];
        this.want(p, cx);
        if (megaShown(p, a.status)) this.want(p, cx, true); // its Mega, fetched when first needed
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
      this.weather = weather;
      changed = true;
    }
    if (this.rainbow && now - this.rainbow.at >= RAINBOW_MS) { this.rainbow = null; changed = true; }
    if (this.rainbow) changed = true; // it fades in and out
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
      const meta = this.spriteFor(ids[a.address], a.status);
      // Mega Evolution (or back): a flash of sparkles.
      const mega = meta?.megaShown === true;
      if (m.mega !== undefined && mega !== m.mega) { m.flashUntil = now + 1500; changed = true; }
      m.mega = mega;
      // It just evolved (here, or in the picker): sparkles.
      const evolvedAt = ids[a.address]?.evolvedAt ?? 0;
      if (now - evolvedAt < 3000 && (m.flashUntil ?? 0) < evolvedAt + 3000) { m.flashUntil = evolvedAt + 3000; changed = true; }
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
    const fight = (a1, m1, a2, m2) => {
      const side = (a) => {
        const meta = this.spriteFor(ids[a.address], a.status);
        return { has: hasOf(meta), msOf: msFor(meta), icon: TYPE_ICON[typeOf(ids[a.address]?.dex)] ?? "⭐" };
      };
      // Too close: they hop apart first (a quick slide, facing each other), then battle.
      const spots = battleSpots(m1.x, m2.x, EDGE, hiFor(this.width));
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
      battle(m1, m2, side(a1), side(a2), now, Math.random, back ? { ...spots, back: BACK } : spots);
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
        [[b, mp, "⚡"], [a, mc, null]].forEach(([ag, m, icon]) => {
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
        fight(pair[0].a, this.mons[pair[0].addr], pair[1].a, this.mons[pair[1].addr]);
        if (this.leader) { for (const { a } of pair) updatePick(a.pane, (p) => withFriend(p, FRIEND.spar)); research("spar"); earn("tip", TIP.spar); }
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
    if (dm && dMeta && drop.dizzy) {
      dm.tease = null;
      onDizzy(dm, now, hasOf(dMeta), msFor(dMeta));
      dm.pauseUntil = dm.react.until + rand(1000, 3000);
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
          fight(list[dj], dm, hit.b, s);
          if (hearts && this.leader) { for (const a of [list[dj], hit.b]) if (a.pane) updatePick(a.pane, (p) => withFriend(p, FRIEND.spar)); research("spar"); earn("tip", TIP.drop); }
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
    if (this.leader && now - (this.giftsAt ?? 0) > 30000) { this.giftsAt = now; this.giveBadgeGifts(); }
    for (const k of Object.keys(this.mons)) if (!live.has(k)) { delete this.mons[k]; changed = true; }
    if (changed || this.snowing) cx.notify();
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

  // The update waiting on GitHub (its version), or null.
  update() {
    return isNewer(this.latest, VERSION) ? this.latest : null;
  }

  openMenu() {
    const update = this.update();
    openOverlay({ mod: MOD, kind: "popup", width: 280, height: update ? 132 : 76, props: { menu: true, update } });
  }

  // The right-click menu: the Bag and Settings (both open a dialog of their own), and a newer
  // release when there is one.
  renderMenu() {
    const t = theme();
    const b = bag();
    const n = Object.values(b.items).reduce((x, y) => x + y, 0);
    const got = badges(summary(stats(), 0), b.marks, liveForBadges()).filter((x) => x.earned).length;
    const row = (id, txt, note, on) => h_flex()
      .id(id).h(28).px(8).rounded(6).items_center().justify_between()
      .text_size(12.5).text_color(t.foreground).cursor_pointer().hover((st) => st.bg(t.hover))
      .on_click(() => { closeOverlay(props()?.overlay); on(); })
      .child(txt)
      .child(div().text_size(11.5).text_color(t.muted).child(note));
    return v_flex()
      .id("pokemon-menu").size_full().p(8).gap(2).bg(t.popover)
      .child(row("open-bag", "Box", `${boxCount()} Pokémon · ${n} item${n === 1 ? "" : "s"} · ${got}/8`, () => openBag("box")))
      .child(row("open-settings", "Settings", "", () => openSettings(props()?.update)))
      // A newer release: an installed copy never updates by itself.
      .when(!!props()?.update, (el) => el
        .child(div().h(4))
        .child(div().px(8).text_size(11).text_color(t.dim).child(`Update: ${props().update} (you have ${VERSION})`))
        .child(div().px(8).text_size(11.5).text_color(t.muted)
          .child(`Delete mods/${MOD} and add github.com/${REPO} again. Your Pokémon are kept.`)));
  }

  initSettings(cx) {
    this.settingsTab = props()?.tab ?? (props()?.update ? "updates" : "strip"); // the Update pill opens Updates
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
    const TABS = [["strip", "Strip"], ["herd", "Herd"], ["trainer", "Trainer"], ["sound", "Sound"], ["updates", "Updates"]];
    const body = tab === "herd" ? this.settingsHerd(kit, st)
      : tab === "trainer" ? this.settingsTrainer(kit, st, t)
      : tab === "sound" ? this.settingsSound(kit)
      : tab === "updates" ? this.settingsUpdates(kit)
      : this.settingsStrip(kit, st);
    const upd = this.newerVersion();
    // The title and the tabs stay; the tab's page scrolls (a short window shows it all, a step at a time).
    return v_flex().id("pokemon-settings").size_full().min_h(0).pt(18).bg(t.popover)
      .child(h_flex().px(18).pb(10).justify_between().items_center().flex_none()
        .child(div().text_size(15).font_semibold().text_color(t.foreground).child("Settings"))
        .child(div().text_size(11).text_color(t.dim).child("Esc")))
      .child(h_flex().px(14).pb(10).gap(4).flex_none().children(TABS.map(([k, txt]) => {
        const on = tab === k;
        const sparkle = k === "trainer" && !st.trainer; // Trainer mode, off: it twinkles to be found
        return h_flex().id(`set-tab-${k}`).h(28).px(10).gap(4).rounded(6).items_center().cursor_pointer()
          .bg(on ? t.selected : "#00000000").hover((s2) => s2.bg(on ? t.selected : t.hover))
          .when(k === "trainer", (el) => el.border_1().border_color(on ? t.accent : "#f2c94c80"))
          .on_click((_e, cx) => { this.settingsTab = k; this.unlocking = false; cx.notify(); })
          .when(k === "trainer", (el) => el.child(div().text_size(12).when(sparkle, (e2) => e2.loop("opacity", { from: 0.25, to: 1, period: 900 })).child("✨")))
          .child(div().text_size(12.5).text_color(on ? t.foreground : t.muted).when(on, (e2) => e2.font_semibold()).child(txt))
          .when(k === "updates" && !!upd, (el) => el.child(div().size(6).rounded_full().bg(t.accent)));
      })))
      .child(v_flex().id(`settings-${tab}`).flex_1().min_h(0).overflow_y_scrollbar().px(18).pb(18).gap(8).children(body));
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
      // Little stars around the card, each twinkling at its own pace.
      .children(stars.map(([x, y, period], i) => div().absolute().left(x).top(y).text_size(i % 2 ? 10 : 12).text_color("#f2c94c")
        .loop("opacity", { from: 0.1, to: 1, period }).child(i % 2 ? "✦" : "✨")))
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
        line("Hear one", `${fullName(sample.dex)}'s cry`, div().id("cry-test").h(26).px(12).rounded_full().flex().items_center().flex_none()
          .bg(t.solid).text_color(t.solid_foreground).text_size(12).font_semibold().cursor_pointer()
          .on_click(() => { lastCry = 0; cry(sample.dex); })
          .child("Play")),
      ),
    ];
  }

  // Updates: this mod (and Pokémon Sidebar with it), and Better Sidebar's patch when it's installed.
  settingsUpdates({ line, button, panel }) {
    const upd = this.newerVersion();
    return [
      panel(
        line("Pokémon herd", this.updating === "running" ? "Downloading…"
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

  openPicker(a, pick, tag) {
    openOverlay({
      mod: MOD,
      kind: "dialog",
      width: 640,
      height: 680,
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
    const gap = this.drawnAt !== undefined && now - this.drawnAt > 3000;
    this.drawnAt = now;
    if (gap) this.resume = true;

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
      const hearts = (full && pick.hearts ? ` · ♥${pick.hearts}` : "") + (full && natureOf(pick) ? ` · ${natureOf(pick).name}` : "");
      const holds = full && pick.held ? ` · ${ITEMS[pick.held].icon}` : ""; // just the icon: the label stays short
      const rivalTags = full && this.rivals?.[a.address] ? ` · ⚔ same folder as ${this.rivals[a.address].map((x) => { const b = list.find((y) => y.address === x); return b ? tagOf(b, tabs) : x; }).join(", ")}` : "";
      // What it says it's doing stays on the cards: here it ran across the whole strip.
      const text = full ? `${nameFor(pick)} · ${tagOf(a, tabs)}${hearts}${holds}${rivalTags}${line ? ` · ${line}` : ""}` : tagOf(a, tabs);
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
      (byRow[rowOf(a)] ??= []).push({ id: a.address, cx: headedTo(a), from: isAt(a), text: label(a), rank: rank(a), settled: was.has(a.address) && this.standing.has(a.address), since: this.since[a.address] });
    }
    for (const row of byRow) if (row) for (const [id, spot] of layoutTags(row, this.width, { maxLines: TAG_LINES })) tags.set(id, spot);
    const heads = []; // per row, where each head and its bubble is: clouds and the moon fade there
    const outer = scale;
    for (const a of order) {
      const pick = ids[a.address];
      const scale = pick.young ? outer * 0.75 : outer; // a sub-agent's Pokémon is smaller
      const id = pick.dex;
      const m = this.mons[a.address] ?? { x: this.width / 2, target: this.width / 2, dir: "r", moving: false, dur: 0 };
      const mood = m.mood ?? moodOf(a, tabs, now);
      const meta = this.spriteFor(pick, a.status);
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
          .child(image(s.path).absolute().left(left).top(top).w(s.w * scale).h(s.h * scale));
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
          .child(body)
          .child(interact(div().absolute().left(hit.left).top(hit.top).w(hit.w).h(hit.h), `hit-${a.address}`))
          .when(!!bubble, (el) =>
            el.child(h_flex().absolute().left(0).w(sw).top(Math.max(2, headY - 22)).justify_center().text_size(12.5).child(bubble)))
          // Reacting to the season: its icon (🌸 ☀️ 🍂 ❄️) beside its head.
          .when(!!reactIcon(m, now), (el) =>
            el.child(div().absolute().left(sw / 2 + 8).top(Math.max(2, headY - 12)).text_size(12)
              .loop("opacity", { from: 0.5, to: 1, period: 700 }).child(reactIcon(m, now))))
          // A battle's special move: its type's icon flies across to the other (one transition,
          // set once: from where it starts on the first frame, to the other on the next ones).
          .when(!!m.react?.shot && now >= m.react.shot.at && now < m.react.shot.until + 150, (el) => {
            const sh = m.react.shot;
            const first = sh.drawnAt === undefined;
            if (first) sh.drawnAt = now;
            return el.child(div().id(`shot-${a.address}-${sh.at}`).absolute().top(Math.max(2, headY + 6)).text_size(16)
              .left(sw / 2 - 8 + ((first ? sh.from : sh.to) - sh.from))
              .transition("left", { duration: Math.max(1, sh.until - sh.drawnAt), easing: "linear" })
              .child(sh.icon));
          })
          // A find, a heart, a berry; or hungry, waiting on you too long.
          .when(!!m.note || !!m.hungry, (el) =>
            el.child(div().absolute().left(sw / 2 - 30).top(Math.max(2, headY - 14)).text_size(13)
              .when(!m.note, (e2) => e2.loop("opacity", { from: 0.4, to: 1, period: 900 }))
              .child(m.note?.item ? this.itemMark(m.note.item, 18) : (m.note?.icon ?? "😢"))))
          // Tired (the 5-hour limit is near): working ones sweat.
          .when(!!this.tired && mood === "working", (el) =>
            el.child(div().absolute().left(sw / 2 + 12).top(Math.max(2, headY - 4)).text_size(11)
              .loop("opacity", { from: 0.3, to: 1, period: 1100 }).child("💦")))
          // Working in the same folder as another agent: crossed swords, pulsing, over its head.
          .when(!!m.rival, (el) =>
            el.child(div().absolute().left(sw / 2 - 8).top(Math.max(2, headY - 30)).text_size(13)
              .loop("opacity", { from: 0.35, to: 1, period: 700 }).child("⚔️")))
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
              .child(
                div().min_w(0).truncate().text_size(10.5)
                  .text_color(hovered || a.focused ? t.foreground : t.muted)
                  .child(label(a)),
              ),
          ))
          // Hovered: its full name ("Pikachu · api") floats over its neighbours' tags.
          .when(!!spot && hovered, (el) => {
            const full = label(a, true);
            const w = Math.min(this.width, full.length * 6.2 + 26);
            const left = m.moving ? x - w / 2 : clamp(x - w / 2, 0, Math.max(0, this.width - w));
            return el.child(
              interact(h_flex(), `tag-${a.address}`)
                .absolute().left(left - x + sw / 2).w(w).top(ground + 6 + spot.line * LABEL_H).h(LABEL_H)
                .overflow_hidden().justify_center().items_center().gap(4).px(4)
                .rounded(5).bg(t.popover).border_1().border_color(t.border)
                .child(div().flex_none().size(6).rounded_full().bg(t[a.status] ?? t.idle))
                .child(div().min_w(0).truncate().text_size(10.5).text_color(t.foreground).child(full)),
            );
          })
      );
    }
    this.heads = heads;
    // A newer release on GitHub: a small pill in the corner; it opens the menu, which says how.
    const update = this.update();
    if (update) {
      root.child(div().id("pokemon-update").absolute().right(6).top(4).h(16).px(6).rounded(8)
        .flex().items_center().text_size(10).bg(t.accent).text_color(t.accent_foreground)
        .cursor_pointer().on_click(() => this.openMenu())
        .child(`Update ${update}`));
    }
    // Shop boosts on now: a small pill each in the top-left corner, with the minutes left.
    const on = Object.entries(loadBoosts(shared(BOOSTS_KEY), now));
    if (on.length) {
      root.child(h_flex().absolute().left(6).top(4).gap(4).children(on.map(([id, until]) =>
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
    this.renderVisitor(root, grounds, scale);
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
          .child(pick ? `${pick.shiny ? "✨ " : ""}${fullName(pick.dex, pick.form)}${p.body ? ` · ${p.body}` : ""}` : p.body))));
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
            .child(div().flex_1().min_w(0).truncate().text_color(t.muted).child(`${pick.shiny ? "✨ " : ""}${nameFor(pick)}${pick.held ? ` ${ITEMS[pick.held].icon}` : ""}`))
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
    cx.spawn(async (cx) => {
      for (const k of keys) {
        try { await ensureArt(k); this.art[k] = "ready"; } catch { this.art[k] = "failed"; }
        cx.notify();
      }
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
        return h_flex().id(`task-${i}`).h(64).px(14).gap(12).items_center().rounded(10).bg(t.raised)
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
      .child(h_flex().h(64).px(14).gap(12).items_center().rounded(10).bg(t.raised).border_1().border_color(all ? t.accent : t.raised)
        .child(div().size(26).rounded_full().flex().items_center().justify_center().flex_none().text_size(14)
          .when(!all, (el) => el.loop("opacity", { from: 0.4, to: 1, period: 1400 })).child("✦"))
        .child(v_flex().flex_1().min_w(0).gap(3)
          .child(div().text_size(13).text_color(t.foreground).child(all ? "All three done: a legendary Pokémon is on its way" : "All three: a legendary Pokémon walks by"))
          .child(div().text_size(11.5).text_color(t.muted).child(settingsNow().visitors === "off" ? "Visitors are off (Settings): it can't come." : "Have a Master Ball or an Ultra Ball ready.")))
        .child(reward(BONUS)))
      .child(div().flex_1())
      .child(div().text_size(11.5).text_color(t.muted).child("Tasks change at midnight; each pays the moment it's done."));
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
        .children([["Seen", d.seen.length], ["Caught", d.caught.length], ["Legendary", legends], ["Shiny", d.shiny.length]].map(([k, n]) => v_flex().flex_1().p(10).gap(2).rounded(10).bg(t.raised)
          .child(div().text_size(18).font_semibold().text_color(t.foreground).child(String(n)))
          .child(div().text_size(11.5).text_color(t.muted).child(k === "Caught" ? `Caught of ${DEX_TOTAL}` : k)))))
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
    const ids = Object.keys(PRICE);
    const sel = ids.includes(this.shopSel) ? this.shopSel : "x-speed";
    const price = PRICE[sel];
    const n = b.items[sel] ?? 0;
    const can = (b.money ?? 0) >= price && n < 99;
    return h_flex().flex_none().h(LIST_H).gap(12).items_stretch()
      .child(v_flex().id("shop-items").w(218).flex_none().min_h(0).overflow_y_scrollbar().p(4).gap(0).rounded(10).bg(t.raised)
        .children(ids.map((id) => {
          const on = id === sel;
          const afford = (b.money ?? 0) >= PRICE[id];
          return h_flex().id(`shop-${id}`).h(26).px(8).gap(8).rounded(7).items_center()
            .bg(on ? t.selected : "#00000000").cursor_pointer().hover((st) => st.bg(on ? t.selected : t.hover))
            .on_click((_e, cx) => { this.shopSel = id; cx.notify(); })
            .child(art(ITEMS[id].art, 22))
            .child(div().flex_1().min_w(0).truncate().text_size(12.5).text_color(t.foreground).child(ITEMS[id].name))
            .child(div().text_size(12).text_color(afford ? t.foreground : t.dim).child(money(PRICE[id])));
        })))
      .child(v_flex().flex_1().min_w(0).p(14).gap(10).rounded(10).bg(t.raised).overflow_hidden()
        .child(h_flex().gap(12).items_center()
          .child(art(ITEMS[sel].art, 56))
          .child(v_flex().min_w(0).gap(2)
            .child(div().text_size(14).font_semibold().text_color(t.foreground).child(ITEMS[sel].name))
            .child(div().text_size(12).text_color(t.muted).child(`${money(price)} · ${n} in the Bag`))))
        .child(div().text_size(12).text_color(t.foreground).child(itemAbout(sel)))
        .child(div().h(2))
        .child(h_flex().gap(10).items_center()
          .child(div().id("shop-buy").h(26).px(14).rounded_full().flex().items_center().flex_none()
            .text_size(12).font_semibold().bg(can ? t.solid : t.border).text_color(can ? t.solid_foreground : t.dim)
            .when(can, (e2) => e2.cursor_pointer().on_click((_e, cx) => {
              const next = buy(bag(), sel);
              if (next) saveBag(next);
              cx.notify();
            }))
            .child(`Buy for ${money(price)}`))
          .child(div().text_size(11.5).text_color(t.dim).child(n >= 99 ? "The Bag holds 99 at most."
            : can ? `You have ${money(b.money)}.` : `${money(price - (b.money ?? 0))} more to go.`)))
        .child(div().flex_1())
        .child(div().text_size(11.5).text_color(t.muted)
          .child("Pokédollars come from jobs: ₽5 and ₽2 a minute each one took (₽150 at most), twice with an Amulet Coin.")));
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
    const how = { night: isNight() };
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
      : first.use === "hold" ? `${ITEMS[usable[0]].name} can be held by ${fullName(first.pick.dex, first.pick.form)} (${first.tag})`
      : `${ITEMS[usable[0]].name} can give ${fullName(first.pick.dex, first.pick.form)} (${first.tag}) half a heart`;
    const use = (id, h) => {
      const live = savedPicks()[h.slot]; // as saved now: never a stale copy (it may have moved since)
      if (!live) return;
      const r = useItem(live, h.slot, id, { night: isNight() }, Date.now());
      if (!r) return;
      savePicks({ [h.slot]: r.pick });
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
      .when(tab === "box", (el) => el.child(this.renderBox(boxed, LIST_H, t, icon, herd)))
      .when(tab === "shop", (el) => el.child(this.renderShop(b, LIST_H, t, art)))
      .when(tab === "today", (el) => el.child(this.renderToday(daily, LIST_H, t, art)))
      .when(tab === "dex", (el) => el.child(this.renderDex(LIST_H, t, art)))
      .when(tab === "items", (el) => el.child(h_flex().flex_none().h(LIST_H).gap(12).items_stretch()
        // Items: every one, in the Bag's order.
        .child(v_flex().id("bag-items").w(218).flex_none().min_h(0).overflow_y_scrollbar().p(4).gap(0).rounded(10).bg(t.raised)
          .children(ids.map((id) => {
            const n = b.items[id] ?? 0;
            const on = id === sel;
            return h_flex().id(`item-${id}`).h(26).px(8).gap(8).rounded(7).items_center()
              .bg(on ? t.selected : "#00000000").cursor_pointer().hover((st) => st.bg(on ? t.selected : t.hover))
              .on_click((_e, cx) => { this.sel = id; cx.notify(); })
              .child(div().opacity(n ? 1 : 0.35).child(art(ITEMS[id].art, 22)))
              .child(div().flex_1().min_w(0).truncate().text_size(12.5).text_color(n ? t.foreground : t.dim).child(ITEMS[id].name))
              .when(takers[id].length > 0, (el) => el.child(div().size(6).rounded_full().bg(t.accent)))
              .when((heldAll[id]?.length ?? 0) > 0, (el) => el.child(div().text_size(11).text_color(t.muted).child(`${heldAll[id].length} held`)))
              .child(div().w(22).text_right().text_size(12.5).text_color(n ? t.foreground : t.dim).child(String(n)));
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
          .when(!!b.items[sel] && sellPrice(sel) > 0, (el) => {
            const n = b.items[sel];
            const sure = this.sellingAll === sel;
            const pill = (id, label, click, danger = false) => div().id(id).h(24).px(10).rounded_full().flex().items_center().flex_none().text_size(11.5).border_1()
              .border_color(danger ? t.blocked : t.border).text_color(danger ? t.blocked : t.muted).cursor_pointer().hover((st) => st.bg(t.hover))
              .on_click((_e, cx) => { click(); cx.notify(); }).child(label);
            return el.child(h_flex().gap(6).items_center()
              .child(pill("sell-one", `Sell 1 · ${money(sellPrice(sel))}`, () => { const next = sell(bag(), sel, 1); if (next) saveBag(next); this.sellingAll = null; }))
              .when(n > 1, (e2) => e2.child(pill("sell-all", sure ? `Sure? ${n} for ${money(n * sellPrice(sel))}` : `Sell all ${n}`, () => {
                if (!sure) { this.sellingAll = sel; return; }
                const next = sell(bag(), sel, n);
                if (next) saveBag(next);
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
                  saveBag(addItem(bag(), sel, -1));
                  setShared(BOOSTS_KEY, withBoost(loadBoosts(shared(BOOSTS_KEY), now), sel, now));
                  cx.notify();
                }))
                .child(until ? "Use another (+10 min)" : "Use it"))
              .child(div().text_size(11.5).text_color(t.dim)
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
              .child(div().text_size(11.5).text_color(t.dim).child(on ? "Thrown at every wild Pokémon, till you run out (then Auto)." : "Auto: the cheapest, the best for a shiny, a Master Ball only for a legendary. Right-click a wild one to switch.")));
          })
          .when(ITEMS[sel].kind === "ball", (el) => el
            .child(div().text_size(12).text_color(t.muted).child(`Odds with this ball: ${Math.round(100 * catchChance(sel, { dex: 25 }))}% for most, ${Math.round(100 * catchChance(sel, { dex: 25, shiny: true }))}% for a shiny, ${Math.round(100 * catchChance(sel, { dex: 150 }))}% for a legendary.`))
            .child(div().text_size(11.5).text_color(t.dim).child(b.items[sel] ? "Click a wild Pokémon on the strip once you have its gift: a ball over its head means one is ready." : "None in the Bag: the Shop has them, and the day's Research gives some.")))
          // A Berry for catching: set it to be fed before each ball (one each time, while there are some).
          .when(ITEMS[sel].kind === "bait", (el) => {
            const on = shared(BAIT_KEY) === sel;
            const has = !!b.items[sel];
            return el.child(div().h(2)).child(h_flex().gap(10).items_center()
              .child(div().id("use-bait").h(26).px(14).rounded_full().flex().items_center().flex_none()
                .text_size(12).font_semibold().bg(on || has ? t.solid : t.border).text_color(on || has ? t.solid_foreground : t.dim)
                .when(on || has, (e2) => e2.cursor_pointer().on_click((_e, cx) => { setShared(BAIT_KEY, on ? null : sel); cx.notify(); }))
                .child(on ? "Stop feeding" : "Feed before each ball"))
              .child(div().text_size(11.5).text_color(t.dim)
                .child(on ? (has ? "On: one goes before each ball you throw." : "On, but none left.") : has ? "One goes before each ball, till you stop or run out." : "None in the Bag: the Shop has them.")));
          })
          // A Festival Ticket: fireworks now.
          .when(sel === "festival-ticket", (el) => {
            const has = !!b.items[sel];
            return el.child(div().h(2)).child(h_flex().gap(10).items_center()
              .child(div().id("use-festival").h(26).px(14).rounded_full().flex().items_center().flex_none()
                .text_size(12).font_semibold().bg(has ? t.solid : t.border).text_color(has ? t.solid_foreground : t.dim)
                .when(has, (e2) => e2.cursor_pointer().on_click((_e, cx) => {
                  saveBag(addItem(bag(), sel, -1));
                  setShared(FESTIVAL_KEY, Date.now());
                  cx.notify();
                }))
                .child("Start the festival"))
              .child(div().text_size(11.5).text_color(t.dim).child(has ? "Look at the strip." : "None in the Bag: the Shop has them.")));
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
                    saveBag(addItem(bag(), sel, -1));
                    setShared(sel === "honey" ? HONEY_KEY : LEGEND_KEY, Date.now());
                    cx.notify();
                  }))
                  .child(sel === "honey" ? "Call one now" : "Call a legendary");
              })())
              .child(div().text_size(11.5).text_color(t.dim)
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
                : `♥ ${heartsText(friendOf(h.pick))} → ${heartsText(friendOf(h.after))}`)))
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
    const q = (this.boxQuery ?? "").trim().toLowerCase();
    const FILTERS = [
      ["all", "All", () => true],
      ["waiting", "Waiting", (x) => !x.tag],
      ["agents", "With agents", (x) => !!x.tag],
      ["caught", "Caught", (x) => !!x.pick.caught],
      ["shiny", "✨ Shiny", (x) => !!x.pick.shiny],
      ["legend", "Legendary", (x) => isLegendary(x.pick.dex)],
    ];
    const filter = FILTERS.find((f) => f[0] === this.boxFilter) ?? FILTERS[0];
    const shown = everyone.filter(filter[2]).filter((x) => !q || nameFor(x.pick).toLowerCase().includes(q) || (x.tag ?? "").toLowerCase().includes(q));
    const sel = everyone.find((x) => x.slot === this.boxSel) ?? null;
    const chip = (id, label, on, click) => div().id(id).h(24).px(8).rounded(6).flex().items_center().flex_none().text_size(11.5).border_1()
      .border_color(on ? t.accent : t.border).bg(on ? t.selected : "#00000000")
      .text_color(on ? t.foreground : t.muted).cursor_pointer().hover((st) => st.bg(t.hover))
      .on_click((_e, cx) => { click(); cx.notify(); }).child(label);
    const pill = (id, label, click, danger = false) => div().id(id).h(26).px(12).rounded_full().flex().items_center().flex_none().text_size(12).border_1()
      .border_color(danger ? t.blocked : t.border).text_color(danger ? t.blocked : t.foreground).cursor_pointer().hover((st) => st.bg(t.hover))
      .on_click((_e, cx) => { click(); cx.notify(); }).child(label);
    const CELL = 84;
    const cell = (x) => {
      const on = x.slot === this.boxSel;
      return v_flex().id(`box-${x.slot}`).relative().w(CELL).h(92).flex_none().items_center().justify_center().gap(1)
        .rounded(8).border_1().border_color(on ? t.accent : "#00000000").bg(on ? t.selected : "#00000000")
        .cursor_pointer().hover((st) => st.bg(on ? t.selected : t.hover))
        .on_click((_e, cx) => { this.boxSel = on ? null : x.slot; this.releasing = null; this.bringing = null; this.renaming = null; cx.notify(); })
        .child(icon(x.pick, 48))
        .child(div().w_full().px(3).text_center().truncate().text_size(11).text_color(t.foreground).child(x.pick.nick ?? nameOf(x.pick.dex)))
        .child(div().w_full().px(3).text_center().truncate().text_size(10).text_color(x.tag ? t.accent : t.muted)
          .child(x.tag ? x.tag : `♥ ${heartsText(friendOf(x.pick))}`))
        .when(!!x.pick.shiny, (el) => el.child(div().absolute().top(3).left(5).text_size(11).child("✨")))
        .when(!!x.pick.caught, (el) => el.child(div().absolute().top(3).right(4).child(this.itemArt("poke-ball", 14))))
        .when(!!x.pick.held, (el) => el.child(div().absolute().top(22).right(4).child(this.itemArt(x.pick.held, 16))));
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
      const facts = [`♥ ${heartsText(friendOf(pick))}`, `${pick.jobs ?? 0} job${pick.jobs === 1 ? "" : "s"}`, nat ? `${nat.name}: ${nat.about}` : "", c.note, pick.stay ? "Everstone" : "",
        pick.caught ? `caught ${new Date(pick.caught).toLocaleDateString()}` : ""].filter(Boolean).join(" · ");
      return v_flex().gap(8)
        .child(h_flex().gap(12).items_center()
          .child(icon(pick, 48))
          .child(v_flex().flex_1().min_w(0).gap(2)
            .child(this.renaming === slot
              ? Input.new(this.nickInput).h(26).px(8).rounded(6).border_1().border_color(t.accent).bg(t.background).text_size(12.5).text_color(t.foreground)
              : div().text_size(13.5).font_semibold().text_color(t.foreground).truncate().child(`${pick.shiny ? "✨ " : ""}${nameFor(pick)}${tag ? ` · with ${tag}` : ""}`))
            .child(div().text_size(11.5).text_color(t.muted).truncate().child(facts))))
        .child(h_flex().gap(6).flex_wrap().items_center()
          .child(pill(`box-rename-${slot}`, this.renaming === slot ? "Cancel" : "Rename", () => {
            if (this.renaming === slot) { this.renaming = null; return; }
            this.renaming = slot;
            this.nickInput.set_value(pick.nick ?? "");
            this.nickInput.focus();
          }))
          .when(!!pick.held, (el) => el.child(pill(`box-take-${slot}`, `Take its ${ITEMS[pick.held].name}`, () => {
            const now = savedPicks()[slot];
            const r = now && takeHeld(now);
            if (!r) return;
            savePicks({ [slot]: r.pick });
            saveBag(addItem(bag(), r.back));
          })))
          .when(!tag && herd.length > 0, (el) => el.child(pill(`box-bring-${slot}`, this.bringing === slot ? "Cancel" : "Bring out", () => { this.bringing = this.bringing === slot ? null : slot; this.releasing = null; })))
          .when(!tag, (el) => el.child(pill(`box-release-${slot}`, sure ? "Sure? Release it" : "Release", () => {
            if (!sure) { this.releasing = slot; return; }
            const now = savedPicks()[slot];
            if (now?.held) saveBag(addItem(bag(), now.held));
            forgetPanes([slot]);
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
            .child(`${x.tag}: ${x.pick.shiny ? "✨ " : ""}${nameFor(x.pick)}`)))));
    };
    return v_flex().id("bag-box").flex_none().h(h).gap(8)
      .child(h_flex().flex_wrap().gap(6).items_center().flex_none()
        .child(Input.new(this.boxInput).w(150).h(26).px(8).rounded(6).border_1().border_color(t.border).bg(t.background).text_size(12).text_color(t.foreground))
        .children(FILTERS.map(([k, label, f]) => chip(`box-f-${k}`, `${label} ${everyone.filter(f).length}`, filter[0] === k, () => { this.boxFilter = k; }))))
      .child(div().id("box-grid").flex_1().min_h(0).p(6).rounded(10).bg(t.raised).overflow_y_scrollbar()
        .child(h_flex().flex_wrap().gap(6).children(shown.map(cell)))
        .when(!shown.length && everyone.length > 0, (el) => el.child(div().p(8).text_size(12).text_color(t.dim).child("None matches."))))
      .child(div().flex_none().min_h(96).p(12).rounded(10).bg(t.raised).child(detail()));
  }

  // An item's sprite in the Bag (its emoji till it's in).
  itemArt(id, size) {
    const art = ITEMS[id]?.art;
    return art && this.art?.[art] === "ready" ? image(artPath(art)).size(size).flex_none() : div().text_size(size * 0.7).child(ITEMS[id]?.icon ?? "");
  }

  // ---- the picker (opened as a dialog with props { picker, slot, current, tag }) ----

  initPicker(cx) {
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
    this.input.on("submit", () => {
      const { entries, total } = searchEntries(this.input.value(), 2, this.searchOnly());
      if (total === 1 && !this.locked(entries[0])) this.choose(entries[0]);
    });
    this.input.focus();
    cx.timer.after(300, () => this.input.focus());
    this.visible = searchEntries("", PICK_COLS * 6).entries; // what the list shows; updated as it scrolls
    this.pickX = 0; // the pointer's x over the list: which column a click was in
    this.sprites ??= {}; // the preview's animations (want / spriteFor)
    this.preview = null; // right-clicked in the list: { dex, form?, shiny }, shown in the card's place
    // The list's renderer can't start downloads; this picks up what scrolled into view.
    cx.timer.every(250, (cx) => this.fetchIcons(cx));
  }

  // The filter chips as searchEntries takes them: the ★ chip is the favourites' keys, read live.
  // Trainer mode (Settings): only what you caught, and the starters.
  searchOnly() {
    const { fav, ...rest } = this.only;
    const mine = settingsNow().trainer ? trainerKeys(pokedex()) : null;
    const keys = fav ? new Set(favs().filter((k) => !mine || mine.has(k))) : mine;
    return keys ? { ...rest, keys } : rest;
  }

  // A legendary not caught yet (and not opened in Settings): shown, but can't be chosen.
  locked(e) {
    return !e.form && isLocked(e.dex, pokedex(), settingsNow().legendsOpen);
  }

  // Icons for what the picker shows, downloaded on demand, a few at a time.
  fetchIcons(cx) {
    this.iconQueue = [...this.chainEntries().flat(), ...(this.preview ? this.lineOf(this.preview).flat() : []), ...this.visible].filter((e) => !this.icons[entryKey(e)]);
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
        cx.notify();
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

  chooseRandom(entries) {
    const p = props();
    const taken = new Set(Object.entries(savedPicks()).filter(([slot]) => slot !== p.slot).map(([, x]) => x.dex));
    const e = randomEntry(entries.filter((x) => !this.locked(x)), p.current, taken);
    if (e) this.choose(e, this.boxing ? { fresh: true } : {});
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
                .child(div().text_size(14).font_semibold().text_color(t.foreground).truncate().child(`${cur.shiny ? "✨ " : ""}${nameFor(cur)}`))
                .child(div().text_size(11).text_color(t.dim).child(`${dexNo(cur.dex)} · ${regionOf(cur) ?? ""}`)))
              // Hearts: red ones it has, grey ones to go (the emoji hearts draw all alike here).
              .child(h_flex().min_w(0).gap(1).items_center()
                .children(Array.from({ length: MAX_HEARTS }, (_, i) => div().flex_none().text_size(12.5).text_color(i < hearts ? HEART : t.border).child("♥")))
                .child(div().ml(8).min_w(0).truncate().text_size(11.5).text_color(t.muted).child(line ? `All ${nameOf(cur.dex)} so far: ${line}` : `No ${nameOf(cur.dex)} has finished a job yet`)))
              .child(h_flex().gap(8).items_center()
                .child(div().min_w(0).text_size(11.5).text_color(t.foreground).child(progress))
                .when(byJobs, (el) => el.child(
                  div().w(80).h(5).rounded_full().bg(t.border).overflow_hidden()
                    .child(div().h_full().w(80 * Math.min(1, (cur.jobs ?? 0) / EVOLVE_JOBS)).bg(t.accent))))),
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
              .on_click(() => { if (!isCur(e)) this.choose(e); })
              .child(icon(e, branchy ? 30 : 36))
              .when(!branchy, (el2) => el2.child(div().text_size(10.5).text_color(t.muted).child(fullName(e.dex, e.form))))),
          ])),
      ))
      .child(this.renderBagRow(cur, t));
  }

  // Shows `e` ({ dex, form? }) in the preview, loading its animations.
  showPreview(e, cx, shiny = false) {
    this.preview = { dex: e.dex, ...(e.form ? { form: e.form } : {}), shiny: shiny && hasShiny(e.dex, e.form) };
    this.want({ ...this.preview, mega: "off" }, cx);
    this.fetchIcons(cx);
    cx.notify();
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
    const STAGE_W = 150, STAGE_H = 104, GROUND = 88;
    const stage = (key, label) => {
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
        .child(div().text_size(10.5).text_color(t.muted).child(label));
    };
    const button = (id, label, on, click) => div()
      .id(id).h(26).px(10).rounded(6).flex().items_center().flex_none().text_size(12).border_1()
      .border_color(on ? t.accent : t.border).bg(on ? t.selected : "#00000000")
      .text_color(t.foreground).cursor_pointer().hover((st) => st.bg(t.hover))
      .on_click(click).child(label);
    return v_flex().gap(8).p(10).rounded(8).border_1().border_color(t.accent).flex_none()
      .child(h_flex().gap(10).items_center()
        .child(v_flex().flex_1().min_w(0).gap(2)
          .child(h_flex().gap(6).items_center()
            .child(div().text_size(14).font_semibold().text_color(t.foreground).truncate().child(`${pv.shiny ? "✨ " : ""}${fullName(pv.dex, pv.form)}`))
            .child(div().text_size(11).text_color(t.dim).child(`${dexNo(pv.dex)} · ${regionOf(pv) ?? ""}`)))
          .child(div().text_size(11.5).text_color(t.muted).child(this.locked(pv) ? "Legendary: catch one as it walks by (the day's Research calls one), or open them all in Settings."
            : hasShiny(pv.dex, pv.form) && !pv.form && shinyUnlocked(pokedex(), pv.dex) ? "You caught a shiny one: ✨ Shiny, then Choose, and it's shiny."
            : "Preview: right-click another to see it")))
        // Favourites are starred here (or on the card, for the one it is).
        .child((() => {
          const on = isFavorite(favs(), pv);
          return button("preview-fav", on ? "★ Favorite" : "☆ Favorite", on, (_e, cx) => { setFavs(toggleFavorite(favs(), pv.form ? { dex: pv.dex, form: pv.form } : { dex: pv.dex })); cx.notify(); });
        })())
        .when(hasShiny(pv.dex, pv.form), (el) => el.child(button("preview-shiny", "✨ Shiny", pv.shiny, (_e, cx) => this.showPreview(pv, cx, !pv.shiny))))
        .when(this.locked(pv), (el) => el.child(div().h(26).px(10).rounded(6).flex().items_center().flex_none().text_size(12).text_color(t.muted).border_1().border_color(t.border)
          .child("🔒 Catch one to use it")))
        .when(!this.locked(pv), (el) => el.child(button("preview-choose", `${this.boxing ? "Choose a new one" : "Choose"}${pv.shiny && shinyUnlocked(pokedex(), pv.dex) && !pv.form ? " ✨" : ""}`, false, () => {
          const e = { dex: pv.dex, ...(pv.form ? { form: pv.form } : {}) };
          const shiny = pv.shiny && !pv.form;
          this.preview = null;
          this.choose(e, { ...(this.boxing ? { fresh: true } : {}), shiny });
        })))
        .child(button("preview-close", "✕", false, (_e, cx) => { this.preview = null; cx.notify(); })))
      .when(inBox.length > 0, (el) => el.child(v_flex().gap(4)
        .child(div().text_size(11).text_color(t.muted).child(`In the Box (${inBox.length})`))
        .children(inBox.map(([slot, b]) => h_flex().gap(8).items_center().h(26)
          .child(div().flex_1().min_w(0).truncate().text_size(12).text_color(t.foreground)
            .child(`${b.shiny ? "✨ " : ""}${nameFor(b)} · ♥ ${heartsText(friendOf(b))} · ${b.jobs ?? 0} jobs`))
          .child(button(`bring-${slot}`, "Bring out", false, () => { this.preview = null; this.choose(pv, { slot }); }))))))
      .child(h_flex().gap(8).items_start()
        .child(stage("idleD", "Standing"))
        .child(stage("walkR", "Walking"))
        .child(stage("sleep", "Asleep")))
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
        const use = itemUse(cur, slot, id, { night });
        return div()
          .id(`use-${id}`).h(24).px(8).rounded(6).flex().items_center().flex_none().gap(4).text_size(11.5).border_1()
          .border_color(t.border).text_color(use ? t.foreground : t.dim)
          .when(!!use, (el) => el.cursor_pointer().hover((st) => st.bg(t.hover)).on_click((_e, cx) => {
            const r = useItem(this.livePick(), slot, id, { night: isNight() }, Date.now());
            if (!r) return;
            savePicks({ [slot]: r.pick });
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
    const narrowed = !!(this.filter.trim() || this.only.region || this.only.mega || this.only.fav);
    const favKeys = favs();
    const dexNow = pokedex();
    // A small toggle: the filter row's chips.
    const chip = (id, label, on, flip) => div()
      .id(id).h(22).px(6).rounded(5).flex().items_center().flex_none().text_size(11).border_1()
      .border_color(on ? t.accent : t.border)
      .bg(on ? t.selected : "#00000000")
      .text_color(on ? t.foreground : t.muted).cursor_pointer().hover((st) => st.bg(t.hover))
      .on_click((_e, cx) => { flip(); this.fetchIcons(cx); cx.notify(); })
      .child(label);
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
                .on_click(() => this.chooseRandom(all))
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
          .children([["off", "Off"], ["on", "On"], ["auto", "Auto: while working"]].map(([mode, txt]) => div()
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
      // Filters, on top of the search: species that can Mega Evolve, and one region (click again: all).
      .child(
        h_flex().gap(4).items_center().flex_none()
          .child(chip("only-fav", favKeys.length ? `★ ${favKeys.length}` : "★", !!this.only.fav, () => { this.only = { ...this.only, fav: !this.only.fav }; }))
          .child(chip("only-mega", "Mega", !!this.only.mega, () => { this.only = { ...this.only, mega: !this.only.mega }; }))
          .child(div().w(1).h(14).mx(3).bg(t.border))
          .children(REGIONS.map((r) => chip(`only-${r}`, r, this.only.region === r, () => {
            this.only = { ...this.only, region: this.only.region === r ? undefined : r };
          }))),
      )
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
                  .child(this.icons[entryKey(e)] === "ready" ? image(iconPath(e.dex, e.form)).size(56).flex_none() : div().size(56).flex_none())
                  .child(div().text_size(9.5).text_color(t.dim).child(dexNo(e.dex)))
                  .child(div().w_full().px(2).text_center().truncate().text_size(11).text_color(t.foreground).child(fullName(e.dex, e.form)))
                  .when(isFavorite(favKeys, e), (el) => el.child(div().absolute().top(4).right(6).text_size(12).text_color("#f2c94c").child("★")))
                  .when(this.locked(e), (el) => el.opacity(0.4).child(div().absolute().top(4).left(6).text_size(11).child("🔒")))
                  .when(!this.locked(e) && !e.form && shinyUnlocked(dexNow, e.dex), (el) => el.child(div().absolute().top(4).left(6).text_size(11).child("✨")));
              })));
            }
            return rows;
          }).size_full().cursor_pointer()
          // Right-click: a preview of that one (how it stands, walks and sleeps) in the card's place.
          .on_item_secondary_click((key, _e, cx) => {
            const col = Math.floor(this.pickX / (PICK_W + PICK_GAP));
            const e = all[Number(key.slice(1)) * PICK_COLS + col];
            if (col >= 0 && col < PICK_COLS && e) this.showPreview(e, cx);
          })
          .on_item_click((key, cx) => {
            const col = Math.floor(this.pickX / (PICK_W + PICK_GAP));
            const e = all[Number(key.slice(1)) * PICK_COLS + col];
            if (!(col >= 0 && col < PICK_COLS && e)) return;
            if (this.locked(e)) { this.showPreview(e, cx); return; } // why it can't be chosen
            this.choose(e, this.boxing ? { fresh: true } : {});
          }))
          .child(Scrollbar.vertical("picks").absolute().inset_0()),
      )
      .when(all.length === 0, (el) => el.child(div().text_size(11.5).text_color(t.muted).child(this.only.region || this.only.mega ? "No Pokémon matches the search and filters." : settingsNow().trainer ? "None you caught by that name. Catch wild ones as they walk by (Trainer mode, Settings)." : "No Pokémon by that name or number.")));
  }
}

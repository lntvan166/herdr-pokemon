// pokemon-herd: every agent is a pixel-art Pokémon roaming a strip (or several rows of one).
// Working ones walk around, idle ones stroll and nap, blocked ones stop and call for you; they
// react when their agent changes or you focus it. Click one to go to its agent; right-click to
// choose which Pokémon it is.
import { View, div, image } from "gpui-kit";
import { h_flex, v_flex, InputState, Input, v_virtual_list, Scrollbar } from "gpui-base";
import { agents, spaces, theme, settings, run, props, shared, setShared, openOverlay, closeOverlay, nextCommand, layout, playSound, terminals, setAgentOrder } from "herdr";
import { placesIn, placeOf, placeBlock, rowsOf, blockProps, hiddenAlong, setRows, setBlockProps, partyPlace, placeParty, swapAgents, unswapAgents, agentsSwapped, hasAgentsList, usesMod, toastMod, setToast } from "./place.js";
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
import { loadPicks, assign, randomEntry, gainJob, EVOLVE_JOBS, MAX_HEARTS, withHearts, itemUse, useItem, needsText, evolveNeeds, takeHeld, HELD_IDS, familyOf, youngOf, subAgents, cardOf, withFriend, friendOf, FRIEND, FRIEND_MAX, fromFolders, electLeader, boxList, raised, rivalsOf, agentOfToast, switchedPick, trimPanes, fromBox, boxOnSwitch, nameFor, cleanNick, sessionUsed, sayingOf, TIRED_AT, heartsText, holdersOf, visitorPick, expShareTarget } from "./picks.js";
import { ITEMS, STONES, loadBag, addItem, mark, pickup, pickupDelay, CANDY_JOB_MS, shinyOdds, badges, CHARM_JOBS, CHARM_ART, itemAbout, takersOf, badgeGifts, badgeProgress, nextBadge } from "./items.js";
import { forEachSafe, logOnce } from "./safe.js";
import { layoutTags } from "./tags.js";
import { restSpot, roomAt, campSeats } from "./rest.js";
import { wrapRow, exitX, entryX, wrapOk, clearWalk } from "./wrap.js";
import { focusEdge, onFocus, onStatus, onSeason, onSpar, sparPair, onCombo, COMBO_GAP, onStir, sleepAfter, effectiveMood, pose, megaShown } from "./react.js";
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
const HONEY_KEY = `${MOD}-honey`; // when Honey was last used (the strip calls a visitor over)
const VISIT_SPEED = 45; // px per second
const SPAR_CHANCE = 1 / 240;
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
  const pool = loadSettings(shared(SETTINGS_KEY)).newFrom === "favorites" ? favoriteEntries(favs()) : null;
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
// One pane's saved Pokémon, changed by f (null: leave it). Returns the new one.
function updatePick(slot, f) {
  const cur = slot && savedPicks()[slot];
  const next = cur && f(cur);
  if (!next) return null;
  savePicks({ [slot]: next });
  if ((next.hearts ?? 0) >= MAX_HEARTS && !bag().marks.fullHearts) saveBag(mark(bag(), { fullHearts: true }));
  return next;
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
const openBag = () => openOverlay({ mod: MOD, kind: "dialog", width: 600, height: 672, props: { bag: true } });

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
    m.x = m.target = m.from = clamp(e.local_position.x / z, EDGE, Math.max(EDGE, this.width - EDGE));
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
    cx.notify();
  }

  // Its agent changed status: the work it did goes to its species' stats, and a finished job
  // to its pane's count towards evolving (sub-agents' Pokémon don't evolve).
  count(a, pick, m, next, now) {
    const c = statusChange(m.run, m.status, next, now);
    m.run = c.run;
    if (!this.leader) return; // another strip counts
    if (pick && (c.ms || c.job)) setShared(STATS_KEY, record(stats(), pick.dex, c));
    if (!c.job) return;
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
    const on = settingsNow().sidebar;
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
    if (!v && now >= this.visitAt) {
      const pick = visitorPick(new Set(Object.values(ids).map((p) => p.dex)));
      const dir = (Math.random() < 0.5 ? "r" : "l");
      const [from, to] = dir === "r" ? [-OFF, this.width + OFF] : [this.width + OFF, -OFF];
      // `id`: its own, for every element drawn for it (a second visitor under the first one's ids
      // kept that one's picture: only its 🎁 showed).
      v = this.visitor = { id: `${now}-${pick.dex}`, pick, dir, row: g ? Math.floor(Math.random() * g.rows) : 0, from, to, start: 0, dur: (Math.abs(to - from) / VISIT_SPEED) * 1000, asked: now };
      this.want(pick, cx);
    }
    if (!v) return false;
    const meta = this.spriteFor(v.pick, "idle");
    if (!v.start) {
      // It sets off once its sprite is in; one that can't be had in a minute doesn't come.
      // A moment after its sprite is in, so the picture is up when it shows.
      if (meta?.walkR) { v.ready ??= now; if (now - v.ready >= 500) v.start = now; }
      else if (now - v.asked > 60000) { this.visitor = null; this.visitAt = next(); }
      return false;
    }
    const f = (now - v.start) / v.dur;
    if (f >= 1) { this.visitor = null; this.visitAt = this.honeyNext ? now : next(); this.honeyNext = false; return true; }
    v.x = v.from + (v.to - v.from) * f;
    // Idle ones on its row, standing within 220 px, turn to watch it.
    list.forEach((a, i) => {
      const m = this.mons[a.address];
      const row = g ? Math.min(m?.row ?? i % g.rows, g.rows - 1) : 0;
      if (m && !m.moving && m.mood === "idle" && row === v.row && Math.abs(m.x - v.x) < 220) m.dir = v.x > m.x ? "r" : "l";
    });
    return true;
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
    const showGift = (!v.gift && Date.now() - v.start > 1000) || (v.gift && Date.now() - v.giftAt < 4000);
    // It walks as the herd does: drawn first where it sets off, then sent to the far edge under one
    // transition lasting the rest of its walk. A short transition re-aimed every tick drew nothing
    // at all, or only its 🎁 (a lone gift crossing the sky).
    const now = Date.now();
    const placed = v.walkFrom !== undefined;
    v.walkFrom ??= now;
    const left = placed ? v.to : v.from;
    root.child(div().id(`visitor-${v.id}`).absolute().top(0).h(ground + 10).w(sw).left(left - mid)
      .transition("left", { duration: Math.max(1, Math.round(v.dur - (v.walkFrom - v.start))), easing: "linear" })
      .child(div()
        .child(div().absolute().left(mid - shadowW / 2).top(ground - 2 * scale).w(shadowW).h(6 * scale).rounded_full().bg("#00000030"))
        .child(image(s.path).absolute().left(imgLeft).top(imgTop).w(s.w * scale).h(s.h * scale)))
      // Hover: what it is; a click: it leaves you something for the Bag (as Pickup finds things), once.
      .child(div().id(`visitor-hit-${v.id}`).absolute().left(hit.left).top(hit.top).w(hit.w).h(hit.h).cursor_pointer()
        .on_hover((h, cx) => { this.visitorHover = h; cx.notify(); })
        .on_click((_e, cx) => {
          if (v.gift) return;
          v.gift = pickup();
          v.giftAt = Date.now();
          saveBag(addItem(bag(), v.gift));
          cx.notify();
        }))
      // Every visitor carries a gift: 🎁 over its head, pulsing, until you click it; then what it left.
      .when(showGift, (el) => el.child(div().absolute().left(mid - 8).top(Math.max(2, headY - 18)).text_size(13)
        .when(!v.gift, (e2) => e2.loop("opacity", { from: 0.45, to: 1, period: 800 }))
        .child(v.gift ? this.itemMark(v.gift, 18) : "🎁"))));
    if (this.visitorHover) {
      const tagW = 230;
      root.child(div().absolute().left(Math.max(4, Math.min(this.width - tagW - 10, v.x - tagW / 2))).top(ground + 6).w(tagW).h(LABEL_H)
        .flex().items_center().justify_center().rounded(4).bg(t.chrome).text_size(10.5).text_color(t.foreground)
        .child(`A wild ${v.pick.shiny ? "✨ " : ""}${fullName(v.pick.dex, v.pick.form)}${v.gift ? ` left you ${ITEMS[v.gift].name.startsWith("A") || ITEMS[v.gift].name.startsWith("O") ? "an" : "a"} ${ITEMS[v.gift].name}` : ": click it"}`));
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
        }
      } else if (now - m.blockedAt < QUICK_MS && now - (petAt[a.pane] ?? 0) > PET_MS / 3) {
        petAt[a.pane] = now;
        if (updatePick(a.pane, (p) => withFriend(p, FRIEND.quick))) this.note(m, "💗", now);
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
      const raw = moodOf(a, tabs, now, after);
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
          m.pauseUntil = m.shuffle ? now + 5000 : family[a.address] ? now + rand(600, 1500) : now + (mood === "working" ? rand(300, 1800) : rand(4000, 12000));
          m.shuffle = false;
          changed = true;
        } else if ((mood !== "working" && mood !== "idle" && !m.shuffle) || reacting) {
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
          walk(m, target, SPEED[mood]);
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
    if (settingsNow().spar && Math.random() < SPAR_CHANCE) {
      const ready = list.filter((a) => {
        const m = this.mons[a.address];
        return m && m.mood === "idle" && !m.moving && !(m.react && now < m.react.until);
      });
      const pair = sparPair(ready.map((a) => ({ a, addr: a.address, x: this.mons[a.address].x, row: rowAt(a, list.indexOf(a)), lastSpar: this.mons[a.address].lastSpar })), now);
      if (pair) {
        pair.forEach(({ a }, k) => {
          const m = this.mons[a.address];
          const meta = this.spriteFor(ids[a.address], a.status);
          const has = new Set(Object.keys(meta?.react ?? {}));
          onSpar(m, pair[1 - k].x, now, has, (name) => meta.react[name].ms, k === 0 ? "💥" : null);
          m.pauseUntil = m.react.until + rand(2000, 5000);
          if (this.leader) updatePick(a.pane, (p) => withFriend(p, FRIEND.spar));
        });
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
    openOverlay({ mod: MOD, kind: "popup", width: 236, height: update ? 132 : 76, props: { menu: true, update } });
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
      .child(row("open-bag", "Bag", `${n} item${n === 1 ? "" : "s"} · ${got}/8 badges`, openBag))
      .child(row("open-settings", "Settings", "", () => openSettings(props()?.update)))
      // A newer release: an installed copy never updates by itself.
      .when(!!props()?.update, (el) => el
        .child(div().h(4))
        .child(div().px(8).text_size(11).text_color(t.dim).child(`Update: ${props().update} (you have ${VERSION})`))
        .child(div().px(8).text_size(11.5).text_color(t.muted)
          .child(`Delete mods/${MOD} and add github.com/${REPO} again. Your Pokémon are kept.`)));
  }

  initSettings(cx) {
    this.updating = null; // null | "running" | "done" | an error message
    this.sidebar = null; // Better Sidebar: "missing" | "patched" | "unpatched" (null: checking)
    this.patching = null; // null | "running" | an error message
    cx.spawn(async (cx) => {
      this.sidebar = await sidebarState().catch(() => "missing");
      cx.notify();
    });
  }

  // Agent cards: Off, Sidebar or Right panel. Undoes whatever there was, then: in the sidebar,
  // the Agents list drawn as cards when the layout has one, else Better Sidebar's rows (patched
  // if need be), else a Party panel there; or a Party panel in the right panel.
  setCards(v, tree, betterHere) {
    let next = placeParty(unswapAgents(tree), MOD, null);
    let better = false;
    if (v === "sidebar") {
      if (hasAgentsList(next)) next = swapAgents(next, MOD);
      else if (betterHere) better = true;
      else next = placeParty(next, MOD, "sidebar") ?? next;
    } else if (v === "panel") next = placeParty(next, MOD, "panel") ?? next;
    if (settingsNow().sidebar !== better) setSetting("sidebar", better);
    if (better && this.sidebar === "unpatched") {
      this.patching = "running";
      patchSidebar().then(async () => { this.patching = null; this.sidebar = await sidebarState(); }).catch((e) => { this.patching = String(e?.message ?? e); });
    }
    if (JSON.stringify(next) !== JSON.stringify(tree)) run("layout.set", { layout: next });
  }

  // The Settings dialog: where the strip sits and how, sounds, and which of the games' mechanics
  // are on. Every change applies at once; it stays open (Esc closes it).
  renderSettings() {
    const t = theme();
    const st = settingsNow();
    const tree = layout();
    const name = shared("layout");
    const shipped = ["main", "terminals", "win98"].includes(name);
    const have = placesIn(tree);
    const place = placeOf(tree, MOD);
    const rows = rowsOf(tree, MOD);
    const inLayout = !!setRows(tree, MOD, rows, 0);
    const movable = inLayout && !shipped;
    const background = blockProps(tree, MOD).background === "plain" ? "plain" : "scenery";
    const NAMES = { sidebar: "Sidebar", bottom: "Bottom", panel: "Right panel" };
    // Agent cards: where they are now. In the sidebar: the Agents list drawn as cards, the
    // Party panel there, or Better Sidebar's own rows (patched); or the Party panel in the right panel.
    const betterHere = usesMod(tree, "better-sidebar");
    const party = partyPlace(tree);
    const cardsNow = agentsSwapped(tree) || party === "sidebar" || (st.sidebar && betterHere) ? "sidebar" : party === "panel" ? "panel" : "off";
    const cardsNote = cardsNow === "sidebar" && agentsSwapped(tree) ? "The sidebar's Agents list, as cards."
      : cardsNow === "sidebar" && betterHere ? (this.sidebar === "patched" ? "Better Sidebar's rows, as cards." : "Better Sidebar's rows: needs its patch (Updates).")
      : cardsNow === "sidebar" ? "A Party list in the sidebar."
      : cardsNow === "panel" ? "A Party list in the right panel."
      : "The agent's name large, its status as the card's edge, its Pokémon and hearts.";
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
    // An on/off switch.
    const toggle = (key) => {
      const on = st[key];
      return div().id(`set-${key}`).w(34).h(20).rounded_full().flex_none().relative().cursor_pointer()
        .bg(on ? t.accent : t.border)
        .on_click((_e, cx) => { setSetting(key, !on); cx.notify(); })
        .child(div().absolute().top(2).left(on ? 16 : 2).size(16).rounded_full().bg(on ? t.accent_foreground : t.foreground));
    };
    // A pill; ink on paper when it can be pressed, dim when not.
    const button = (id, txt, enabled, onPress) => div().id(id).h(26).px(12).rounded_full().flex().items_center().flex_none()
      .text_size(12).font_semibold()
      .bg(enabled ? t.solid : t.border).text_color(enabled ? t.solid_foreground : t.dim)
      .when(enabled, (el) => el.cursor_pointer().on_click((_e, cx) => { onPress(cx); cx.notify(); }))
      .child(txt);
    const panel = (...kids) => v_flex().px(14).py(4).rounded(10).bg(t.raised).children(kids);
    const herd = agents();
    const focused = herd.find((a) => a.focused) ?? herd[0];
    const sample = focused ? assignAll(herd).ids[focused.address] : { dex: 25 };

    // The title stays; everything under it scrolls (a short window shows it all, a step at a time).
    return v_flex().id("pokemon-settings").size_full().min_h(0).pt(18).bg(t.popover)
      .child(h_flex().px(18).pb(8).justify_between().items_center().flex_none()
        .child(div().text_size(15).font_semibold().text_color(t.foreground).child("Settings"))
        .child(div().text_size(11).text_color(t.dim).child("Esc")))
      .child(v_flex().id("settings-body").flex_1().min_h(0).overflow_y_scrollbar().px(18).pb(18).gap(8)
      .child(heading("Strip"))
      .child(panel(
        line("Place", shipped ? `"${name}" is a built-in layout: clone it to move things.` : null,
          choices("place", ["sidebar", "bottom", "panel"].map((p) => [p, NAMES[p]]), place, (p) => have.includes(p) && !shipped, (p) => this.applyLayout(p, rows, false))),
        line("Size", null, choices("size", SIZES, scaleIn(blockProps(tree, MOD)), () => movable, (v) => this.applySize(v))),
        line("Rows", null, choices("rows", [[1, "1"], [2, "2"], [3, "3"]], rows, () => movable, (n) => this.applyLayout(place, n, false))),
        line("Sky", "Muted sits quietly in a dark app; Bright is a real day, a sunset, and the sun.",
          choices("sky", [["muted", "Muted"], ["bright", "Bright"]], blockProps(tree, MOD).sky === "bright" ? "bright" : "muted",
            () => movable && background === "scenery", (v) => {
              const next = setBlockProps(layout(), MOD, { sky: v });
              if (next) run("layout.set", { layout: next });
            })),
        line("Background", null, choices("bg", [["plain", "Plain"], ["scenery", "Scenery"]], background, () => movable, (v) => {
          const next = setBlockProps(layout(), MOD, { background: v });
          if (next) run("layout.set", { layout: next });
        })),
      ))
      .child(heading("Agent cards"))
      .child(panel(
        // A built-in layout can't be changed: one click makes a copy of it, shown at once.
        ...(shipped ? [line("Make this layout yours", `"${name}" is built in. A copy you own can hold the cards and move the strip.`,
          button("clone-layout", "Make it mine", true, () => run("layout.clone", { name })))] : []),
        line("Show each agent as its Pokémon's card", cardsNote,
          choices("cards", [["off", "Off"], ["sidebar", "Sidebar"], ["panel", "Right panel"]], cardsNow,
            (v) => !shipped && (v === "off" || (v === "sidebar" ? hasAgentsList(tree) || betterHere || have.includes("sidebar") : have.includes("panel"))),
            (v) => this.setCards(v, tree, betterHere))),
      ))
      .child(heading("Sounds and notifications"))
      .child(panel(
        line("Pokémon in notifications", shipped ? `Needs a layout of your own (Make it mine, above).` : "An agent's notification leads with its Pokémon.",
          (() => {
            const on = toastMod(tree) === MOD;
            return div().id("set-toast").w(34).h(20).rounded_full().flex_none().relative()
              .bg(on ? t.accent : t.border).opacity(shipped ? 0.4 : 1)
              .when(!shipped, (el) => el.cursor_pointer().on_click((_e, cx) => { run("layout.set", { layout: setToast(layout(), on ? null : MOD) }); cx.notify(); }))
              .child(div().absolute().top(2).left(on ? 16 : 2).size(16).rounded_full().bg(on ? t.accent_foreground : t.foreground));
          })()),
        line("Cry when an agent needs you", null, toggle("cryBlocked")),
        line("Cry when an agent finishes", "Herdr's own sound plays too; it can be turned off in Herdr's settings.", toggle("cryDone")),
        line("Hear one", `${fullName(sample.dex)}'s cry`, div().id("cry-test").h(26).px(12).rounded_full().flex().items_center().flex_none()
          .bg(t.solid).text_color(t.solid_foreground).text_size(12).font_semibold().cursor_pointer()
          .on_click(() => { lastCry = 0; cry(sample.dex); })
          .child("Play")),
      ))
      .child(heading("Gameplay"))
      .child(panel(
        line("Evolution", "Pokémon evolve as their agents work. Off: jobs still count.", toggle("evolve")),
        line("Pickup", "Idle Pokémon find Berries, stones and Rare Candy.", toggle("pickup")),
        line("Weather", "Rain while agents wait on you; a storm when they wait long.", toggle("weather")),
        line("Sparring", "Two idle Pokémon spar now and then, and like each other more.", toggle("spar")),
        line("Sub-agents", "A sub-agent is its agent's Pokémon, younger, and follows it.", toggle("family")),
        line("New agents' Pokémon", st.newFrom === "favorites" && !favs().length ? "No favourites yet: Edit ★ in the picker, then click the ones you like." : "Any species, or one of your favourites (★ in the picker).",
          choices("new-from", [["any", "Any"], ["favorites", "Favorites"]], st.newFrom, () => true, (v) => setSetting("newFrom", v))),
        line("Campfire", "At night, with every agent resting, the herd sleeps round a fire.", toggle("campfire")),
        line("Visitors", "A wild Pokémon walks across, and the herd watches it go by. Rare: every 10–25 min; Often: 3–8; Lots: 1–3.",
          choices("visitors", [["off", "Off"], ["rare", "Rare"], ["often", "Often"], ["lots", "Lots"]], st.visitors, () => true, (v) => setSetting("visitors", v))),
        line("Tired near the limit", "With Usage Limits: from 90% of the 5-hour window the herd sweats and walks slower.", toggle("tired")),
      ))
      .child(heading("Updates"))
      .child(panel(
        line("Pokémon herd", this.updating === "running" ? "Downloading…"
          : this.updating === "done" ? `Updated ${(this.updated ?? []).map((u) => `mods/${u.dir.split("/").pop()} to ${u.version}`).join(", ")}. It reloads by itself; if this still says ${VERSION}, restart Herdr.`
          : this.updating ? `Couldn't update: ${this.updating}`
          : props()?.update ? `${props().update} is out; you have ${VERSION}. Your Pokémon, Bag and badges stay.`
          : `${VERSION}, the latest (checked once a day).`,
          button("update-now", "Update now", !!props()?.update && this.updating !== "running" && this.updating !== "done", (cx) => {
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
        line("Cards in Better Sidebar", this.sidebar === null ? "Checking…"
          : this.sidebar === "missing" ? "Better Sidebar isn't installed."
          : this.sidebar === "patched" ? "Patched: each agent shows as its Pokémon's card."
          : this.patching && this.patching !== "running" ? `Couldn't patch: ${this.patching}`
          : "Not patched (a reinstall of Better Sidebar undoes it).",
          button("patch-sidebar", "Patch", this.sidebar === "unpatched" && this.patching !== "running", (cx) => {
            this.patching = "running";
            cx.spawn(async (cx) => {
              try { await patchSidebar(); this.patching = null; this.sidebar = await sidebarState(); } catch (e) { this.patching = String(e?.message ?? e); }
              cx.notify();
            });
          })),
      )));
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
      // Hovered: its species' stats too ("Pikachu · api · 128 done · 14h 20m").
      const line = full ? statLine(stats().species[pick.dex]) : "";
      const hearts = full && pick.hearts ? ` · ♥${pick.hearts}` : "";
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
        const s = (p.sprite === "react" ? meta.react?.[p.anim] : meta[p.sprite]) ?? meta.idleR;
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
            if (mm) this.note(mm, "💗", now2, 3000);
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
          .left(x - sw / 2)
          .transition("left", { duration: Math.max(1, Math.round(m.moving ? m.dur : m.dur || 150)), easing: "linear" })
          .child(body)
          .child(interact(div().absolute().left(hit.left).top(hit.top).w(hit.w).h(hit.h), `hit-${a.address}`))
          .when(!!bubble, (el) =>
            el.child(h_flex().absolute().left(0).w(sw).top(Math.max(2, headY - 22)).justify_center().text_size(12.5).child(bubble)))
          // Reacting to the season: its icon (🌸 ☀️ 🍂 ❄️) beside its head.
          .when(!!m.react?.icon && now < m.react.until, (el) =>
            el.child(div().absolute().left(sw / 2 + 8).top(Math.max(2, headY - 12)).text_size(12)
              .loop("opacity", { from: 0.5, to: 1, period: 700 }).child(m.react.icon)))
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
    this.bagTab = props()?.tab === "box" ? "box" : "items";
    // Renaming one in the Box: its slot, and the field (Enter saves; empty clears the name).
    this.renaming = null;
    this.nickInput = InputState.new({ placeholder: "Nickname (16 letters)" });
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
    const LIST_H = ids.length * 26 + 8; // the items list; the panel beside it is held to the same height
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
    };
    const shown = all.find((x) => x.id === this.badgeHover);
    const charm = s.jobs >= CHARM_JOBS;

    return v_flex().id("pokemon-bag").size_full().min_h(0).p(18).gap(14).bg(t.popover)
      // Title row: the name, the finding under it; the trainer's totals at the right.
      .child(h_flex().items_start().justify_between().gap(12).flex_none()
        .child(v_flex().min_w(0).gap(3)
          // Items | Box: what's in the Bag, or the Pokémon raised whose agents are gone.
          .child(h_flex().gap(14).items_center().children([["items", "Bag"], ["box", `Box ${boxed.length}`]].map(([k, txt]) => div()
            .id(`bag-tab-${k}`).text_size(15).cursor_pointer()
            .when(tab === k, (el) => el.font_semibold().text_color(t.foreground))
            .when(tab !== k, (el) => el.text_color(t.dim).hover((st) => st.text_color(t.muted)))
            .on_click((_e, cx) => { this.bagTab = k; this.releasing = null; cx.notify(); })
            .child(txt))))
          .child(div().text_size(12).text_color(first ? t.foreground : t.muted).truncate().child(finding)))
        .child(v_flex().gap(3).items_end().flex_none()
          .child(h_flex().gap(12).items_center()
            .child(div().text_size(11.5).text_color(t.muted).child(`${s.jobs} jobs · ${duration(s.ms)} worked`))
            .child(div().text_size(11).text_color(t.dim).child("Esc")))
          // Who did the most: the three species with the most jobs.
          .when(s.top.length > 0, (el) => el.child(div().text_size(11.5).text_color(t.muted)
            .child(`Most jobs: ${s.top.map((x) => `${nameOf(x.dex)} ${x.jobs}`).join(" · ")}`)))))
      .when(tab === "box", (el) => el.child(this.renderBox(boxed, LIST_H, t, icon, herd)))
      .when(tab !== "box", (el) => el.child(h_flex().flex_none().h(LIST_H).gap(12).items_stretch()
        // Items: every one, in the Bag's order.
        .child(v_flex().w(218).flex_none().p(4).gap(0).rounded(10).bg(t.raised)
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
          // An item to use (Honey): one button, no Pokémon to choose.
          .when(ITEMS[sel].kind === "use", (el) => {
            const off = settingsNow().visitors === "off";
            return el.child(div().h(2)).child(h_flex().gap(10).items_center()
              .child((() => {
                const on = !!b.items[sel] && !off;
                return div().id("use-honey").h(26).px(14).rounded_full().flex().items_center().flex_none()
                  .text_size(12).font_semibold().bg(on ? t.solid : t.border).text_color(on ? t.solid_foreground : t.dim)
                  .when(on, (e2) => e2.cursor_pointer().on_click((_e, cx) => {
                    saveBag(addItem(bag(), sel, -1));
                    setShared(HONEY_KEY, Date.now());
                    cx.notify();
                  }))
                  .child("Call one now");
              })())
              .child(div().text_size(11.5).text_color(t.dim)
                .child(off ? "Visitors are off (Settings)." : !b.items[sel] ? "None in the Bag yet." : "It walks across within a few seconds.")));
          })
          .when(ITEMS[sel].kind !== "use", (el) => el.child(div().h(2))
          .child(div().text_size(11.5).text_color(t.muted).child("On screen")))
          .when(ITEMS[sel].kind !== "use" && !(b.items[sel] ?? 0) && !held.length, (el) => el.child(div().text_size(12).text_color(t.dim)
            .child(sel === "rare-candy" ? "None yet. A job over 30 minutes earns one; idle Pokémon sometimes find one."
              : "None yet. Idle Pokémon find these now and then.")))
          .when(ITEMS[sel].kind !== "use" && !!b.items[sel] && !takers[sel].length, (el) => el.child(div().text_size(12).text_color(t.dim)
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

  // The Bag's Box tab: each raised Pokémon whose agent is gone (the latest first), its hearts and
  // how close it is to evolving, what it holds (Take: back into the Bag), and Release (twice: it
  // asks "Sure?"; what it held goes back into the Bag). An agent that gets its species takes it.
  renderBox(boxed, h, t, icon, herd = []) {
    // `tag`: the agent it's with (on screen: no Release, it's in use); none: waiting in the Box.
    const row = ({ slot, pick, tag }) => {
      const c = cardOf(pick);
      const sure = this.releasing === slot;
      return h_flex().id(`box-${slot}`).h(46).px(10).gap(10).items_center().flex_none().rounded(8).hover((st) => st.bg(t.hover))
        .child(icon(pick, 34))
        .child(v_flex().flex_1().min_w(0).gap(1)
          .child(this.renaming === slot
            ? Input.new(this.nickInput).h(24).px(8).rounded(6).border_1().border_color(t.accent).bg(t.background).text_size(12).text_color(t.foreground)
            : div().text_size(12.5).text_color(t.foreground).truncate().child(`${pick.shiny ? "✨ " : ""}${nameFor(pick)}${tag ? ` · ${tag}` : ""}`))
          .child(div().text_size(11).text_color(t.muted).truncate()
            .child([`♥ ${heartsText(friendOf(pick))}`, c.note, pick.stay ? "Everstone" : ""].filter(Boolean).join(" · "))))
        .when(!!pick.held, (el) => el.child(h_flex().gap(6).items_center().flex_none()
          .child(this.itemArt(pick.held, 20))
          .child(div().id(`box-take-${slot}`).h(24).px(10).rounded_full().flex().items_center().text_size(11.5).border_1()
            .border_color(t.border).text_color(t.foreground).cursor_pointer().hover((st) => st.bg(t.hover))
            .on_click((_e, cx) => {
              const now = savedPicks()[slot];
              const r = now && takeHeld(now);
              if (!r) return;
              savePicks({ [slot]: r.pick });
              saveBag(addItem(bag(), r.back));
              cx.notify();
            })
            .child("Take"))))
        // Rename: a field in place of its name; Enter saves (empty: no nickname).
        .child(div().id(`box-rename-${slot}`).h(24).px(10).rounded_full().flex().items_center().flex_none().text_size(11.5).border_1()
          .border_color(t.border).text_color(t.muted).cursor_pointer().hover((st) => st.bg(t.hover))
          .on_click((_e, cx) => {
            if (this.renaming === slot) { this.renaming = null; cx.notify(); return; }
            this.renaming = slot;
            this.nickInput.set_value(pick.nick ?? "");
            this.nickInput.focus();
            cx.notify();
          })
          .child(this.renaming === slot ? "Cancel" : "Rename"))
        .when(!tag, (el) => el.child(div().id(`box-release-${slot}`).h(24).px(10).rounded_full().flex().items_center().flex_none().text_size(11.5).border_1()
          .border_color(sure ? t.blocked : t.border).text_color(sure ? t.blocked : t.muted).cursor_pointer().hover((st) => st.bg(t.hover))
          .on_click((_e, cx) => {
            if (!sure) { this.releasing = slot; cx.notify(); return; }
            const now = savedPicks()[slot];
            if (now?.held) saveBag(addItem(bag(), now.held));
            forgetPanes([slot]);
            this.releasing = null;
            cx.notify();
          })
          .child(sure ? "Sure?" : "Release")));
    };
    // With agents now: the raised ones on screen, to see the whole herd in one place.
    const active = herd.filter((x) => raised(x.pick)).map((x) => ({ slot: x.slot, pick: x.pick, tag: x.tag }));
    const head = (txt) => div().px(10).pt(6).pb(2).text_size(11.5).text_color(t.muted).child(txt);
    return v_flex().id("bag-box").flex_none().h(h).p(6).gap(2).rounded(10).bg(t.raised).overflow_y_scrollbar()
      .when(active.length > 0, (el) => el.child(head(`With agents ${active.length}`)).children(active.map(row)))
      .child(head(`Waiting ${boxed.length}`))
      .when(!boxed.length, (el) => el.child(div().px(10).py(6).text_size(12).text_color(t.dim)
        .child("None. Close an agent whose Pokémon you raised (hearts, jobs, an item), or pick another for it, and it waits here for the next agent to get its species.")))
      .children(boxed.map(row));
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
      if (total === 1) this.choose(entries[0]);
    });
    this.input.focus();
    cx.timer.after(300, () => this.input.focus());
    this.visible = searchEntries("", PICK_COLS * 6).entries; // what the list shows; updated as it scrolls
    this.pickX = 0; // the pointer's x over the list: which column a click was in
    // The list's renderer can't start downloads; this picks up what scrolled into view.
    cx.timer.every(250, (cx) => this.fetchIcons(cx));
  }

  // The filter chips as searchEntries takes them: the ★ chip is the favourites' keys, read live.
  searchOnly() {
    const { fav, ...rest } = this.only;
    return fav ? { ...rest, keys: new Set(favs()) } : rest;
  }

  // Icons for what the picker shows, downloaded on demand, a few at a time.
  fetchIcons(cx) {
    this.iconQueue = [...this.chainEntries().flat(), ...this.visible].filter((e) => !this.icons[entryKey(e)]);
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
    const cur = this.livePick();
    if (!cur?.dex) return [];
    const label = cur.form && formsOf(cur.dex).find((f) => f.form === cur.form)?.label;
    return chainOf(cur.dex).map((stage) => stage.map((dex) => {
      const form = label ? formsOf(dex).find((f) => f.label === label)?.form : undefined;
      return form ? { dex, form } : { dex };
    }));
  }

  choose(entry) { // { dex, form? }: a species, or one of its regional forms
    const p = props();
    // The one it is already: keep it as it is (choosing it again would start its hearts and jobs over).
    const was = this.livePick() ?? p.current;
    if (was && was.dex === entry.dex && (was.form ?? null) === (entry.form ?? null)) return closeOverlay(p.overlay);
    // What it holds and its Everstone stay with the pane; a shiny pane stays shiny; its Mega
    // setting carries over, and X or Y if it stays the same species.
    const cur = this.livePick() ?? p.current;
    let next = switchedPick(cur, entry, this.megaMode, this.megaKind);
    // The Box: that species raised before by an agent now gone comes back as it was (its hearts,
    // jobs, item, shiny); if both hold something, this pane's item goes back into the Bag.
    const onScreen = new Set(agents().map((a) => a.pane).filter(Boolean));
    const boxed = fromBox(entry, savedPicks(), onScreen, p.slot);
    if (boxed) {
      if (cur?.held && boxed.pick.held) saveBag(addItem(bag(), cur.held));
      next = { ...boxed.pick, mega: this.megaMode, ...(boxed.pick.held || !cur?.held ? {} : { held: cur.held }), ...(cur?.stay ? { stay: true } : {}) };
    }
    // The one it was, if raised, waits in the Box (not overwritten).
    const away = boxOnSwitch(cur, entry, Date.now());
    savePicks({ ...(away ? { [away.key]: away.pick } : {}), [p.slot]: next });
    if (boxed) forgetPanes([boxed.slot]);
    closeOverlay(p.overlay);
  }

  chooseRandom(entries) {
    const p = props();
    const taken = new Set(Object.entries(savedPicks()).filter(([slot]) => slot !== p.slot).map(([, x]) => x.dex));
    const e = randomEntry(entries, p.current, taken);
    if (e) this.choose(e);
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
              .child(h_flex().gap(1).items_center()
                .children(Array.from({ length: MAX_HEARTS }, (_, i) => div().text_size(12.5).text_color(i < hearts ? HEART : t.border).child("♥")))
                .child(div().ml(8).text_size(11.5).text_color(t.muted).child(line ? `Every ${nameOf(cur.dex)}: ${line}` : `No ${nameOf(cur.dex)} has finished a job yet`)))
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

  // The Bag, for this Pokémon: Berries (a heart), Rare Candy (evolve now) and the stones it can
  // take. What does nothing for it now is greyed out.
  renderBagRow(cur, t) {
    const b = bag();
    const slot = props()?.slot;
    const night = isNight();
    const mine = new Set(evolveNeeds(cur).flatMap((n) => n.ways).filter((w) => w.startsWith("stone:")).map((w) => `${w.slice(6)}-stone`));
    const ids = ["berry", "rare-candy", ...STONES.map((k) => `${k}-stone`).filter((id) => mine.has(id)), ...HELD_IDS].filter((id) => b.items[id]);
    return h_flex().gap(6).items_center().flex_none()
      // What it holds: click to take it back into the Bag.
      .when(!!cur.held, (el) => el.child(div()
        .id("take-held").h(24).px(8).rounded(6).flex().items_center().text_size(11.5).border_1()
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
          .id(`use-${id}`).h(24).px(8).rounded(6).flex().items_center().gap(4).text_size(11.5).border_1()
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
              .child(div().text_size(11.5).text_color(t.muted).truncate().child(this.marking ? "Click a Pokémon to ★ or un-★ it, then Done" : `for ${p.tag ?? "this agent"}`)),
          )
          .child(
            h_flex().gap(10).items_center().flex_none()
              // Favourites mode: clicks ★ Pokémon (or un-★ them) instead of choosing one; Done ends
              // it. Not a star itself ("☆ Mark" read as one: clicked again, nothing was un-starred).
              .child(div()
                .id("pick-mark").h(26).px(10).rounded(6).flex().items_center().text_size(12).border_1()
                .border_color(this.marking ? "#f2c94c" : t.border).bg(this.marking ? t.selected : "#00000000")
                .text_color(t.foreground).cursor_pointer().hover((st) => st.bg(t.hover))
                .on_click((_e, cx) => { this.marking = !this.marking; cx.notify(); })
                .child(this.marking ? "✓ Done" : "Edit ★"))
              // Any Pokémon (of those the search shows), preferring one nobody else on screen has.
              .child(div()
                .id("pick-random").h(26).px(10).rounded(6).flex().items_center().text_size(12).border_1()
                .border_color(t.border).text_color(t.foreground).cursor_pointer().hover((st) => st.bg(t.hover))
                .on_click(() => this.chooseRandom(all))
                .child(narrowed ? "🎲 Random match" : "🎲 Random"))
              .child(div().text_size(11).text_color(t.dim).child("Esc")),
          ),
      )
      .when(!!cur?.dex, (el) => el.child(this.renderCurrent(cur, t)))
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
                  // Editing favourites: an empty ☆ on the others, so a click plainly stars one.
                  .when(this.marking && !isFavorite(favKeys, e), (el) => el.child(div().absolute().top(4).right(6).text_size(12).text_color(t.dim).child("☆")));
              })));
            }
            return rows;
          }).size_full().cursor_pointer().on_item_click((key, cx) => {
            const col = Math.floor(this.pickX / (PICK_W + PICK_GAP));
            const e = all[Number(key.slice(1)) * PICK_COLS + col];
            if (!(col >= 0 && col < PICK_COLS && e)) return;
            if (this.marking) { setFavs(toggleFavorite(favs(), e)); cx.notify(); } // stays open, ★ shown at once
            else this.choose(e);
          }))
          .child(Scrollbar.vertical("picks").absolute().inset_0()),
      )
      .when(all.length === 0, (el) => el.child(div().text_size(11.5).text_color(t.muted).child(this.only.region || this.only.mega ? "No Pokémon matches the search and filters." : "No Pokémon by that name or number.")));
  }
}

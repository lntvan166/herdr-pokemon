// pokemon-herd: every agent is a pixel-art Pokémon roaming a strip (or several rows of one).
// Working ones walk around, idle ones stroll and nap, blocked ones stop and call for you; they
// react when their agent changes or you focus it. Click one to go to its agent; right-click to
// choose which Pokémon it is.
import { View, div, image } from "gpui-kit";
import { h_flex, v_flex, InputState, Input, v_virtual_list, Scrollbar } from "gpui-base";
import { agents, spaces, theme, settings, run, props, shared, setShared, openOverlay, closeOverlay, nextCommand, layout } from "herdr";
import { placesIn, placeOf, placeBlock, rowsOf, blockProps, hiddenAlong, setRows, setBlockProps } from "./place.js";
import { nightness, palette, features, isLight, treeParts } from "./scene.js";
import { hasShiny, dexNo, megaForm, megaForms, setMegas, fullName, searchEntries } from "./dex.js";
import { MOD, LEGACY_KEY } from "./id.js";
import { loadPicks, assign } from "./picks.js";
import { forEachSafe, logOnce } from "./safe.js";
import { layoutTags } from "./tags.js";
import { restSpot, roomAt } from "./rest.js";
import { wrapRow, exitX, entryX, wrapOk, clearWalk } from "./wrap.js";
import { focusEdge, onFocus, onStatus, effectiveMood, pose, megaShown } from "./react.js";
import { loadSprite, ensureIcon, iconPath, imageMagick, savedMegas, refreshMegas } from "./sprites.js";

const SLOT = 128; // width of one Pokémon's box (sprite, bubble)
const REST_GAP = 60; // a resting Pokémon keeps this far from the others on its row: room for a name
const WRAP_CHANCE = 0.3; // with rows: how often a walk goes off the edge onto the next row
const OFF = 40; // how far past the edge it walks before it turns up on the next row
const EDGE = 28; // how close to the strip's edges a Pokémon walks (its tag has its own layer)
const LABEL_H = 18; // name tag under the feet
const TAG_LINES = 2; // lines kept under each row for names: fixed, so the ground lines never move
const FEET = 24; // ground line, px above the strip's bottom
const SPEED = { working: 70, idle: 32 }; // px per second
const SLEEP_AFTER = 3 * 60 * 1000; // idle this long: fall asleep
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
  const next = { ...savedPicks(), ...update };
  const keys = Object.keys(next);
  for (let i = 0; i < keys.length - 300; i++) delete next[keys[i]]; // forget the oldest panes
  setShared(MOD, { v: 2, panes: next });
}

const paneless = {}; // sub-agents' picks: not saved, only kept while the app runs
const assignAll = (list) => {
  const keys = Object.keys(paneless);
  for (let i = 0; i < keys.length - 200; i++) delete paneless[keys[i]]; // forget the oldest
  return assign(list, savedPicks(), paneless);
};

function tabsById() {
  const out = {};
  for (const s of spaces()) for (const t of s.tabs) out[t.id] = { ...t, space_name: s.name };
  return out;
}

function tagOf(a, tabs) {
  const t = tabs[a.tab];
  if (t?.named) return t.name;
  return a.space_name || a.tab_name || a.address;
}

// What the Pokémon is doing: walks while working, strolls while idle, sleeps when idle long.
function moodOf(a, tabs, now) {
  if (a.status === "blocked") return "blocked";
  if (a.status === "done") return "done";
  if (a.status === "working") return "working";
  // changed_at is null when nothing in the tab changed since the app started: idle all along.
  const changed = tabs[a.tab]?.changed_at;
  return changed == null || now - changed > SLEEP_AFTER ? "sleep" : "idle";
}

const PICK_COLS = 6; // the picker's grid: columns, cell width and gap, row height
const PICK_W = 92;
const PICK_GAP = 6;
const PICK_ROW = 102;
const ICON_JOBS = 8; // icon downloads at once
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const zoom = () => (Number(settings()?.zoom) > 0 ? Number(settings().zoom) : 1);
const scaleOf = () => {
  const s = props()?.scale;
  return Number.isFinite(s) && s > 0 ? s : 1;
};

// ---- the view -------------------------------------------------------------------

export default class PokemonHerd extends View {
  init(_p, cx) {
    this.picker = !!props()?.picker;
    this.menu = !!props()?.menu;
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
        if (c !== "pick") continue;
        const list = agents();
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
      } catch (e) {
        logOnce(e, console.log, Date.now(), (this.errSeen ??= new Map()));
      }
    });
  }

  // One row's Scenery: a flat sky, stars and moon (night) or clouds (day), hills, then grass on
  // the ground line. It stops just under the grass: the names below keep the strip's colour.
  scenery(top, ground, row) {
    const now = new Date();
    const p = palette(nightness(now.getHours() + now.getMinutes() / 60), isLight(theme().chrome));
    const key = `v2|${Math.round(this.width)}|${ground}|${row}`; // bump when features() changes shape
    this.sceneCache ??= {};
    const f = (this.sceneCache[key] ??= features(Math.round(this.width), ground, row));
    const line = ground + 4; // the ground line, as the plain background draws it
    const box = div().absolute().left(0).top(top).w(this.width).h(line + 6).overflow_hidden().bg(p.sky);
    return box
      .when(p.stars > 0.05, (el) => el
        .children(f.stars.filter((s) => s.y < line - 20).map((s) => div().absolute().left(s.x).top(s.y).size(s.bright ? 2 : 1).bg(s.bright ? "#ffeebb" : "#cfd8ff").opacity(p.stars * p.starAlpha)))
        .child(div().absolute().left(f.moon.x).top(f.moon.y).size(10).rounded_full().bg("#e9e5c8").opacity(p.stars * 0.85)))
      .when(p.clouds > 0.05, (el) => el.children(f.clouds.filter((c) => c.y + 10 < line - 24).map((c) => div()
        .absolute().left(c.x).top(c.y).w(c.w).h(12).opacity(p.clouds * p.cloudAlpha)
        .child(div().absolute().left(0).top(4).w(c.w).h(8).rounded(4).bg("#ffffff"))
        .child(div().absolute().left(Math.round(c.w * 0.25)).top(0).w(Math.round(c.w * 0.45)).h(9).rounded(5).bg("#ffffff")))))
      .children(f.hills.map((h) => div().absolute().left(Math.round(h.cx - h.rx)).top(line - h.ry).w(Math.round(2 * h.rx)).h(Math.round(2 * h.ry)).rounded_full().bg(p.hill)))
      .children(f.trees.flatMap((t) => treeParts(t, line - 3).map(([x, y, w, h, c, round]) => {
        const el = div().absolute().left(x).top(y).w(w).h(h).bg(p[c]);
        return round ? el.rounded_full() : el;
      })))
      .child(div().absolute().left(0).right(0).top(line - 3).h(7).bg(p.grass))
      .children(f.tufts.map((u) => div().absolute().left(u.x).top(line - 3 - u.h).w(1).h(u.h).bg(u.dark ? p.dark : p.grass)))
      .child(div().absolute().left(0).right(0).top(line + 4).h(2).bg(p.dark));
  }

  // The sprite set to draw: its Mega while megaShown and once loaded, else its usual one.
  // (A Mega set is marked megaShown, so the tick can tell when it changes.)
  spriteFor(pick, status) {
    if (megaShown(pick, status)) {
      const mega = this.sprites[spriteKey(pick, true)];
      if (mega?.walkR) { mega.megaShown = true; return mega; }
    }
    return this.sprites[spriteKey(pick)];
  }

  // Shiny, and really shown as one (not the normal sprite standing in for a shiny that failed).
  showsShiny(pick) {
    return pick.shiny && this.sprites[spriteKey(pick)]?.shiny !== false;
  }

  // Loads one Pokémon's sprites in the background; a failed one retries after a minute.
  // A shiny whose shiny sprite can't be had shows the normal one.
  want(pick, cx, mega = false) {
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
    return { rows, rowH: Math.round(88 * scaleOf()) + FEET + (TAG_LINES - 1) * LABEL_H };
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

  // Rows: grows or shrinks this block to hold them (props.block names it, default the mod id).
  fitHeight(g) {
    const want = g.rows * g.rowH;
    if (want === this.asked) return;
    this.asked = want;
    run("layout.resize", { id: props()?.block ?? MOD, px: want });
  }

  tick(cx) {
    const now = Date.now();
    const list = agents();
    const tabs = tabsById();
    const { ids, fresh } = assignAll(list);
    if (Object.keys(fresh).length) savePicks(fresh); // keeps new agents' Pokémon stable
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
    const walk = (m, target, speed) => {
      m.from = m.x;
      m.target = target;
      m.dir = target > m.x ? "r" : "l";
      m.start = now;
      m.dur = (Math.abs(target - m.x) / speed) * 1000;
      m.moving = true;
    };
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
      if (!m) {
        // Spread over its own row: agent i is the k-th of `inRow` on row i % rows.
        const rows = g ? g.rows : 1;
        const k = Math.floor(i / rows);
        const inRow = Math.ceil((list.length - (i % rows)) / rows);
        const x = clamp(((k + 0.5) / inRow) * this.width + rand(-20, 20), lo, hi);
        m = this.mons[a.address] = { x, from: x, target: x, dir: Math.random() < 0.5 ? "l" : "r", moving: false, start: 0, dur: 0, pauseUntil: now + rand(300, 2500), mood: null, status: a.status, react: null, awakeUntil: 0, sparkleUntil: ids[a.address]?.shiny ? now + 2500 : 0 };
        changed = true;
      }
      // Reactions (react.js): to its agent's status changing, and to you focusing it.
      const meta = this.spriteFor(ids[a.address], a.status);
      // Mega Evolution (or back): a flash of sparkles.
      const mega = meta?.megaShown === true;
      if (m.mega !== undefined && mega !== m.mega) { m.flashUntil = now + 1500; changed = true; }
      m.mega = mega;
      if (m.flashUntil && now >= m.flashUntil) { m.flashUntil = 0; changed = true; }
      const has = new Set(Object.keys(meta?.react ?? {}));
      const msOf = (name) => meta.react[name].ms;
      const raw = moodOf(a, tabs, now);
      if (m.status !== a.status) { onStatus(m, m.status, a.status, now, has, msOf); m.status = a.status; changed = true; }
      if (focus.react === a.address) { onFocus(m, effectiveMood(raw, m, now), now, has, msOf); changed = true; }
      const mood = effectiveMood(raw, m, now);
      if (mood !== m.mood) { m.mood = mood; changed = true; }
      const reacting = !!m.react && now < m.react.until;
      if (reacting) changed = true; // its sprite goes from the animation to facing you
      else if (m.react) { m.react = null; changed = true; }
      if (m.sparkleUntil && now >= m.sparkleUntil) { m.sparkleUntil = 0; changed = true; }
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
          m.pauseUntil = m.shuffle ? now + 5000 : now + (mood === "working" ? rand(300, 1800) : rand(4000, 12000));
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
      } else if ((mood === "working" || mood === "idle") && !reacting && now >= m.pauseUntil && hi > lo) {
        let target = rand(lo, hi);
        if (!m.entering && Math.abs(target - m.x) < 60) target = m.x + (target >= m.x ? 60 : -60);
        target = clamp(target, lo, hi);
        // Stop somewhere with room for a name, clear of those resting (working ones too, so
        // they don't make a sleeper shuffle aside).
        target = restSpot(target, othersOnRow(i), lo, hi, REST_GAP);
        // With rows, now and then it walks off the edge and carries on along the next row.
        const way = Math.random() < 0.5 ? "l" : "r";
        const wrap = !!g && g.rows > 1 && !m.entering && Math.random() < WRAP_CHANCE
          && wrapOk(rowCounts, wrapRow(rowAt(a, i), way, g.rows), list.length, g.rows);
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
    for (const k of Object.keys(this.mons)) if (!live.has(k)) { delete this.mons[k]; changed = true; }
    if (changed) cx.notify();
  }

  // ---- the menu (right-click on the strip; a popup with props { menu }) ----

  // Moves the strip to `place` with `rows` rows, by rewriting the shown layout.
  // `place` null: only the rows change, wherever it is (e.g. where Herdr docked it on install).
  applyLayout(place, rows) {
    const tree = layout();
    const scale = Number(blockProps(tree, MOD).scale) > 0 ? Number(blockProps(tree, MOD).scale) : 1;
    const px = rows * (Math.round(88 * scale) + FEET + (TAG_LINES - 1) * LABEL_H);
    const next = place ? placeBlock(tree, MOD, place, rows, px) : setRows(tree, MOD, rows, px);
    // The right panel stays the Files/Changes buttons' to open and close (they remember it per
    // space): the strip shows there whenever that panel is open.
    if (next) run("layout.set", { layout: next });
    closeOverlay(props()?.overlay);
  }

  renderMenu() {
    const t = theme();
    const tree = layout();
    const name = shared("layout");
    const shipped = ["main", "terminals", "win98"].includes(name);
    const have = placesIn(tree);
    const place = placeOf(tree, MOD);
    const rows = rowsOf(tree, MOD);
    const inLayout = !!setRows(tree, MOD, rows, 0); // its block is in the shown layout (wherever)
    const background = blockProps(tree, MOD).background === "plain" ? "plain" : "scenery";
    const label = (txt) => div().text_size(11).text_color(t.dim).child(txt);
    const item = (id, txt, on, active, enabled) => h_flex()
      .id(id).h(26).px(8).rounded(6).items_center().justify_between()
      .text_size(12.5).text_color(enabled ? t.foreground : t.dim)
      .when(enabled, (el) => el.cursor_pointer().hover((st) => st.bg(t.hover)).on_click(on))
      .child(txt)
      .when(active, (el) => el.child(div().text_color(t.accent).child("✓")));
    const NAMES = { sidebar: "Sidebar", bottom: "Bottom of the window", panel: "Right panel (with Files)" };
    const hidden = (p) => hiddenAlong(tree, p).length > 0;
    return v_flex()
      .id("pokemon-menu").size_full().p(8).gap(4).bg(t.popover)
      .child(label("Rows"))
      .child(h_flex().gap(4).children([1, 2, 3].map((n) => div()
        .id(`rows-${n}`).flex_1().h(26).rounded(6).flex().items_center().justify_center()
        .text_size(12.5).border_1()
        .border_color(n === rows ? t.accent : t.border)
        .bg(n === rows ? t.selected : "#00000000")
        .text_color(inLayout && !shipped ? t.foreground : t.dim)
        .when(inLayout && !shipped, (el) => el.cursor_pointer().hover((st) => st.bg(t.hover)).on_click(() => this.applyLayout(place, n)))
        .child(String(n)))))
      .child(div().h(4))
      .child(label("Background"))
      .child(h_flex().gap(4).children([["plain", "Plain"], ["scenery", "Scenery"]].map(([v, txt]) => div()
        .id(`bg-${v}`).flex_1().h(26).rounded(6).flex().items_center().justify_center()
        .text_size(12.5).border_1()
        .border_color(v === background ? t.accent : t.border)
        .bg(v === background ? t.selected : "#00000000")
        .text_color(inLayout && !shipped ? t.foreground : t.dim)
        .when(inLayout && !shipped, (el) => el.cursor_pointer().hover((st) => st.bg(t.hover)).on_click(() => {
          const next = setBlockProps(layout(), MOD, { background: v });
          if (next) run("layout.set", { layout: next });
          closeOverlay(props()?.overlay);
        }))
        .child(txt))))
      .child(div().h(4))
      .child(label("Place"))
      .children(["sidebar", "bottom", "panel"].map((p) =>
        item(`place-${p}`, p === place && hidden(p) ? `${NAMES[p]}, closed` : NAMES[p],
          () => this.applyLayout(p, rows), p === place, have.includes(p) && !shipped)))
      .when(shipped, (el) => el.child(div().pt(4).text_size(11).text_color(t.muted)
        .child(`"${name}" is a built-in layout: clone it to move things.`)));
  }

  openPicker(a, pick, tag) {
    openOverlay({
      mod: MOD,
      kind: "dialog",
      width: 640,
      height: 560,
      props: { picker: true, slot: slotOf(a), current: pick, tag },
    });
  }

  render(cx) {
    if (this.menu) return this.renderMenu();
    return this.picker ? this.renderPicker(cx) : this.renderStrip(cx);
  }

  renderStrip(cx) {
    const t = theme();
    const scale = scaleOf();
    const now = Date.now();
    const list = agents();
    const tabs = tabsById();
    const { ids } = assignAll(list);
    const g = this.grid(list.length);
    // with rows: per row, from the row's top; below it the name tags, on as many lines as they need
    const ground = (g ? g.rowH : this.height) - FEET - (TAG_LINES - 1) * LABEL_H;
    const grounds = g ? Array.from({ length: g.rows }, (_, r) => r * g.rowH + ground) : [ground];
    const sceneryOn = props()?.background !== "plain";

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
      .on_mouse_down("right", () => openOverlay({ mod: MOD, kind: "popup", width: 236, height: 272, props: { menu: true } }))
      .on_hover((h, cx) => { if (!h) this.dragEnd(cx); })
      // Scenery (the default): sky, hills and grass above each ground line. Plain: a faint line.
      .children(sceneryOn
        ? grounds.map((y, r) => this.scenery(y - ground, ground, r))
        : grounds.map((y) => div().absolute().left(0).right(0).top(y + 4).h(1).bg(t.border)));

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
      const text = full ? `${fullName(pick.dex, pick.form)} · ${tagOf(a, tabs)}` : tagOf(a, tabs);
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
    for (const a of order) {
      const pick = ids[a.address];
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
    return root;
  }

  // ---- the picker (opened as a dialog with props { picker, slot, current, tag }) ----

  initPicker(cx) {
    this.filter = "";
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
      const { entries, total } = searchEntries(this.input.value(), 2);
      if (total === 1) this.choose(entries[0]);
    });
    this.input.focus();
    cx.timer.after(300, () => this.input.focus());
    this.visible = searchEntries("", PICK_COLS * 6).entries; // what the list shows; updated as it scrolls
    this.pickX = 0; // the pointer's x over the list: which column a click was in
    // The list's renderer can't start downloads; this picks up what scrolled into view.
    cx.timer.every(250, (cx) => this.fetchIcons(cx));
  }

  // Icons for what the picker shows, downloaded on demand, a few at a time.
  fetchIcons(cx) {
    this.iconQueue = this.visible.filter((e) => !this.icons[entryKey(e)]);
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

  choose(entry) { // { dex, form? }: a species, or one of its regional forms
    const p = props();
    // A shiny pane stays shiny; its Mega setting carries over, and X or Y if it stays the same species.
    const { dex, form } = entry;
    const megaKind = dex === p.current?.dex && this.megaKind ? { megaKind: this.megaKind } : {};
    savePicks({ [p.slot]: { dex, shiny: p.current?.shiny === true && hasShiny(dex, form), mega: this.megaMode, ...(form ? { form } : {}), ...megaKind } });
    closeOverlay(p.overlay);
  }

  // Saves the picker's Mega mode and X/Y on the current pick, together (one never drops the other).
  saveMega(p) {
    savePicks({ [p.slot]: { ...p.current, mega: this.megaMode, ...(this.megaKind ? { megaKind: this.megaKind } : {}) } });
  }

  renderPicker(cx) {
    const t = theme();
    const p = props() ?? {};
    const all = searchEntries(this.filter, Infinity).entries; // every match: scroll to browse them all
    const now = p.current?.dex ? `${p.current.shiny ? "✨ " : ""}${fullName(p.current.dex, p.current.form)}` : "?";
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
              .child(div().text_size(11.5).text_color(t.muted).truncate().child(`for ${p.tag ?? "this agent"} · now ${now}`)),
          )
          .child(div().text_size(11).text_color(t.dim).child("Esc")),
      )
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
      // A virtual list of grid rows: only what's on screen is drawn, so all ~974 scroll smoothly.
      // It reports only the row clicked; the pointer's x says which cell.
      .child(
        div().flex_1().min_h(0).relative()
          .on_mouse_move((e) => { this.pickX = e.local_position.x / zoom(); })
          .child(v_virtual_list("picks", Math.ceil(all.length / PICK_COLS), PICK_ROW, (i) => `r${i}`, (range) => {
            this.visible = all.slice(range.start * PICK_COLS, range.end * PICK_COLS);
            const rows = [];
            for (let r = range.start; r < range.end; r++) {
              rows.push(h_flex().h(PICK_ROW).gap(PICK_GAP).children(all.slice(r * PICK_COLS, (r + 1) * PICK_COLS).map((e) => {
                const current = e.dex === p.current?.dex && (e.form ?? null) === (p.current?.form ?? null);
                return v_flex()
                  .w(PICK_W).h(96).flex_none()
                  .items_center().justify_center().gap(2)
                  .rounded(8).border_1()
                  .border_color(current ? t.accent : "#00000000")
                  .bg(current ? t.selected : "#00000000")
                  .child(this.icons[entryKey(e)] === "ready" ? image(iconPath(e.dex, e.form)).size(56).flex_none() : div().size(56).flex_none())
                  .child(div().text_size(9.5).text_color(t.dim).child(dexNo(e.dex)))
                  .child(div().w_full().px(2).text_center().truncate().text_size(11).text_color(t.foreground).child(fullName(e.dex, e.form)));
              })));
            }
            return rows;
          }).size_full().cursor_pointer().on_item_click((key) => {
            const col = Math.floor(this.pickX / (PICK_W + PICK_GAP));
            const e = all[Number(key.slice(1)) * PICK_COLS + col];
            if (col >= 0 && col < PICK_COLS && e) this.choose(e);
          }))
          .child(Scrollbar.vertical("picks").absolute().inset_0()),
      )
      .when(all.length === 0, (el) => el.child(div().text_size(11.5).text_color(t.muted).child("No Pokémon by that name or number.")));
  }
}

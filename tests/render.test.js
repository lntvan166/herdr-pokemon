// The views drawn in Node (gpui-kit, gpui-base and herdr stood in for by tests/render/mocks):
// the picker in every state (filters open, a search, a preview, Box it), a Pokémon's menu, the
// Bag's Box tab and the strip draw without throwing, and their buttons do what they say. A
// render that throws in Herdr shows "This view could not be re-rendered" and its clicks do
// nothing (the picker with its filters open, 2.26.0).
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

register("./render/loader.mjs", import.meta.url);
globalThis.__freezePicks = true; // the saved Pokémon, never changed in place: a write to them throws
process.env.POKEMON_TEST_HOME = mkdtempSync(join(tmpdir(), "pokemon-render-"));

let H, K, Herd, ids;
const cx = { spawn() {}, notify() {}, timer: { every() {}, after() {} }, stop_propagation() {}, open_url() {} };

before(async () => {
  H = await import("herdr");
  K = await import("gpui-kit");
  ids = await import("../mods/pokemon-herd/id.js");
  ({ default: Herd } = await import("../mods/pokemon-herd/main.js"));
});

// Three agents (p0 Charizard, p1 Vulpix, p2 Eevee) and three waiting in the Box: a raised
// Eevee, a locked Pikachu, and a Lucario (a favourite kind).
let rev = 1;
const setPanes = (panes) => { H.store.set(ids.MOD, { v: 2, panes }); H.store.set(`${ids.MOD}-picks-rev`, ++rev); }; // as savePicks does
function seed() {
  H.store.clear();
  setPanes({
    "box-1-133": { dex: 133, hearts: 2, jobs: 4 },
    "box-2-25": { dex: 25, locked: true, jobs: 1 },
    "box-3-448": { dex: 448, hearts: 1, jobs: 2 },
    p0: { dex: 6, hearts: 3, jobs: 12, held: "lucky-egg" },
    p1: { dex: 37, jobs: 1 },
    p2: { dex: 133 },
  });
  H.store.set(ids.BAG_KEY, { v: 1, money: 5000, items: { berry: 3, "sitrus-berry": 2, revive: 1, "fire-stone": 1, "soothe-bell": 1 }, marks: {} });
  H.store.set(ids.FAVORITES_KEY, { v: 1, keys: ["448"] });
  for (const k of Object.keys(K.handlers)) delete K.handlers[k];
  H.log.closed.length = 0;
  H.log.opened.length = 0;
}
const picks = () => H.store.get(ids.MOD).panes;
function view(p) {
  H.__setProps(p);
  const v = new Herd();
  v.init({}, cx);
  return v;
}
const picker = () => view({ picker: true, slot: "p0", current: { dex: 6 }, tag: "api", overlay: "ov-pick" });
const click = (key, ...args) => {
  const f = K.handlers[key];
  assert.ok(f, `no handler ${key} (have: ${Object.keys(K.handlers).filter((k) => k.startsWith(key.split(/[-:]/)[0])).slice(0, 8).join(", ")})`);
  return f(...(args.length ? args : [{}, cx]));
};

test("the picker draws in every state", () => {
  seed();
  const v = picker();
  v.render(cx);
  v.filtersOpen = true; v.render(cx);
  v.only = { types: ["fire"] }; v.render(cx);
  v.only = { fav: true, region: "Kanto", mega: true, legend: true, types: ["fire", "flying"] }; v.render(cx);
  v.only = {}; v.filter = "pika"; v.render(cx);
  v.filter = ""; v.showPreview({ dex: 38 }, cx); v.render(cx);
  v.filtersOpen = false; v.render(cx);
  v.preview = null; v.boxing = true; v.render(cx);
});

test("the picker with its filters open: a cell still previews, and Replace chooses it", () => {
  seed();
  const v = picker();
  v.filtersOpen = true;
  v.render(cx);
  v.pickX = 1; // the first column
  click("picks:on_item_click", "r0", cx);
  assert.ok(v.preview, "a click on a cell previews it");
  v.render(cx);
  click("preview-choose:on_click");
  assert.deepEqual(H.log.closed, ["ov-pick"], "it closes");
  assert.equal(picks().p0.dex, v.preview?.dex ?? picks().p0.dex);
});

test("Replace gives a new one, never one of its kind from the Box", () => {
  seed();
  const v = picker();
  v.showPreview({ dex: 133 }, cx);
  v.render(cx);
  click("preview-choose:on_click");
  assert.equal(picks().p0.dex, 133);
  assert.ok(!picks().p0.jobs, "a new Eevee, no jobs");
  assert.ok(picks()["box-1-133"], "the boxed Eevee still waits");
  assert.ok(Object.values(picks()).some((p) => p.dex === 6 && p.jobs === 12), "Charizard went to the Box");
});

test("the picker's Box row: favourites first, a click brings one out", () => {
  seed();
  const v = picker();
  v.render(cx);
  assert.ok(K.handlers["pk-box-box-3-448:on_click"], "the favourite (Lucario) is in the row");
  click("pk-box-box-3-448:on_click");
  assert.equal(picks().p0.dex, 448);
  assert.equal(picks().p0.jobs, 2, "the very one, with its jobs");
  assert.equal(picks()["box-3-448"], undefined);
  assert.deepEqual(H.log.closed, ["ov-pick"]);
});

test("a Pokémon's menu: draws, uses an item, brings one out, opens the picker", () => {
  seed();
  const v = view({ mon: true, slot: "p1", current: { dex: 37 }, tag: "web", overlay: "ov-mon" });
  v.render(cx);
  click("mon-use-fire-stone:on_click");
  assert.equal(picks().p1.dex, 38, "the Fire Stone evolved Vulpix");
  assert.equal(H.store.get(ids.BAG_KEY).items["fire-stone"], undefined);
  v.render(cx);
  click("mon-bring-box-1-133:on_click");
  assert.equal(picks().p1.dex, 133);
  assert.equal(picks().p1.jobs, 4);
  assert.deepEqual(H.log.closed, ["ov-mon"]);
  seed();
  const w = view({ mon: true, slot: "p0", current: { dex: 6 }, tag: "api", overlay: "ov-mon" });
  w.render(cx);
  click("mon-take:on_click");
  assert.equal(picks().p0.held, undefined);
  assert.equal(H.store.get(ids.BAG_KEY).items["lucky-egg"], 1);
  w.render(cx);
  click("mon-pick:on_click");
  assert.ok(H.log.opened.some((o) => o.props?.picker && o.props.slot === "p0"), "the picker opens for it");
});

test("the Bag's Box tab: a card's actions", () => {
  seed();
  const v = view({ bag: true, tab: "box", sel: "box-1-133" });
  v.render(cx);
  click("box-bring-box-1-133:on_click");
  v.render(cx);
  click("box-to-box-1-133-p2:on_click");
  assert.equal(picks().p2.dex, 133);
  assert.equal(picks().p2.jobs, 4);
  seed();
  const w = view({ bag: true, tab: "box", sel: "box-1-133" });
  w.render(cx);
  click("box-feed-berry-box-1-133:on_click");
  assert.equal(picks()["box-1-133"].fed?.n, 1, "it ate the Berry");
  assert.equal(H.store.get(ids.BAG_KEY).items.berry, 2);
  w.render(cx);
  click("box-lock-box-1-133:on_click");
  assert.equal(picks()["box-1-133"].locked, true);
});

// A Mega's moves are its own to choose: Change on its row saves them apart (`megaMoves`), and
// the one as it is keeps its own; none chosen for the Mega, it fights with its own four.
test("a Mega's moves: a Change of their own", () => {
  seed();
  const v = view({ bag: true, tab: "box", sel: "p0" });
  v.render(cx);
  assert.ok(K.handlers["moves-edit-p0-base:on_click"], "Change for Charizard");
  click("moves-edit-p0-X:on_click");
  v.render(cx);
  click("learn-p0-X-2:on_click"); // Flamethrower, one of Mega X's own four: dropped
  const p0 = picks().p0;
  assert.equal(p0.megaMoves?.X?.length, 3);
  assert.ok(!p0.megaMoves.X.includes("Flamethrower"));
  assert.equal(p0.moves, undefined, "Charizard's own four untouched");
  v.render(cx);
  click("moves-default-p0-X:on_click");
  assert.equal(picks().p0.megaMoves, undefined, "back to Mega X's own four");
});

// One Mega only (Gallade, kind ""): Change on one row opens that row only.
test("one Mega only: each row's Change opens its own", () => {
  seed();
  setPanes({ ...H.store.get(ids.MOD).panes, p1: { dex: 475, jobs: 70 } });
  const v = view({ bag: true, tab: "box", sel: "p1" });
  v.render(cx);
  for (const k of Object.keys(K.handlers)) delete K.handlers[k];
  v.render(cx);
  assert.ok(K.handlers["moves-edit-p1-:on_click"], "As Mega has its Change");
  click("moves-edit-p1-base:on_click");
  for (const k of Object.keys(K.handlers)) delete K.handlers[k];
  v.render(cx);
  assert.ok(K.handlers["learn-p1-base-0:on_click"], "its own list open");
  assert.equal(K.handlers["learn-p1--0:on_click"], undefined, "the Mega's list shut");
});

// Every Pokémon saved, read once per render: each read checks them all (loadPicks), and a
// preview read them a dozen times; with ~250 in the Box that went past Herdr's time for a
// render ("This view could not be re-rendered: interrupted", its buttons dead).
test("a render reads the saved Pokémon once", () => {
  seed();
  // The saved Pokémon, the Pokédex and the favourites: each read once at most.
  const keys = [ids.MOD, `${ids.MOD}-dex`, ids.FAVORITES_KEY];
  const once = (v, label) => {
    const r0 = Object.fromEntries(keys.map((k) => [k, H.reads[k] ?? 0]));
    v.render(cx);
    for (const k of keys) assert.ok((H.reads[k] ?? 0) - r0[k] <= 1, `${label}: ${k} read ${(H.reads[k] ?? 0) - r0[k]} times`);
  };
  const v = picker();
  once(v, "picker");
  v.showPreview({ dex: 38 }, cx);
  once(v, "preview");
  v.filtersOpen = true;
  v.only = { types: ["dragon"] };
  once(v, "preview, filters open");
  once(view({ mon: true, slot: "p0", current: { dex: 6 }, tag: "api" }), "a Pokémon's menu");
  const st = view({ rows: 1, scale: 0.75 });
  st.sized = true; st.width = 1200; st.height = 112;
  once(st, "strip");
});

// A reload (an update, a reinstall) mid-battle or mid-catch: the wild one or the trainer is
// back as last settled (keepVisitor → VISITOR_KEY), not gone.
test("a visitor is back after a reload; not one caught", () => {
  seed();
  const strip = () => { const v = view({ rows: 1, scale: 0.75 }); v.leader = true; v.sized = true; v.width = 1200; v.height = 112; return v; };
  const KEY = `${ids.MOD}-visitor`;
  const a = strip();
  const now = Date.now();
  a.visitor = { id: `${now}-25`, pick: { dex: 25, hp: 0.4 }, dir: "l", row: 0, from: 1100, to: -40, start: now - 1000, dur: 60000, throws: 2, gift: "berry", purse: 0 };
  a.keepVisitor();
  assert.equal(H.store.get(KEY)?.v.pick.hp, 0.4);
  // Mid-hit: the last settled state stays.
  a.visitor.fight = { at: now, until: now + 2000, hp: 0.1 };
  a.visitor.pick.hp = 0.1;
  a.keepVisitor();
  assert.equal(H.store.get(KEY).v.pick.hp, 0.4);
  // Reloaded: a new strip has it back, health and balls as they were.
  const b = strip();
  b.visit(H.agents(), {}, null, now, cx);
  assert.equal(b.visitor?.id, `${now}-25`);
  assert.equal(b.visitor.pick.hp, 0.4);
  assert.equal(b.visitor.throws, 2);
  // A trainer, its second Pokémon out: back the same.
  a.visitor = { id: `${now}-9`, pick: { dex: 9, hp: 0.7 }, dir: "l", row: 0, from: 1100, to: 1099, start: now - 1000, dur: 1000, gift: "none", purse: 0,
    trainer: { cls: "swimmer", title: "Swimmer", name: "Lia", team: [{ dex: 131, nature: "bold" }, { dex: 9, nature: "calm" }], idx: 1, at: now - 30000 },
    halt: { kind: "trainer", x: 1100, at: now - 1000, until: now + 120000, icon: "❗", face: "L" } };
  a.keepVisitor();
  const c = strip();
  c.visit(H.agents(), {}, null, now, cx);
  assert.equal(c.visitor?.trainer?.idx, 1);
  assert.equal(c.visitor.pick.hp, 0.7);
  // Caught: none kept.
  a.caught({ ...a.visitor, trainer: undefined, throw: { ball: "poke-ball" } });
  assert.equal(H.store.get(KEY), null);
});

// From one tick or render to the next, the saved Pokémon are read again only after a save (its
// stamp, PICKS_REV_KEY): not ~250 of them read and checked 4 times a second.
test("the saved Pokémon are read again only after a save", () => {
  seed();
  const st = view({ rows: 1, scale: 0.75 });
  st.sized = true; st.width = 1200; st.height = 112;
  st.render(cx);
  const r0 = H.reads[ids.MOD] ?? 0;
  st.render(cx); st.render(cx);
  assert.equal((H.reads[ids.MOD] ?? 0) - r0, 0, "nothing saved: not read again");
  const m = view({ mon: true, slot: "p0", current: { dex: 6 }, tag: "api" });
  m.render(cx);
  click("mon-take:on_click"); // a save
  const r1 = H.reads[ids.MOD] ?? 0;
  st.render(cx);
  assert.equal((H.reads[ids.MOD] ?? 0) - r1, 1, "saved: read once more");
  assert.equal(H.store.get(ids.MOD).panes.p0.held, undefined);
});

// The Battle Tower: started from the menu, its trainers come one by one (no other visitor);
// three faints of yours end the climb, its wins kept as the best.
test("the Battle Tower: start, a trainer, three faints and it's over", () => {
  seed();
  const KEY = `${ids.MOD}-tower`;
  const menu = view({ menu: true });
  menu.render(cx);
  click("menu-tower:on_click");
  assert.ok(H.store.get(KEY)?.run, "a climb on");
  const st = view({ rows: 1, scale: 0.75 });
  st.leader = true; st.sized = true; st.width = 1200; st.height = 112;
  st.visit(H.agents(), {}, null, Date.now(), cx);
  assert.equal(st.visitor?.trainer?.tower, 1, "its first trainer");
  assert.equal(st.visitor.trainer.team.length, 3);
  st.render(cx);
  H.store.set(KEY, { ...H.store.get(KEY), best: 2, run: { ...H.store.get(KEY).run, wins: 5 } });
  for (let i = 0; i < 3; i++) st.towerFaint(`t${i}`, Date.now());
  assert.equal(H.store.get(KEY).run, null, "over");
  assert.equal(H.store.get(KEY).best, 5, "its 5 wins, the best now");
  assert.equal(st.visitor, null, "the trainer gone");
  st.render(cx);
  // Given up from the menu: its trainer goes.
  menu.render(cx);
  click("menu-tower:on_click");
  st.visit(H.agents(), {}, null, Date.now(), cx);
  assert.ok(st.visitor?.trainer?.tower);
  menu.render(cx);
  click("menu-tower:on_click");
  st.visit(H.agents(), {}, null, Date.now(), cx);
  assert.equal(st.visitor, null);
});

// A trainer beaten: its balls, its words, its pay rising, then it walks off: all drawn.
// A climb over: each one's health as it stood (no healing in it), healing again from now.
test("the Battle Tower: health as it stood when the climb ends", () => {
  seed();
  const KEY = `${ids.MOD}-tower`, HP = `${ids.MOD}-hp`;
  const now = Date.now(), from = now - 5 * 60000;
  H.store.set(KEY, { v: 1, best: 0, run: { at: from, wins: 1, faints: 0, out: [], nextAt: 0 } });
  H.store.set(HP, { p0: { hp: 0.3, at: from + 60000 } }); // hurt in the climb, 4 minutes ago
  const st = view({ rows: 1, scale: 0.75 });
  st.leader = true; st.sized = true; st.width = 1200; st.height = 112;
  st.towerEnd(now, "given up");
  const r = H.store.get(HP).p0;
  assert.equal(r.hp, 0.3, "not healed in the climb");
  assert.ok(r.at >= now, "healing from now");
});

test("a trainer beaten draws its win (balls, words, pay, walking off)", () => {
  seed();
  const st = view({ rows: 1, scale: 0.75 });
  st.sized = true; st.width = 1200; st.height = 112;
  const box = { x: 4, y: 4, w: 24, h: 30 }, cut = (n) => ({ path: `x/${n}.gif`, w: 64, h: 64, box });
  const meta = { walkR: cut("wr"), walkL: cut("wl"), idleR: cut("ir"), idleL: cut("il"), idleD: cut("id"), sleep: cut("s"), react: {} };
  st.sprites = new Proxy({}, { get: () => meta, set: () => true });
  st.trainerArt = { ace: { custom: true, standL: "a.png", walkL: "a.png", standR: "b.png", walkR: "b.png", w: 30, h: 60 } };
  const now = Date.now();
  for (const won of [100, 3500]) {
    st.visitor = { id: `w-${won}`, pick: { dex: 9, hp: 0 }, dir: "l", row: 0, from: 1100, to: 1099, start: now - 9000, dur: 1000, fainted: now - won - 2200,
      fight: { at: now - won - 3000, until: now - won - 2500, x: 1100, ownX: 1000, fainted: true, hp: 0, own: "t0" },
      trainer: { cls: "ace", title: "Ace Trainer", name: "Mia", team: [{ dex: 3 }, { dex: 6 }, { dex: 9 }], idx: 2, beaten: now - won, winner: "t0", paid: { money: 540, items: [["rare-candy", 3]] } } };
    st.render(cx);
  }
});

test("the strip draws", () => {
  seed();
  const v = view({ rows: 1, scale: 0.75 });
  v.sized = true; v.width = 1200; v.height = 112;
  v.render(cx);
});

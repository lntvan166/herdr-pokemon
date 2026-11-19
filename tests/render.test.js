// The views drawn in Node (gpui-kit, gpui-base and herdr stood in for by tests/render/mocks):
// the picker in every state (filters open, a search, a preview, Box it), a Pokémon's menu, the
// Bag's Box tab and the strip draw without throwing, and their buttons do what they say. A
// render that throws in Herdr shows "This view could not be re-rendered" and its clicks do
// nothing (the picker with its filters open, 2.26.0).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

register("./render/loader.mjs", import.meta.url);
globalThis.__freezePicks = true; // the saved Pokémon, never changed in place: a write to them throws
process.env.POKEMON_TEST_HOME = mkdtempSync(join(tmpdir(), "pokemon-render-"));
after(() => rmSync(process.env.POKEMON_TEST_HOME, { recursive: true, force: true })); // (one a run was left in /tmp)

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

// A legendary's forms are legendaries: Black and White Kyurem locked till Kyurem's caught, and
// listed under ✦ Legendary.
test("the picker: a legendary's forms locked with it, and among the legendaries", () => {
  seed();
  const v = picker();
  assert.equal(v.locked({ dex: 646, form: "0001" }), "legend", "Black Kyurem, Kyurem not caught");
  assert.equal(v.locked({ dex: 646 }), "legend");
  v.only = { legend: true };
  assert.ok(v.searchOnly().keys.has("646-0001") && v.searchOnly().keys.has("646"), "listed");
  H.store.set(`${ids.MOD}-dex`, { v: 1, seen: [646], caught: [646], shiny: [], alpha: [], male: [], female: [], sizes: {} });
  assert.equal(v.locked({ dex: 646, form: "0002" }), false, "Kyurem caught: White Kyurem too");
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

// Right-clicked while Mega Evolved on the strip: its Mega's card (name, types, moves).
test("a Pokémon's menu, Mega Evolved: drawn as its Mega", () => {
  seed();
  const m = view({ mon: true, slot: "p0", current: { dex: 6 }, tag: "api", megaNow: "X" });
  m.render(cx);
  assert.ok(K.handlers["mon-pick:on_click"], "drawn");
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
  const box = { x: 4, y: 4, w: 24, h: 30 }, cut = (n) => ({ path: `x/${n}.gif`, w: 64, h: 64, box });
  const meta = { walkR: cut("wr"), walkL: cut("wl"), idleR: cut("ir"), idleL: cut("il"), idleD: cut("id"), sleep: cut("s"), react: { Hop: cut("hop") } };
  st.sprites = new Proxy({}, { get: () => meta, set: () => true });
  st.visit(H.agents(), {}, null, Date.now(), cx);
  assert.equal(st.visitor?.trainer?.tower, 1, "its first trainer");
  st.visit(H.agents(), {}, null, Date.now() + 1000, cx); // its sprite in: it sets off, and waits in its corner
  st.visit(H.agents(), {}, null, Date.now() + 1100, cx);
  assert.equal(st.visitor.trainer.team.length, 3);
  st.render(cx);
  H.store.set(KEY, { ...H.store.get(KEY), best: 2, run: { ...H.store.get(KEY).run, wins: 5 } });
  st.visitor.trainer.gloat = Date.now(); // the last of yours just fainted to it
  for (let i = 0; i < 3; i++) st.towerFaint(`t${i}`, Date.now());
  assert.equal(H.store.get(KEY).run, null, "over");
  assert.equal(H.store.get(KEY).best, 5, "its 5 wins, the best now");
  // The trainer won: it says so a moment (its Pokémon cheering), then walks off and is gone.
  assert.ok(st.visitor?.trainer?.leaving, "it goes, not vanishes");
  st.render(cx);
  const later = Date.now() + 3000;
  st.visit(H.agents(), {}, null, later, cx);
  assert.equal(st.visitor?.dir, "r", "walking off to the right");
  st.visit(H.agents(), {}, null, later + 60000, cx);
  assert.equal(st.visitor, null, "out of the strip, gone");
  // Given up from the menu: its trainer goes.
  menu.render(cx);
  click("menu-tower:on_click");
  st.visit(H.agents(), {}, null, Date.now(), cx);
  assert.ok(st.visitor?.trainer?.tower);
  menu.render(cx);
  click("menu-tower:on_click");
  st.visit(H.agents(), {}, null, Date.now(), cx);
  assert.ok(st.visitor?.trainer?.leaving, "given up: it goes");
});

// A trainer beaten: its balls, its words, its pay rising, then it walks off: all drawn.
// In a climb, one healing item a floor (a Berry or a Revive): the second does nothing, and the
// menu offers none till the next floor.
test("the Battle Tower: one heal a floor", () => {
  seed();
  const KEY = `${ids.MOD}-tower`, HP = `${ids.MOD}-hp`;
  H.store.set(KEY, { v: 1, best: 0, run: { at: Date.now() - 1000, wins: 0, faints: 0, out: [], nextAt: 0 } });
  const hurt = () => H.store.set(HP, { p0: { hp: 0.2, at: Date.now() } });
  const m = view({ mon: true, slot: "p0", current: { dex: 6 }, tag: "api" });
  hurt();
  m.render(cx);
  click("mon-use-berry:on_click");
  assert.equal(H.store.get(KEY).run.heals, 1);
  hurt();
  for (const k of Object.keys(K.handlers)) delete K.handlers[k];
  m.render(cx);
  assert.equal(K.handlers["mon-use-berry:on_click"], undefined, "no Berry offered on this floor");
  assert.equal(H.store.get(ids.BAG_KEY).items.berry, 2, "one eaten");
  // The next floor: its heal back.
  H.store.set(KEY, { ...H.store.get(KEY), run: { ...H.store.get(KEY).run, wins: 1, heals: 0 } });
  for (const k of Object.keys(K.handlers)) delete K.handlers[k];
  m.render(cx);
  assert.ok(K.handlers["mon-use-berry:on_click"], "a Berry again");
});

// In a climb, switching between yours on the strip is free; one swapped in from the Box comes in
// with its agent's health as it stood, less 10% (not a fresh one).
test("the Battle Tower: from the Box costs 10%, switching on the strip doesn't", () => {
  seed();
  const KEY = `${ids.MOD}-tower`, HP = `${ids.MOD}-hp`;
  H.store.set(KEY, { v: 1, best: 0, run: { at: Date.now() - 1000, wins: 0, faints: 0, out: [], nextAt: 0 } });
  const st = view({ rows: 1, scale: 0.75 });
  st.leader = true; st.sized = true; st.width = 1200; st.height = 112;
  const box = { x: 4, y: 4, w: 24, h: 30 }, cut = (n) => ({ path: `x/${n}.gif`, w: 64, h: 64, box });
  const meta = { walkR: cut("wr"), walkL: cut("wl"), idleR: cut("ir"), idleL: cut("il"), idleD: cut("id"), sleep: cut("s"), react: {} };
  st.sprites = new Proxy({}, { get: () => meta, set: () => true });
  st.tick(cx);
  const now = Date.now();
  const tr = { cls: "ace", title: "Ace Trainer", name: "Mia", team: [{ dex: 9, nature: "calm" }], idx: 0, tower: 1, effort: 1.1, waited: true };
  st.visitor = { id: "sw", pick: { dex: 9, nature: "calm", trainer: true, mega: "off" }, dir: "l", row: 0, from: 600, to: 599, start: now - 5000, dur: 1000, x: 600, gift: "none", purse: 0, trainer: tr,
    halt: { kind: "trainer", x: 600, at: now, until: now + 120000, icon: "❗", face: "L" } };
  for (const a of ["t0", "t1"]) { const m = st.mons[a]; m.x = 560; m.moving = false; m.row = 0; }
  const hpOf = (a) => (Number.isFinite(st.mons[a].hp) ? st.mons[a].hp : 1);
  st.dropAt = { addr: "t0", dizzy: false };
  st.tick(cx);
  const t1Before = hpOf("t1");
  st.visitor.fight = null; st.visitor.pick.hp = 1;
  st.dropAt = { addr: "t1", dizzy: false };
  st.tick(cx);
  assert.equal(hpOf("t1"), t1Before, "switched on the strip: no cost");
  // From the Box, into p2 (hurt to 0.8): 0.7.
  H.store.set(HP, { p2: { hp: 0.8, at: Date.now() } });
  const menu = view({ mon: true, slot: "p2", current: { dex: 133 }, tag: "web", overlay: "ov" });
  menu.render(cx);
  click("mon-bring-box-1-133:on_click");
  assert.ok(Math.abs(H.store.get(HP).p2.hp - 0.7) < 1e-9, `from the Box: ${H.store.get(HP).p2.hp}`);
});

// Two of yours only: two lives, and the climb ends once both are out (it waited, three lives and
// nobody to send, till its trainer gave up).
test("the Battle Tower: as many lives as Pokémon, ended when none is left", () => {
  seed();
  const KEY = `${ids.MOD}-tower`;
  const st = view({ rows: 1, scale: 0.75 });
  st.leader = true; st.sized = true; st.width = 1200; st.height = 112;
  H.store.set(KEY, { v: 1, best: 0, run: { at: Date.now(), wins: 2, faints: 0, out: [], nextAt: Date.now() + 99999 } });
  // Three agents: t0..t2 (p0..p2). Two of them out, the third closed: none left.
  st.towerFaint("t0", Date.now());
  st.towerFaint("t1", Date.now());
  assert.ok(H.store.get(KEY).run, "one still up: on");
  H.store.set(KEY, { ...H.store.get(KEY), run: { ...H.store.get(KEY).run, out: ["p0", "p1", "p2"] } });
  st.visit(H.agents(), {}, null, Date.now(), cx);
  assert.equal(H.store.get(KEY).run, null, "nobody left: over");
  assert.equal(st.towerOver?.why, "no one left");
  // Begun with two lives: a third agent opened in it adds one (three at most).
  H.store.set(KEY, { v: 1, best: 0, run: { at: Date.now(), wins: 0, faints: 0, out: [], nextAt: Date.now() + 99999, lives: 2 } });
  st.visit(H.agents(), {}, null, Date.now(), cx);
  assert.equal(H.store.get(KEY).run.lives, 3, "three on screen: three lives");
  st.towerFaint("t0", Date.now());
  st.towerFaint("t1", Date.now());
  assert.ok(H.store.get(KEY).run, "two down of three: on");
});

// A climb begun with a wild one walking by: it hurries off (not a whole walk across the strip),
// and the Tower's trainer comes in right after.
test("the Battle Tower: a wild one here hurries off for its trainer", () => {
  seed();
  const KEY = `${ids.MOD}-tower`;
  const st = view({ rows: 1, scale: 0.75 });
  st.leader = true; st.sized = true; st.width = 1200; st.height = 112;
  const box = { x: 4, y: 4, w: 24, h: 30 }, cut = (n) => ({ path: `x/${n}.gif`, w: 64, h: 64, box });
  const meta = { walkR: cut("wr"), walkL: cut("wl"), idleR: cut("ir"), idleL: cut("il"), idleD: cut("id"), sleep: cut("s"), react: {} };
  st.sprites = new Proxy({}, { get: () => meta, set: () => true });
  const now = Date.now();
  st.visitor = { id: "wild", pick: { dex: 25 }, dir: "r", row: 0, from: -40, to: 1240, start: now - 2000, dur: 60000, x: 0, purse: 0 };
  H.store.set(KEY, { v: 1, best: 0, run: { at: now, wins: 0, faints: 0, out: [], nextAt: 0 } });
  st.visit(H.agents(), {}, null, now, cx);
  assert.ok(st.visitor.hurry && st.visitor.dur < 15000, `it hurries (${Math.round(st.visitor.dur)} ms)`);
  st.render(cx);
  st.visit(H.agents(), {}, null, now + st.visitor.dur + 10, cx);
  assert.equal(st.visitor, null, "gone");
  st.visit(H.agents(), {}, null, now + 20000, cx);
  assert.equal(st.visitor?.trainer?.tower, 1, "the Tower's trainer, right after");
});

// A Revive in a climb: the one fainted is back in it (its heal for the floor; the life stays lost).
test("the Battle Tower: a Revive brings one back into the climb", () => {
  seed();
  const KEY = `${ids.MOD}-tower`, HP = `${ids.MOD}-hp`;
  H.store.set(KEY, { v: 1, best: 0, run: { at: Date.now() - 1000, wins: 1, faints: 1, out: ["p0"], nextAt: 0, lives: 3 } });
  H.store.set(HP, { p0: { hp: 0, at: Date.now() - 500, rest: Date.now() + 600000 } });
  const m = view({ mon: true, slot: "p0", current: { dex: 6 }, tag: "api", overlay: "ov" });
  m.render(cx);
  click("mon-use-revive:on_click");
  const run = H.store.get(KEY).run;
  assert.ok(!run.out.includes("p0"), "back in the climb");
  assert.equal(run.faints, 1, "its life stays lost");
  assert.equal(run.heals, 1, "the floor's heal");
});

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
  for (const won of [100, 2600, 4000]) {
    st.visitor = { id: `w-${won}`, pick: { dex: 9, hp: 0 }, dir: "l", row: 0, from: 1100, to: 1099, start: now - 9000, dur: 1000, fainted: now - won - 2200,
      fight: { at: now - won - 3000, until: now - won - 2500, x: 1100, ownX: 1000, fainted: true, hp: 0, own: "t0" },
      trainer: { cls: "ace", title: "Ace Trainer", name: "Mia", team: [{ dex: 3 }, { dex: 6 }, { dex: 9 }], idx: 2, beaten: now - won, winner: "t0", paid: { money: 540, items: [["rare-candy", 3]] } } };
    st.render(cx);
  }
});

// Who moves first in a battle: the faster. Snorlax (slow) on an Electrode (fast): it strikes first,
// and Snorlax after it lands (if still up).
test("the faster moves first against a wild one", () => {
  seed();
  setPanes({ ...H.store.get(ids.MOD).panes, p0: { dex: 143, jobs: 3 } });
  const st = view({ rows: 1, scale: 0.75 });
  st.leader = true; st.sized = true; st.width = 1200; st.height = 112;
  const box = { x: 4, y: 4, w: 24, h: 30 }, cut = (n) => ({ path: `x/${n}.gif`, w: 64, h: 64, box });
  const meta = { walkR: cut("wr"), walkL: cut("wl"), idleR: cut("ir"), idleL: cut("il"), idleD: cut("id"), sleep: cut("s"), react: {} };
  st.sprites = new Proxy({}, { get: () => meta, set: () => true });
  st.tick(cx);
  const now = Date.now();
  st.visitor = { id: "fast", pick: { dex: 101, hp: 1 }, dir: "l", row: 0, from: 600, to: 599, start: now - 5000, dur: 1000, x: 600, purse: 0, halt: { kind: "curious", x: 600, at: now, until: now + 60000 } };
  const m = st.mons.t0; m.x = 560; m.moving = false;
  st.dropAt = { addr: "t0", dizzy: false };
  st.tick(cx);
  const fx = st.visitor.fight;
  assert.ok(fx, "a fight");
  assert.equal(fx.wildFirst, true, "Electrode is faster");
  assert.ok(fx.backHit < fx.hitAt, "its blow lands first");
  // The other way round: yours the Electrode, the wild one a Snorlax: yours first.
  st.visitor = { id: "slow", pick: { dex: 143, hp: 1 }, dir: "l", row: 0, from: 600, to: 599, start: now - 5000, dur: 1000, x: 600, purse: 0, halt: { kind: "curious", x: 600, at: now, until: now + 60000 } };
  setPanes({ ...H.store.get(ids.MOD).panes, p0: { dex: 101, jobs: 3 } });
  st.mons.t0.restUntil = 0; st.mons.t0.react = null; st.mons.t0.pauseUntil = 0;
  st.tick(cx);
  st.mons.t0.x = 560; st.mons.t0.moving = false;
  st.dropAt = { addr: "t0", dizzy: false };
  st.tick(cx);
  const fx2 = st.visitor.fight;
  assert.ok(fx2 && !fx2.wildFirst && fx2.hitAt < fx2.backHit, "yours faster: yours first");
});

// Moments: a trainer's ball arcing out and opening, a shiny's sparkles walking in, one of yours
// greying out as it faints: each drawn at each beat.
test("send-out ball, shiny sparkles, a faint: drawn at every beat", () => {
  seed();
  const st = view({ rows: 1, scale: 0.75 });
  st.sized = true; st.width = 1200; st.height = 112;
  const box = { x: 4, y: 4, w: 24, h: 30 }, cut = (n) => ({ path: `x/${n}.gif`, w: 64, h: 64, box });
  const meta = { walkR: cut("wr"), walkL: cut("wl"), idleR: cut("ir"), idleL: cut("il"), idleD: cut("id"), sleep: cut("s"), react: {} };
  st.sprites = new Proxy({}, { get: () => meta, set: () => true });
  st.trainerArt = { ace: { custom: true, standL: "a.png", walkL: "a.png", standR: "b.png", walkR: "b.png", w: 30, h: 60 } };
  const now = Date.now();
  for (const t of [10, 300, 560, 900, 2000]) {
    st.visitor = { id: `s${t}`, pick: { dex: 9, trainer: true }, dir: "l", row: 0, from: 1100, to: 1099, start: now - 9000, dur: 1000, x: 1100, purse: 0, gift: "none",
      sentOut: { at: now - t, dex: 9 }, halt: { kind: "trainer", x: 1100, at: now - t, until: now + 60000, icon: "❗", face: "L" },
      trainer: { cls: "ace", title: "Ace Trainer", name: "Mia", team: [{ dex: 3 }, { dex: 9 }], idx: 1, waited: true } };
    st.render(cx);
  }
  for (const t of [10, 400, 1500]) {
    st.visitor = { id: `y${t}`, pick: { dex: 25, shiny: true }, dir: "r", row: 0, from: -40, to: 1240, start: now - t, dur: 60000, purse: 0 };
    st.render(cx);
  }
  st.visitor = null;
  st.tick(cx);
  st.mons.t0.faintAt = now - 100;
  st.render(cx);
});

test("the strip draws", () => {
  seed();
  const v = view({ rows: 1, scale: 0.75 });
  v.sized = true; v.width = 1200; v.height = 112;
  v.render(cx);
});

// A trainer in its corner: the others on its row walk out of its side, so the fight reads on its
// own; the one fighting it stays.
test("a trainer: those not fighting it step out of its side of the strip", () => {
  seed();
  const st = view({ rows: 1, scale: 0.75 });
  st.leader = true; st.sized = true; st.width = 1200; st.height = 112;
  const box = { x: 4, y: 4, w: 24, h: 30 }, cut = (n) => ({ path: `x/${n}.gif`, w: 64, h: 64, box });
  const meta = { walkR: cut("wr"), walkL: cut("wl"), idleR: cut("ir"), idleL: cut("il"), idleD: cut("id"), sleep: cut("s"), react: {} };
  st.sprites = new Proxy({}, { get: () => meta, set: () => true });
  st.tick(cx);
  const now = Date.now();
  st.visitor = { id: "tr", pick: { dex: 9, hp: 1 }, dir: "l", row: 0, from: 1100, to: 1099, start: now - 9000, dur: 1000, x: 1100, purse: 0,
    halt: { kind: "trainer", x: 1100, at: now, until: now + 60000, face: "L" },
    trainer: { cls: "ace", title: "Ace Trainer", name: "Mia", team: [{ dex: 9 }, { dex: 6 }], idx: 0, waited: true, fighter: "t0" } };
  for (const [k, x] of [["t0", 1000], ["t1", 1050], ["t2", 1080]]) Object.assign(st.mons[k], { x, from: x, target: x, moving: false, pauseUntil: now + 60000, react: null });
  st.tick(cx);
  const [f, o, o2] = ["t0", "t1", "t2"].map((k) => st.mons[k]);
  assert.ok(!f.moving || f.target > 900, "the fighter stays");
  assert.ok(o.moving && o.target < 1100 - 80 - 37, `t1 steps out (to ${o.target})`);
  assert.ok(o2.moving && o2.target < 1100 - 80 - 37, `t2 steps out (to ${o2.target})`);
  // Apart, with room for their names (they bunched up at the zone's edge, names cut short).
  assert.ok(Math.abs(o.target - o2.target) >= 100, `${o.target} ${o2.target}`);
  // One far off stays put.
  Object.assign(st.mons.t1, { x: 300, from: 300, target: 300, moving: false, pauseUntil: now + 60000 });
  st.tick(cx);
  assert.ok(!st.mons.t1.moving, "one far off stays");
});

// The Day Care: two of the Box left there from their cards, its line drawn; an egg's minutes of
// work done, it hatches into the Box (and the Pokédex), and the strip says so.
test("the Day Care: a pair from the Box, an egg hatching into it", () => {
  seed();
  const CARE = `${ids.MOD}-daycare`;
  setPanes({ ...H.store.get(ids.MOD).panes, "box-1-133": { dex: 133, gender: "m", hearts: 2 }, "box-3-448": { dex: 448, gender: "f", hearts: 1 } });
  view({ bag: true, tab: "box", sel: "box-1-133" }).render(cx);
  click("box-care-box-1-133:on_click");
  assert.deepEqual(H.store.get(CARE).pair, ["box-1-133"]);
  const v = view({ bag: true, tab: "box", sel: "box-3-448" });
  v.render(cx);
  click("box-care-box-3-448:on_click");
  assert.deepEqual(H.store.get(CARE).pair, ["box-1-133", "box-3-448"]);
  v.render(cx); // its line: Eevee ♂ & Lucario ♀, they get along
  // Taken back out: one left.
  click("box-care-box-3-448:on_click");
  assert.deepEqual(H.store.get(CARE).pair, ["box-1-133"]);
  // An egg one minute from hatching: a minute of work and it's a Riolu in the Box.
  H.store.set(CARE, { v: 1, pair: ["box-1-133", "box-3-448"], egg: { dex: 447, need: 60, done: 59, at: 1 } });
  const st = view({ rows: 1, scale: 0.75 });
  st.leader = true; st.sized = true; st.width = 1200; st.height = 112;
  st.dayCare(2, Date.now());
  const born = Object.entries(picks()).find(([k, p]) => k.startsWith("box-") && p.dex === 447);
  assert.ok(born && born[1].hatched && born[1].hearts === 2 && born[1].nature, "a Riolu, hatched");
  assert.ok(H.store.get(`${ids.MOD}-dex`).caught.includes(447));
  const care = H.store.get(CARE);
  assert.equal(care.egg, null);
  assert.equal(care.last.dex, 447);
  st.render(cx); // "🥚 Riolu hatched · in the Box"
  // A click on it: the Box, with the Riolu picked.
  H.log.opened.length = 0;
  click("pokemon-hatched:on_mouse_down:left");
  assert.equal(care.last.slot, born[0]);
  assert.equal(H.log.opened.at(-1)?.props?.sel, born[0], JSON.stringify(H.log.opened.at(-1)));
  view({ bag: true, tab: "box", sel: born[0] }).render(cx);
});

// A wild one first drawn late (its picture came in after it set off): drawn where it has got to,
// not at the edge (from there it crossed the whole strip in what was left of its walk, flying).
test("a wild one drawn late starts where it has walked to by now", () => {
  seed();
  const st = view({ rows: 1, scale: 0.75 });
  st.sized = true; st.width = 1200; st.height = 112;
  const box = { x: 4, y: 4, w: 24, h: 30 }, cut = (n) => ({ path: `x/${n}.gif`, w: 64, h: 64, box });
  const meta = { walkR: cut("wr"), walkL: cut("wl"), idleR: cut("ir"), idleL: cut("il"), idleD: cut("id"), sleep: cut("s"), react: {} };
  st.sprites = new Proxy({}, { get: () => meta, set: () => true });
  const now = Date.now();
  st.visitor = { id: "late", pick: { dex: 132, hp: 1 }, dir: "l", row: 0, from: 1000, to: 0, start: now - 20000, dur: 40000, purse: 0 };
  st.render(cx);
  const mid = 128 / 2, x = K.lefts["visitor-late-0"] + mid;
  assert.ok(Math.abs(x - 500) < 20, `drawn at ${x}, where it is by now: ~500`);
});

// A trainer's balls (one a Pokémon, grey once down) always show: walking in too, and no tag
// under it (sent out…, hover) over them: the tags keep off the trainer's side.
test("a trainer's balls always show: walking in, and no tag over them", () => {
  seed();
  const st = view({ rows: 1, scale: 0.75 });
  st.sized = true; st.width = 1200; st.height = 112;
  const box = { x: 4, y: 4, w: 24, h: 30 }, cut = (n) => ({ path: `x/${n}.gif`, w: 64, h: 64, box });
  const meta = { walkR: cut("wr"), walkL: cut("wl"), idleR: cut("ir"), idleL: cut("il"), idleD: cut("id"), sleep: cut("s"), react: {} };
  st.sprites = new Proxy({}, { get: () => meta, set: () => true });
  st.trainerArt = { ace: { custom: true, standL: "a.png", walkL: "a.png", standR: "b.png", walkR: "b.png", w: 30, h: 60 } };
  const now = Date.now();
  const team = [{ dex: 3 }, { dex: 6 }, { dex: 9 }];
  // Walking in (not in its corner yet).
  st.visitor = { id: "walkin", pick: { dex: 3, hp: 1 }, dir: "l", row: 0, from: 1240, to: 1000, start: now - 1000, dur: 8000, purse: 0,
    trainer: { cls: "ace", title: "Ace Trainer", name: "Mia", team, idx: 0 } };
  st.render(cx);
  assert.ok("trainer-balls-walkin" in K.lefts, "its balls, walking in");
  // In its corner, its next one just sent out: "… sent out …" kept left of the trainer.
  st.visitor = { id: "corner", pick: { dex: 6, hp: 1 }, dir: "l", row: 0, from: 1100, to: 1099, start: now - 9000, dur: 1000, x: 1100, purse: 0,
    halt: { kind: "trainer", x: 1100, at: now, until: now + 60000, face: "L" }, sentOut: { at: now - 1000, dex: 6 },
    trainer: { cls: "ace", title: "Ace Trainer", name: "Mia", team, idx: 1, waited: true } };
  st.render(cx);
  const trainerX = 1100 + st.trainerGap(st.visitor, 0.75), half = st.trainerSize(st.visitor, 0.75).w / 2;
  assert.ok(K.lefts["visitor-tag-corner"] + 300 <= trainerX - half, `tag ends at ${K.lefts["visitor-tag-corner"] + 300}, trainer from ${trainerX - half}`);
});

// Abilities in a battle: yours a Gyarados (Intimidate), the wild one a Snorlax with Thick Fat:
// said in the first hit's words (no tag of their own over the fight), once each.
test("abilities in a fight: Intimidate as they meet, over its head before the moves, once", () => {
  seed();
  setPanes({ ...H.store.get(ids.MOD).panes, p0: { dex: 130, jobs: 3, abil: 0 } });
  const st = view({ rows: 1, scale: 0.75 });
  st.leader = true; st.sized = true; st.width = 1200; st.height = 112;
  const box = { x: 4, y: 4, w: 24, h: 30 }, cut = (n) => ({ path: `x/${n}.gif`, w: 64, h: 64, box });
  const meta = { walkR: cut("wr"), walkL: cut("wl"), idleR: cut("ir"), idleL: cut("il"), idleD: cut("id"), sleep: cut("s"), react: {} };
  st.sprites = new Proxy({}, { get: () => meta, set: () => true });
  st.tick(cx);
  const now = Date.now();
  st.visitor = { id: "fat", pick: { dex: 143, hp: 1, abil: 1 }, dir: "l", row: 0, from: 600, to: 599, start: now - 5000, dur: 1000, x: 600, purse: 0, halt: { kind: "curious", x: 600, at: now, until: now + 60000 } };
  Object.assign(st.mons.t0, { x: 560, moving: false });
  st.dropAt = { addr: "t0", dizzy: false };
  st.tick(cx);
  const fx = st.visitor.fight;
  assert.ok(fx, "a fight");
  // Intimidate: over Gyarados's head at once, on its own, before any move (the fight held back).
  const note = (st.mons.t0.sparNotes ?? []).find((n) => /Intimidate/.test(n.text));
  assert.ok(note && note.at - now < 600, JSON.stringify(st.mons.t0.sparNotes));
  assert.ok(fx.at >= note.until - 400, `moves from ${fx.at - now}, Intimidate till ${note.until - now}`);
  const said = [fx.blow?.word?.[0], st.mons.t0.blows?.at(-1)?.word?.[0]].join(" | ");
  assert.doesNotMatch(said, /Intimidate/); // not in a hit's words
  assert.equal(st.visitor.abil.w.st.atk, -1, "Snorlax's Attack a stage down");
  st.render(cx);
  assert.ok(!Object.keys(K.tops).some((k) => k.startsWith("abil-")), "no ability tag over the fight");
  // The next exchange: Intimidate isn't said again.
  st.visitor.fight = null; st.mons.t0.restUntil = 0; st.mons.t0.battleUntil = 0; st.mons.t0.blows = [];
  Object.assign(st.mons.t0, { x: 560, moving: false });
  st.dropAt = { addr: "t0", dizzy: false };
  st.tick(cx);
  const again = [st.visitor.fight?.blow?.word?.[0], st.mons.t0.blows?.at(-1)?.word?.[0], ...(st.mons.t0.sparNotes ?? []).filter((n) => n.at > note.at).map((n) => n.text)].join(" | ");
  assert.doesNotMatch(again, /Intimidate/);
});

// A big one whose head nears the strip's top: its move's name and its ability over its head go
// under its health bar, not on it (pinned to the top, they hid a trainer's Pokémon's bar).
test("a big one's words keep off its health bar", () => {
  seed();
  const st = view({ rows: 1, scale: 0.75 });
  st.sized = true; st.width = 1200; st.height = 112;
  const big = { x: 4, y: 4, w: 60, h: 90 }, cut = (n) => ({ path: `x/${n}.gif`, w: 96, h: 96, box: big });
  const meta = { walkR: cut("wr"), walkL: cut("wl"), idleR: cut("ir"), idleL: cut("il"), idleD: cut("id"), sleep: cut("s"), react: {} };
  st.sprites = new Proxy({}, { get: () => meta, set: () => true });
  const now = Date.now();
  st.visitor = { id: "big", pick: { dex: 143, hp: 0.6 }, dir: "l", row: 0, from: 800, to: 799, start: now - 9000, dur: 1000, x: 800, purse: 0,
    fight: { at: now - 500, hitAt: now - 300, backAt: now - 100, backLaunch: now + 100, backHit: now + 400, until: now + 2000, x: 800, ownX: 700, own: "t0", hp: 0.6,
      back: { hp: 0.5 }, wildMove: { type: "normal", name: "Body Slam", physical: true }, ownMove: { type: "fire", name: "Ember" } } };
  st.render(cx);
  st.render(cx); // (the move's name: in place from the second draw)
  const move = K.tops["mvw-big-" + st.visitor.fight.at];
  // No room above (its head near the top): the move's name just under its bar (bar + 7), never
  // pinned to the top on the bar (2, before).
  assert.ok(move > 2, `move at ${move}`);
});

// The wild one's Intimidate: over its head as they meet, the moves after it.
test("a wild one's Intimidate: said over its head first", () => {
  seed();
  const st = view({ rows: 1, scale: 0.75 });
  st.leader = true; st.sized = true; st.width = 1200; st.height = 112;
  const box = { x: 4, y: 4, w: 24, h: 30 }, cut = (n) => ({ path: `x/${n}.gif`, w: 64, h: 64, box });
  const meta = { walkR: cut("wr"), walkL: cut("wl"), idleR: cut("ir"), idleL: cut("il"), idleD: cut("id"), sleep: cut("s"), react: {} };
  st.sprites = new Proxy({}, { get: () => meta, set: () => true });
  st.tick(cx);
  const now = Date.now();
  st.visitor = { id: "gy", pick: { dex: 130, hp: 1, abil: 0 }, dir: "l", row: 0, from: 600, to: 599, start: now - 5000, dur: 1000, x: 600, purse: 0, halt: { kind: "curious", x: 600, at: now, until: now + 60000 } };
  Object.assign(st.mons.t0, { x: 560, moving: false });
  st.dropAt = { addr: "t0", dizzy: false };
  st.tick(cx);
  const fx = st.visitor.fight;
  assert.equal(fx.entry?.text, "Intimidate");
  assert.ok(fx.at >= fx.entry.until - 400, "the moves after it");
  st.render(cx);
});

// A wild one walking: a redraw a second or two after the last (something else on the strip) keeps
// its walk as it is (it went on a new leg, its walking picture starting over: it seemed to glide);
// only a long gap (the window hidden) sets it off again from where it is.
test("a walking wild one keeps its leg through ordinary redraws", () => {
  seed();
  const st = view({ rows: 1, scale: 0.75 });
  st.sized = true; st.width = 1200; st.height = 112;
  const box = { x: 4, y: 4, w: 24, h: 30 }, cut = (n) => ({ path: `x/${n}.gif`, w: 64, h: 64, box });
  const meta = { walkR: cut("wr"), walkL: cut("wl"), idleR: cut("ir"), idleL: cut("il"), idleD: cut("id"), sleep: cut("s"), react: {} };
  st.sprites = new Proxy({}, { get: () => meta, set: () => true });
  const now = Date.now();
  st.visitor = { id: "walk", pick: { dex: 143, hp: 1 }, dir: "l", row: 0, from: 1000, to: -40, start: now - 3000, dur: 23000, purse: 0, leg: 0 };
  st.render(cx);
  st.drawnAt = Date.now() - 1600; // the last frame 1.6 s ago: an ordinary gap
  st.render(cx);
  assert.equal(st.visitor.leg, 0, "the same leg");
  st.drawnAt = Date.now() - 5000; // 5 s without a frame: the window was hidden
  st.render(cx);
  assert.equal(st.visitor.leg, 1, "set off again from where it is");
});

// The Bag's Day Care tab: empty, its candidates; one left there from it, its partners; Take back;
// a hatched one a click away from its card in the Box.
test("the Day Care tab: leave two, take one back, the hatched ones", () => {
  seed();
  const CARE = `${ids.MOD}-daycare`;
  setPanes({ ...H.store.get(ids.MOD).panes, "box-1-133": { dex: 133, gender: "m", hearts: 2 }, "box-3-448": { dex: 448, gender: "f", hearts: 1 }, "box-9-132": { dex: 132, caught: 5 } });
  const v = view({ bag: true, tab: "care" });
  v.render(cx);
  assert.ok(K.handlers["care-in-box-9-132:on_click"], "Ditto offered");
  // The search: "luc" leaves Lucario only.
  for (const k of Object.keys(K.handlers)) if (k.startsWith("care-in-")) delete K.handlers[k];
  v.careQuery = "luc"; v.render(cx);
  assert.ok(K.handlers["care-in-box-3-448:on_click"], "Lucario a match");
  assert.ok(!K.handlers["care-in-box-9-132:on_click"], "Ditto not");
  v.careQuery = ""; v.render(cx);
  click("care-in-box-1-133:on_click");
  assert.deepEqual(H.store.get(CARE).pair, ["box-1-133"]);
  v.render(cx);
  assert.ok(K.handlers["care-in-box-3-448:on_click"], "Lucario ♀ offered for Eevee ♂");
  click("care-in-box-3-448:on_click");
  assert.deepEqual(H.store.get(CARE).pair, ["box-1-133", "box-3-448"]);
  v.render(cx);
  click("care-out-box-1-133:on_click");
  assert.deepEqual(H.store.get(CARE).pair, ["box-3-448"]);
  // An egg, and one hatched before.
  H.store.set(CARE, { v: 1, pair: ["box-1-133", "box-3-448"], egg: { dex: 133, need: 60, done: 20, at: 1 }, hatched: 1, born: [{ dex: 448, slot: "box-3-448", at: 1 }] });
  v.render(cx);
  click("care-born-box-3-448:on_click");
  assert.equal(v.bagTab, "box");
  assert.equal(v.boxSel, "box-3-448");
});

// The picker's 📦 Box filter: only the kinds waiting in the Box (a click: its preview, those of it
// there to bring out).
test("the picker's Box filter: the kinds waiting in the Box", () => {
  seed();
  const v = picker();
  v.filtersOpen = true; // (the chips show with the filters open)
  v.render(cx);
  click("only-box:on_click");
  assert.equal(v.only.box, true);
  const keys = v.searchOnly().keys;
  assert.ok(keys.has("133") && keys.has("448"), [...keys].join(","));
  assert.ok(!keys.has("6") && !keys.has("37"), "not those with agents");
  v.render(cx);
});

// A spar: both awake through it (asleep, its zZ showed over one throwing Earthquake).
test("a spar keeps both awake", () => {
  seed();
  const st = view({ rows: 1, scale: 0.75 });
  st.leader = true; st.sized = true; st.width = 1200; st.height = 112;
  const box = { x: 4, y: 4, w: 24, h: 30 }, cut = (n) => ({ path: `x/${n}.gif`, w: 64, h: 64, box });
  const meta = { walkR: cut("wr"), walkL: cut("wl"), idleR: cut("ir"), idleL: cut("il"), idleD: cut("id"), sleep: cut("s"), react: {} };
  st.sprites = new Proxy({}, { get: () => meta, set: () => true });
  st.tick(cx);
  const now = Date.now();
  Object.assign(st.mons.t0, { x: 500, moving: false, react: null, awakeUntil: 0 });
  Object.assign(st.mons.t1, { x: 520, moving: false, react: null, awakeUntil: 0 });
  st.dropAt = { addr: "t0", dizzy: false };
  st.tick(cx);
  const [a, b] = [st.mons.t0, st.mons.t1];
  assert.ok(a.react?.seq, "a spar");
  assert.ok(a.awakeUntil > a.react.until && b.awakeUntil > b.react.until, `${a.awakeUntil - now} ${b.awakeUntil - now}`);
  st.render(cx);
});

// A trainer's ❗: as it spots you, till its first battle (not over every pause between blows).
test("a trainer's ! only till its first battle", () => {
  seed();
  const st = view({ rows: 1, scale: 0.75 });
  st.leader = true; st.sized = true; st.width = 1200; st.height = 112;
  const box = { x: 4, y: 4, w: 24, h: 30 }, cut = (n) => ({ path: `x/${n}.gif`, w: 64, h: 64, box });
  const meta = { walkR: cut("wr"), walkL: cut("wl"), idleR: cut("ir"), idleL: cut("il"), idleD: cut("id"), sleep: cut("s"), react: {} };
  st.sprites = new Proxy({}, { get: () => meta, set: () => true });
  st.trainerArt = { ace: { custom: true, standL: "a.png", walkL: "a.png", standR: "b.png", walkR: "b.png", w: 30, h: 60 } };
  st.tick(cx);
  const now = Date.now();
  st.visitor = { id: "tr", pick: { dex: 9, hp: 1 }, dir: "l", row: 0, from: 800, to: 799, start: now - 9000, dur: 1000, x: 800, purse: 0,
    halt: { kind: "trainer", x: 800, at: now, until: now + 60000, icon: "❗", face: "L" },
    trainer: { cls: "ace", title: "Ace Trainer", name: "Mia", team: [{ dex: 9 }, { dex: 6 }], idx: 0, waited: true } };
  Object.assign(st.mons.t0, { x: 760, moving: false, react: null });
  st.dropAt = { addr: "t0", dizzy: false };
  st.tick(cx);
  assert.equal(st.visitor.trainer.fought, true);
  // Between blows, waiting again: no ❗.
  st.visitor.fight = null;
  st.visitor.halt = { kind: "trainer", x: 800, at: now, until: now + 60000, icon: "❗", face: "L" };
  st.render(cx);
});

// The Rival: it comes with its starter's line (chosen the first time), counted; its entrance drawn.
test("the Rival comes: its team, its visit counted, its entrance", () => {
  seed();
  const RIVAL = `${ids.MOD}-rival`;
  const st = view({ rows: 1, scale: 0.75 });
  st.leader = true; st.sized = true; st.width = 1200; st.height = 112;
  const box = { x: 4, y: 4, w: 24, h: 30 }, cut = (n) => ({ path: `x/${n}.gif`, w: 64, h: 64, box });
  const meta = { walkR: cut("wr"), walkL: cut("wl"), idleR: cut("ir"), idleL: cut("il"), idleD: cut("id"), sleep: cut("s"), react: {} };
  st.sprites = new Proxy({}, { get: () => meta, set: () => true });
  st.trainerArt = { rival: { custom: true, standL: "a.png", walkL: "a.png", standR: "b.png", walkR: "b.png", w: 30, h: 60 } };
  const now = Date.now();
  const tr = st.rivalComes(now, () => null);
  assert.equal(tr.cls, "rival");
  assert.equal(tr.team.length, 3);
  const r = H.store.get(RIVAL);
  assert.equal(r.meets, 1);
  assert.ok(r.starter > 0 && r.nextAt > now);
  // In its corner, its entrance under way.
  st.visitor = { id: "rv", pick: { dex: tr.team[0].dex, hp: 1 }, dir: "l", row: 0, from: 1100, to: 1099, start: now - 9000, dur: 1000, x: 1100, purse: 0,
    halt: { kind: "trainer", x: 1100, at: now, until: now + 60000, icon: "❗", face: "L" },
    trainer: { ...tr, idx: 0, lives: 3, waited: true, introAt: now - 1000, greet: "Hey!", record: [1, 2] } };
  st.render(cx);
  assert.ok("rival-in-rv-bar0" in K.lefts && "rival-in-rv-say" in K.lefts, "its bars and challenge");
});

// The Rival's rules: swapping in one of yours while the one before is still up costs a free hit
// (it strikes, yours doesn't); its Potion on one in the red (its turn: no strike).
test("the Rival: a switch costs a free hit; its Potion", () => {
  seed();
  const st = view({ rows: 1, scale: 0.75 });
  st.leader = true; st.sized = true; st.width = 1200; st.height = 112;
  const box = { x: 4, y: 4, w: 24, h: 30 }, cut = (n) => ({ path: `x/${n}.gif`, w: 64, h: 64, box });
  const meta = { walkR: cut("wr"), walkL: cut("wl"), idleR: cut("ir"), idleL: cut("il"), idleD: cut("id"), sleep: cut("s"), react: {} };
  st.sprites = new Proxy({}, { get: () => meta, set: () => true });
  st.trainerArt = { rival: { custom: true, standL: "a.png", walkL: "a.png", standR: "b.png", walkR: "b.png", w: 30, h: 60 } };
  st.tick(cx);
  const now = Date.now();
  const rival = (hp) => ({ id: `rv${hp}`, pick: { dex: 9, hp, abil: 0 }, dir: "l", row: 0, from: 800, to: 799, start: now - 9000, dur: 1000, x: 800, purse: 0,
    halt: { kind: "trainer", x: 800, at: now, until: now + 60000, icon: "❗", face: "L" },
    trainer: { cls: "rival", title: "Rival", name: "Blaze", rival: true, team: [{ dex: 9 }, { dex: 3 }, { dex: 6 }], idx: 0, waited: true, lives: 3, potions: 2, effort: 1.55 } });
  // Its Potion: in the red, it drinks (+50%), and doesn't strike back.
  st.visitor = rival(0.2);
  Object.assign(st.mons.t0, { x: 760, moving: false, react: null });
  st.dropAt = { addr: "t0", dizzy: false };
  st.tick(cx);
  assert.equal(st.visitor.trainer.potions, 1);
  assert.equal(st.visitor.fight.back, null, "its turn the Potion");
  assert.match(st.visitor.fight.entry?.text ?? "", /Potion/);
  // A switch: t0 still up, t1 dropped in: it strikes, t1 doesn't.
  st.visitor = rival(1);
  st.visitor.abil = { own: "t0", idx: 0, o: { ab: "", hp: 1, st: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } }, w: { ab: "", hp: 1, st: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } } };
  Object.assign(st.mons.t1, { x: 760, moving: false, react: null, restUntil: 0 });
  st.dropAt = { addr: "t1", dizzy: false };
  st.tick(cx);
  const fx = st.visitor.fight;
  assert.ok(fx.back && fx.blow === null, "it struck, yours didn't");
  assert.ok((st.mons.t1.sparNotes ?? []).some((n) => /Switched/.test(n.text)));
});

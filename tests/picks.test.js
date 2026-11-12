import { test } from "node:test";
import assert from "node:assert/strict";
import { loadPicks, assign, hash, randomEntry } from "../mods/pokemon-herd/picks.js";
import { hasShiny, isWalkable } from "../mods/pokemon-herd/dex.js";

test("loadPicks tolerates junk", () => {
  for (const junk of [null, undefined, 5, "x", { panes: 3 }, { panes: { p: { dex: "x" } } }, { panes: { p: null } }]) {
    assert.deepEqual(loadPicks(junk, null), { panes: {}, migrated: false });
  }
});

test("loadPicks migrates legacy", () => {
  assert.deepEqual(loadPicks(null, { panes: { p1: 25, p2: 514 } }), { panes: { p1: { dex: 25, shiny: false, mega: "auto" } }, migrated: true });
});

test("loadPicks prefers current", () => {
  const r = loadPicks({ v: 2, panes: { p1: { dex: 4, shiny: true } } }, { panes: { p1: 25 } });
  assert.deepEqual(r, { panes: { p1: { dex: 4, shiny: true, mega: "auto" } }, migrated: false });
});

test("assign keeps saved picks", () => {
  const { ids, fresh } = assign([{ address: "t1", pane: "p1" }], { p1: { dex: 7, shiny: true } });
  assert.deepEqual(ids.t1, { dex: 7, shiny: true });
  assert.deepEqual(fresh, {});
});

test("assign gives unique dex on screen", () => {
  // Saved picks take the slots fresh ones would hash to: they still all differ.
  const list = Array.from({ length: 30 }, (_, i) => ({ address: `t${i}`, pane: `p${i}` }));
  const first = assign(list, {}).ids;
  const saved = { p0: first.t1 }; // t0 is saved as what t1 would get
  const { ids } = assign(list, saved);
  const dexes = Object.values(ids).map((p) => p.dex);
  assert.equal(new Set(dexes).size, dexes.length);
});

test("assign is stable for paneless agents", () => {
  const list = [{ address: "t9", pane: "" }];
  const a = assign(list, {});
  const b = assign(list, {});
  assert.deepEqual(a.ids, b.ids);
  assert.deepEqual(a.fresh, {});
  assert.ok(isWalkable(a.ids.t9.dex));
});

test("shiny rate", () => {
  let shiny = 0;
  for (let i = 0; i < 6400; i++) {
    const { ids } = assign([{ address: `t${i}`, pane: `pane-${i}` }], {});
    const p = ids[`t${i}`];
    if (p.shiny) { shiny++; assert.ok(hasShiny(p.dex)); }
  }
  assert.ok(shiny >= 60 && shiny <= 140, `shiny count ${shiny}`);
});

test("hash is FNV-1a", () => {
  assert.equal(hash(""), 2166136261);
});

test("a paneless agent keeps its Pokémon when a pane later gets the same one", () => {
  const memo = {};
  const first = assign([{ address: "t9", pane: "" }], {}, memo).ids.t9;
  const later = assign([{ address: "t1", pane: "p1" }, { address: "t9", pane: "" }], { p1: { dex: first.dex, shiny: false } }, memo).ids.t9;
  assert.deepEqual(later, first);
});

test("mega mode: kept when valid, Auto when missing or junk", () => {
  const r = loadPicks({ v: 2, panes: { a: { dex: 6, shiny: false, mega: "on" }, b: { dex: 6, shiny: false }, c: { dex: 6, shiny: false, mega: "x" } } }, null);
  assert.equal(r.panes.a.mega, "on");
  assert.equal(r.panes.b.mega, "auto");
  assert.equal(r.panes.c.mega, "auto");
  assert.equal(assign([{ address: "t1", pane: "p1" }], {}).ids.t1.mega, "auto");
});

test("a regional form is kept when it exists, dropped (species kept) when not", () => {
  const r = loadPicks({ v: 2, panes: { a: { dex: 37, form: "0001" }, b: { dex: 37, form: "0009" } } }, null);
  assert.equal(r.panes.a.form, "0001");
  assert.equal(r.panes.b.dex, 37);
  assert.equal(r.panes.b.form, undefined);
});

test("Mega X or Y: kept when it's X or Y, dropped otherwise", () => {
  const r = loadPicks({ v: 2, panes: { a: { dex: 6, shiny: false, megaKind: "Y" }, b: { dex: 6, shiny: false, megaKind: "Z" }, c: { dex: 6, shiny: false } } }, null);
  assert.equal(r.panes.a.megaKind, "Y");
  assert.equal("megaKind" in r.panes.b, false);
  assert.equal("megaKind" in r.panes.c, false);
});

test("randomEntry skips the current one and Pokémon others have", () => {
  const entries = [{ dex: 1 }, { dex: 4 }, { dex: 7 }, { dex: 25 }];
  for (let i = 0; i < 20; i++) {
    const r = randomEntry(entries, { dex: 1 }, new Set([4, 7]), Math.random);
    assert.deepEqual(r, { dex: 25 });
  }
});

test("randomEntry falls back when everything is taken", () => {
  const entries = [{ dex: 1 }, { dex: 4 }];
  assert.deepEqual(randomEntry(entries, { dex: 1 }, new Set([4]), () => 0), { dex: 4 });
  assert.deepEqual(randomEntry([{ dex: 1 }], { dex: 1 }, new Set(), () => 0), null);
  assert.equal(randomEntry([], null, new Set(), () => 0), null);
});

test("randomEntry tells regional forms apart from the current one", () => {
  const entries = [{ dex: 26 }, { dex: 26, form: 1 }];
  assert.deepEqual(randomEntry(entries, { dex: 26 }, new Set(), () => 0.99), { dex: 26, form: 1 });
});

import { EVOLVE_JOBS, MAX_HEARTS, gainJob, useItem, itemUse, withHearts, evolveTarget } from "../mods/pokemon-herd/picks.js";
test("loadPicks keeps jobs and Everstone", () => {
  const r = loadPicks({ panes: { p: { dex: 4, jobs: 3, stay: true }, q: { dex: 4, jobs: -1, stay: "x" } } }, null);
  assert.equal(r.panes.p.jobs, 3);
  assert.equal(r.panes.p.stay, true);
  assert.equal(r.panes.q.jobs, undefined);
  assert.equal(r.panes.q.stay, undefined);
});

test("gainJob counts, then evolves at EVOLVE_JOBS", () => {
  let p = { dex: 4, shiny: true, mega: "on" };
  for (let i = 1; i < EVOLVE_JOBS; i++) {
    const r = gainJob(p, "pane");
    assert.equal(r.evolved, false);
    p = r.pick;
    assert.equal(p.jobs, i);
  }
  const r = gainJob(p, "pane");
  assert.equal(r.evolved, true);
  assert.deepEqual(r.pick, { dex: 5, shiny: true, mega: "on", jobs: 0 });
});

test("gainJob: Everstone and final stages keep counting without evolving", () => {
  const stay = gainJob({ dex: 4, shiny: false, mega: "auto", stay: true, jobs: EVOLVE_JOBS }, "p");
  assert.equal(stay.evolved, false);
  assert.equal(stay.pick.dex, 4);
  const last = gainJob({ dex: 6, shiny: false, mega: "auto", jobs: EVOLVE_JOBS }, "p");
  assert.equal(last.evolved, false);
  assert.equal(last.pick.dex, 6);
});

test("gainJob: branches pick one per pane, regional forms stay regional when they can", () => {
  const a = gainJob({ dex: 133, shiny: false, mega: "auto", jobs: EVOLVE_JOBS - 1 }, "pane-a").pick.dex;
  assert.ok([134, 135, 136, 196, 197, 470, 471, 700].includes(a));
  assert.equal(gainJob({ dex: 133, shiny: false, mega: "auto", jobs: EVOLVE_JOBS - 1 }, "pane-a").pick.dex, a); // same pane: same
  const vulpix = useItem({ dex: 37, form: "0001", shiny: false, mega: "auto" }, "p", "ice-stone").pick;
  assert.equal(vulpix.dex, 38);
  assert.equal(vulpix.form, "0001"); // Alolan Ninetales
  const megaKind = gainJob({ dex: 5, shiny: false, mega: "auto", megaKind: "Y", jobs: EVOLVE_JOBS - 1 }, "p").pick;
  assert.equal(megaKind.megaKind, "Y"); // Charmeleon -> Charizard keeps its Y
});

test("stones: only for their own species, and they choose Eevee's branch", () => {
  assert.equal(itemUse({ dex: 25 }, "p", "thunder-stone"), "evolve");
  assert.equal(itemUse({ dex: 25 }, "p", "fire-stone"), null);
  assert.equal(useItem({ dex: 133, mega: "auto" }, "p", "water-stone").pick.dex, 134);
  assert.equal(useItem({ dex: 133, mega: "auto" }, "p", "fire-stone").pick.dex, 136);
  assert.equal(useItem({ dex: 4, mega: "auto" }, "p", "fire-stone"), null); // Charmander: jobs only
  assert.equal(itemUse({ dex: 25, stay: true }, "p", "thunder-stone"), null); // Everstone
});

test("stone species don't evolve by jobs", () => {
  assert.equal(gainJob({ dex: 25, mega: "auto", jobs: 50 }, "p").evolved, false); // Pikachu needs a Thunder Stone
});

test("friendship: full hearts evolve on the next job, at the right time of day", () => {
  assert.equal(gainJob({ dex: 172, mega: "auto", hearts: MAX_HEARTS - 1 }, "p").evolved, false); // Pichu
  assert.equal(gainJob({ dex: 172, mega: "auto", hearts: MAX_HEARTS }, "p").pick.dex, 25);
  // Eevee, full hearts: Espeon by day, Umbreon by night (or a job-way branch: Leafeon, Glaceon, Sylveon).
  const day = evolveTarget({ dex: 133, hearts: MAX_HEARTS }, "p", { night: false });
  const night = evolveTarget({ dex: 133, hearts: MAX_HEARTS }, "p", { night: true });
  assert.ok(day !== 197 && night !== 196);
  assert.equal(evolveTarget({ dex: 133, hearts: 0, jobs: 0 }, "p", {}), null);
});

test("time of day: Gligar evolves at night only", () => {
  assert.equal(gainJob({ dex: 207, mega: "auto", jobs: EVOLVE_JOBS - 1 }, "p", { night: false }).evolved, false);
  assert.equal(gainJob({ dex: 207, mega: "auto", jobs: EVOLVE_JOBS - 1 }, "p", { night: true }).pick.dex, 472);
});

test("Rare Candy evolves a levelling one now; berries add hearts", () => {
  assert.equal(useItem({ dex: 4, mega: "auto" }, "p", "rare-candy", {}, 99).pick.dex, 5);
  assert.equal(useItem({ dex: 4, mega: "auto" }, "p", "rare-candy", {}, 99).pick.evolvedAt, 99);
  assert.equal(itemUse({ dex: 6 }, "p", "rare-candy"), null); // nothing to become
  assert.equal(itemUse({ dex: 25 }, "p", "rare-candy"), null); // needs a stone
  assert.equal(useItem({ dex: 4, hearts: 2 }, "p", "berry").pick.friend, 50); // half a heart
  assert.equal(useItem({ dex: 4, friend: 50 }, "p", "berry").pick.hearts, 3);
  assert.equal(itemUse({ dex: 4, hearts: MAX_HEARTS }, "p", "berry"), null);
  assert.equal(withHearts({ dex: 4, hearts: 1 }, -5).hearts, 0);
});

test("loadPicks keeps hearts and evolvedAt", () => {
  const r = loadPicks({ panes: { p: { dex: 4, hearts: 9, evolvedAt: 5 }, q: { dex: 4, hearts: "x" } } }, null);
  assert.equal(r.panes.p.hearts, MAX_HEARTS);
  assert.equal(r.panes.p.evolvedAt, 5);
  assert.equal(r.panes.q.hearts, undefined);
});

test("Shiny Charm odds", () => {
  const list = Array.from({ length: 400 }, (_, i) => ({ address: `t${i}`, pane: `p${i}` }));
  const n64 = Object.values(assign(list, {}, {}, 64).ids).filter((p) => p.shiny).length;
  const n32 = Object.values(assign(list, {}, {}, 32).ids).filter((p) => p.shiny).length;
  assert.ok(n32 > n64);
});

import { needsText } from "../mods/pokemon-herd/picks.js";
test("needsText says what it takes", () => {
  assert.equal(needsText({ dex: 4, jobs: 3 }), "after 7 more jobs");
  assert.equal(needsText({ dex: 25 }), "with a Thunder Stone");
  assert.equal(needsText({ dex: 172 }), "at 5 ♥");
  assert.equal(needsText({ dex: 207, jobs: 9 }), "after 1 more job, at night");
  assert.equal(needsText({ dex: 6 }), null);
  assert.match(needsText({ dex: 133 }), /^with a Water, Thunder, Fire, Leaf or Ice Stone; .*at 5 ♥, by day.*at 5 ♥, at night$/);
});

import { takeHeld } from "../mods/pokemon-herd/picks.js";
test("held items: Lucky Egg doubles jobs, Soothe Bell doubles hearts gained", () => {
  assert.equal(gainJob({ dex: 4, mega: "auto", held: "lucky-egg" }, "p").pick.jobs, 2);
  assert.equal(gainJob({ dex: 4, mega: "auto", held: "lucky-egg", jobs: EVOLVE_JOBS - 2 }, "p").pick.dex, 5);
  assert.equal(withHearts({ dex: 4, hearts: 1, held: "soothe-bell" }, 1).hearts, 3);
  assert.equal(withHearts({ dex: 4, hearts: 3, held: "soothe-bell" }, -1).hearts, 2); // losing isn't doubled
  // Evolving keeps what it holds.
  assert.equal(gainJob({ dex: 4, mega: "auto", held: "amulet-coin", jobs: EVOLVE_JOBS - 1 }, "p").pick.held, "amulet-coin");
});

test("held items: give, swap, take back", () => {
  assert.equal(itemUse({ dex: 6 }, "p", "lucky-egg"), "hold");
  assert.equal(itemUse({ dex: 6, held: "lucky-egg" }, "p", "lucky-egg"), null); // holds one already
  const r = useItem({ dex: 6, held: "soothe-bell" }, "p", "lucky-egg");
  assert.equal(r.pick.held, "lucky-egg");
  assert.equal(r.back, "soothe-bell"); // goes back to the Bag
  assert.deepEqual(takeHeld({ dex: 6, held: "lucky-egg" }), { pick: { dex: 6 }, back: "lucky-egg" });
  assert.equal(takeHeld({ dex: 6 }), null);
  const loaded = loadPicks({ panes: { a: { dex: 6, held: "amulet-coin" }, b: { dex: 6, held: "junk" } } }, null).panes;
  assert.equal(loaded.a.held, "amulet-coin");
  assert.equal(loaded.b.held, undefined);
});

import { familyOf, youngOf } from "../mods/pokemon-herd/picks.js";
test("familyOf: sub-agents without a pane, whose parent is on screen", () => {
  const list = [{ address: "t1", pane: "p1" }, { address: "t2", pane: "" }, { address: "t3", pane: "p3" }, { address: "t4", pane: "" }];
  const terms = [{ address: "t2", parent: "t1" }, { address: "t3", parent: "t1" }, { address: "t4", parent: "t9" }, { address: "t1", parent: null }];
  assert.deepEqual(familyOf(list, terms), { t2: "t1" });
  assert.deepEqual(familyOf(list, null), {});
});

test("youngOf: the first stage, same region, shiny kept, never Mega", () => {
  assert.deepEqual(youngOf({ dex: 6, shiny: true, mega: "on" }), { dex: 4, shiny: true, mega: "off", young: true });
  assert.equal(youngOf({ dex: 38, form: "0001" }).form, "0001"); // Alolan Ninetales -> Alolan Vulpix
  assert.equal(youngOf({ dex: 38, form: "0001" }).dex, 37);
  assert.equal(youngOf({ dex: 132 }).dex, 132); // Ditto: itself
});

import { subAgents } from "../mods/pokemon-herd/picks.js";
test("subAgents: live paneless children of agents on screen, as agents", () => {
  const list = [{ address: "t2t", pane: "p1", tab: "tb", tab_name: "poke", space: "s", space_name: "personal", tab_index: 0, status: "working" }];
  const terms = [
    { address: "t2t", parent: null, state: "live", status: "working" },
    { address: "t2w", parent: "t2t", state: "live", status: "done", title: "Reply", report: { app: "claude-code" } },
    { address: "t2x", parent: "t2t", state: "finished", status: "done" },
    { address: "t2y", parent: "t9", state: "live", status: "idle" },
    { address: "t2z", parent: "t2t", state: "live", status: null }, // a shell, no status
  ];
  const subs = subAgents(list, terms);
  assert.deepEqual(subs.map((a) => [a.address, a.pane, a.status, a.tab_name]), [["t2w", "", "idle", "poke"]]); // its done is its parent's business
  assert.deepEqual(familyOf([...list, ...subs], terms), { t2w: "t2t" });
});

import { cardOf } from "../mods/pokemon-herd/picks.js";
test("cardOf: hearts and the way to evolve, for the sidebar's card", () => {
  assert.deepEqual(cardOf({ dex: 4, jobs: 6, hearts: 3 }), { hearts: 3, maxHearts: 5, progress: 0.6, note: "6/10 jobs" });
  assert.deepEqual(cardOf({ dex: 25 }), { hearts: 0, maxHearts: 5, progress: null, note: "needs a Thunder Stone" });
  assert.equal(cardOf({ dex: 172 }).note, "evolves at 5 ♥");
  assert.equal(cardOf({ dex: 6 }).note, ""); // a last stage: the card says nothing
  assert.deepEqual(cardOf({ dex: 4, stay: true, jobs: 3 }), { hearts: 0, maxHearts: 5, progress: null, note: "Everstone" });
});

import { withFriend, friendOf, FRIEND, FRIEND_MAX, HEART_PTS } from "../mods/pokemon-herd/picks.js";
test("friendship points: hearts come slowly", () => {
  let p = { dex: 4 };
  for (let i = 0; i < 4; i++) p = withFriend(p, FRIEND.quick);
  assert.equal(p.friend, 16);
  assert.equal(p.hearts, 0); // four quick answers: not a heart yet
  p = withFriend(p, FRIEND.pat);
  assert.equal(p.hearts, 0);
  p = withFriend(p, FRIEND.pat);
  assert.equal(p.hearts, 1);
  assert.equal(withFriend({ dex: 4, friend: 99 }, 50).friend, FRIEND_MAX);
  assert.equal(withFriend({ dex: 4, friend: 5 }, FRIEND.hungry).friend, 0);
  assert.equal(friendOf({ dex: 4, hearts: 3 }), 3 * HEART_PTS); // saved before points: its hearts count
  // Five hearts is a long way: about 25 quick answers.
  assert.ok(FRIEND_MAX / FRIEND.quick >= 25);
});

test("loadPicks: points kept; old hearts become points", () => {
  const r = loadPicks({ panes: { a: { dex: 4, friend: 47 }, b: { dex: 4, hearts: 2 } } }, null).panes;
  assert.equal(r.a.friend, 47);
  assert.equal(r.a.hearts, 2);
  assert.equal(r.b.friend, 40);
  assert.equal(r.b.hearts, 2);
});

import { fromFolders } from "../mods/pokemon-herd/picks.js";
test("fromFolders: a new agent in an old folder gets its Pokémon back", () => {
  const panes = { old: { dex: 25, friend: 60, hearts: 3, jobs: 4, held: "lucky-egg" } };
  const folders = { "/src/tms": "old" };
  const list = [{ address: "t9", pane: "new" }];
  const r = fromFolders(list, panes, folders, { t9: "/src/tms" });
  assert.deepEqual(r.inherit, { new: panes.old });
  assert.deepEqual(r.folders, { "/src/tms": "new" });
});

test("fromFolders: not while the old one is on screen, not for a subfolder, only once", () => {
  const panes = { old: { dex: 25 } };
  const folders = { "/src/tms": "old" };
  // The old agent is still open: the new one gets its own.
  assert.deepEqual(fromFolders([{ address: "t1", pane: "old" }, { address: "t9", pane: "new" }], panes, folders, { t1: "/src/tms", t9: "/src/tms" }).inherit, {});
  // A subfolder is another folder.
  assert.deepEqual(fromFolders([{ address: "t9", pane: "new" }], panes, folders, { t9: "/src/tms/manager" }).inherit, {});
  // Two new ones in the folder: the first gets it, and keeps the folder.
  const two = fromFolders([{ address: "t8", pane: "a" }, { address: "t9", pane: "b" }], panes, folders, { t8: "/src/tms", t9: "/src/tms" });
  assert.deepEqual(Object.keys(two.inherit), ["a"]);
  assert.equal(two.folders["/src/tms"], "a");
  // A pane that already has its Pokémon keeps it.
  assert.deepEqual(fromFolders([{ address: "t9", pane: "new" }], { ...panes, new: { dex: 4 } }, folders, { t9: "/src/tms" }).inherit, {});
  // Sub-agents (no pane) take no part.
  assert.deepEqual(fromFolders([{ address: "t9", pane: "" }], panes, folders, { t9: "/src/tms" }).inherit, {});
});

import { rivalsOf, agentOfToast } from "../mods/pokemon-herd/picks.js";
test("rivalsOf: two agents working in one folder", () => {
  const list = [
    { address: "a", pane: "pa", status: "working" }, { address: "b", pane: "pb", status: "working" },
    { address: "c", pane: "pc", status: "idle" }, { address: "d", pane: "pd", status: "working" }, { address: "e", pane: "", status: "working" },
  ];
  const cwd = { a: "/src/tms", b: "/src/tms", c: "/src/tms", d: "/src/other", e: "/src/tms" };
  assert.deepEqual(rivalsOf(list, cwd), { a: ["b"], b: ["a"] }); // idle ones and sub-agents don't count
  assert.deepEqual(rivalsOf(list, {}), {});
});

test("agentOfToast: by its action, else by the tab named in its title", () => {
  const list = [{ address: "t1", pane: "p1", tab_name: "api" }, { address: "t2", pane: "p2", tab_name: "review" }];
  assert.equal(agentOfToast({ action: { name: "pane.focus", args: { pane: "p2" } } }, list).address, "t2");
  assert.equal(agentOfToast({ action: { name: "agent.focus", args: { terminal: "t1" } } }, list).address, "t1");
  assert.equal(agentOfToast({ title: "review needs you" }, list).address, "t2");
  assert.equal(agentOfToast({ title: "Update ready" }, list), null);
});

import { sessionUsed, sayingOf, TIRED_AT } from "../mods/pokemon-herd/picks.js";
test("sessionUsed: the highest 5-hour window used, from Usage Limits' state", () => {
  const state = { claude: { report: { windows: [{ id: "session", percent: 52 }, { id: "weekly_all", percent: 97 }] } },
    codex: { report: null, lastGood: { windows: [{ id: "session", percent: 91 }] } } };
  assert.equal(sessionUsed(state), 91);
  assert.ok(sessionUsed(state) >= TIRED_AT);
  assert.equal(sessionUsed(null), null);
  assert.equal(sessionUsed({ claude: { report: null, lastGood: null } }), null);
});

test("sayingOf: an agent's status message, one line, cut short", () => {
  assert.equal(sayingOf({ report: { msg: "Running the tests\nmore" } }), "Running the tests");
  assert.equal(sayingOf({ status: { msg: "Reading files" } }), "Reading files");
  assert.equal(sayingOf({ report: { msg: "x".repeat(60) } }).length, 48);
  assert.equal(sayingOf({ report: {} }), null);
  assert.equal(sayingOf(null), null);
});

import { heartsText, holdersOf } from "../mods/pokemon-herd/picks.js";
test("heartsText: hearts in halves", () => {
  assert.equal(heartsText(0), "0");
  assert.equal(heartsText(9), "0");
  assert.equal(heartsText(10), "½");
  assert.equal(heartsText(20), "1");
  assert.equal(heartsText(35), "1½");
  assert.equal(heartsText(100), "5");
  assert.equal(heartsText(999), "5");
});

test("holdersOf: the panes whose Pokémon holds an item", () => {
  const panes = { p1: { dex: 6, held: "lucky-egg" }, p2: { dex: 4 }, p3: { dex: 9, held: "soothe-bell" } };
  assert.deepEqual(holdersOf("lucky-egg", panes), [{ slot: "p1", pick: panes.p1 }]);
  assert.deepEqual(holdersOf("amulet-coin", panes), []);
});

import { visitorPick } from "../mods/pokemon-herd/picks.js";
import { WALKABLE as WALK } from "../mods/pokemon-herd/dex.js";
test("visitorPick: a walking species nobody on screen has, sometimes shiny", () => {
  const taken = new Set(WALK.slice(1)); // all but the first
  assert.equal(visitorPick(taken, () => 0.5).dex, WALK[0]);
  assert.equal(visitorPick(new Set(WALK), () => 0).dex, WALK[0]); // all taken: anyone
  let shiny = 0;
  for (let i = 0; i < 2000; i++) if (visitorPick(new Set()).shiny) shiny++;
  assert.ok(shiny > 5 && shiny < 90, String(shiny));
  assert.equal(visitorPick(new Set()).mega, "off");
});

test("fromFolders moves a Pokémon to the new pane: the old pane is listed to forget, so nothing held is doubled", () => {
  const panes = { old: { dex: 6, held: "lucky-egg" } };
  const r = fromFolders([{ address: "t9", pane: "new" }], panes, { "/src/tms": "old" }, { t9: "/src/tms" });
  assert.deepEqual(r.inherit, { new: panes.old });
  assert.deepEqual(r.forget, ["old"]);
  assert.deepEqual(fromFolders([], panes, {}, {}).forget, []);
});

import { trimPanes } from "../mods/pokemon-herd/picks.js";
test("trimPanes: the oldest forgotten, what they held handed back", () => {
  const panes = { a: { dex: 6, held: "lucky-egg" }, b: { dex: 4 }, c: { dex: 25, held: "soothe-bell" }, d: { dex: 1 } };
  const r = trimPanes(panes, 2);
  assert.deepEqual(Object.keys(r.panes), ["c", "d"]);
  assert.deepEqual(r.returned, ["lucky-egg"]);
  assert.deepEqual(trimPanes(panes, 10), { panes, returned: [] });
});

import { fromBox, raised } from "../mods/pokemon-herd/picks.js";
test("fromBox: the raised Pokémon of that species whose agent is gone, the latest", () => {
  const panes = {
    old1: { dex: 6, friend: 40, hearts: 2 },
    live: { dex: 6, held: "soothe-bell" },
    fresh: { dex: 6, mega: "auto" }, // never raised: not in the Box
    old2: { dex: 6, held: "lucky-egg", jobs: 3 },
    vulpixA: { dex: 37, form: "0001", friend: 20 },
  };
  const onScreen = new Set(["live"]);
  assert.deepEqual(fromBox({ dex: 6 }, panes, onScreen), { slot: "old2", pick: panes.old2 });
  assert.equal(fromBox({ dex: 6 }, panes, onScreen, "old2").slot, "old1"); // not its own pane
  assert.equal(fromBox({ dex: 37 }, panes, onScreen), null); // the species, not its Alolan form
  assert.equal(fromBox({ dex: 37, form: "0001" }, panes, onScreen).slot, "vulpixA");
  assert.equal(fromBox({ dex: 25 }, panes, onScreen), null);
  assert.equal(raised({ dex: 6, mega: "auto" }), false);
  assert.equal(raised({ dex: 6, shiny: true }), true);
});

test("with a Lucky Egg, what's left to evolve counts jobs at two each", () => {
  assert.equal(needsText({ dex: 5, jobs: 8, held: "lucky-egg" }), "after 1 more job (Lucky Egg: each counts twice)");
  assert.equal(needsText({ dex: 5, jobs: 5, held: "lucky-egg" }), "after 3 more jobs (Lucky Egg: each counts twice)");
  assert.equal(needsText({ dex: 5, jobs: 8 }), "after 2 more jobs");
  assert.equal(cardOf({ dex: 5, jobs: 8, held: "lucky-egg" }).note, "8/10 · 🥚×2");
  assert.equal(cardOf({ dex: 5, jobs: 8 }).note, "8/10 jobs");
});

test("trimPanes never drops the panes to keep (on screen, or just updated)", () => {
  const panes = { onScreen: { dex: 6, held: "lucky-egg" }, b: { dex: 4 }, c: { dex: 25 }, d: { dex: 1 } };
  const r = trimPanes(panes, 2, new Set(["onScreen"]));
  assert.deepEqual(Object.keys(r.panes).sort(), ["d", "onScreen"]);
  assert.deepEqual(r.returned, []);
});

import { electLeader, boxList } from "../mods/pokemon-herd/picks.js";
test("electLeader: one strip counts; another takes over when it goes quiet", () => {
  assert.deepEqual(electLeader(null, "a", 1000), { leader: true, write: { id: "a", at: 1000 } });
  assert.deepEqual(electLeader({ id: "a", at: 1000 }, "b", 2000), { leader: false, write: null });
  assert.deepEqual(electLeader({ id: "a", at: 1000 }, "a", 2000), { leader: true, write: { id: "a", at: 2000 } });
  assert.equal(electLeader({ id: "a", at: 1000 }, "b", 4001).leader, true); // a went quiet
  assert.equal(electLeader({ junk: 1 }, "b", 10).leader, true);
});

test("boxList: raised Pokémon whose agents are gone, the latest first", () => {
  const panes = { old: { dex: 6, friend: 20, hearts: 1 }, live: { dex: 4, jobs: 3 }, plain: { dex: 7, mega: "auto" }, newer: { dex: 25, held: "leftovers" } };
  assert.deepEqual(boxList(panes, new Set(["live"])).map((x) => x.slot), ["newer", "old"]);
});

import { boxOnSwitch } from "../mods/pokemon-herd/picks.js";
test("boxOnSwitch: a raised Pokémon switched away goes to the Box, without what stays with the pane", () => {
  const ala = { dex: 65, friend: 100, hearts: 5, jobs: 3, held: "lucky-egg", stay: true, mega: "auto" };
  const r = boxOnSwitch(ala, { dex: 6 }, 123);
  assert.equal(r.key, "box-123-65");
  assert.deepEqual(r.pick, { dex: 65, friend: 100, hearts: 5, jobs: 3, mega: "auto" });
  assert.equal(boxOnSwitch({ dex: 65, mega: "auto" }, { dex: 6 }, 1), null); // never raised
  assert.equal(boxOnSwitch(ala, { dex: 65 }, 1), null); // the same one
  // In the Box, the next agent (or pick) of that species gets it back.
  assert.equal(fromBox({ dex: 65 }, { [r.key]: r.pick }, new Set()).slot, "box-123-65");
});

import { nameFor, cleanNick, switchedPick as switched } from "../mods/pokemon-herd/picks.js";
test("nicknames: kept short and clean, shown with the species, carried through evolution and the Box", () => {
  assert.equal(cleanNick("  Blaze  "), "Blaze");
  assert.equal(cleanNick("A very long nickname here"), "A very long nick");
  assert.equal(cleanNick("   "), null);
  assert.equal(cleanNick(42), null);
  assert.equal(nameFor({ dex: 6, nick: "Blaze" }), "Blaze (Charizard)");
  assert.equal(nameFor({ dex: 6 }), "Charizard");
  assert.equal(nameFor({ dex: 37, form: "0001", nick: "Snow" }), "Snow (Vulpix (Alola))");
  const r = loadPicks({ panes: { a: { dex: 6, nick: "Blaze" }, b: { dex: 6, nick: 7 } } }, null).panes;
  assert.equal(r.a.nick, "Blaze");
  assert.equal(r.b.nick, undefined);
  assert.equal(gainJob({ dex: 4, mega: "auto", jobs: EVOLVE_JOBS - 1, nick: "Ember" }, "p").pick.nick, "Ember"); // evolved, still Ember
  assert.equal(boxOnSwitch({ dex: 6, hearts: 2, friend: 40, nick: "Blaze" }, { dex: 25 }, 1).pick.nick, "Blaze");
  assert.equal(switched({ dex: 6, nick: "Blaze" }, { dex: 25 }, "auto", null).nick, undefined); // another Pokémon: no name yet
});

import { rollShiny } from "../mods/pokemon-herd/picks.js";
test("a new Pokémon rolls its own shiny; the one before's never carries over", () => {
  const shinyCur = { dex: 384, shiny: true, mega: "auto", jobs: 4 };
  assert.equal(switched(shinyCur, { dex: 6 }, "auto", null).shiny, false); // no shiny out of nothing
  assert.equal(switched(shinyCur, { dex: 6 }, "auto", null, true).shiny, true); // its own roll
  assert.equal(rollShiny({ dex: 6 }, 64, () => 0), true);
  assert.equal(rollShiny({ dex: 6 }, 64, () => 0.5), false);
  assert.equal(rollShiny({ dex: 6 }, 64, () => 1 / 64 - 1e-9), true); // 1 in 64
});

test("boxOnSwitch: Box it takes any, the same species too; Bring out the same species if raised", () => {
  const fresh = { dex: 6, mega: "auto" }; // just chosen, never raised
  assert.equal(boxOnSwitch(fresh, { dex: 25 }, 1), null); // a plain switch: not raised, not kept
  assert.equal(boxOnSwitch(fresh, { dex: 6 }, 1, { same: true, all: true }).key, "box-1-6"); // Box it
  assert.equal(boxOnSwitch({ dex: 6, shiny: true, mega: "auto" }, { dex: 25 }, 1).key, "box-1-6"); // a shiny is always kept
  assert.equal(boxOnSwitch({ dex: 6, mega: "auto" }, { dex: 6 }, 1, { same: true }), null); // Bring out: not raised
  assert.equal(boxOnSwitch({ dex: 6, jobs: 2, mega: "auto" }, { dex: 6 }, 1, { same: true }).pick.jobs, 2);
});

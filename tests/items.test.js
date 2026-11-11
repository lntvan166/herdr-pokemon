import { test } from "node:test";
import assert from "node:assert/strict";
import { ITEMS, loadBag, addItem, mark, pickup, badges, BADGES, shinyOdds, MAX_ITEM } from "../mods/pokemon-herd/items.js";
import { coatOf, waysOf } from "../mods/pokemon-herd/dex.js";

test("loadBag tolerates junk and keeps known items", () => {
  for (const junk of [null, 5, "x", { v: 2 }, { v: 1, items: 3 }]) assert.deepEqual(loadBag(junk), { v: 1, items: {}, marks: { evolutions: 0, nightJob: false, fullHearts: false, seen: [] } });
  const b = loadBag({ v: 1, items: { berry: 3, "fire-stone": 1, junk: 4, "rare-candy": -1 }, marks: { evolutions: 2, nightJob: true } });
  assert.deepEqual(b.items, { berry: 3, "fire-stone": 1 });
  assert.equal(b.marks.evolutions, 2);
});

test("addItem counts up and down within limits", () => {
  let b = loadBag(null);
  b = addItem(b, "berry", 2);
  assert.equal(b.items.berry, 2);
  b = addItem(b, "berry", -5);
  assert.equal(b.items.berry, undefined);
  assert.equal(addItem(b, "berry", 500).items.berry, MAX_ITEM);
  assert.equal(mark(b, { nightJob: true }).marks.nightJob, true);
});

test("pickup always finds a real item, mostly berries", () => {
  assert.equal(pickup(() => 0), "berry");
  assert.equal(pickup(() => 0.9999), "amulet-coin"); // the last, and rarest
  const seen = new Set(Array.from({ length: 2000 }, (_, i) => pickup(() => (i + 0.5) / 2000)));
  for (const id of seen) assert.ok(ITEMS[id], id);
  assert.ok(seen.has("thunder-stone"));
});

test("badges", () => {
  const none = badges({ jobs: 0, ms: 0, longest: 0 }, loadBag(null).marks);
  assert.equal(none.length, 8);
  assert.ok(none.every((b) => !b.earned));
  const some = badges({ jobs: 120, ms: 0, longest: 2 * 3600000 }, { evolutions: 1, nightJob: false, fullHearts: false });
  assert.deepEqual(some.filter((b) => b.earned).map((b) => b.id), ["boulder", "cascade", "thunder", "volcano"]);
  assert.equal(new Set(BADGES.map((b) => b.id)).size, 8);
});

test("Shiny Charm at 500 jobs", () => {
  assert.equal(shinyOdds(499), 64);
  assert.equal(shinyOdds(500), 32);
});

test("seasonal coats and evolution ways", () => {
  assert.equal(coatOf(585, 0), null);
  assert.equal(coatOf(585, 3).form, "0003");
  assert.equal(coatOf(25, 2), null);
  assert.deepEqual(waysOf(5), ["jobs"]);
  assert.deepEqual(waysOf(26), ["stone:thunder"]);
});

import { itemAbout, takersOf, stoneTakers } from "../mods/pokemon-herd/items.js";
test("itemAbout and stoneTakers", () => {
  assert.ok(stoneTakers("thunder").includes("Pikachu") && stoneTakers("thunder").includes("Eevee"));
  assert.match(itemAbout("thunder-stone"), /^Evolves .*Pikachu/);
  assert.match(itemAbout("berry"), /heart/);
  for (const id of Object.keys(ITEMS)) assert.ok(itemAbout(id).length > 10, id);
});

test("takersOf: who an item would help now, and into what", () => {
  const herd = [
    { slot: "a", tag: "api", pick: { dex: 25, mega: "auto" } },
    { slot: "b", tag: "web", pick: { dex: 4, mega: "auto", hearts: 5 } },
    { slot: "c", tag: "db", pick: { dex: 133, mega: "auto", stay: true } },
  ];
  const t = takersOf("thunder-stone", herd);
  assert.deepEqual(t.map((x) => [x.tag, x.use, x.after.dex]), [["api", "evolve", 26]]);
  assert.deepEqual(takersOf("berry", herd).map((x) => x.tag), ["api", "db"]);
  assert.deepEqual(takersOf("rare-candy", herd).map((x) => [x.tag, x.after.dex]), [["web", 5]]);
});

import { badgeGifts, HELD } from "../mods/pokemon-herd/items.js";
test("a held item for each badge newly earned, once", () => {
  const marks = loadBag(null).marks;
  const s = { jobs: 120, ms: 0, longest: 0 };
  const g = badgeGifts(s, marks);
  assert.deepEqual(g.seen, ["boulder", "cascade"]);
  assert.equal(g.gifts.length, 2);
  assert.ok(g.gifts.every((id) => HELD.includes(id)));
  assert.deepEqual(badgeGifts(s, { ...marks, seen: g.seen }).gifts, []);
  assert.deepEqual(loadBag({ v: 1, items: {}, marks: { seen: ["boulder", "junk"] } }).marks.seen, ["boulder"]);
  assert.ok(ITEMS["lucky-egg"] && ITEMS["lucky-egg"].kind === "held");
});

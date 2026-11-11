import { test } from "node:test";
import assert from "node:assert/strict";
import { loadFavorites, toggleFavorite, isFavorite, favoriteEntries, favKey } from "../mods/pokemon-herd/favorites.js";
import { assign } from "../mods/pokemon-herd/picks.js";

test("favorites: load, toggle, entries", () => {
  assert.deepEqual(loadFavorites(null), []);
  assert.deepEqual(loadFavorites({ v: 1, keys: ["25", "25", "37-0001", "99999", "25-0009", 4] }), ["25", "37-0001"]);
  let keys = toggleFavorite([], { dex: 25 });
  keys = toggleFavorite(keys, { dex: 37, form: "0001" });
  assert.deepEqual(keys, ["25", "37-0001"]);
  assert.equal(isFavorite(keys, { dex: 37, form: "0001" }), true);
  assert.equal(isFavorite(keys, { dex: 37 }), false); // the species and its form are apart
  assert.deepEqual(toggleFavorite(keys, { dex: 25 }), ["37-0001"]);
  assert.deepEqual(favoriteEntries(keys), [{ dex: 25 }, { dex: 37, form: "0001" }]);
  assert.equal(favKey({ dex: 6 }), "6");
});

test("assign: new agents from a pool (favorites), each its own while there are enough", () => {
  const pool = [{ dex: 25 }, { dex: 37, form: "0001" }];
  const list = [{ address: "t1", pane: "p1" }, { address: "t2", pane: "p2" }];
  const { ids } = assign(list, {}, {}, 64, pool);
  const got = Object.values(ids).map((p) => `${p.dex}${p.form ? `-${p.form}` : ""}`).sort();
  assert.deepEqual(got, ["25", "37-0001"]);
  // No pool: any walking species, as before.
  assert.ok(assign([{ address: "t1", pane: "p1" }], {}, {}, 64, []).ids.t1.dex >= 1);
});

import { switchedPick } from "../mods/pokemon-herd/picks.js";
test("switchedPick: choosing another Pokémon keeps what the pane holds and its Everstone", () => {
  const before = { dex: 6, shiny: true, mega: "on", held: "lucky-egg", stay: true, friend: 60, hearts: 3, jobs: 4, megaKind: "Y" };
  const after = switchedPick(before, { dex: 25 }, "auto", null);
  assert.equal(after.dex, 25);
  assert.equal(after.held, "lucky-egg");
  assert.equal(after.stay, true);
  assert.equal(after.jobs, undefined); // a new Pokémon starts its count
  assert.equal(after.friend, undefined); // and its friendship
  assert.equal(after.mega, "auto");
  // The same species again: Mega X/Y kept.
  assert.equal(switchedPick(before, { dex: 6 }, "on", "Y").megaKind, "Y");
  // Nothing held, no Everstone: none added.
  const plain = switchedPick({ dex: 6 }, { dex: 25 }, "auto", null);
  assert.equal("held" in plain, false);
  assert.equal("stay" in plain, false);
});

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

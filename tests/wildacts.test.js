import test from "node:test";
import assert from "node:assert/strict";
import { actFor, wants, TEASERS, NAPPERS, TELEPORTERS, FIGHTERS, FRIENDS, ACTS, HALT, ICON } from "../mods/pokemon-herd/wildacts.js";
import { catchChance, NAP_CATCH, FRIEND_CATCH } from "../mods/pokemon-herd/trainer.js";

test("a wild one's act: by its kind (Gengar teases, Snorlax naps, Abra teleports, Machop challenges, Eevee's friendly)", () => {
  const always = () => 0;
  assert.equal(actFor({ dex: 94 }, {}, always).kind, "tease");
  assert.equal(actFor({ dex: 143 }, {}, always).kind, "nap");
  assert.equal(actFor({ dex: 63 }, {}, always).kind, "teleport");
  assert.equal(actFor({ dex: 66 }, {}, always).kind, "challenge");
  assert.equal(actFor({ dex: 133 }, {}, always).kind, "friendly");
  assert.ok(actFor({ dex: 143 }, {}, always).ms >= 60000); // a long nap
  assert.equal(actFor({ dex: 150, legend: true }, {}, always), null); // a legendary keeps to itself
  for (const set of [TEASERS, NAPPERS, TELEPORTERS, FIGHTERS, FRIENDS]) assert.ok(set.size > 0);
});

test("by the situation: the day's weather, an agent working, its Speed; most only walk by", () => {
  const at = (r) => () => r;
  assert.equal(actFor({ dex: 4 }, { boosted: ["fire"] }, at(0.1)).kind, "weather"); // Charmander on a sunny day
  assert.equal(actFor({ dex: 4 }, { boosted: ["fire"] }, at(0.1)).icon, "☀️");
  assert.equal(actFor({ dex: 16 }, { working: true }, at(0.05)).kind, "curious");
  assert.equal(actFor({ dex: 135 }, {}, at(0.5)).kind, "dash"); // Jolteon (130 Speed)
  assert.equal(actFor({ dex: 16 }, {}, at(0.5)), null); // Pidgey on a plain day: just walks by
  let n = 0;
  for (let i = 0; i < 4000; i++) if (actFor({ dex: 1 + (i % 900) }, { boosted: ["water"], working: true })) n++;
  assert.ok(n / 4000 > 0.1 && n / 4000 < 0.45, String(n / 4000));
});

test("whom it stops by; every act has its pause or icon; asleep or friendly, easier to catch", () => {
  assert.ok(wants("tease", { mood: "sleep" }) && !wants("tease", { mood: "working" }));
  assert.ok(wants("curious", { mood: "working" }) && !wants("curious", { mood: "idle" }));
  assert.ok(!wants("challenge", { mood: "idle", moving: true }));
  for (const k of ACTS) assert.ok(HALT[k] || ICON[k] || ["weather", "teleport", "nap"].includes(k), k);
  const p = { dex: 143 };
  assert.ok(catchChance("poke-ball", { ...p, asleep: true }) > catchChance("poke-ball", p));
  assert.ok(catchChance("poke-ball", { ...p, friendly: true }) > catchChance("poke-ball", p));
  assert.ok(NAP_CATCH > FRIEND_CATCH && FRIEND_CATCH > 1);
});

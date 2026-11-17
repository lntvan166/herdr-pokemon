import { test } from "node:test";
import assert from "node:assert/strict";
import { sheetPlan } from "../mods/pokemon-herd/sheets.js";

test("core sheets come in one go; each reaction sheet on its own, never one already core", () => {
  const plan = sheetPlan({ Walk: { name: "Walk" }, Idle: { name: "Idle" }, Sleep: { name: "Idle" } }, { Hop: { name: "Hop" }, Wake: { name: "Walk" }, Hurt: { name: "Hurt" } });
  assert.deepEqual(plan.core, ["Walk", "Idle"]);
  assert.deepEqual(plan.optional, ["Hop", "Hurt"]);
});

test("spriteScale: 2x, else 1.5x, else 1x, the biggest under SHOWN_MAX; big ones end up the biggest", async () => {
  const { spriteScale, SHOWN_MAX } = await import("../mods/pokemon-herd/sheets.js");
  assert.equal(spriteScale(24), 2); // Pikachu: 48 px
  assert.equal(spriteScale(29), 2); // Rotom Wash, in its big frame
  assert.equal(spriteScale(42), 2); // Lugia: 84 px (it was 42 at 1x)
  assert.equal(spriteScale(44), 1.5); // Wailord: 66 px
  assert.equal(spriteScale(67), 1); // Gyarados
  for (const d of [9, 24, 33, 42, 44, 53, 67]) assert.ok(d * spriteScale(d) <= SHOWN_MAX || spriteScale(d) === 1);
  assert.ok(44 * spriteScale(44) > 24 * spriteScale(24)); // Wailord bigger than Pikachu
});

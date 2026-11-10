import { test } from "node:test";
import assert from "node:assert/strict";
import { sheetPlan } from "../mods/pokemon-herd/sheets.js";

test("core sheets come in one go; each reaction sheet on its own, never one already core", () => {
  const plan = sheetPlan({ Walk: { name: "Walk" }, Idle: { name: "Idle" }, Sleep: { name: "Idle" } }, { Hop: { name: "Hop" }, Wake: { name: "Walk" }, Hurt: { name: "Hurt" } });
  assert.deepEqual(plan.core, ["Walk", "Idle"]);
  assert.deepEqual(plan.optional, ["Hop", "Hurt"]);
});

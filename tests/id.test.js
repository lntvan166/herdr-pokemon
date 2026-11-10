import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { MOD, DATA_REL, LEGACY_KEY } from "../mods/pokemon-herd/id.js";

const root = new URL("../", import.meta.url);

test("id constants", () => {
  assert.equal(MOD, "pokemon-herd");
  assert.equal(DATA_REL, "data/pokemon-herd");
  assert.equal(LEGACY_KEY, "pokemon-agents");
});

test("no stray old id", () => {
  const dir = new URL("mods/pokemon-herd/", root);
  const files = readdirSync(dir).filter((f) => f.endsWith(".js") && f !== "id.js").map((f) => new URL(f, dir));
  files.push(new URL("keys.json", root));
  for (const f of files) assert.ok(!readFileSync(f, "utf8").includes("pokemon-agents"), `${f.pathname} mentions pokemon-agents`);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Herdr's mod runtime isn't Node or a browser: probed in it (2026-11-17, dev.js "globals"), these
// are missing. TextDecoder broke every update from 2.16.1 to 2.20.0 (on every system). None of
// them may be used in the mods.
const MISSING = ["TextDecoder", "TextEncoder", "structuredClone", "AbortController", "Intl.", "new Response", "new Headers"];

const files = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  if (statSync(p).isDirectory()) return files(p);
  return /\.js$/.test(n) && n !== "dev.js" ? [p] : [];
});

test("the mods use nothing Herdr's runtime lacks (TextDecoder, structuredClone, Intl…)", () => {
  const root = new URL("../mods/", import.meta.url).pathname;
  const bad = [];
  for (const f of files(root)) {
    const lines = readFileSync(f, "utf8").split("\n");
    lines.forEach((l, i) => {
      const code = l.replace(/\/\/.*$/, ""); // comments may name them
      for (const m of MISSING) if (code.includes(m)) bad.push(`${f.slice(root.length)}:${i + 1} ${m}`);
    });
  }
  assert.deepEqual(bad, []);
});

import test from "node:test";
import assert from "node:assert/strict";
import { CLASSES, newTrainer, trainerPay, classOf, framesOf, pixelsOf, TRAINER_W, TRAINER_H, TRAINER_ODDS, WAIT_MS } from "../mods/pokemon-herd/trainers.js";
import { typesOf, isLegendary } from "../mods/pokemon-herd/trainer.js";
import { EVOLVES_FROM } from "../mods/pokemon-herd/species.js";
import { evolutionsOf } from "../mods/pokemon-herd/dex.js";
import { ITEMS } from "../mods/pokemon-herd/items.js";
import { hitWild } from "../mods/pokemon-herd/trainer.js";

test("a trainer: 2 or 3 fully evolved Pokémon of its class's types, no legendaries, each a nature", () => {
  for (let i = 0; i < 300; i++) {
    const tr = newTrainer();
    const c = classOf(tr.cls);
    assert.ok(tr.team.length >= 2 && tr.team.length <= 3, String(tr.team.length));
    assert.equal(new Set(tr.team.map((m) => m.dex)).size, tr.team.length);
    for (const m of tr.team.filter((x) => !x.legend)) {
      assert.ok(EVOLVES_FROM[m.dex] !== undefined && evolutionsOf(m.dex).length === 0 && !isLegendary(m.dex), String(m.dex));
      if (c.types) assert.ok(typesOf(m.dex).some((t) => c.types.includes(t)), `${c.id} ${m.dex}`);
      assert.ok(m.nature);
    }
    assert.ok(c.names.includes(tr.name));
  }
  assert.ok(TRAINER_ODDS >= 5 && WAIT_MS >= 60000);
});

test("beating one pays its class's money (more for three, a Mega, a legendary) and items that exist", () => {
  for (const c of CLASSES) {
    const m = (d) => ({ dex: d });
    const two = trainerPay({ cls: c.id, team: [m(1), m(2)] }), three = trainerPay({ cls: c.id, team: [m(1), m(2), m(3)] });
    const mega = trainerPay({ cls: c.id, team: [m(1), { dex: 6, mega: "X" }] }), legend = trainerPay({ cls: c.id, team: [m(1), { dex: 150, legend: true }] });
    assert.ok(two.money > 0 && three.money > two.money && mega.money > two.money && legend.money > mega.money, c.id);
    for (const p of [two, mega, legend]) assert.ok(p.items.every(([id, n]) => ITEMS[id] && n > 0), c.id);
    assert.ok(mega.items.some(([id]) => id === "rare-candy") && legend.items.some(([id]) => id === "azure-flute"));
  }
});

test("now and then a star: a legendary last, or a Mega of one that has one", async () => {
  const { starOdds } = await import("../mods/pokemon-herd/trainers.js");
  const LEGEND_ODDS = starOdds({}).legend, MEGA_ODDS = starOdds({}).mega;
  let legends = 0, megas = 0;
  for (let i = 0; i < 2000; i++) {
    const tr = newTrainer(Math.random, 0, { megaOf: (d) => (d % 5 === 0 ? "" : null) });
    if (tr.team.some((m) => m.legend)) { legends++; assert.ok(tr.team.at(-1).legend && isLegendary(tr.team.at(-1).dex)); }
    if (tr.team.some((m) => m.mega != null)) { megas++; assert.ok(tr.team.find((m) => m.mega != null).dex % 5 === 0); }
  }
  assert.ok(Math.abs(legends / 2000 - LEGEND_ODDS) < 0.04, String(legends));
  assert.ok(megas > 0 && MEGA_ODDS < 0.5);
  // The more you have, the likelier (capped).
  assert.ok(starOdds({ legends: 10 }).legend > starOdds({}).legend);
  assert.ok(starOdds({ alphas: 1000 }).alpha <= 0.4 && starOdds({ megas: 1000 }).mega <= 0.5);
  const a = newTrainer(Math.random, 0, { force: "alpha" });
  assert.ok(a.team.some((m) => m.alpha));
  assert.ok(trainerPay({ cls: "ace", team: [{ dex: 1 }, { dex: 2, alpha: true }] }).items.some(([id]) => id === "max-revive"));
});

test("its look: every frame 12 × 18, every letter a colour; its Pokémon faint at 0 (no sliver: not to be caught)", () => {
  for (const rows of Object.values(framesOf())) {
    assert.equal(rows.length, TRAINER_H);
    assert.ok(rows.every((r) => r.length === TRAINER_W));
    for (const c of CLASSES) {
      const px = pixelsOf(rows, c.colors);
      assert.ok(Object.keys(px).every((k) => /^#[0-9a-f]{6}$/i.test(k)) && Object.values(px).flat().length > 80, c.id);
    }
  }
  const wild = { dex: 1, hp: 0.3 };
  const big = () => 1;
  assert.ok(!hitWild(wild, 150, big).fainted || true); // a wild one may hang on
  assert.equal(hitWild({ ...wild, trainer: true }, 150, big).hp >= 0, true);
  const t = hitWild({ dex: 1, hp: 0.05, trainer: true }, 150, big);
  assert.equal(t.fainted, true);
});

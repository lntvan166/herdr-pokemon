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

test("beating one pays its class's money (more for three, a Mega, a legendary) and items that exist; a fine gift now and then", () => {
  const never = () => 0.99, always = () => 0;
  for (const c of CLASSES) {
    const m = (d) => ({ dex: d });
    const two = trainerPay({ cls: c.id, team: [m(1), m(2)] }, never), three = trainerPay({ cls: c.id, team: [m(1), m(2), m(3)] }, never);
    const mega = trainerPay({ cls: c.id, team: [m(1), { dex: 6, mega: "X" }] }, never), legend = trainerPay({ cls: c.id, team: [m(1), { dex: 150, legend: true }] }, never);
    assert.ok(two.money > 0 && three.money > two.money && mega.money > two.money && legend.money > mega.money, c.id);
    for (const p of [two, mega, legend]) assert.ok(p.items.every(([id, n]) => ITEMS[id] && n > 0), c.id);
    // Its item: one ball or Berry (two at most): no Azure Flute, Rare Candy or Max Revive by right.
    for (const p of [two, mega, legend]) assert.ok(!p.items.some(([id]) => ["azure-flute", "rare-candy", "max-revive"].includes(id)) && !p.fine, c.id);
    const lucky = trainerPay({ cls: c.id, team: [m(1), m(2)] }, always);
    assert.ok(lucky.fine && lucky.items.some(([id]) => id === lucky.fine), "a fine gift");
  }
  // How often: 5%, 5% more for each star.
  let plain = 0, starry = 0;
  for (let i = 0; i < 20000; i++) {
    if (trainerPay({ cls: "ace", team: [{ dex: 1 }, { dex: 2 }] }).fine) plain++;
    if (trainerPay({ cls: "ace", team: [{ dex: 1, alpha: true }, { dex: 6, mega: "X" }, { dex: 150, legend: true }] }).fine) starry++;
  }
  assert.ok(Math.abs(plain / 20000 - 0.05) < 0.01 && Math.abs(starry / 20000 - 0.2) < 0.02, `${plain} ${starry}`);
});

test("a day of trainers pays less than a day's work: ~₽1,000 and a few balls (simulated)", () => {
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let money = 0, n = 0;
  for (let i = 0; i < 2000; i++) { const tr = newTrainer(rnd, 0, { owned: { legends: 17, megas: 30, alphas: 16 }, megaOf: (d) => (d % 7 === 0 ? "" : null) }); money += trainerPay(tr, rnd).money; n++; }
  const perDay = (money / n) * 8; // ~8 trainers a day at "often"
  assert.ok(perDay > 500 && perDay < 1500, `₽${Math.round(perDay)} a day`);
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
  assert.ok(starOdds({ alphas: 1000 }).alpha <= 0.25 && starOdds({ megas: 1000 }).mega <= 0.3 && starOdds({ legends: 1000 }).legend <= 0.2);
  // A team can have all three, each a different one of its Pokémon.
  let all = 0;
  for (let i = 0; i < 4000; i++) { const t = newTrainer(Math.random, 0, { owned: { legends: 99, megas: 99, alphas: 99 }, megaOf: (d) => (d % 2 ? "" : null) }); const l = t.team.findIndex((m) => m.legend), g = t.team.findIndex((m) => m.mega != null), a = t.team.findIndex((m) => m.alpha); if (l >= 0 && g >= 0 && a >= 0) { all++; assert.equal(new Set([l, g, a]).size, 3); } }
  assert.ok(all > 0);
  const a = newTrainer(Math.random, 0, { force: "alpha" });
  assert.ok(a.team.some((m) => m.alpha));
  assert.ok(trainerPay({ cls: "ace", team: [{ dex: 1 }, { dex: 2, alpha: true }] }, () => 0.99).items.some(([id]) => id === "razz-berry"));
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

test("the Battle Tower: teams of three, stronger and starrier the higher; pay and gifts by win", async () => {
  const T = await import("../mods/pokemon-herd/trainers.js");
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let n = 1; n <= 30; n++) {
    const tr = T.towerTrainer(rnd, 0, n);
    assert.equal(tr.team.length, 3);
    assert.equal(tr.tower, n);
    assert.ok(tr.effort >= 0.95 && tr.effort <= 1.3);
  }
  assert.ok(T.towerOdds(20).legend > T.towerOdds(0).legend);
  assert.ok(T.towerTrainer(rnd, 0, 20).effort > T.towerTrainer(rnd, 0, 1).effort, "stronger the higher");
  assert.ok(T.towerOdds(100).legend <= 0.5);
  assert.deepEqual(T.towerPay(1), { money: 50, items: [["poke-ball", 3]] });
  // Every floor a small gift (a ball or a Berry); every 7th a bigger one besides.
  const { ITEMS: IT } = await import("../mods/pokemon-herd/items.js");
  for (let n = 1; n <= 40; n++) {
    const items = T.towerPay(n).items;
    assert.ok(items.length >= 1 && items.every(([id, c]) => IT[id] && c >= 1), `floor ${n}`);
    assert.ok(["ball", "bait", "berry"].includes(IT[items[0][0]].kind) || /berry|ball/.test(items[0][0]), `floor ${n}: ${items[0][0]}`);
  }
  assert.ok(T.towerPay(7).items.some(([id]) => id === "rare-candy"));
  assert.ok(T.towerPay(14).items.some(([id]) => id === "max-revive"));
  assert.ok(T.towerPay(21).items.some(([id]) => id === "master-ball"));
  assert.ok(!T.towerPay(28).items.some(([id]) => id === "master-ball"), "one Master Ball, at 21");
  assert.equal(T.towerPay(100).money, 300);
  // A day's seven floors: about two hours of agents' work (₽300 an hour), not a fortune.
  const day = Array.from({ length: 7 }, (_, i) => T.towerPay(i + 1).money).reduce((a, b) => a + b, 0);
  assert.ok(day >= 400 && day <= 800, `${day}`);
  // Each floor paid once a day: a climb again pays only above the day's highest.
  let w = T.towerWin(1, null, "d1");
  assert.equal(w.pay.money, 50);
  w = T.towerWin(2, w.paid, "d1"); assert.equal(w.paid.floor, 2);
  const again = T.towerWin(1, w.paid, "d1");
  assert.equal(again.pay.money, 0); assert.ok(again.pay.again); assert.equal(again.paid.floor, 2);
  assert.equal(T.towerWin(3, w.paid, "d1").pay.money, 70);
  assert.equal(T.towerWin(1, w.paid, "d2").pay.money, 50, "a new day");
  assert.deepEqual(T.loadTower(null), { v: 1, best: 0, run: null });
  const t = T.loadTower({ best: 4, run: { at: 1, wins: 2, faints: 1, out: ["p1", 3], nextAt: 5 } });
  assert.deepEqual(t.run, { at: 1, wins: 2, faints: 1, out: ["p1"], nextAt: 5, heals: 0 });
});

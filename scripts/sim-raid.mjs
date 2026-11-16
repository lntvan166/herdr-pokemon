// Raid balance (events.js): how long an eager player (every Pokémon dropped as soon as it can hit)
// and a casual one (one drop a minute) take to beat a boss, by team size; wins, faints.
//   node scripts/sim-raid.mjs now               # the values in events.js
//   node scripts/sim-raid.mjs try 3 3 0.75      # bulk base, per agent, the boss answer factor
//   node scripts/sim-raid.mjs day               # eggs a day by team and pace; the reward; catching the boss
const R = new URL("../mods/pokemon-herd", import.meta.url).pathname;
const ev = await import(`${R}/events.js`);
const { WALKABLE } = await import(`${R}/dex.js`);
const { isLegendary } = await import(`${R}/trainer.js`);
const { EVOLVES_FROM } = await import(`${R}/species.js`);
const team = WALKABLE.filter((d) => !isLegendary(d));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
// One battle: n Pokémon; style "eager" (every one ready is dropped at once) or "casual" (one drop a
// minute, the readiest); `bulkOf(n)`; `back` the boss's answer factor. Returns { minutes|null, faints }.
function battle(n, style, bulk, backMul, working = 0.5) {
  let r = { ...ev.newRaid(0, Math.random), bulk };
  const mons = Array.from({ length: n }, (_, i) => ({ pane: `p${i}`, dex: pick(team), hp: 1, rest: 0, next: 0, working: Math.random() < working }));
  let faints = 0, lastCasual = -1e9;
  for (let t = 0; t < ev.RAID_MS; t += 1000) {
    const ready = mons.filter((m) => t >= m.rest && t >= m.next);
    const go = style === "eager" ? ready : t - lastCasual >= 60000 && ready.length ? [ready[0]] : [];
    if (go.length && style !== "eager") lastCasual = t;
    for (const m of go) {
      const out = ev.raidHit(r, m.dex, m.pane, "normal", t, Math.random, { working: m.working });
      r = out.raid;
      m.next = t + ev.RAID_COOLDOWN;
      if (r.hp <= 0) return { min: t / 60000, faints };
      if (out.hit.back) {
        m.hp -= out.hit.back.dmg * (backMul / ev.RAID_BACK);
        if (m.hp <= 0) { faints++; m.hp = 1; m.rest = t + ev.RAID_REST; }
      }
    }
    for (const m of mons) if (t >= m.rest && m.hp < 1) m.hp = Math.min(1, m.hp + 1000 / (10 * 60000)); // heals over ~10 min (as on the strip)
  }
  return { min: null, faints };
}
const stats = (n, style, bulk, back, runs = 400) => {
  const res = Array.from({ length: runs }, () => battle(n, style, bulk, back));
  const won = res.filter((x) => x.min !== null).map((x) => x.min).sort((a, b) => a - b);
  const med = won.length ? won[Math.floor(won.length / 2)] : NaN;
  return { win: Math.round((100 * won.length) / runs), med: med.toFixed(1), faints: (res.reduce((s, x) => s + x.faints, 0) / runs).toFixed(1) };
};
const [, , mode] = process.argv;
if (mode === "day") {
  const { catchChance } = await import(`${R}/trainer.js`);
  // A working day: 9 hours with agents open; each agent works a share of it (busy 40–80%), its
  // minutes counted (all agents together) towards an egg every RAID_WORK minutes, MAX_EGGS a day.
  console.log(`Eggs a day (every ${process.argv[3] ?? ev.RAID_WORK} min of work per agent, ${process.argv[4] ?? ev.MAX_EGGS} at most), 1000 days each:`);
  for (const n of [1, 2, 3, 4, 6]) for (const [label, lo, hi] of [["light", 0.2, 0.4], ["busy", 0.4, 0.8]]) {
    const counts = [0, 0, 0, 0];
    for (let d = 0; d < 1000; d++) {
      let minutes = 0;
      for (let a = 0; a < n; a++) minutes += 9 * 60 * (lo + Math.random() * (hi - lo));
      const per = (process.argv[3] ? Number(process.argv[3]) : ev.RAID_WORK) * n; // minutes per agent (try another)
      const cap = process.argv[4] ? Number(process.argv[4]) : ev.MAX_EGGS;
      counts[Math.min(cap, Math.floor(minutes / per))]++;
    }
    const avg = counts.reduce((s, c, k) => s + c * k, 0) / 1000;
    console.log(`  ${n} agent${n > 1 ? "s" : " "} ${label.padEnd(5)}: ${avg.toFixed(1)} a day  (0: ${counts[0] / 10}%, 1: ${counts[1] / 10}%, 2: ${counts[2] / 10}%, 3: ${counts[3] / 10}%)`);
  }
  // The reward against a day's pay (jobs pay ~₽300 an hour of an agent's work).
  const r = ev.raidReward({ dex: 248, alpha: true }), l = ev.raidReward({ dex: 150, legend: true });
  console.log(`Reward: ₽${r.money} (a legendary ₽${l.money}) and ${r.count} Ultra Balls (₽150 each in the Shop) per raid won.`);
  // Catching it, beaten (5% health), with the 3 Ultra Balls (and Golden Razz before each).
  for (const [what, pick] of [["an Alpha (final stage)", { dex: 248, alpha: true, hp: 0.05 }], ["a legendary", { dex: 150, hp: 0.05 }]]) {
    const one = catchChance("ultra-ball", pick), oneB = catchChance("ultra-ball", pick, "golden-razz-berry");
    const three = 1 - (1 - one * 0.95) ** 3; // a miss: 1 in 20 runs (FLEE) — not for a legendary, roughly
    console.log(`  ${what}: an Ultra Ball ${Math.round(100 * one)}% (with Golden Razz ${Math.round(100 * oneB)}%); the 3 it pays catch it ${Math.round(100 * three)}% of the time`);
  }
} else if (mode === "now") {
  console.log(`events.js: bulk ${ev.RAID_HP}+${ev.RAID_HP_PER}(n-1), boss answer x${ev.RAID_BACK}`);
  for (const n of [1, 2, 3, 4, 6]) {
    const b = ev.RAID_HP + ev.RAID_HP_PER * (n - 1);
    console.log(`n=${n} bulk=${b}`, "eager", JSON.stringify(stats(n, "eager", b, ev.RAID_BACK)), "casual", JSON.stringify(stats(n, "casual", b, ev.RAID_BACK)));
  }
} else {
  const [base, per, back] = process.argv.slice(3).map(Number);
  console.log(`TRY: bulk ${base}+${per}(n-1), answer x${back}`);
  for (const n of [1, 2, 3, 4, 6]) {
    const b = base + per * (n - 1);
    console.log(`n=${n} bulk=${b.toFixed(1)}`, "eager", JSON.stringify(stats(n, "eager", b, back)), "casual", JSON.stringify(stats(n, "casual", b, back)));
  }
}

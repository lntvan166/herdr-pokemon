// Mass Outbreak balance (events.js): per outbreak, how many visitors walk by, how many are its
// species, how often one is shiny, how many a player catches (a Poké Ball each, the clicks a
// visitor needs); against an ordinary 20 minutes. 10,000 outbreaks.
//   node scripts/sim-outbreak.mjs                  # the values in events.js
//   node scripts/sim-outbreak.mjs 20 2 3 16 0.8    # minutes, every [from, to] min, shiny 1 in, share
const R = new URL("../mods/pokemon-herd", import.meta.url).pathname;
const ev = await import(`${R}/events.js`);
const { catchChance, VISIT_SPEED } = await import(`${R}/trainer.js`).then((m) => ({ ...m, VISIT_SPEED: 45 }));
const { VISIT_EVERY } = await import(`${R}/settings.js`);
const [mins, lo, hi, shiny, share] = process.argv.length > 2 ? process.argv.slice(2).map(Number)
  : [ev.OUTBREAK_MS / 60000, ev.OUTBREAK_EVERY[0], ev.OUTBREAK_EVERY[1], ev.OUTBREAK_SHINY, ev.OUTBREAK_SHARE];
const WIDTH = 1700, WALK = (WIDTH + 80) / VISIT_SPEED; // a visitor crosses a 1700 px strip in ~40 s
const rand = (a, b) => a + Math.random() * (b - a);
function run(minutes, every, shinyIn, part, species = 46) { // species: a first stage that evolves (Paras), 45% to catch
  let t = rand(0, 0.5), seen = 0, its = 0, shinies = 0, caught = 0;
  while (t < minutes) {
    seen++;
    const mine = Math.random() < part;
    if (mine) { its++; if (Math.random() * shinyIn < 1) shinies++; }
    if (mine && Math.random() < catchChance("poke-ball", { dex: species })) caught++;
    t += WALK / 60 + rand(every[0], every[1]);
  }
  return { seen, its, shinies, caught };
}
const avg = (f, n = 10000) => {
  const s = { seen: 0, its: 0, shinies: 0, caught: 0, anyShiny: 0 };
  for (let i = 0; i < n; i++) { const r = f(); for (const k of ["seen", "its", "shinies", "caught"]) s[k] += r[k]; if (r.shinies) s.anyShiny++; }
  return { visitors: (s.seen / n).toFixed(1), itsSpecies: (s.its / n).toFixed(1), caught: (s.caught / n).toFixed(1), shinyChance: `${Math.round((100 * s.anyShiny) / n)}%` };
};
for (const pace of ["rare", "often", "lots"]) {
  const every = process.argv.length > 2 ? [lo, hi] : ev.outbreakPace(VISIT_EVERY[pace]);
  console.log(`Outbreak with visitors at "${pace}": ${mins} min, one every ${every.join("–")} min (+${Math.round(WALK)} s to cross), ${Math.round(share * 100)}% its species, shiny 1 in ${shiny}`);
  console.log("  ", JSON.stringify(avg(() => run(mins, every, shiny, share))));
}
for (const pace of ["rare", "often", "lots"]) {
  console.log(`An ordinary ${mins} min at "${pace}" (every ${VISIT_EVERY[pace].join("–")} min, shiny 1 in 64, any species):`);
  console.log("  ", JSON.stringify(avg(() => run(mins, VISIT_EVERY[pace], 64, 1))));
}

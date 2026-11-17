# Pokerdr: the trainer's game

Part of [RECIPE.md](../../RECIPE.md) (kept apart so the recipe stays under herdr.dev's 64 KB). Read both before building.

## The trainer's game (trainer.js, items.js)

The pure rules are in `mods/pokemon-herd/trainer.js` and `items.js`, each constant commented
with its reason; the tests (`tests/trainer.test.js`, `tests/items.test.js`) pin them down.

- **Pokédollars:** a job pays `1 + 5 × minutes` (₽300 at most, ×2 with an Amulet Coin), so about
  ₽300 an hour of agents' work however it's cut into jobs. Small extras with daily caps against
  farming: visitors' purses (₽10–30, now and then ₽60–100, a shiny ₽150, a legendary walking by
  ₽400, one called ₽100; up to ₽600 a day; fewer purses the more often visitors come) and tips
  (a pat that gives a heart ₽10, a spar set up by a drop ₽15, one watched ₽5; up to ₽200 a day).
  Prices are set from a working day (~₽3,000); anything sells back for half.
- **Catching:** a visitor's first click takes its gift and purse; then, with a ball over its
  head, a click throws one: the chosen ball (Bag, menu, or right-click the visitor) or Auto
  (cheapest; an Ultra Ball for a shiny, an Alpha or a legendary; never a Master Ball: that one only when chosen, and once thrown the choice goes back to Auto). A Berry goes
  before each ball (Razz ×1.5, Golden Razz ×2.5, Pinap: twice the gift, Silver Pinap: both): the
  one set in the Bag or the menu, None, or Auto (the default; `baitFor`: none with a Master Ball,
  the best there is for a rare one, a Razz for any other only when the ball alone is under 50%).
  A rare one walking in (shiny, Alpha, legendary) cries once, softly (a quarter of the volume,
  easing in: `ensureQuietCry`), and a note blinks in the strip's
  corner ("✨ Shiny Wooloo is walking by!"; Settings → Sound → When a rare one walks by). The
  visitor stops while the ball shakes (up to three times), then "Gotcha!" or it breaks free and
  walks on. Caught: into the Box (`box-<when>-<dex>`) with ♥1, a nature (Hasty, Lazy, Calm, Brave,
  Jolly: speed, napping, sparring, fidgets) and its ball. The throw (`fx.js`): the ball flies up
  from the strip's roomier side and down onto it (260 + 220 ms), the Pokémon flashes into it with
  a burst (260 ms), the ball drops to the ground and wobbles once per shake (320 ms of every
  700), then a burst: gold stars caught, white broken out.
- **Battling a wild one** (drop one of yours on it; `hitWild`, `hitBack` in `trainer.js`): yours
  steps off on its own side, far enough for their moves to fly (`fightGap`: half of each one's
  drawn width and 60 px between, 96–170 px; `wildSpot`, 300 ms), then uses its special move:
  its own type that does most to it (`bestType`) flies over and lands; the wild one flinches and
  loses health; 650 ms later it lets fly back with its own type. Each fights as it looks: a Mega
  or a regional form with its own stats and types (`base-stats.js` `FORM_BASE`, `fighterKey`),
  a Mega without data as its species ×1.2 hitting, ×0.85 taking. Damage: the games' (see
  Damage); a hit twice its health knocks it out (`OVERKILL_GREEN` 2), in the red half again (`OVERKILL` 1.5): stopping in the red, about 1 wild one in 12 is knocked out anyway; one more hit in the red, 4 in 5. Yours takes `OWN_TAKE` 0.85 of
  the wild one's hit, 2% less a heart. Its health is kept in shared state `pokemon-herd-hp`
  (`{ pane: { hp, at, rest? } }`, `healthNow`: back to full over 10 minutes, null while it rests
  after fainting), so a Berry fed from the Bag or the Box heals it (`HEAL`: an Oran Berry a
  quarter, a Sitrus Berry half; 💚), even once it has had its three Berries' hearts for the day. A Berry can't help one that fainted (it rests 10 minutes); a **Revive** (₽300, Shop and Pickup) brings it back at once with half its health, a **Max Revive** (₽800) with all of it (`picks.js` `REVIVE`; the Bag, the Box's pill and the picker's card; 💊 on the strip).
- **Battle effects** (`fx.js`, drawn by `main.js` with native transitions and loops): a move
  first gathers at the mouth (`CHARGE_MS` 340: sparks drawn in, a glow swelling), then goes
  its own way: a special move flies as `specialParts` draws it (Flamethrower a stream of flame,
  Surf a wave along the ground, Thunderbolt a jagged bolt, Ice Beam a beam crystals grow from,
  Sludge Bomb globs lobbed over, Earth Power the ground bursting under it, Psychic waves
  gripping it, Moonblast a moon over it shot down…, `at` from when it lands, from -`FLY`); a
  physical one rushes in to strike and back (`dashAt`; a boss never dashes) and leaves its mark
  (`physicalParts`); a signature move its own scene (`signatureParts`). (`TRAVEL`'s beams, arcs
  and volleys are the fallback for a move with no type.) Where it lands, debris by its look: embers rise, drops and rocks fall,
  sparks and leaves fly flat. After the hit, for 1.3 s, what it leaves on its target
  (`RESIDUE`): flames flickering (fire), sparks crackling (electric), frost over it (ice),
  bubbles rising (poison), dots circling its head (psychic, ghost, dark), drips (water), leaves
  falling (grass, bug), dust at its feet (rock, ground, fighting), sparkles (the rest). A wild
  one knocked out sinks and fades, smoke rising. A shot is in its type's colours and look (an orb with an ember tail for fire, bubbles,
  leaves, sparks, shards, rings, wind, a star; Mega Charizard X's fire blue) with a glow. Where
  any blow lands: a white flash and a ring swelling and fading, sparks flying out; the target
  knocked back (3–16 px by how hard) and back; a shake only for a super-effective one or a
  knockout; over its head the games' word ("Super effective!", "Not very effective…", "No
  effect…") and the damage floating up ("-23%"; yours hurt in red); a health bar's loss shows
  white, draining away. A plain strike lands lightly in white and gold.
- **Moves** (`moves.js`): for each type a physical, a special and a signature move (`MOVES`),
  and three more (`MORE_MOVES`: a weak one young Pokémon know, Tackle, Ember, Water Gun, and
  stronger ones, Fire Blast, Hydro Pump, Outrage…; 90 to know in all), each with its power from
  PokeAPI (`base-stats.js` `MOVE_POWER`: Fire Punch 75, Flamethrower 90, Blast Burn 150). Each
  Pokémon knows four (`MOVESET`, by `scripts/gen-stats.mjs` from PokeAPI's learnsets: among those
  moves, the ones it really learns, levelling up first, a TM, tutor or egg move ×0.3 so only to
  fill in (one move of each of its types; a TM or tutor move ×0.8 for one fully evolved (Venusaur's Earthquake over Tackle); a move of power 50 or less ×0.01, so never one it starts with unless it knows nothing else; Caterpie: Bug Bite, Tackle);
  its two best of its own types and its two best others for coverage, best by
  power ×1.3 on its stronger side ×1.5 its own type; a type it learns none of here gets that
  type's move on its stronger side; a Mega knows its species'). Each turn it picks one, chance ∝
  (expected damage × STAB)^3 (`PICK_SHARP`): mostly its best, now and then another. 1 in 8 that
  type's signature move instead (it fires), 1 in 16 a critical hit (×1.5), STAB ×1.5 for its own
  type. A physical move rushes in (a dash, `speedLines`; its type's mark on the target,
  `physicalParts`), a special one fires its own way (`specialParts`), a signature move has its
  own scene (`signatureParts`; `fxSig` draws them). Each of `MORE_MOVES` has its own look
  (`fx-moves.js` `PHYSICAL`, `SPECIAL`, by name, the same parts: Tackle a white smack, Double-Edge
  a heavy burst with recoil sparks, Fire Blast a fireball bursting in five flames, Hydro Pump a
  white-capped torrent, Giga Drain green motes drawn back, Solar Beam light gathered then a thick
  beam, Icicle Crash icicles dropped from above, Rock Slide rocks tumbling, Phantom Force a dark
  hole opening by it, Knock Off something knocked flying…). A heavy blow (power ≥ 0.85) holds both still
  `HITSTOP` (90 ms) before the knock back. A miss (as often as the move's accuracy in the games: `base-stats.js` `MOVE_ACC`, `missOf`; Thunder 30%, Fire Blast 15%, Swift never; the weather as the main games have it, `weatherMiss`: in rain or a storm Thunder and Hurricane never miss, in the sun they hit half the time, in snow Blizzard never misses, and Solar Beam is half as strong in rain or snow, `weatherPower`; with a small target's dodging on top, and counted in which move it picks) does nothing:
  "Missed!", the target hops aside. The move's name shows over the one using it as it gathers.
- **Damage** (`trainer.js` `damage`, `gameDamage`): the games' (Gen 5+, level 50): ((2×50/5+2) ×
  power × Attack/Defense (physical) or Sp. Atk/Sp. Def (special) / 50 + 2) × the type's effect
  (×4 … ×0) × 85–100%, over the target's HP (`STATS`); × STAB and crit (the move's `mul`), Alpha
  ×1.3/×0.8 (a wild Alpha hitting yours ×1.5, `WILD_ALPHA_HIT`: yours faints in ~62% of catches
  against one, 41% against any other), Shadow ×1.2. Battles on the strip × `DAMAGE_SCALE` 0.65 (a wild one weakened to
  the red in about 3½ hits, ~2% knocked out; raids re-tuned, `RAID_HP` 2.4); sparring at the
  games' own numbers (a knockout in one blow can happen). All are level 50 (`LEVEL`); being raised counts a
  little (`effortOf`: +1% to its stats, not HP, a heart, +5% at most; in the wild and raids only
  its attack, its hearts already softening what it takes). Its nature (`NATURE_STATS`): +10% one stat, −10% another (Hasty: Speed
  up, Defense down; Brave: Attack/Speed; Jolly: Speed/Sp. Atk; Calm: Sp. Def/Attack; Lazy:
  Defense/Sp. Def).
- **The big moments** (`fx.js` EVOLVE_MS, MEGA_MS, HATCH_*): evolving, it pulses while a column
  of light stands over it, motes rising and a ring swelling out, then a gold burst and "✨
  Evolved!" (3 s); Mega Evolving, a sphere of light round it and the Key Stone's six colours
  orbiting, then a burst (1.5 s; back from a Mega, a small one); caught, the ball clicks shut (a
  ring snapping in), glows and gold stars float up; a raid egg shakes hard and cracks in its last
  3 s, then hatches in a flash with rays of light and the shell flying apart, its boss growing
  from a third of its size.
- **White flash and dust**: a Pokémon struck flashes as its white silhouette for 170 ms (sprites.js
  `ensureWhite`, made once beside the sprite as `-w.gif` the first time it's wanted); evolving,
  the silhouette pulses over it. Knocked back hard, dust is kicked up at its feet.
- **Battle sounds** (Settings → Sound, and the 🔇/🔊 in the strip's top-right corner; off by
  default): gathering, a whoosh or a zap as it flies, a hit (a big one deeper), a ball thrown,
  landing, each shake, caught or broken out (`sfx/*.mp3`, synthesized by `scripts/make-sfx.py`),
  played by the leading strip right on time. The strip asks for a frame at each
  of these moments (`fxSchedule`), so nothing waits for its quarter-second tick.
- **Mass Outbreak** (`events.js`; Settings → Trainer → Events): once a day, at a time drawn
  from the date between 9:30 and 17:00 (the same in every window), for 20 minutes, a first-stage
  species (`outbreakOfDay`): visitors every 2–3 minutes (or the pace set, if faster:
  `outbreakPace`), 4 in 5 of them that species, shiny 1 in 16 (`outbreakPick`); a note in the
  corner ("🌊 Outbreak: Magikarp · 14m left"). Simulated (`scripts/sim-outbreak.mjs`): ~7 walk by,
  5–6 of its species, a shiny among them 1 outbreak in 3 (an ordinary 20 minutes at Often: ~4,
  1 in 17).
- **Raids** (`events.js`, shared `pokemon-herd-raid`; Settings → Trainer → Events): time, not
  jobs (a message to an agent counts as a job: jobs could be spammed). Every 150 minutes of all
  agents' work together (a working agent's minutes counted once a minute as they go, `creditWork`, one write for all; they used to count only when it stopped), 2 a day at most (`laysEgg`; it was per agent open, and seven open, most
  idle, needed 17½ hours of work for one), an egg (PokeAPI's `pokemon/egg` sprite) in
  the middle of the first row, wobbling its last 30 s; 5 minutes later it hatches into a boss ×1.8
  (an Alpha at its last stage; 1 in 5 a legendary not caught yet), with a health bar, for 30
  minutes; no other visitors meanwhile. Its bulk: `RAID_HP` 2.4, and `RAID_HP_PER` 2.4 for each agent
  on the field past the first, reckoned at each hit (`bulkFor`, `raidHit` `how.agents`: each agent a
  Pokémon that can hit it, so opening more to beat it makes it sturdier as they come; it was fixed
  by those working when the egg was laid, and a boss laid with most agents done fell in three hits;
  while a raid is on, its spot (mid-strip, first row, `BOSS_CLEAR` 80 px each side × the scale) is
  kept clear: yours don't stop there, and one standing there, asleep too, shuffles aside; tuned with `scripts/sim-raid.mjs`: an eager player wins in ~13 minutes
  whatever the team). You fight it: drop one of yours on it (near it, first row) and it steps off
  and fires its best type (`raidHit`: a wild hit's damage over its bulk, at least 3%; ×1.5 while
  its agent is working), each once a minute (`cooldownLeft`). While the battle is on, each one
  waiting shows "⏳ 35s" over its head, one resting "💫 1m"; dropped too soon it says so and hops
  back off the boss. The boss faces whoever hit it last, flinches as a blow lands, and turns to
  strike back (SpAttack, Shoot, Attack). Unless that beats it, the boss
  fires back 0.9 s later (its best type, half a wild hit back's damage; fainted, it rests 3
  minutes, `RAID_REST`, or a Revive brings it back at once) and throws the attacker off to
  150 px from it (30 px further if it stood further): no crowding round it; at 0 health it rests.
  Beaten: ₽300 (a legendary ₽600) and 3 Ultra Balls, and it walks off slowly with a sliver of
  health and a ball over its head, to be caught. Its notes: "🥚 Raid egg · hatches in 4m",
  "⚔ Raid: Alpha Tyranitar · 24m left", "⚔ Raid won!…" (90 s, or 8 s once caught), "… got away".
- **Today's events** (the Bag's Today tab, `todayEvents`): under the Research, a row for raids
  (the agents' work to the next egg as a bar, "egg 1 of 2 today"; an egg hatching; the boss's
  health in a raid on) and one for the day's outbreak (its species and time, the time left while
  on, or over).
- **Legendaries** (`LEGENDARY`): locked in the picker and for new agents until one is caught
  (Settings → Trainer → Unlock all, with "Sure?", opens them). One visitor in 150 is one; the
  Azure Flute (₽1,000) and the day's Research call one: always one not caught yet, while any are
  left (`wildPick` with the Pokédex's caught). 20 balls before one flees (`LEGEND_THROWS`, as GO's Premier Balls at most); it walks at half speed (`walkSpeed`), time to go after it.
- **Genders** (`gender.js`, data `gender-data.js` from `scripts/gen-gender.mjs`: PokeAPI's
  female rate in eighths, -1 genderless; SpriteCollab's female sprites): a wild one rolled one
  (`rollGender`); a saved one without, given one by its slot (`genderFrom(hash(pane:gender))`,
  `loadPicks`, `assign`), so it never changes. A female of the 59 with their own sprite is drawn
  with it (`loadSprite` form "female": `sprite/<dex>/0000/<0000|0001>/0002`; sprite key "g").
  `GENDER_EVOLVE`: Gallade ♂, Froslass ♀, Vespiquen ♀, Salazzle ♀, Wormadam ♀, Mothim ♂
  (`evolveTarget`). ♂/♀ by its name (hover, Gotcha, Box); the Pokédex's `male`/`female` lists
  and a "♂ and ♀" count.
- **Weather** (`weather.js` `weatherNow`): rain or a storm (scene.js `weatherOf`) Water, Electric,
  Bug; else night (`nightness` ≥ 0.5) Dark, Ghost, Poison; else the season (`seasonAt`): spring
  Fairy, Normal, Flying; summer Fire, Grass, Ground; autumn Dragon, Psychic, Fighting; winter Ice,
  Steel, Rock. A boosted type's move ×1.2 (`WEATHER_HIT`; main.js `boosted`, the weather's icon by
  its name), in every battle; `WEATHER_SHARE` 40% of the wild ones are of a boosted type
  (`wildPick` `boost`). A row on the Today tab.
- **Sizes** (`weather.js` `rollSize`): each wild one, as it appears: XXS 1/40 (0.5–0.7), XS 1/8,
  XL 1/8, XXL 1/40 (1.3–1.5), else 0.9–1.1. Feel, not strength (that's an Alpha's): moves miss an
  XXS 1 in 8, an XS 1 in 12 (`sizeMiss`, `pickMove` `targetSize`); a blow knocks back by the
  hitter's size over the target's (`knockMul`, 0.6–1.6, a blow's `kb`). Drawn ×`drawSize` (0.3 of
  the difference: ×1.15 at most) never taken for an Alpha; its size shown only in the Box, unless an XXL/XXS would be its species'
  biggest/smallest yet (`recordSize`: under a wild one's feet, on the Gotcha line);
  kept when caught (`size`), shown on its Box tile and in its facts; the Pokédex keeps each
  species' smallest and biggest (`sizes`, `withRecord`).
- **Shadow Alphas** (`SHADOW_SHARE` 1 in 3 Alphas; `shadow: true`): dark violet flames behind it and
  violet motes; it hits ×1.2 and takes ×1.2 (`SHADOW_HIT`, `SHADOW_TAKE`), wild or caught. In the
  Box (filter Shadow), at ♥4 (`PURIFY_HEARTS`) a Purify pill: no longer Shadow, still an Alpha, a
  heart more and ₽100 (`purified`, `PURIFY_PAY`).
- **Alphas** (`ALPHA_ODDS` 40): a wild one ×1.4 bigger with a breathing red glow and a red α;
  half the base rate to catch, ₽150 and twice the gift; caught, `alpha: true`, ♥2, still bigger.
- **Pokédex:** species seen and caught by region; goals at 5, 15, 30, 60, 100, 200 caught pay
  money, Ultra Balls, Master Balls. A species caught shiny can be chosen shiny in the picker.
- **Today:** three Research tasks a day, drawn from the date (every window agrees), each paying
  when done (money, or 15–20 Poké Balls, 8 Great Balls); all three: 5 Ultra Balls and an Azure Flute, to call a legendary when you choose (it came at once, and a task done by agents' work alone, nobody watching, lost it). Yesterday sums up in a line.
- **Trainer mode** (Settings → Trainer, off by default, its tab twinkling): only caught species
  and the three Kanto starters can be chosen or come to new agents.


- **Choosing moves** (`moves.js` `learnableOf`, `chosenOf`; a pick's `moves`): in the picker's card
  and the Box, "Change" lists every move it can really learn (`base-stats.js` `LEARNS`: among the
  90, and the 18 signature moves from `SIG_FROM` when it learns them), its type's colour, its power;
  a click takes or drops one, `MAX_MOVES` 4 at most, at least one; "Default" goes back to its own
  four. Chosen moves are used in the wild, raids and spars; a signature move chosen is used as one
  (it fires, misses 1 in 5). No cost and no limit but what it learns.
- **Their own moves** (`moves.js` `EXCLUSIVE`, 44): a move only one Pokémon (or its line) knows,
  as in the games (Judgment Arceus, Psystrike Mewtwo, Roar of Time Dialga, Spacial Rend Palkia,
  Aeroblast Lugia, Sacred Fire Ho-Oh, Volt Tackle Pikachu, Pyro Ball Cinderace, Flower Trick
  Meowscarada…), with its power, type and side. Always among its four (in place of its last), and
  in Change (a white edge). Used as a signature move is drawn (`fx.js` `signatureParts`, its
  type's scene; Judgment its own: `fx-moves.js` `SIGNATURE`, light gathered, then pillars of light
  in the judged type's colours coming down), but as sure to hit as any move and as physical as
  it is. Rules: Judgment's type is the one that does most to the other (`judgedType`, with STAB);
  `crit: "high"` 1 in 8 (Spacial Rend, Aeroblast, Snipe Shot), `"always"` (Flower Trick);
  Thousand Arrows hits a Flying type (neutral); Oblivion Wing drains ¾; Sacred Fire burns half the
  time, Blue Flare and Bolt Strike 1 in 5 (spar.js `SIDE_EFFECTS`).
- **What a wild one does** (`wildacts.js` `actFor`, chosen as it comes; main.js `visit` stops it
  `v.halt` where it does it, then it walks on as a new leg): about 1 in 4 do one thing. By its
  kind (lists of national numbers): `tease` (Gastly line, Sableye, Zorua, Impidimp, Mimikyu,
  Jigglypuff…: stops at one of yours idle or asleep within `NEAR` 24 px on its row, 💢 over it,
  then runs off at ×1.8 with 😜; its purse ×1.5), `nap` (Snorlax, Slowpoke, Slakoth, Komala:
  60–90 s asleep 30–60% of the way across, its sleep sprite and zZ; `asleep` ×1.5 to catch; hit
  awake, `grumpy`, it hits back ×1.3), `teleport` (Abra, Ralts lines: a ball it breaks out of and
  it's 200+ px away, a psychic flash at both ends), `challenge` (Machop, Hitmons, Riolu, Scrafty,
  Hawlucha…: stops at one of yours idle, ❗ 1.5 s, then a battle as a drop starts one),
  `friendly` (Eevee and its evolutions, Pikachu, Togepi, Marill, Buneary…: stops by one of yours,
  both 💗; ×1.2 to catch). By what's going on: `weather` (a type the day's weather favours, 1 in
  4: stops 4 s with ☀️ 💧 ❄️ 🍃…), `curious` (an agent working, 1 in 8: stops by its Pokémon, ❓
  3 s). By chance: `dash` (Speed 100+, 6 in 10: ×2 pace, 💨). A legendary or an outbreak's: none.
  A ball or a battle ends it. Icons only while it does it (nothing pulsing).

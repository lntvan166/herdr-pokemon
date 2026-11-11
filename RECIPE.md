# Pokémon herd

Every coding agent becomes a pixel-art Pokémon on a strip of ground. It walks while its agent
works, strolls and naps when the agent is idle, and stands calling for you with a red "!" when
the agent is blocked. Each Pokémon's agent name sits under its feet. Click a Pokémon to jump to
its agent; it wakes up and looks at you. There are 974 species, an occasional shiny, regional
forms, and Mega Evolution while an agent works.

![Pokémon herd](preview.png)

## What you see

- **A strip:** one block, background `chrome`. It has a faint ground line (1 px, `border`) per
  row. Without `props.rows` it is the classic single strip that Herdr docks at the bottom of the
  window (`mod.json`: `place: "bottom"`, `size: 112`). With `props.rows` = 1–3, it is that many
  rows.
  - Each row is `round(88 × scale) + 24 + 18` px tall: room for the sprites above the ground,
    then two lines for names below it.
  - The block resizes itself to `rows × that` with `layout.resize`.
  - `props.scale` (default 1; 0.75 suits a sidebar) scales the sprites.
- **Scenery** (`props.background`, default; `"plain"` turns it off): each row has its own scene
  above its ground line.
  - The sky is one flat colour, muted and dark so it sits in a dark app: a grey teal `#22383c`
    by day (not blue, or the many blue Pokémon sink into it) and `#141b2c` by night. It is day
    from 6:30 to 17:30 and night from 18:30 to 5:30, blended over an hour at dawn and dusk.
  - By day at most 3 clouds per row, white at 14 %. By night sparse stars (one per 40 px, 70 %)
    and a moon. Low rounded hills one step lighter than the sky (`#2c4636` / `#1b2637`).
  - Small trees standing on the grass behind the Pokémon, one every 150–310 px (sometimes a
    little one beside): round (a canopy with a darker lower right) or pine (four tiers), 18–30 px
    tall, one step darker than the hills (`#3b6e3c` / `#22402f`, light theme `#86b673` /
    `#8aa293`), on a 2 px trunk.
  - A 7 px grass band (`#558a41` / `#27472f`) on the ground line, with a 1–3 px tuft every
    6–17 px.
  - In a light theme (the theme's `chrome` is light) the same scene is pale and soft: sky
    `#d9e6e4` by day and a dusk slate `#c8cddb` by night, hills `#c6d9c4` / `#b6bece`, grass
    `#8fb878` / `#7f9e85`; clouds at 75 % and stars at 95 % so they still show on it.
  - A cloud or the moon right above a Pokémon's head or bubble fades to 15 %, so the bubble stays
    readable. It uses the heads' places on the last frame.
  - Seasons (`seasonAt`): spring, summer, autumn, winter, 3 hours each, the cycle one step later
    each day (so a given hour changes season from day to day); the last 20 minutes blend into the
    next. The grass band changes most, so each season reads at a glance. Spring: pink blossom
    trees (`#f7a8cc`), lime grass (`#9be060`), 2 px pink/yellow flowers every 7–22 px. Summer: deep
    green (`#2f8a3a`, grass `#3d9a33`). Autumn: orange trees (`#e07a26` / `#b0461f`), gold grass
    (`#d1a640`), and falling leaves. Winter: trees, grass and hills towards white, and falling snow.
    Snow is 2 px flakes (one per 25 px) falling 5–12 px/s with a sway; leaves are every other flake,
    orange. Redrawn every tick and slid with `top`/`left` transitions; a flake back at the top is a
    new element, so it never slides up. In a dark theme the season colours are dimmed only a little
    (and more at night), or blossoms, gold and snow read as grey.
  - Below it the names keep the strip's colour. Positions are seeded per row, so nothing
    flickers.
- **The Pokémon:** one per agent, an animated sprite cut from PMD SpriteCollab.
  - Its feet stand on the ground line, with a soft shadow (`#00000030`).
  - Sprites are drawn 2× with nearest-neighbour scaling, or 1× for big ones whose frames are
    over 64 px tall.
  - While a sprite downloads, a small Poké Ball (`#e3350d` / `#f4f4f4`) pulses in its place.
- **Names:** under each Pokémon's feet. Each shows a 6 px status dot (theme colour `working`,
  `blocked`, `done` or `idle`) and the tab's name (or the space's), in 10.5 px text.
  - Muted text; `foreground` when the agent is focused or the Pokémon is hovered.
  - Two lines per row, fixed. A tag is centred under its own Pokémon, pushed in only at the
    strip's edge.
  - On the first line, a tag keeps to its share: halfway to the Pokémon on each side.
  - When two tags collide, the less important one drops to line 2. Blocked ranks above done,
    above focused, above the rest. Tags of Pokémon standing longest keep their lines first.
  - A crowded tag narrows to 54 px (about 6 letters), then 36, then 24, with "…". It is never
    hidden.
  - Shiny Pokémon get "✨ " before the name.
- **Bubbles above heads:**
  - Blocked: a red "!" (`blocked` colour), pulsing.
  - Done: a green "✓" (`done` colour).
  - Asleep: grey "z / zZ / zZz / zZ", cycling every 700 ms.
  - A ✨ flashes beside a shiny when it first appears, and for 1.5 s when a Pokémon Mega
    Evolves or turns back.
- **The picker:** a 640×700 dialog titled "Choose a Pokémon", "for <tag>".
  - A card for the Pokémon it is now (read live, so it shows an evolution that happened while open):
    its icon, "✨ Name #dex · Region", "Its species: 12 done · 3h", then "Evolves after 7 more
    jobs" with a thin progress bar, or "Fully evolved", "Doesn't evolve", "Holds an Everstone:
    won't evolve". On the right, a "🪨 Everstone" toggle (only for species in a line). Under it,
    the evolution line, stage by stage with "›" between: icon and name each, icons only when a
    stage branches (Eevee). Click one to become it; the current one is outlined.
  - A "🎲 Random" button beside "Esc" ("🎲 Random match" while searching): any of the matches
    but the current one, preferring a species no other pane has (`randomEntry` in `picks.js`).
  - Under the search box, a row of small toggle chips: "Mega" (species that can Mega Evolve), then
    one region of Kanto, Johto, Hoenn, Sinnoh, Unova, Kalos, Alola, Galar, Hisui, Paldea (click
    the lit one again for all). A species' region is where its dex number was introduced; a
    regional form's is its own (`regionOf` in `dex.js`). They combine with the search and Random.
  - An optional row "Mega: Off / On / Auto: while working", only for species with a Mega.
  - An optional row "Form: Mega X / Mega Y", only when both are drawn. Mega X is the default, and
    a choice of Y falls back to X until Y is drawn.
  - A search box, then a grid of every match: 6 columns of 92×96 cells, each with a 56 px
    portrait, its dex number "#025" and its name. Regional forms follow their species as
    "Vulpix (Alola)".
- **The menu:** a 236×272 popup with "Rows: 1 2 3", "Background: Plain / Scenery", and "Place: Sidebar / Bottom of the window /
  Right panel (with Files)". The current choices carry an accent border or a ✓. Under them,
  "Stats": "All: 128 done · 14h 20m" and the three species with the most jobs (52 px plus 20 px
  a species taller).
- **Evolution** (`picks.js`; data from PokeAPI in `species.js`: `EVOLVES_FROM`, and `EVOLVE_HOW`
  from pokemon_evolution.csv). Each species it can become has its ways ("jobs", "stone:<kind>"
  for the ten common stones, "friend", "friend:day", "friend:night", "day", "night"); any one will
  do. Levelling up, trades and odd ways count as "jobs": `EVOLVE_JOBS` (10) jobs since it became
  this Pokémon. "friend" needs `MAX_HEARTS` (5) hearts and evolves on its next job. Day/night:
  `nightness >= 0.5` when the job finishes. Stones and Rare Candy (any non-stone way, ignoring the
  count) are used from the picker. A branch is chosen by hash of pane and dex among the ways met.
  A regional form evolves into the same region's form when one walks. Shiny (if the new one has a
  shiny sprite), Mega mode, X/Y, hearts and `stay` (the Everstone, which stops all of it) carry
  over; `evolvedAt` makes every view flash ✨ for 3 s. Choosing a Pokémon restarts the count and
  keeps `stay`. Sub-agents don't evolve.
- **Seasonal coats** (`SEASONAL`, `coatOf` in `dex.js`): Deerling and Sawsbuck's sprites use their
  Summer, Autumn or Winter form folder in those seasons (names and picks unchanged).
- **Hearts** (`hearts` on a pane's pick, 0..5): +1 for a click on it (at most every 30 min), +1
  when its agent is answered within a minute of asking (at most every 10 min); waiting over 5 min
  makes it hungry (😢 pulsing beside its head, −1); answered while hungry, it eats a Berry from the
  Bag if there is one (+1, 🍓). Picker: red ♥ for each, grey for the rest.
- **The Bag** (`items.js`, shared state `pokemon-herd-bag`, `{ v: 1, items: { <id>: count },
  marks: { evolutions, nightJob, fullHearts } }`, up to 99 each): Berry, Rare Candy and the ten
  stones. Pickup: every 1 to 2 hours per Pokémon, if its agent is idle then, it finds one (Berry
  70, each stone 2, Rare Candy 10 by weight), its icon beside its head for 8 s. A job of 30 min or
  more earns a Rare Candy (🍬). The picker's "Bag" row lists Berries, Rare Candy and the stones it
  could take; ones of no use now are greyed.
- **The Bag dialog** (600×562, props `{ bag: true }`; opened from the menu's "Open the Bag" row,
  which shows "n items · g/8 badges", or the command `pokemon-herd.bag`). Style: flat, elevation
  by one lightness step (`raised` panels on `popover`, no borders, no shadows); colour only on
  data (a 6 px `accent` dot on items someone can use now); the one primary control is `solid` on
  `solid_foreground`. Title row: "Bag", under it the finding ("Thunder Stone can evolve Pikachu
  (api) now", evolutions before hearts, else "Nothing to use right now"); right: "39 jobs · 26m
  worked", "Esc". Left, a 218 px panel: all twelve items on a 30 px pitch, PokeAPI's 30 px item
  sprite (saved at 2x, shown at 26), name, count right-aligned; zero counts dim with the sprite at
  35%; the chosen one on `selected`. Right, the same height: the item at 56 px, its name, "n in
  the Bag", what it does (`itemAbout`: a stone lists the species it evolves), "On screen" and up to
  four agents it helps now (`takersOf`): portrait, "Name · tag", "becomes Raichu" or "♥ 2 → 3",
  a "Use" pill; "and n more"; or an honest empty line. Bottom: "Badges g of 8" (hovering one
  names it and what it takes, at the right), and a strip of the Kanto badge sprites (PokeAPI
  badges/1..8, 34 px, unearned at 18%) with the Shiny Charm sprite and "At 500 jobs · 39 so far"
  or "Shinies 1 in 32" at its right end. Redraws every second and fetches missing portraits.
- **Badges and the Shiny Charm**: 🪨 10 jobs, 💧 100, ⚡ a first evolution, 🌈 24 h of work, 💗 5
  hearts, 🌙 a job finished 0:00–5:00, 🌋 a job over an hour, 🌍 1000 jobs; Shiny Charm from 500
  jobs (new agents' shinies 1 in 32). The emoji are only names here: the Bag draws the sprites.
- **Stats** (`stats.js`, shared state `pokemon-herd-stats`, `{ v: 1, species: { <dex>: { jobs, ms,
  longest } } }`): per species, not per pane, so closing a pane loses nothing; shiny, Mega and
  regional forms count as their species. A job is work that ends in done or idle; blocked
  (waiting on you) pauses it without counting the wait. An agent already working when the strip
  starts counts from then. The hovered name adds "128 done · 14h 20m".

## How it behaves

- **Seasonal reactions** (Scenery on): an idle Pokémon about to stroll on reacts to the season
  instead, 3 times in 10: spring `sniff` (Eat, Nod, Hop), summer `bask` (Laying, Sit, DeepBreath,
  Hop), autumn `lookUp` (LookUp, Rotate), winter `shiver` (Shake, Cringe, Hurt): the first
  animation its sprite has, played over for about 2 s, with 🌸 ☀️ 🍂 ❄️ pulsing beside its head.
  Only some sprites have the fitting animations, so each list ends in one nearly all have. Then it
  rests 3–8 s. It falls asleep after 3 minutes idle by day, 1 minute by night.

- **Agent statuses:**
  - **working:** walks to random spots at 70 px/s, pausing 0.3–1.8 s.
  - **idle:** strolls at 32 px/s, pausing 4–12 s, and stops at least 60 px from other resting
    Pokémon. After 3 minutes idle (1 at night; the tab's `changed_at`), it sleeps, using the Sleep sprite
    with "zZ". A tab unchanged since start counts as asleep.
  - **blocked:** stops where it is, startles once (Hurt or Shake), then shows the "!".
  - **done:** stops, celebrates once (Dance or Hop), faces you with a "✓". Herdr reports `done`
    only if the agent finished while you weren't looking; working → idle celebrates too.
  - **Starting work** (idle/done → working): a short Charge (or Hop), then it walks off.
- **Focus:** when focus moves *to* an agent (its pane, or a click on its Pokémon), the Pokémon
  wakes: Wake, or Hop if it has no Wake, or a 600 ms stand. Then it faces you for 1.5 s and
  stays awake 15 s. Only the newly focused one reacts, and nobody reacts at startup.
- **Hover** a standing Pokémon or its name: it turns half towards you (down-left or down-right,
  facing inward). Its full "Pikachu · tag" floats over its neighbours on a popover background.
- **Click** a Pokémon or its name: `pane.focus {pane}`, or `agent.focus {terminal}` for an
  agent without a pane.
- **Drag** a Pokémon (after 5 px): it follows the pointer, can change row, and stays put for
  20 s. The click that ends a drag is ignored.
- **Right-click** a Pokémon or its name: the picker for that agent. `alt-shift-p` (`keys.json`
  → `pokemon-herd.pick`) opens it for the focused agent. Choosing saves the pick and closes it.
  Enter chooses when exactly one matches.
- **Right-click the ground:** the menu.
  - Rows change the block's `props.rows` and height wherever it sits.
  - Place moves the block to `sidebar-lists` (above `needs-you`), `work` (above `status-row`),
    or `panel` (after `panel-body`), by `layout.set` on the shown layout.
  - Built-in layouts (main, terminals, win98) are greyed out.
- **Rows are one track:** about 3 in 10 walks of a working or strolling Pokémon go 40 px past
  the row's edge. Off the right, it appears outside the left of the next row and walks in. Off
  the left, it appears on the row above. The last row wraps to the first. It won't move onto a
  row that already holds its fair share.
- **Updates:** `id.js` holds `VERSION` (year.month.day). Once a day the strip reads `id.js` from
  the repo on GitHub (`data/pokemon-herd/latest.json`). When that is newer, an accent pill
  "Update <version>" sits in the strip's top-right corner. Clicking it opens the menu, which
  grows to 352 px with how to update.
- **Picks:** a new agent's Pokémon is chosen from the 974 walking species by a hash of its pane
  id, skipping any already on screen.
  - 1 in 64 is shiny, if a shiny sprite exists. Picks are saved per pane and kept.
  - Sub-agents without a pane keep theirs in memory.
  - Picks made by the upstream `pokemon-agents` mod are taken over once.
- **Mega** (per Pokémon, in its picker): Off, On, or Auto (the default: Mega while its agent is
  working). 41 species at release; regional forms don't Mega Evolve.
  - SpriteCollab draws new Megas every few weeks. Once a day the strip downloads its
    `tracker.json` and keeps the Megas that walk in `data/pokemon-herd/megas.json`. A new one shows
    up without a release. The built-in list always stays, and a failed download waits a day.

## Built from

- **The mod:** `mods/pokemon-herd/`.
  - `main.js` is the view and wiring: the strip, the picker (`props.picker`), and the menu
    (`props.menu`), all one mod opened three ways.
  - Pure modules, testable with `node --test`:
    - `id.js`: the id "pokemon-herd"; the shared key and the cache folder come from it.
    - `species.js`: generated by `scripts/gen-species.mjs`. SPECIES `[dex, name, shiny]`,
      MEGA, REGIONAL.
    - `dex.js`: names, search, forms.
    - `picks.js`: saved picks, hash, shiny, migration.
    - `tags.js`: name-tag layout.
    - `react.js`: reactions and poses.
    - `rest.js`: resting spots.
    - `wrap.js`: rows as a track.
    - `place.js`: layout edits for the menu.
    - `sheets.js`: which sheets to fetch.
    - `update.js`: the release on GitHub vs this one.
    - `megas.js`: which Megas have art, from `tracker.json`; also used by `scripts/gen-species.mjs`.
    - `safe.js`: a tick that survives errors.
    - `scene.js`: Scenery colours by the clock and the season, and seeded positions.
    - `stats.js`: jobs and working time per species.
- **Herdr functions:** `agents()`, `spaces()` (tab names, `changed_at`), `theme()`,
  `settings().zoom`, `props()`, `shared/setShared("pokemon-herd")` for picks, `layout()`,
  `openOverlay/closeOverlay`, `nextCommand()`, `exec`, `appHome()`, and `fs/promises`.
- **Commands:** `pane.focus`, `agent.focus`, `layout.resize`, `layout.set`.
- **Motion:** a `cx.timer.every(250)` tick moves the Pokémon. Movement uses `left` transitions,
  `.frames` for "zZ", and `.loop` for pulses. The picker grid is a `v_virtual_list`.
- **Programs and network:** it runs `curl` and ImageMagick (`magick`, or `convert` +
  `identify`).
  - It downloads `AnimData.xml` and `*-Anim.png` sheets from
    `raw.githubusercontent.com/PMDCollab/SpriteCollab` (`sprite/<dex>[/<form>][/0001 shiny]`)
    and portraits (`portrait/<dex>[/<form>]/Normal.png`).
  - It cuts one facing per GIF (walk right and left; idle down-right, down-left and down;
    sleep; reactions facing down) into `~/.config/herdr-app/data/pokemon-herd/`.
  - Sprites download when first shown, icons when they scroll into view, at most 8 at a time.
- **Art:** PMD SpriteCollab (CC BY-NC 4.0). Names from PokeAPI. Nothing Pokémon is in
  `mods/`.

## Watch out

- Each Pokémon's box is 128 px wide and spans its row. Take the mouse only on the visible
  sprite and its tag, or neighbours steal each other's hover and clicks on a narrow sidebar.
- Place Pokémon only after the first `on_size_change`. Placing them in a guessed width piles
  them at the edge.
- Keep the tag lines fixed. Growing the block for extra lines makes the ground lines jump.
- Lay tags out where each Pokémon is headed. Put a walking Pokémon's tag on a line that stays
  clear along its whole way, and lay it out after the standing ones.
- A virtual list reports only the clicked row: the pointer's x picks the cell.
- A one-shot reaction is a looping GIF, shown for the animation's total duration.
- Some species lack Sleep (it uses Idle), Wake, Dance or Shake, so every reaction needs a
  fallback. 51 species have no walking animation and are never handed out.
- One missing optional reaction sheet must not sink the Pokémon, so fetch those one by one.
- Don't open the right panel from the mod: Files/Changes own it.

## Done when

- `npm test` passes, and `herdr-app check mods/pokemon-herd` passes.
- On a 243 px sidebar with 2 rows and 7 agents:
  - every agent shows a Pokémon with its name under its feet;
  - no name is hidden;
  - the ground lines don't move for a minute.
- A working agent's Pokémon walks, and sometimes leaves a row's edge and turns up on the next
  row.
- Focus a sleeping agent's pane: its Pokémon wakes, faces you, and sleeps again about 15 s
  later.
- Right-click a Pokémon: the picker searches "alola" and scrolls through all of them. Choosing
  one changes it, and a shiny stays shiny.
- Right-click the ground: 1/2/3 rows change the height at once. Bottom of the window moves the
  strip there.
- A Pokémon with Mega on Auto turns Mega when its agent starts working, and back when it is done.

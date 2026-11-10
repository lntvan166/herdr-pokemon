# herdr-pokemon

Every coding agent in [Herdr](https://herdr.dev) becomes a pixel-art Pokémon. It walks while
its agent works, naps when it's idle, and calls for you when it's blocked. Click one to jump
to its agent.

<p align="center"><img src="docs/demo/herd.gif" alt="A herd of Pokémon in Herdr's sidebar, two rows, each named after its agent" width="540"></p>

A Herdr mod, `pokemon-herd`. It started as a copy of
[mathieucroset/herdr-pokemon-agents](https://github.com/mathieucroset/herdr-pokemon-agents)
(see [Where this comes from](#where-this-comes-from)).

## What it does

**They react to you and to their agents.** Click an agent, or focus its pane, and its Pokémon
wakes up and looks at you, then stays up 15 s. When its agent finishes, it celebrates. When the
agent needs you, it startles and calls. When the agent starts working, it gets ready to go. Hover
one and it turns to you, and its name shows what its species has done: "Pikachu · api · 128 done ·
14h 20m".

<p align="center">
  <img src="docs/demo/focus.gif" alt="Clicking an agent wakes its sleeping Pikachu, which looks at you" width="360">
  <img src="docs/demo/reactions.gif" alt="Venusaur celebrates a finished task; Garchomp startles when its agent needs you" width="360">
</p>

**974 Pokémon, a few surprises.** Every agent gets a random Pokémon from all those with a
walking animation, and keeps it. Now and then one is **shiny** (1 in 64). Right-click one, or
press `alt-shift-p` for the focused agent, to pick another: search by name, number or region,
or scroll through them all. The **regional forms** (Alola, Galar, Hisui, Paldea) are there too.

<p align="center"><img src="docs/demo/variety.gif" alt="Pikachu, a shiny Pikachu, Alolan Vulpix and Mega Charizard X" width="440"></p>

**Mega Evolution.** About 40 species can Mega Evolve. Each one's picker has a Mega setting: Off,
On, or Auto. On Auto, it Mega Evolves while its agent works and turns back when the agent is
done. New Megas show up by themselves as SpriteCollab draws them (the mod checks once a day).
Mega X / Y: pick one in the picker once both are drawn.

<p align="center"><img src="docs/demo/charizard-mega.gif" alt="Charizard asleep; its agent starts working; it Mega Evolves into Mega Charizard X and walks off" width="360"></p>

**A herd that stays readable.**
- Every name sits under its own Pokémon. It is cut with "…" when space is tight, and drops to a
  second line when two would collide. A name is never hidden.
- Resting Pokémon spread out to make room for their names.
- The ground lines stay put: the strip never jumps up and down.

**Yours to arrange.**
- Right-click the strip's ground to choose 1–3 rows, and where the strip sits: the sidebar, the
  bottom of the window, or the right panel.
- The background is **Scenery** by default: sky, hills, trees and grass. It shows day or night by your
  clock, with clouds by day and stars and moon by night, and it never draws behind the names.
  It is muted in a dark theme and pale in a light one. The seasons turn every 3 hours: spring
  flowers, summer green, autumn leaves, then snow, a step further on each day.
  Switch it to **Plain** in the same menu.
- **Stats:** each species counts the jobs its agents finished and the time they spent working.
  Two agents that are both Pikachu add to Pikachu's. The same menu shows the totals and the three
  busiest species.
- The rows form one track: walk off the right edge of one and you turn up on the left of the next.
- Drag a Pokémon to move it, or to change its row.

## Install

You need [Herdr](https://herdr.dev), `curl`, and ImageMagick (`magick` or `convert`).

In Herdr, the easiest way is to ask your agent to add `herdr.dev/mods/lntvan166/herdr-pokemon`
(it follows [RECIPE.md](RECIPE.md)). Or by hand:

```sh
git clone https://github.com/lntvan166/herdr-pokemon
cd herdr-pokemon
scripts/install.sh   # copies mods/pokemon-herd into ~/.config/herdr-app/mods/ and checks it
```

Herdr docks a strip at the bottom of the window the first time it sees the mod. Right-click
its ground to give it more rows or move it to the sidebar. Built-in layouts must be cloned
first (`layout.clone`). To place it yourself instead, add a block to a layout you own:

```json
{ "id": "pokemon-herd", "type": "block", "content": { "mod": "pokemon-herd", "props": { "scale": 0.75, "rows": 2 } }, "size": { "px": 216 } }
```

Optional, in `keys.json`: `"alt-shift-p": "pokemon-herd.pick"` opens the picker for the
focused agent.

The mod downloads sprites as it needs them into `~/.config/herdr-app/data/pokemon-herd/`.
If you are coming from the upstream `pokemon-agents` mod, your agents keep their Pokémon.

## Updating

An installed copy doesn't update by itself. Once a day the strip checks this repo, and when a
newer version is out it shows a small **Update** pill in its corner (right-click the ground for
the details). To update:

- **Installed by your agent:** delete `~/.config/herdr-app/mods/pokemon-herd/`, then ask it to
  add `herdr.dev/mods/lntvan166/herdr-pokemon` again. Without the delete it adds a second copy
  under another name.
- **Cloned by hand:** `git pull && scripts/install.sh`.

Your agents keep their Pokémon, shinies and Mega settings, since those live in Herdr's shared
state and not in the mod's folder. New Megas need no update: the mod picks them up as
SpriteCollab draws them.

## Art and names

- Sprites and portraits: [PMD SpriteCollab](https://github.com/PMDCollab/SpriteCollab) by the
  PMDCollab artists, CC BY-NC 4.0. Each sprite's credits are in their repo. The mod downloads
  them on first use.
- The demo GIFs above are drawn from those sprites (same credits and licence) by
  `scripts/make-demos.py`. They are the only Pokémon art in this repo.
- Names come from [PokeAPI](https://github.com/PokeAPI/pokeapi)'s
  `pokemon_species_names.csv`. `node scripts/gen-species.mjs` bakes them into
  `mods/pokemon-herd/species.js`.
- Pokémon and all related names are trademarks of Nintendo, Creatures and GAME FREAK. This is
  an unofficial fan project, not affiliated with them.

## Where this comes from

The original idea and implementation are
**[mathieucroset/herdr-pokemon-agents](https://github.com/mathieucroset/herdr-pokemon-agents)**
(MIT, commit `93e86ad`, v0.2.0). Its changelog is in
[docs/upstream-CHANGELOG.md](docs/upstream-CHANGELOG.md), and its license and copyright stay in
[LICENSE](LICENSE). This is now its own mod, and it installs next to the upstream one without
clashing.

## Develop

`npm test` runs the tests for the pure modules (Node ≥ 20). The pure modules are: species and
picks, name-tag layout, reactions, resting spots, row wrapping, and placement.
`scripts/install.sh` copies the mod into Herdr, which hot-reloads it.

## License

Code: MIT (see [LICENSE](LICENSE)). The demo GIFs: CC BY-NC 4.0, after PMD SpriteCollab.

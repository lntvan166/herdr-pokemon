# Contributing

Thanks for wanting to help the herd. Bug reports, ideas and pull requests are all welcome.

- **A question or an idea:** start a [Discussion](https://github.com/lntvan166/herdr-pokemon/discussions).
- **Something broken:** open an [issue](https://github.com/lntvan166/herdr-pokemon/issues/new/choose)
  with the mod's version (Settings → Updates), Herdr's version, and a screenshot if you can.
- **A change:** open a pull request. For anything bigger than a fix, open a Discussion first, so
  we agree on it before you spend the time.

## Set up

You need [Herdr](https://herdr.dev), Node ≥ 20, `curl`, and ImageMagick (`magick`, or `convert`
and `identify`).

```sh
git clone https://github.com/lntvan166/herdr-pokemon
cd herdr-pokemon
npm test              # the pure modules' tests
scripts/install.sh    # copies mods/pokemon-herd into ~/.config/herdr-app/mods/ and checks it
```

Herdr reloads the mod as soon as it is copied in. `herdr-app status` shows its errors (`errors`),
and `herdr-app check mods/pokemon-herd` checks it without installing.

## How the code is laid out

- `mods/pokemon-herd/main.js`: the views (the strip, the picker, the Bag, Settings, the cards) and
  the tick that moves the herd.
- Pure modules, each with tests in `tests/`: `picks.js` (who is which Pokémon, evolving, hearts),
  `react.js` (reactions, battles), `items.js` (the Bag, Pokédollars, the Shop), `scene.js` (the
  sky), `tags.js`, `rest.js`, `wrap.js`, `place.js` (layouts), `stats.js`, `settings.js`,
  `update.js`, `types.js`, `dex.js` / `species.js` (generated).
- `mods/pokemon-sidebar/`: Pokémon Sidebar, a fork of Better Sidebar (Apache-2.0: keep its
  LICENSE and NOTICE, and add what you change to NOTICE). Its tests are in `tests/sidebar/`.
- `sprites.js`: downloads and cuts the sprites (bump its `VERSION` when the cut changes, so caches
  are rebuilt).
- [RECIPE.md](RECIPE.md) describes how everything behaves, numbers included. Keep it in step with
  the code: an agent can rebuild the mod from it.

## Conventions

- **Logic goes in a pure module with a test**; `main.js` wires it up and draws it.
- **What users read is in English**, short and plain, one name per action.
- **Never block the tick**: one agent's error must not stop the others (see `safe.js`).
- **Shared state** (`shared` / `setShared`) is read and written by every copy of the mod: only the
  leader strip writes what is counted (jobs, Pokédollars, finds).
- **Versions** are semver in `mods/pokemon-herd/id.js` (`export const VERSION`): patch for fixes,
  minor for new things. Leave the `// VERSION = "2026.11.12"` comment above it as it is: copies from
  before 1.0.0 read it. Installed copies compare their version with the repo's to offer the update,
  so a release bumps it; a pull request may leave that to the maintainer.
- Update README.md for what users see and RECIPE.md for how it works.

## Demos

`python3 scripts/make-demos.py [scene…]` draws the README's GIFs and the gallery card
(`preview.png`) from sprites the mod has already downloaded (pick a Pokémon once in the mod's
picker if one is missing). It needs ImageMagick 7 and the DejaVu fonts.

## Credits and licences

Code is MIT. Sprites and portraits are [PMD SpriteCollab](https://sprites.pmdcollab.org/)'s
(CC BY-NC 4.0); item art, cries and types come from [PokeAPI](https://pokeapi.co/). Don't commit
their files to the repo, except in the demo images, which credit them. Pokémon is © Nintendo,
Creatures, GAME FREAK; this is a fan project.

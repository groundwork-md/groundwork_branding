# Logo

The masters are the SVG files in `assets/logo/svg/`, written by `npm run build:logo`
(`tool/generate_logo.py`) from the Space Grotesk outline in `fonts/space-grotesk/` and the colours
in `tokens/color.json`. The PNG files in `assets/logo/png/` are rasterised from them
(`npm run build:logo -- --png`, which needs `rsvg-convert`).

## Construction

The idea: what is below grade is the groundwork. The wordmark's **g has its tail dropping through a
ground line**.

- The g is Space Grotesk's own outline. Only the tail is redrawn: every point of the descender is
  lowered by a fixed offset (50 font units at weight 600, 75 at 700, of 1000 per em), so the tail
  clears the ground line.
- The **ground line** is a rule 0.035 to 0.110 em below the baseline at weight 600. It is broken
  around the g's stem, with 40 units of clearance (46 at weight 700), and runs on to the right.
- **The mark is the wordmark's g plus its ground.** The ground line in the mark sits exactly where
  the wordmark's rule sits.
- All text is outlined to paths, so no font is needed to display a master.

## The masters

| File | What | Notes |
| --- | --- | --- |
| `wordmark-light.svg`, `wordmark-dark.svg` | "groundwork", Space Grotesk 600, tracking -0.015em, with the reconciled g and the ground rule | ink on a light ground, paper on a dark ground; transparent background |
| `mark-light.svg`, `mark-dark.svg` | the fine mark (600): the g and its broken ground line | 100 unit square, the mark 86% of its height; for documents and large uses |
| `avatar.svg` | the heavier mark (700) in paper on the lifted tile | 100 unit square, the mark 70% of its height; the heavier drawing holds at small sizes |
| `favicon.svg` | the mark drawn on the 16 px grid | ink tile with a 3 px corner radius, paper mark; whole-pixel coordinates only |
| `social-preview.svg` | 1280 x 640 card: wordmark, ground line running off the card, tagline and repository line | ink ground, paper text |

PNG exports: `avatar.png` (500 px), `favicon-16.png`, `favicon-32.png`, `favicon-180.png`,
`wordmark-light.png` and `wordmark-dark.png` (1200 px wide), `social-preview.png` (1280 x 640).

## Regenerating

```sh
python3 -m venv .venv && .venv/bin/pip install -r tool/requirements.txt
PATH="$PWD/.venv/bin:$PATH" npm run build:logo           # SVG masters
PATH="$PWD/.venv/bin:$PATH" npm run build:logo -- --png  # and the PNG exports (rsvg-convert)
PATH="$PWD/.venv/bin:$PATH" npm run check:logo           # fail if a committed SVG is stale
```

`npm run check:logo` runs in CI. The PNG exports depend on the rasteriser version, so CI does not
compare their bytes; `npm test` checks their sizes and that every master uses only the brand
colours.

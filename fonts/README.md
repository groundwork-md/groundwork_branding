# Fonts

These files are **build inputs, not brand assets**. The brand-asset licence (all rights reserved,
`assets/LICENSE.md`) and the repository's Apache-2.0 licence do not cover them; the family's
`OFL.txt` does. Space Grotesk is licensed under the SIL Open Font License 1.1 **without a Reserved
Font Name** (re-checked in `OFL.txt` when vendored; the only "Reserved Font Name" text is the
licence's own definition).

`space-grotesk/` holds the variable font (wght 300-700). `tool/generate_logo.py` instantiates it at
400, 600 and 700 and outlines the wordmark and the card text to paths, so no font file ships with
the logo masters.

Each file is fetched byte for byte from the upstream repository at the pinned commit. The test
`test/fonts.test.mjs` checks the SHA-256 of each file below against this table.

| file | source URL | upstream ref | SHA-256 |
| --- | --- | --- | --- |
| `space-grotesk/SpaceGrotesk[wght].ttf` | https://raw.githubusercontent.com/floriankarsten/space-grotesk/03507d024a01282884232081fc6011c09ff4e849/fonts/ttf/SpaceGrotesk%5Bwght%5D.ttf | master (03507d024a01282884232081fc6011c09ff4e849) | acad6de1fc93436f5c0f1f4137751ef04f1aea3063e7036535970ffcfbd79f72 |
| `space-grotesk/OFL.txt` | https://raw.githubusercontent.com/floriankarsten/space-grotesk/03507d024a01282884232081fc6011c09ff4e849/OFL.txt | master (03507d024a01282884232081fc6011c09ff4e849) | 564ce565c371c5e5bbf286006565a7c9aa55a9f56e7ca58d56e05d649dd61a72 |

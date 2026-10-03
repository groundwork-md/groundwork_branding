# groundwork_branding

The brand of [groundwork](https://github.com/groundwork-md/groundwork): design tokens (DTCG), logo
masters, and the guidelines. The wordmark's g has its tail dropping through a ground line; the
palette is ink and paper with no accent; the typeface is Space Grotesk.

groundwork is an independent project, not affiliated with or endorsed by Anthropic. Claude and
Claude Code are trademarks of Anthropic.

## Contents

| Path | What |
| --- | --- |
| `tokens/` | The DTCG token sources (`color.json`, `typography.json`) and the declared contrast pairs |
| `dist/` | Generated token outputs, committed: `css/tokens.css`, `json/tokens.json` |
| `assets/logo/` | The logo masters: `svg/` (wordmark, mark, avatar, favicon, social preview) and `png/` exports; all rights reserved, see `assets/LICENSE.md` |
| `fonts/` | Space Grotesk as a build input, with its OFL text and checksums |
| `docs/` | `guidelines.md`, `logo.md`, the generated `contrast.md`, `licence-exceptions.toml` |
| `tool/` | The token build and validator, the Python logo generator, the contrast and freshness checks, the CI hygiene checks, `commit-baseline.txt` (grandfathered SHAs) |
| `test/` | Unit tests (`npm test`) |
| `.github/` | One verification workflow per check, actions pinned by SHA |
| `bin/hooks/` | Git hooks (`commit-msg`) |
| `CLAUDE.md` | Working rules for the branch, commit and PR workflow |
| `CONTRIBUTING.md` | How to contribute, including the asset rule |
| `SECURITY.md` | How to report a vulnerability |
| `CHANGELOG.md` | Keep a Changelog |

Start with [`docs/guidelines.md`](docs/guidelines.md).

## Build

Node 24 (`.nvmrc`), dependencies pinned exactly with `package-lock.json` committed, install scripts
disabled (`.npmrc`). The logo generator needs Python 3 with the two packages in
`tool/requirements.txt`, and `rsvg-convert` for the PNG exports only.

```sh
npm ci
npm run build           # validate the tokens, then write dist/ with Style Dictionary
npm run check:fresh     # fail if committed generated output is stale
npm run check:tokens    # validate the DTCG token sources
npm run check:contrast  # WCAG 2.x contrast of the declared pairs; writes docs/contrast.md
npm run build:logo      # regenerate assets/logo/svg (add -- --png for the PNG exports)
npm run check:logo      # fail if a committed SVG master is stale
npm run package         # stub: release assets
npm run check:branch    # branch named <family>/<N>-<slug>
npm run check:history   # commit subjects read type(scope): description (#N)
npm run check:changelog # CHANGELOG.md has an Unreleased section
npm run check:docs      # no dead relative links, no undefined hex colour, current contrast table
npm run check:licence   # dependency licences against the allow list
npm test                # unit tests
```

`build:logo` and `check:logo` call `python3`; see [`docs/logo.md`](docs/logo.md) for the virtual
environment.

## Checks

CI runs one workflow per check on every push to `development`/`production` and every pull request,
on GitHub-hosted runners; verification only, nothing deploys. Run each locally (after `npm ci`):

| Workflow | Locally | What it fails on |
| --- | --- | --- |
| `build` | `npm run build`, `npm run check:fresh` | a token source that does not validate; a committed `dist/` or `docs/contrast.md` that differs from a fresh build |
| `contrast` | `npm run check:contrast`, `npm test` | a declared pair that misses its threshold or its expected ratio; a failing unit test |
| `logo` | `npm run check:logo` | a committed SVG master that differs from what the generator writes |
| `licence-check` | `npm run check:licence` | a lockfile package on the deny list, not on the allow list, unknown, or MPL-2.0 without a recorded exception in `docs/licence-exceptions.toml` |
| `branch-lint` | `npm run check:branch [-- <branch>]` | a branch not named `<family>/<N>-<slug>` |
| `lint-history` | `npm run check:history` | a commit subject not `type(scope): description (#N)`, unless its full SHA is in `tool/commit-baseline.txt` |
| `changelog-check` | `npm run check:changelog`, `npm run check:docs` | a `CHANGELOG.md` without an `Unreleased` section; a dead relative link in the README or `docs/`, a hex colour not in `tokens/*.json`, or a stale contrast table in the guidelines |

## Contributing

1. Install the commit hook once per clone: `git config core.hooksPath bin/hooks`.
2. Branch from `development` as `<family>/<N>-<slug>` (`feature` `bugfix` `chore` `documentation`
   `release`; `hotfix` from `production`), `N` being the GitHub issue number, in its own worktree:
   `git worktree add .worktrees/<N> -b <family>/<N>-<slug> origin/development`.
3. Commit as `type(scope): description (#N)`. One issue, one branch, one pull request; plain merge
   only.

See `CONTRIBUTING.md` and `CLAUDE.md` for the full rules, and `SECURITY.md` to report a
vulnerability. Taking part means following the [Code of Conduct](CODE_OF_CONDUCT.md).

## Licence

This repository carries two licences; see `NOTICE`.

| What | Licence |
| --- | --- |
| Code: token sources, build and generator scripts, CI, docs tooling | Apache-2.0 (`LICENSE`) |
| Brand assets: logo, wordmark, mark, avatar, favicons, social preview | All rights reserved (`assets/LICENSE.md`) |

The Apache-2.0 licence never applies to an asset file. The font under `fonts/` is a build input
under its own licence, the SIL Open Font License 1.1 (`fonts/space-grotesk/OFL.txt`).

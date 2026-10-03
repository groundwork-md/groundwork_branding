# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Repository bootstrap: the Apache-2.0 and all-rights-reserved licence split, the commit-msg hook, the issue and pull-request templates, and the Code of Conduct (#1).
- Repo-hygiene checks: branch lint, history lint, changelog check, docs check, dependency licence check, each with a verification workflow on a GitHub-hosted runner, actions pinned by SHA (#1).
- Colour and typography tokens in DTCG: ink `#16171A`, paper `#FBFBF8`, the avatar tile, Space Grotesk (#1).
- Token validator and Style Dictionary 5 build: `npm run build` writes `dist/css/tokens.css` (light on `:root`, dark under `prefers-color-scheme` and `[data-theme="dark"]`) and `dist/json/tokens.json` (#1).
- Contrast check over the declared pairs: `npm run check:contrast` writes `docs/contrast.md` (#1).
- Freshness check: `npm run check:fresh` rebuilds `dist/` and `docs/contrast.md` into a temp dir and fails with a diff naming each stale file (#1).
- Logo masters (wordmark, mark, avatar, favicon, social preview) and PNG exports, written by `npm run build:logo` from the vendored Space Grotesk outline; `npm run check:logo` fails on a stale SVG (#1).
- Guidelines and logo construction notes in `docs/` (#1).

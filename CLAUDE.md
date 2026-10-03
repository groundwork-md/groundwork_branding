# CLAUDE.md — groundwork_branding

The groundwork brand repo (design tokens, logo masters, guidelines). Public.
**Two licences:** code is Apache-2.0, brand assets are all rights reserved: see `NOTICE` and
`assets/LICENSE.md`. An agent never merges into `production`.

## Read this before you do that

| about to… | read first |
| --- | --- |
| start work on an issue | Branches below: a new worktree, never the main checkout |
| commit | Commits below; install the hook once with `git config core.hooksPath bin/hooks` |
| open a PR | Pull requests below |
| add a code file | it carries `SPDX-License-Identifier: Apache-2.0` |
| add or touch an asset file | `assets/LICENSE.md`: no Apache-2.0 header or SPDX tag; each assets directory carries a `LICENSE.md` |
| change a brand value | it lives in `tokens/`; then `npm run build`, `npm run check:contrast`, `npm run check:logo` |
| write anything public | no personal data, no private paths, no names of private repositories or layers; no Anthropic or Claude logos |

## Branches

One issue, one branch, one worktree, one PR. Two long-lived branches: `production` (releasable) and
`development` (integration, default). Both are merge-only: never push to either directly (the one
exception was the bootstrap commit). Working branches are `<family>/<N>-<slug>`, `N` = GitHub issue
number, family one of `feature` `bugfix` `chore` `documentation` `release` (from `development`) or
`hotfix` (from `production`).

Worktree (never work in the main checkout, which stays parked on `development`):

```
git worktree add .worktrees/<N> -b <family>/<N>-<slug> origin/development
```

`.worktrees/` is gitignored. Add `--relative-paths` only when every git that touches this checkout
is 2.48 or newer. `git stash` is forbidden: use a worktree or a WIP commit.

## Commits

`type(scope): description (#N)`, type one of `feat fix docs style refactor perf test build ci chore
revert merge release`, scope and issue reference required for every commit, merges included
(`chore(licence): merge the licence split (#2)`). Enforced by `bin/hooks/commit-msg`; install once
with `git config core.hooksPath bin/hooks`.

## Pull requests

1 PR = 1 issue. Title is a conforming commit subject ending `(#N)`; the body carries the issue's
acceptance-criteria checklist. **Plain merge only**, never squash or rebase-merge. No closing
keywords: an issue is closed by hand after the change is verified on `development`.

## Generated files

`dist/`, `docs/contrast.md`, the contrast table in `docs/guidelines.md` and `assets/logo/` are
generated; never edit them by hand. `npm run check:fresh` and `npm run check:logo` fail when they
are stale.

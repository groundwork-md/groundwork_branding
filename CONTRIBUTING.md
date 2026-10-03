# Contributing

This repository holds the groundwork brand under **two licences**: code is Apache-2.0, brand assets
are all rights reserved. See the README's "Licence" section and `NOTICE`. Taking part means
following the [Code of Conduct](CODE_OF_CONDUCT.md).

## Workflow

- **Open an issue first** for anything beyond a typo or a broken link, and describe the change you
  have in mind. One issue lists its acceptance criteria as a `- [ ]` checklist.
- **One issue, one branch, one worktree, one PR.** Branches are `<family>/<N>-<slug>` with family
  `feature` `bugfix` `chore` `documentation` `release` (from `development`) or `hotfix` (from
  `production`). `production` and `development` are merge-only: never push to them directly.
- **Commits** read `type(scope): description (#N)`; scope and issue reference are required. Install
  the hook once: `git config core.hooksPath bin/hooks`.
- **Pull requests** are plain-merged, never squashed. See `CLAUDE.md` for the worktree command.
- Do not report a suspected vulnerability in a public issue or PR; see `SECURITY.md`.

## Code contributions

- A contribution to code is licensed under the Apache License 2.0, the same terms as the rest of the
  code (section 5 of `LICENSE`). There is no contributor licence agreement.
- Every code file carries `SPDX-License-Identifier: Apache-2.0`.
- JSON cannot hold a header, so every design-token JSON root carries
  `$extensions["io.github.groundwork-md.license"]: "Apache-2.0"`. The token validator enforces this.
- Run the checks listed in the README before you open a pull request. If a check fails, fix the
  content rather than loosening the check. Generated files are regenerated with their command,
  never edited by hand.

## Brand-asset contributions

The logo, wordmark, mark, avatar, favicons and social preview are owned by the groundwork authors
and are not open for outside reuse (`assets/LICENSE.md`). Open an issue before sending a change to
an asset. An asset contribution is accepted **only as a gift of the rights** to the maintainers:
you transfer all rights in it, agreed in the issue before you send the work, and it then falls under
`assets/LICENSE.md`, not Apache-2.0. Asset files never carry an Apache-2.0 header or SPDX tag.

Every directory under `assets/` carries a `LICENSE.md` (a copy of or pointer to `assets/LICENSE.md`);
`node --test` fails otherwise.

## Keep it neutral and public

Everything here is public. No personal data, no absolute paths from your machine, no secrets, no
names of private repositories, and no Anthropic or Claude logos or lookalikes. "Claude Code" appears
only as plain factual text.

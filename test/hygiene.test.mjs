// SPDX-License-Identifier: Apache-2.0

import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { checkDocs } from '../tool/lib/docs.mjs';
import { findOffenders, hasUnreleased, parseBaseline, validateBranchName, validateCommitSubject } from '../tool/lib/rules.mjs';

const tool = (name) => resolve('tool', name);
const run = (script, args, cwd) => spawnSync('node', [tool(script), ...args], { cwd, encoding: 'utf8' });
const tmp = () => mkdtempSync(join(tmpdir(), 'hygiene-'));

test('branch names', () => {
  for (const ok of ['development', 'production', 'feature/4-dtcg-source-tokens', 'chore/7-ci', 'hotfix/12-fix', 'release/14-1.0.0']) {
    assert.equal(validateBranchName(ok), null, ok);
  }
  for (const bad of ['main', 'feature/dtcg', 'feat/4-x', 'feature/4-Bad_Slug', 'feature/4-', 'fix/4-x', 'release/14-1.0']) {
    assert.match(validateBranchName(bad), /does not match/, bad);
  }
});

test('check:branch fails on a bad branch name and passes on a good one', () => {
  const bad = run('branch-lint.mjs', ['not-a-branch'], '.');
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /does not match/);
  assert.equal(run('branch-lint.mjs', ['chore/7-x'], '.').status, 0);
});

test('commit subjects', () => {
  assert.equal(validateCommitSubject('feat(tokens): add things (#4)'), null);
  assert.equal(validateCommitSubject('chore(licence): merge the licence split (#2)'), null);
  for (const bad of ['Initial Commit', 'feat: no scope (#4)', 'feat(tokens): no issue', 'wip(tokens): bad type (#4)']) {
    assert.ok(validateCommitSubject(bad), bad);
  }
});

test('history lint exempts by full SHA only', () => {
  const lines = ['a'.repeat(40) + '\tInitial Commit', 'b'.repeat(40) + '\tfeat(x): ok (#1)'];
  assert.equal(findOffenders(lines, new Set()).length, 1);
  assert.equal(findOffenders(lines, new Set(['a'.repeat(40)])).length, 0);
  assert.equal(findOffenders(lines, new Set(['a'.repeat(12)])).length, 1);
  assert.deepEqual([...parseBaseline('# c\n\nabc\n')], ['abc']);
});

test('check:history fails on a repo with a bad commit subject', () => {
  const dir = tmp();
  const git = (...a) => execFileSync('git', ['-c', 'user.name=T', '-c', 'user.email=t@example.com', ...a], { cwd: dir, encoding: 'utf8' });
  git('init', '-q');
  git('commit', '-q', '--allow-empty', '--no-verify', '-m', 'feat(x): ok (#1)');
  assert.equal(run('lint-history.mjs', [], dir).status, 0);
  git('commit', '-q', '--allow-empty', '--no-verify', '-m', 'Initial Commit');
  const bad = run('lint-history.mjs', [], dir);
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /1 offending commit/);
});

test('changelog needs an Unreleased section', () => {
  assert.ok(hasUnreleased('# C\n\n## [Unreleased]\n'));
  assert.ok(hasUnreleased('## Unreleased\n'));
  assert.equal(hasUnreleased('## [1.0.0]\n'), false);
});

test('check:changelog fails without an Unreleased section', () => {
  const dir = tmp();
  assert.equal(run('changelog-check.mjs', [], dir).status, 1);
  writeFileSync(join(dir, 'CHANGELOG.md'), '# Changelog\n\n## [1.0.0]\n');
  assert.equal(run('changelog-check.mjs', [], dir).status, 1);
  writeFileSync(join(dir, 'CHANGELOG.md'), '# Changelog\n\n## [Unreleased]\n');
  assert.equal(run('changelog-check.mjs', [], dir).status, 0);
});

test('check:docs flags a dead link, an unknown hex colour and a stale contrast table', () => {
  const dir = tmp();
  mkdirSync(join(dir, 'docs'));
  mkdirSync(join(dir, 'tokens'));
  writeFileSync(join(dir, 'tokens/color.json'), '{"a": {"$value": "#112233"}}');
  writeFileSync(join(dir, 'README.md'), 'Ok [docs](docs/guidelines.md) and #112233.\n');
  const row = '| `a` | `b` | light | text | 4.5:1 |';
  writeFileSync(join(dir, 'docs/guidelines.md'), `${row}\n`);
  writeFileSync(join(dir, 'docs/contrast.md'), `${row}\n`);
  assert.deepEqual(checkDocs(dir), []);

  writeFileSync(join(dir, 'README.md'), 'Dead [x](docs/missing.md) and #abcdef.\n');
  writeFileSync(join(dir, 'docs/contrast.md'), `${row}\n| \`c\` | \`d\` | - | text | 7:1 |\n`);
  const problems = checkDocs(dir);
  assert.equal(problems.length, 3);
  assert.match(problems.join('\n'), /dead link "docs\/missing.md"/);
  assert.match(problems.join('\n'), /hex colour #abcdef/);
  assert.match(problems.join('\n'), /contrast table is stale/);
  const cli = run('docs-check.mjs', [], dir);
  assert.equal(cli.status, 1);
});

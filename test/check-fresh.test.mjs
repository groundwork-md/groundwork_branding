// SPDX-License-Identifier: Apache-2.0
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const script = join(root, 'tool/check-fresh.mjs');
const run = (dir) => spawnSync(process.execPath, [script, dir], { encoding: 'utf8' });

function copy() {
  const dir = mkdtempSync(join(tmpdir(), 'gw-fresh-'));
  for (const d of ['dist', 'tokens', 'docs']) cpSync(join(root, d), join(dir, d), { recursive: true });
  return dir;
}

test('the committed dist/ and docs/contrast.md equal a fresh build', () => {
  const r = run(root);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /up to date/);
});

test('one hex changed in tokens/color.json without rebuilding exits 1 and names each stale file', () => {
  const dir = copy();
  const f = join(dir, 'tokens/color.json');
  writeFileSync(f, readFileSync(f, 'utf8').replace('#2A2C31', '#2B2C31'));
  const r = run(dir);
  assert.equal(r.status, 1);
  for (const name of ['dist/css/tokens.css', 'dist/json/tokens.json', 'docs/contrast.md']) assert.match(r.stderr, new RegExp(`${name} is stale`));
  assert.match(r.stderr, /^[-+]{3} /m, 'unified diff');
});

test('a hand-edited committed file, a missing file and an extra file are reported', () => {
  const dir = copy();
  writeFileSync(join(dir, 'docs/contrast.md'), 'edited\n');
  writeFileSync(join(dir, 'dist/css/extra.css'), 'x\n');
  const r = run(dir);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /docs\/contrast\.md is stale/);
  assert.match(r.stderr, /dist\/css\/extra\.css is stale/);
});

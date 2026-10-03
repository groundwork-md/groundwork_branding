// SPDX-License-Identifier: Apache-2.0
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const hook = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'hooks', 'commit-msg');

function run(subject) {
  const file = join(mkdtempSync(join(tmpdir(), 'hook-')), 'MSG');
  writeFileSync(file, `${subject}\n\nbody\n`);
  return spawnSync('sh', [hook, file], { encoding: 'utf8' });
}

test('accepts type(scope): description (#N)', () => {
  assert.equal(run('chore(licence): merge the licence split (#2)').status, 0);
});

test('rejects a subject without scope or issue reference', () => {
  const r = run('update stuff');
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /rejected/);
});

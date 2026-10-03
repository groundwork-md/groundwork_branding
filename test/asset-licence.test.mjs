// SPDX-License-Identifier: Apache-2.0
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const assets = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');

function dirs(root) {
  return readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .flatMap((e) => [join(root, e.name), ...dirs(join(root, e.name))]);
}

test('assets/ has its LICENSE.md', () => {
  assert.ok(existsSync(join(assets, 'LICENSE.md')), 'assets/LICENSE.md is missing');
});

test('every directory under assets/ has a LICENSE.md', () => {
  const missing = dirs(assets).filter((d) => !existsSync(join(d, 'LICENSE.md')));
  assert.deepEqual(missing, [], `directories without LICENSE.md: ${missing.join(', ')}`);
});

// SPDX-License-Identifier: Apache-2.0
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readme = readFileSync(join(root, 'fonts/README.md'), 'utf8');

/** `file` and SHA-256 columns of the README's table. */
const rows = [...readme.matchAll(/^\| `([^`]+)` \|.*\| ([0-9a-f]{64}) \|$/gm)].map((m) => ({ file: m[1], sha: m[2] }));

test('the font table lists the font file and its OFL text', () => {
  assert.deepEqual(rows.map((r) => r.file).sort(), ['space-grotesk/OFL.txt', 'space-grotesk/SpaceGrotesk[wght].ttf']);
});

test('each vendored font file matches the SHA-256 recorded in fonts/README.md', () => {
  for (const { file, sha } of rows) {
    assert.equal(createHash('sha256').update(readFileSync(join(root, 'fonts', file))).digest('hex'), sha, file);
  }
});

test('the OFL text names no Reserved Font Name beyond its own definition', () => {
  const ofl = readFileSync(join(root, 'fonts/space-grotesk/OFL.txt'), 'utf8');
  assert.match(ofl, /SIL OPEN FONT LICENSE Version 1\.1/);
  assert.doesNotMatch(ofl.split('\n').slice(0, 3).join('\n'), /Reserved Font Name/);
});

// SPDX-License-Identifier: Apache-2.0
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const run = (dir) => spawnSync(process.execPath, ['tool/validate-tokens.mjs', dir], { encoding: 'utf8' });
const KEY = 'io.github.groundwork-md.license';

/** A minimal valid colour source; [mutate] edits a fresh copy before it is written to a temp dir. */
function fixture(mutate = () => {}) {
  const doc = {
    $extensions: { [KEY]: 'Apache-2.0' },
    color: {
      $type: 'color',
      $description: 'Fixture.',
      primitive: { a: { $value: '#111111', $description: 'A.' }, b: { $value: '#EEEEEE', $description: 'B.' } },
      theme: {
        light: { ground: { $value: '{color.primitive.b}', $description: 'g' }, ink: { $value: '{color.primitive.a}', $description: 'i' } },
        dark: { ground: { $value: '{color.primitive.a}', $description: 'g' }, ink: { $value: '{color.primitive.b}', $description: 'i' } },
      },
    },
  };
  mutate(doc);
  const dir = mkdtempSync(join(tmpdir(), 'gw-tokens-'));
  writeFileSync(join(dir, 'color.json'), JSON.stringify(doc));
  return dir;
}

test('the real tokens pass', () => {
  const r = run('tokens');
  assert.equal(r.status, 0, r.stderr);
});

test('the valid fixture passes', () => {
  const r = run(fixture());
  assert.equal(r.status, 0, r.stderr);
});

const failing = {
  'an unresolved reference': [(d) => { d.color.theme.light.ink.$value = '{color.primitive.nope}'; }, /color\.json: color\.theme\.light\.ink: unresolved reference \{color\.primitive\.nope\}/],
  'a raw hex outside color.primitive': [(d) => { d.color.theme.dark.ink.$value = '#123456'; }, /color\.json: color\.theme\.dark\.ink: raw hex #123456/],
  'a missing description': [(d) => { delete d.color.theme.light.ink.$description; delete d.color.$description; }, /color\.json: color\.theme\.light\.ink: lacks \$description/],
  'a missing type': [(d) => { delete d.color.$type; }, /color\.json: color\.primitive\.a: lacks \$type/],
  'a missing licence extension': [(d) => { delete d.$extensions; }, /color\.json: root lacks \$extensions\["io\.github\.groundwork-md\.license"\]/],
  'a role in light but not in dark': [(d) => { d.color.theme.light.extra = { $value: '{color.primitive.a}', $description: 'x' }; }, /color\.theme\.light\.extra: role exists in light but not in dark/],
  'a required role missing in dark': [(d) => { delete d.color.theme.dark.ink; }, /color\.theme\.dark\.ink: missing required role/],
  'a reference cycle': [(d) => { d.color.theme.light.ink.$value = '{color.theme.dark.ink}'; d.color.theme.dark.ink.$value = '{color.theme.light.ink}'; }, /reference cycle/],
};
for (const [name, [mutate, pattern]] of Object.entries(failing)) {
  test(`fails on ${name}`, () => {
    const r = run(fixture(mutate));
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stderr, pattern);
  });
}

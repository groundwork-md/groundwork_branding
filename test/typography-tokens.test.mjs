// SPDX-License-Identifier: Apache-2.0
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const t = JSON.parse(readFileSync(new URL('../tokens/typography.json', import.meta.url), 'utf8'));
const { family, weight } = t.font;

test('licence extension on the root', () => {
  assert.equal(t.$extensions['io.github.groundwork-md.license'], 'Apache-2.0');
});

test('the family is Space Grotesk with system fallbacks', () => {
  assert.deepEqual(family.sans.$value, ['Space Grotesk', 'system-ui', 'sans-serif']);
});

test('weights: 600 wordmark, 700 heavy mark, 400 text', () => {
  assert.equal(weight.wordmark.$value, 600);
  assert.equal(weight['mark-heavy'].$value, 700);
  assert.equal(weight.text.$value, 400);
  assert.equal(weight.$type, 'fontWeight');
});

test('wordmark tracking is -0.015em, the value the generator tracks by', () => {
  assert.equal(t.font['letter-spacing'].wordmark.$value, '-0.015em');
  assert.match(readFileSync(new URL('../tool/generate_logo.py', import.meta.url), 'utf8'), /"groundwork", size, -0\.015\)/);
});

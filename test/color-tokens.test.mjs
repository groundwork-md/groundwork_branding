// SPDX-License-Identifier: Apache-2.0
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const doc = JSON.parse(readFileSync(new URL('../tokens/color.json', import.meta.url), 'utf8'));
const get = (path) => path.split('.').reduce((n, k) => n?.[k], doc);
const resolve = (path) => {
  const seen = new Set();
  let tok = get(path);
  while (typeof tok?.$value === 'string' && tok.$value.startsWith('{')) {
    const ref = tok.$value.slice(1, -1);
    assert.ok(!seen.has(ref), `reference cycle at ${ref}`);
    seen.add(ref);
    tok = get(ref);
    assert.ok(tok, `${path} references missing path ${ref}`);
  }
  return tok.$value;
};
const leaves = (node, prefix = []) =>
  Object.entries(node).flatMap(([k, v]) =>
    k.startsWith('$') ? [] : '$value' in v ? [[[...prefix, k].join('.'), v]] : leaves(v, [...prefix, k]));

test('licence extension on the root', () => {
  assert.equal(doc.$extensions['io.github.groundwork-md.license'], 'Apache-2.0');
});

test('the brand colours are ink #16171A and paper #FBFBF8, with the avatar tile #2A2C31', () => {
  assert.equal(resolve('color.primitive.ink'), '#16171A');
  assert.equal(resolve('color.primitive.paper'), '#FBFBF8');
  assert.equal(resolve('color.primitive.tile'), '#2A2C31');
  assert.equal(resolve('color.brand.avatar-tile'), '#2A2C31');
});

test('the themes swap ink and paper', () => {
  assert.equal(resolve('color.theme.light.ground'), '#FBFBF8');
  assert.equal(resolve('color.theme.light.ink'), '#16171A');
  assert.equal(resolve('color.theme.dark.ground'), '#16171A');
  assert.equal(resolve('color.theme.dark.ink'), '#FBFBF8');
});

test('no accent: the brand has no colour beyond ink, paper and the avatar tile', () => {
  const brand = leaves(doc.color).filter(([p]) => !p.startsWith('primitive.github-')).map(([p]) => resolve(`color.${p}`));
  assert.deepEqual([...new Set(brand)].sort(), ['#16171A', '#2A2C31', '#FBFBF8']);
  assert.equal(get('color.theme.light.accent'), undefined);
});

test('every token has a description; semantic tokens reference, only primitives hold hex', () => {
  for (const [path, tok] of leaves(doc.color)) {
    assert.ok(tok.$description, `${path} lacks $description`);
    if (path.startsWith('primitive.')) assert.match(tok.$value, /^#[0-9A-F]{6}$/);
    else {
      assert.match(tok.$value, /^\{.+\}$/, `${path} must be a reference`);
      resolve(`color.${path}`);
    }
  }
});

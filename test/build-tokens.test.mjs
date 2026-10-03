// SPDX-License-Identifier: Apache-2.0
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { cssName, cssValue } from '../tool/build-tokens.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(root, 'dist/css/tokens.css'), 'utf8');
const files = ['css/tokens.css', 'json/tokens.json'];

/** The declarations of the first block whose selector line contains [selector]. */
function block(selector) {
  const i = css.indexOf(selector);
  assert.ok(i >= 0, `${selector} missing`);
  const body = css.slice(css.indexOf('{', i) + 1, css.indexOf('}', i));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+|color-scheme):\s*([^;]+);/g)].map((m) => [m[1], m[2]]));
}
const light = block(':root {');
const dark = block(':root:not([data-theme="light"])');
const darkAttr = block(':root[data-theme="dark"]');

test('every generated file starts with the generated header naming tokens/*.json and Apache-2.0', () => {
  for (const f of files) {
    const text = readFileSync(join(root, 'dist', f), 'utf8');
    assert.match(text.slice(0, 400), /Generated, do not edit\. Source: tokens\/\*\.json.*Apache-2\.0/, f);
  }
});

test('light is the default and dark is redefined in both selectors', () => {
  assert.equal(light['--color-ground'], '#FBFBF8');
  assert.equal(light['--color-ink'], '#16171A');
  assert.equal(light['color-scheme'], 'light');
  for (const d of [dark, darkAttr]) {
    assert.equal(d['--color-ground'], '#16171A');
    assert.equal(d['--color-ink'], '#FBFBF8');
    assert.equal(d['color-scheme'], 'dark');
  }
});

test('type tokens and the avatar tile', () => {
  assert.equal(light['--font-family-sans'], '"Space Grotesk", system-ui, sans-serif');
  assert.deepEqual([light['--font-weight-wordmark'], light['--font-weight-mark-heavy'], light['--font-weight-text']], ['600', '700', '400']);
  assert.equal(light['--font-letter-spacing-wordmark'], '-0.015em');
  assert.equal(light['--color-brand-avatar-tile'], '#2A2C31');
});

test('cssName and cssValue', () => {
  assert.equal(cssName(['color', 'theme', 'dark', 'ink']), '--color-ink');
  assert.equal(cssName(['color', 'primitive', 'paper']), '--color-primitive-paper');
  assert.equal(cssValue({ $type: 'fontFamily', $value: ['A B', 'x'] }), '"A B", x');
  assert.equal(cssValue({ $type: 'fontWeight', $value: 600 }), '600');
});

test('tokens.json is a flat resolved set with $value and $type', () => {
  const j = JSON.parse(readFileSync(join(root, 'dist/json/tokens.json'), 'utf8'));
  assert.equal(j['color.theme.dark.ground'].$value, '#16171A');
  assert.equal(j['color.theme.dark.ground'].$type, 'color');
  assert.deepEqual(j['font.family.sans'].$value, ['Space Grotesk', 'system-ui', 'sans-serif']);
});

test('an unresolved reference makes the build exit 1 and write nothing', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'gw-broken-'));
  const tokens = join(tmp, 'tokens');
  cpSync(join(root, 'tokens'), tokens, { recursive: true });
  const f = join(tokens, 'color.json');
  writeFileSync(f, readFileSync(f, 'utf8').replace('"{color.primitive.tile}"', '"{color.primitive.missing}"'));
  const out = join(tmp, 'out');
  const r = spawnSync(process.execPath, [join(root, 'tool/build-tokens.mjs'), out, tokens], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.equal(existsSync(out), false);
});

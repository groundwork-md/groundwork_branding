// SPDX-License-Identifier: Apache-2.0
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { allPass, evaluate, luminance, ratio, round2 } from '../tool/lib/contrast.mjs';

const tokens = JSON.parse(readFileSync('dist/json/tokens.json', 'utf8'));
const def = JSON.parse(readFileSync('tokens/contrast-pairs.json', 'utf8'));

test('luminance and ratio maths against WCAG references', () => {
  assert.equal(luminance('#000000'), 0);
  assert.equal(luminance('#FFFFFF'), 1);
  assert.ok(Math.abs(luminance('#FF0000') - 0.2126) < 1e-4);
  assert.equal(round2(ratio('#000000', '#FFFFFF')), 21);
  assert.equal(round2(ratio('#FFFFFF', '#000000')), 21);
  assert.equal(round2(ratio('#777777', '#777777')), 1);
  assert.equal(round2(ratio('#767676', '#FFFFFF')), 4.54);
  assert.throws(() => luminance('red'));
});

test('ratio reproduces the recorded brand figures', () => {
  const figures = [
    ['#FBFBF8', '#16171A', 17.29], ['#FBFBF8', '#2A2C31', 13.48], ['#2A2C31', '#0D1117', 1.35],
    ['#2A2C31', '#FFFFFF', 13.97], ['#16171A', '#FFFFFF', 17.92], ['#FBFBF8', '#0D1117', 18.25],
    ['#16171A', '#0D1117', 1.06],
  ];
  for (const [a, b, want] of figures) assert.equal(round2(ratio(a, b)), want, `${a} on ${b}`);
});

test('every declared pair passes on the real tokens and reproduces its expected ratio', () => {
  const result = evaluate(tokens, def);
  assert.deepEqual(result.rows.filter((r) => !r.ok).map((r) => `${r.fgName}/${r.bgName}/${r.theme}: ${r.reason}`), []);
  assert.ok(allPass(result));
});

test('the declared pairs cover both themes, the avatar, GitHub grounds and the rejected ink tile', () => {
  const rows = evaluate(tokens, def).rows;
  assert.ok(rows.some((r) => r.fgName === 'ink' && r.theme === 'light' && r.kind === 'text'));
  assert.ok(rows.some((r) => r.fgName === 'ink' && r.theme === 'dark' && r.kind === 'text'));
  assert.ok(rows.some((r) => r.bgName === 'color.brand.avatar-tile' && r.kind === 'text'));
  assert.ok(rows.some((r) => r.bgName === 'color.primitive.github-dark' && r.kind === 'decoration'));
  assert.ok(rows.some((r) => r.assertFail && r.fgName === 'color.primitive.ink'));
});

test('an assertFail pair that passes, or a wrong expected ratio, fails the check', () => {
  const pairs = [{ fg: 'ink', bg: 'ground', theme: 'light', kind: 'text', assertFail: true }];
  assert.equal(allPass(evaluate(tokens, { pairs })), false);
  pairs[0] = { fg: 'ink', bg: 'ground', theme: 'light', kind: 'text', expect: 15.0 };
  assert.equal(allPass(evaluate(tokens, { pairs })), false);
});

test('an unknown kind or colour throws', () => {
  assert.throws(() => evaluate(tokens, { pairs: [{ fg: 'ink', bg: 'ground', theme: 'light', kind: 'huge' }] }), /unknown kind/);
  assert.throws(() => evaluate(tokens, { pairs: [{ fg: 'nope', bg: 'ground', theme: 'light', kind: 'text' }] }), /unknown colour/);
});

test('failure mode: raising the dark ground to a mid grey in a token copy exits 1 naming the pair and ratio', () => {
  const dir = mkdtempSync(join(tmpdir(), 'contrast-'));
  const copy = structuredClone(tokens);
  copy['color.theme.dark.ground'].$value = '#8A8A88';
  const tokensFile = join(dir, 'tokens.json');
  writeFileSync(tokensFile, JSON.stringify(copy));
  const run = spawnSync(process.execPath, ['tool/contrast-check.mjs', tokensFile, 'tokens/contrast-pairs.json', join(dir, 'contrast.md')], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stdout, /FAIL: ink on ground \(dark, text\) measured \d\.\d\d:1, required 4\.50:1/);
  const ok = spawnSync(process.execPath, ['tool/contrast-check.mjs', 'dist/json/tokens.json', 'tokens/contrast-pairs.json', join(dir, 'ok.md')], { encoding: 'utf8' });
  assert.equal(ok.status, 0);
});

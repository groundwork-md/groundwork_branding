// SPDX-License-Identifier: Apache-2.0
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svgDir = join(root, 'assets/logo/svg');
const pngDir = join(root, 'assets/logo/png');
const colour = JSON.parse(readFileSync(join(root, 'tokens/color.json'), 'utf8')).color.primitive;
const INK = colour.ink.$value;
const PAPER = colour.paper.$value;
const TILE = colour.tile.$value;

/** Attributes of a tag as an object. */
const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
const rootTag = (svg) => attrs(svg.match(/<svg\b[^>]*>/)[0]);
/** Every fill and stroke colour in [svg]. */
const colours = (svg) => [...svg.matchAll(/\b(?:fill|stroke)="(#[0-9A-Fa-f]{3,8})"/g)].map((m) => m[1].toUpperCase());

/** The rules every master obeys; throws a readable assertion when one is broken. */
function checkMaster(svg, allowed) {
  const a = rootTag(svg);
  const [x, y, w, h] = a.viewBox.split(' ').map(Number);
  assert.deepEqual([x, y], [0, 0]);
  // the generator keeps full float precision in the viewBox, so compare numerically
  assert.ok(Math.abs(w - Number(a.width)) < 0.01 && Math.abs(h - Number(a.height)) < 0.01, 'viewBox matches width and height');
  assert.equal(a.role, 'img');
  assert.equal(a['aria-label'], 'groundwork');
  assert.match(svg, /<title>groundwork<\/title>/);
  assert.doesNotMatch(svg, /gradient|<filter|filter=|<text|<image|<script|<style|rgb\(/i, 'outlined paths in flat colour only');
  const found = colours(svg);
  assert.ok(found.length > 0, 'has a colour');
  for (const c of found) assert.ok(allowed.includes(c), `${c} is not a brand colour for this file`);
  return found;
}

const read = (name) => readFileSync(join(svgDir, name), 'utf8');

test('the wordmarks are one flat colour: ink on light, paper on dark', () => {
  assert.deepEqual([...new Set(checkMaster(read('wordmark-light.svg'), [INK]))], [INK]);
  assert.deepEqual([...new Set(checkMaster(read('wordmark-dark.svg'), [PAPER]))], [PAPER]);
});

test('the marks are the 100 unit square, ink on light and paper on dark', () => {
  for (const [name, c] of [['mark-light.svg', INK], ['mark-dark.svg', PAPER]]) {
    const svg = read(name);
    assert.deepEqual([...new Set(checkMaster(svg, [c]))], [c]);
    assert.equal(rootTag(svg).viewBox, '0 0 100 100');
  }
});

test('the avatar is a paper mark on the lifted tile, not on ink', () => {
  const svg = read('avatar.svg');
  checkMaster(svg, [TILE, PAPER]);
  assert.equal(rootTag(svg).viewBox, '0 0 100 100');
  assert.match(svg, new RegExp(`<rect width="100" height="100" fill="${TILE}"/>`));
});

test('the favicon is drawn on the 16 px grid: whole numbers, ink tile, paper mark', () => {
  const svg = read('favicon.svg');
  assert.deepEqual([...new Set(checkMaster(svg, [INK, PAPER]))].sort(), [INK, PAPER].sort());
  assert.equal(rootTag(svg).viewBox, '0 0 16 16');
  const body = svg.slice(svg.indexOf('</title>'));
  const nums = body.replace(/#[0-9A-Fa-f]{6}/g, '').match(/-?\d+(?:\.\d+)?/g);
  assert.ok(nums.length > 20);
  assert.deepEqual(nums.filter((n) => !Number.isInteger(Number(n))), [], 'every coordinate is a whole pixel');
});

test('the social preview is 1280 x 640 on ink with paper text', () => {
  const svg = read('social-preview.svg');
  checkMaster(svg, [INK, PAPER]);
  assert.equal(rootTag(svg).viewBox, '0 0 1280 640');
  assert.match(svg, new RegExp(`<rect width="1280" height="640" fill="${INK}"/>`));
});

test('a stray colour or a live text element fails the master check', () => {
  assert.throws(() => checkMaster(read('wordmark-light.svg').replace(INK, '#FF0000'), [INK]), /not a brand colour/);
  assert.throws(() => checkMaster(read('wordmark-light.svg').replace('</svg>', '<text>x</text></svg>'), [INK]));
  assert.throws(() => checkMaster(read('wordmark-light.svg').replace('role="img"', ''), [INK]));
});

/** Width and height from a PNG's IHDR chunk. */
function pngSize(file) {
  const b = readFileSync(file);
  assert.equal(b.subarray(1, 4).toString('latin1'), 'PNG', `${file} is a PNG`);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

test('every PNG export has the size its source declares', () => {
  const sizes = { 'avatar.png': [500, 500], 'favicon-16.png': [16, 16], 'favicon-32.png': [32, 32], 'favicon-180.png': [180, 180], 'social-preview.png': [1280, 640] };
  for (const [name, want] of Object.entries(sizes)) assert.deepEqual(pngSize(join(pngDir, name)), want, name);
  for (const theme of ['light', 'dark']) {
    const [w, h] = pngSize(join(pngDir, `wordmark-${theme}.png`));
    const a = rootTag(read(`wordmark-${theme}.svg`));
    assert.equal(w, 1200);
    assert.ok(Math.abs(h - Math.round((1200 * a.height) / a.width)) <= 1, `wordmark-${theme}.png keeps the aspect ratio`);
  }
});

test('the SVG and PNG directories hold exactly the expected masters', () => {
  assert.deepEqual(readdirSync(svgDir).filter((f) => f.endsWith('.svg')).sort(),
    ['avatar.svg', 'favicon.svg', 'mark-dark.svg', 'mark-light.svg', 'social-preview.svg', 'wordmark-dark.svg', 'wordmark-light.svg']);
  assert.deepEqual(readdirSync(pngDir).filter((f) => f.endsWith('.png')).sort(),
    ['avatar.png', 'favicon-16.png', 'favicon-180.png', 'favicon-32.png', 'social-preview.png', 'wordmark-dark.png', 'wordmark-light.png']);
});

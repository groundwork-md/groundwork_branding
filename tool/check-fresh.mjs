// SPDX-License-Identifier: Apache-2.0

// Freshness check: rebuilds every generated output (dist/css, dist/json and docs/contrast.md)
// into a temp dir and fails, naming each stale file with a unified diff, when a committed copy
// differs. Generated outputs are committed; nobody edits dist/ by hand. The SVG logo masters are
// checked by `npm run check:logo` (Python generator, its own CI job).
// Run: `npm run check:fresh`. Argument: the repo root to check (default: this repo).
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build-tokens.mjs';
import { evaluate, renderMarkdown } from './lib/contrast.mjs';

const here = dirname(fileURLToPath(import.meta.url));

/** Each generator writes its fresh files under [out]; `dirs` are the committed folders it owns. */
const generators = [
  { fix: 'npm run build', dirs: ['dist/css', 'dist/json'],
    run: async (root, out) => build(join(out, 'dist'), join(root, 'tokens')) },
  { fix: 'npm run build && npm run check:contrast', dirs: [], run: async (root, out) => {
    const tokens = JSON.parse(readFileSync(join(out, 'dist/json/tokens.json'), 'utf8'));
    const pairs = JSON.parse(readFileSync(join(root, 'tokens/contrast-pairs.json'), 'utf8'));
    mkdirSync(join(out, 'docs'), { recursive: true });
    writeFileSync(join(out, 'docs/contrast.md'), renderMarkdown(evaluate(tokens, pairs)));
  } },
];

const list = (dir, base = dir) => (existsSync(dir)
  ? readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? list(join(dir, e.name), base) : [join(dir, e.name).slice(base.length + 1)]))
  : []);

/** Returns [{ file, fix, diff }] for every stale, missing or unexpected generated file. */
export async function checkFresh(root = resolve(here, '..')) {
  const out = mkdtempSync(join(tmpdir(), 'groundwork-fresh-'));
  const stale = [];
  try {
    for (const g of generators) {
      await g.run(root, out);
      const dirs = g.dirs.length ? g.dirs : ['docs/contrast.md'];
      const expected = new Set(dirs.flatMap((d) => (d.endsWith('.md') ? [d] : list(join(out, d), out))));
      const committed = new Set(g.dirs.flatMap((d) => list(join(root, d), root)));
      for (const f of new Set([...expected, ...committed])) {
        const fresh = join(out, f);
        const live = join(root, f);
        if (!existsSync(live)) stale.push({ file: f, fix: g.fix, diff: 'missing from the committed tree' });
        else if (!existsSync(fresh)) stale.push({ file: f, fix: g.fix, diff: 'committed but no longer generated' });
        else if (!readFileSync(live).equals(readFileSync(fresh))) {
          stale.push({ file: f, fix: g.fix, diff: spawnSync('diff', ['-u', live, fresh], { encoding: 'utf8' }).stdout });
        }
      }
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
  return stale;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const stale = await checkFresh(process.argv[2] ? resolve(process.argv[2]) : undefined);
  if (stale.length === 0) {
    console.log('check:fresh: dist/ and docs/contrast.md are up to date.');
  } else {
    for (const s of stale) console.error(`check:fresh: ${s.file} is stale. Run \`${s.fix}\` and commit the result.\n${s.diff}`);
    process.exit(1);
  }
}

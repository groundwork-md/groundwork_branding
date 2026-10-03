// SPDX-License-Identifier: Apache-2.0

// Docs rules: no dead relative links, no hex colour outside tokens/*.json, no stale contrast table.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/** Markdown files to check under [root]: README.md, CONTRIBUTING.md and everything under docs/. */
export function markdownFiles(root = '.') {
  const out = ['README.md', 'CONTRIBUTING.md'].map((f) => join(root, f)).filter((f) => existsSync(f));
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir).sort()) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith('.md')) out.push(p);
    }
  };
  walk(join(root, 'docs'));
  return out;
}

/** Every `#rrggbb` (upper-cased) found in the token source files; empty when there is no tokens/. */
export function tokenHexes(dir = 'tokens') {
  const set = new Set();
  if (!existsSync(dir)) return set;
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.json')) continue;
    for (const m of readFileSync(join(dir, name), 'utf8').matchAll(/#[0-9a-fA-F]{6}\b/g)) set.add(m[0].toUpperCase());
  }
  return set;
}

/** Relative link targets of a markdown text, ignoring code fences and code spans. */
export function relativeLinks(text) {
  const plain = text.replace(/^```[\s\S]*?^```/gm, '').replace(/`[^`\n]*`/g, '');
  const out = [];
  for (const m of plain.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const target = m[1];
    if (/^([a-z][a-z0-9+.-]*:|#|\/\/)/i.test(target)) continue;
    out.push(target);
  }
  return out;
}

/** Pair rows of the generated contrast table. */
export const contrastRows = (text) => text.split('\n').filter((l) => /^\| `[^`]+` \| `[^`]+` \| (light|dark|-) \|/.test(l));

/** Problem messages for the docs under [root] (default: the current directory). */
export function checkDocs(root = '.') {
  const problems = [];
  const known = tokenHexes(join(root, 'tokens'));
  for (const file of markdownFiles(root)) {
    const text = readFileSync(file, 'utf8');
    for (const target of relativeLinks(text)) {
      const path = decodeURIComponent(target.split('#')[0].split('?')[0]);
      if (path && !existsSync(resolve(dirname(file), path))) problems.push(`${file}: dead link "${target}"`);
    }
    for (const m of text.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
      if (!known.has(m[0].toUpperCase())) problems.push(`${file}: hex colour ${m[0]} is not in tokens/*.json`);
    }
  }
  const guidelines = join(root, 'docs/guidelines.md');
  const contrast = join(root, 'docs/contrast.md');
  if (existsSync(guidelines) && existsSync(contrast)) {
    const guide = new Set(contrastRows(readFileSync(guidelines, 'utf8')));
    for (const row of contrastRows(readFileSync(contrast, 'utf8'))) {
      if (!guide.has(row)) problems.push(`docs/guidelines.md: contrast table is stale, missing row ${row}`);
    }
  }
  return problems;
}

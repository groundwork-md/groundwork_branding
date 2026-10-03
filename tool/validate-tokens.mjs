// SPDX-License-Identifier: Apache-2.0

// Validates every tokens/*.json source file: each file root carries the
// io.github.groundwork-md.license Apache-2.0 extension; every token has $type and $description
// (own or inherited from the nearest group); every {reference} resolves (no cycles); raw hex
// appears only under color.primitive; the theme roles exist in both themes and light and dark
// carry the same roles. Messages name the file and the token path.
// Run: `npm run check:tokens [dir]`.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const REF = /^\{([^{}]+)\}$/;
const HEX = /^#[0-9A-Fa-f]{3,8}$/;
export const roles = ['ground', 'ink'];
const LICENCE_KEY = 'io.github.groundwork-md.license';

/** Flattens a token tree into leaves with inherited $type. */
function collect(node, file, path, type, desc, out) {
  const t = node.$type ?? type;
  const d = node.$description ?? desc;
  if ('$value' in node) {
    out.push({ file, path: path.join('.'), token: node, type: t, description: d });
    return;
  }
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith('$')) continue;
    if (v === null || typeof v !== 'object') {
      out.push({ file, path: [...path, k].join('.'), invalid: true });
      continue;
    }
    collect(v, file, [...path, k], t, d, out);
  }
}

/** Validates a `{ 'file.json': tree }` map; returns { errors, leaves }. */
export function validate(trees) {
  const errors = [];
  const leaves = new Map();
  for (const [file, tree] of Object.entries(trees)) {
    if (tree.$extensions?.[LICENCE_KEY] !== 'Apache-2.0') {
      errors.push(`${file}: root lacks $extensions["${LICENCE_KEY}"] = "Apache-2.0"`);
    }
    const found = [];
    collect(tree, file, [], undefined, undefined, found);
    for (const leaf of found) {
      if (leaves.has(leaf.path)) errors.push(`${file}: ${leaf.path}: duplicate token (also in ${leaves.get(leaf.path).file})`);
      leaves.set(leaf.path, leaf);
    }
  }
  for (const [path, leaf] of leaves) {
    const where = `${leaf.file}: ${path}`;
    if (leaf.invalid) { errors.push(`${where}: not a token or group`); continue; }
    if (leaf.type === undefined) errors.push(`${where}: lacks $type`);
    if (typeof leaf.description !== 'string' || leaf.description.trim() === '') {
      errors.push(`${where}: lacks $description`);
    }
    const v = leaf.token.$value;
    if (typeof v === 'string' && v.includes('{')) {
      const m = REF.exec(v);
      if (!m) errors.push(`${where}: malformed reference ${v}`);
      else if (!leaves.has(m[1])) errors.push(`${where}: unresolved reference ${v}`);
    } else if (typeof v === 'string' && HEX.test(v) && !path.startsWith('color.primitive.')) {
      errors.push(`${where}: raw hex ${v} outside color.primitive; use a {reference}`);
    }
  }
  for (const start of leaves.keys()) {
    const seen = new Set();
    for (let cur = start; cur !== undefined;) {
      if (seen.has(cur)) { errors.push(`${leaves.get(start).file}: ${start}: reference cycle through ${cur}`); break; }
      seen.add(cur);
      const v = leaves.get(cur)?.token?.$value;
      cur = typeof v === 'string' ? REF.exec(v)?.[1] : undefined;
    }
  }
  // Theme roles: all of them in both themes, light and dark identical.
  const themeRoles = (theme) => new Map(
    [...leaves.values()]
      .filter((l) => l.path.startsWith(`color.theme.${theme}.`))
      .map((l) => [l.path.split('.')[3], l]),
  );
  const sets = { light: themeRoles('light'), dark: themeRoles('dark') };
  for (const [theme, other] of [['light', 'dark'], ['dark', 'light']]) {
    for (const role of roles) {
      if (!sets[theme].has(role)) errors.push(`color.theme.${theme}.${role}: missing required role`);
    }
    for (const [role, leaf] of sets[theme]) {
      if (!sets[other].has(role)) errors.push(`${leaf.file}: color.theme.${theme}.${role}: role exists in ${theme} but not in ${other}`);
    }
  }
  return { errors, leaves };
}

/** Loads the DTCG sources; contrast-pairs.json is check input, not a token file. */
export function loadSources(dir = 'tokens') {
  return Object.fromEntries(
    readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'contrast-pairs.json').sort()
      .map((f) => [`${dir}/${f}`, JSON.parse(readFileSync(join(dir, f), 'utf8'))]),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sources = loadSources(process.argv[2] ?? 'tokens');
  const { errors, leaves } = validate(sources);
  if (errors.length > 0) {
    console.error(`validate-tokens: ${errors.length} problem(s):`);
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }
  console.log(`validate-tokens: ${leaves.size} tokens in ${Object.keys(sources).length} files ok.`);
}

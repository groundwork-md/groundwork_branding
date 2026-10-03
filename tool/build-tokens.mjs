// SPDX-License-Identifier: Apache-2.0

// Builds the DTCG sources in tokens/ with Style Dictionary 5 into dist/:
//   css/tokens.css     CSS custom properties, light default, dark redefined
//   json/tokens.json   the resolved flat token set
// Run: `npm run build`. Arguments: output directory (default dist), tokens
// directory (default tokens). The build runs the validator and a full build in a
// temporary directory first, so a failure exits 1 and writes nothing.
import { cpSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import StyleDictionary from 'style-dictionary';
import { loadSources, validate } from './validate-tokens.mjs';

const outputs = ['css', 'json'];
const LICENCE_KEY = 'io.github.groundwork-md.license';

/** Renders a resolved token value as a CSS value. */
export function cssValue(token) {
  const v = token.$value;
  switch (token.$type) {
    case 'fontFamily':
      return v.map((f) => (/\s/.test(f) ? `"${f}"` : f)).join(', ');
    default:
      return String(v);
  }
}

/** The theme (light or dark) a token belongs to, or null when it is theme-independent. */
function themeOf(path) {
  const [a, b, c] = path;
  return a === 'color' && b === 'theme' ? c : null;
}

/** Maps a token path to its CSS custom property name: a theme role is `--color-<role>`. */
export function cssName(path) {
  return themeOf(path) ? `--color-${path[3]}` : `--${path.join('-')}`;
}

const header = '/* SPDX-License-Identifier: Apache-2.0 */\n/* Generated, do not edit. Source: tokens/*.json, built by `npm run build`. Licence: Apache-2.0. */\n';
const comment = 'Generated, do not edit. Source: tokens/*.json, built by `npm run build`. Licence: Apache-2.0.';

function cssFormat({ dictionary }) {
  const light = [];
  const dark = [];
  const rest = [];
  for (const t of dictionary.allTokens) {
    const line = `${cssName(t.path)}: ${cssValue(t)};`;
    const theme = themeOf(t.path);
    if (theme === 'light') light.push(line);
    else if (theme === 'dark') dark.push(line);
    else rest.push(line);
  }
  const block = (indent, lines) => lines.map((l) => `${indent}${l}`).join('\n');
  const darkLines = [...dark, 'color-scheme: dark;'];
  return `${header}
:root {
${block('  ', [...rest, ...light, 'color-scheme: light;'])}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${block('    ', darkLines)}
  }
}

:root[data-theme="dark"] {
${block('  ', darkLines)}
}
`;
}

function jsonFormat({ dictionary }) {
  const out = { $comment: comment, $extensions: { [LICENCE_KEY]: 'Apache-2.0' } };
  for (const t of dictionary.allTokens) {
    const e = { $value: t.$value, $type: t.$type };
    if (t.$description) e.$description = t.$description;
    if (t.$extensions) e.$extensions = t.$extensions;
    out[t.path.join('.')] = e;
  }
  return `${JSON.stringify(out, null, 2)}\n`;
}

/**
 * Builds css/ and json/ into [outDir]. Everything is built in a temporary
 * directory first; [outDir] is touched only when the whole build succeeded.
 */
export async function build(outDir = 'dist', tokensDir = 'tokens') {
  const sources = loadSources(tokensDir);
  const { errors } = validate(sources);
  if (errors.length > 0) throw new Error(`token validation failed:\n  ${errors.join('\n  ')}`);
  const stage = mkdtempSync(join(tmpdir(), 'groundwork-tokens-'));
  try {
    const platform = (dir, file, format) => ({ transforms: [], buildPath: `${stage}/${dir}/`, files: [{ destination: file, format }] });
    const sd = new StyleDictionary({
      usesDtcg: true,
      log: { verbosity: 'silent', errors: { brokenReferences: 'throw' } },
      source: Object.keys(sources),
      platforms: {
        css: platform('css', 'tokens.css', 'groundwork/css'),
        json: platform('json', 'tokens.json', 'groundwork/json'),
      },
    });
    sd.registerFormat({ name: 'groundwork/css', format: cssFormat });
    sd.registerFormat({ name: 'groundwork/json', format: jsonFormat });
    await sd.buildAllPlatforms();
    mkdirSync(outDir, { recursive: true });
    for (const d of outputs) {
      rmSync(join(outDir, d), { recursive: true, force: true });
      cpSync(join(stage, d), join(outDir, d), { recursive: true });
    }
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = process.argv[2] ?? 'dist';
  try {
    await build(out, process.argv[3] ?? 'tokens');
  } catch (e) {
    console.error(`build: ${e.message}`);
    process.exit(1);
  }
  console.log(`build: wrote ${out}/css/tokens.css and ${out}/json/tokens.json`);
}

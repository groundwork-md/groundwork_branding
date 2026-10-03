// SPDX-License-Identifier: Apache-2.0

// Evaluates tokens/contrast-pairs.json against the built dist/json/tokens.json
// in both themes, prints the table, writes docs/contrast.md and exits 1 on any
// failure. Run: `npm run check:contrast` (after `npm run build`).
// Arguments (all optional): tokens.json, contrast-pairs.json, output markdown.
import { readFileSync, writeFileSync } from 'node:fs';
import { allPass, evaluate, renderMarkdown, renderText } from './lib/contrast.mjs';

const [tokensFile = 'dist/json/tokens.json', pairsFile = 'tokens/contrast-pairs.json', outFile = 'docs/contrast.md'] = process.argv.slice(2);
const tokens = JSON.parse(readFileSync(tokensFile, 'utf8'));
const def = JSON.parse(readFileSync(pairsFile, 'utf8'));
const result = evaluate(tokens, def);
process.stdout.write(renderText(result));
writeFileSync(outFile, renderMarkdown(result));
if (!allPass(result)) {
  console.error('check:contrast: failed.');
  process.exit(1);
}
console.log(`check:contrast: all pairs pass; ${outFile} written.`);

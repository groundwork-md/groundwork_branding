// SPDX-License-Identifier: Apache-2.0

// Docs check: no dead relative links in the markdown docs, no hex colour that is not in the
// token files, and the guidelines carry the current contrast table.
// Run: `npm run check:docs`.
import { checkDocs } from './lib/docs.mjs';

const problems = checkDocs('.');
if (problems.length) {
  console.error(`docs-check: ${problems.length} problem(s):\n${problems.map((p) => `  ${p}`).join('\n')}`);
  process.exit(1);
}
console.log('docs-check: links, hex colours and the contrast table ok.');

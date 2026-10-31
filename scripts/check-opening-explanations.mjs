// Check of public/data/opening-explanations.json against public/data/repertoire.json.
// Re-runs the generator's validation on the written file: every key exists and is a non-main line; departPly, mainMove and
// lineMove equal the values recomputed by replaying both SAN lists with the rules engine; every entry has reviewed:false,
// non-empty HE and EN text (1-2 sentences, naming the departure move, only moves within departPly+6 plies of the main
// line or this line, no numbers/evaluations); and the file is exactly what build-opening-explanations.mjs produces.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEntries, extractMoveTokens, validateEntry, validateOutput } from './lib/opening-explanations.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const repertoire = JSON.parse(await readFile(resolve(root, 'public/data/repertoire.json'), 'utf8'));
const output = JSON.parse(await readFile(resolve(root, 'public/data/opening-explanations.json'), 'utf8'));
const source = JSON.parse(await readFile(resolve(root, 'data-src/opening-explanations/pilot.json'), 'utf8'));

const errors = validateOutput(repertoire, output);
if (!Object.keys(output).length) errors.push('output has no entries');

const rebuilt = buildEntries(repertoire, source.entries || {});
errors.push(...rebuilt.errors);
if (JSON.stringify(rebuilt.output) !== JSON.stringify(output)) errors.push('output differs from what pilot.json builds; re-run scripts/build-opening-explanations.mjs');

// Self-test: the validator must reject each kind of invented content.
const facts = { departPly: 7, mainMove: 'c3', lineMove: 'd3' };
const mainSans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6'];
const lineSans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'Nf6', 'c3', 'd5'];
const good = { en: 'Instead of 4.c3 (main line), White plays 4.d3: a slower build-up.', he: 'במקום 4.c3 (הקו הראשי) הלבן משחק 4.d3: בנייה איטית יותר.' };
const mutate = (patch) => ({ ...good, ...patch });
const selfTests = [
  ['good entry passes', good, true],
  ['unknown move is rejected', mutate({ en: 'Instead of 4.c3 (main line), White plays 4.d3: later Bg5 follows.', he: 'במקום 4.c3 (הקו הראשי) הלבן משחק 4.d3: אחר כך Bg5.' }), false],
  ['move beyond departPly+6 is rejected', mutate({ en: 'Instead of 4.c3 (main line), White plays 4.d3: then 9.Re1.', he: 'במקום 4.c3 (הקו הראשי) הלבן משחק 4.d3: ואז 9.Re1.' }), false],
  ['missing departure move is rejected', mutate({ en: 'White builds slowly.', he: 'הלבן בונה לאט.' }), false],
  ['evaluation numbers are rejected', mutate({ en: 'Instead of 4.c3 (main line), White plays 4.d3: about +0.3 for White.', he: 'במקום 4.c3 (הקו הראשי) הלבן משחק 4.d3: בערך +0.3.' }), false],
  ['person names are rejected', mutate({ en: 'Instead of 4.c3 (main line), White plays 4.d3: a Fischer favourite.', he: 'במקום 4.c3 (הקו הראשי) הלבן משחק 4.d3: בנייה איטית.' }), false],
  ['empty Hebrew is rejected', mutate({ he: '' }), false],
  ['Latin words in Hebrew are rejected', mutate({ he: 'במקום 4.c3 (הקו הראשי) הלבן משחק 4.d3: slow.' }), false],
  ['three sentences are rejected', mutate({ en: 'Instead of 4.c3 (main line), White plays 4.d3. It is slow. It is solid.' }), false],
];
for (const [name, entry, expectOk] of selfTests) {
  const problems = validateEntry(entry, facts, mainSans, lineSans);
  if ((problems.length === 0) !== expectOk) errors.push(`self-test failed: ${name} (${problems.join('; ') || 'no problems found'})`);
}
const tokens = extractMoveTokens('Instead of 4.c3 (main line), White plays 4...Nbd2+ and 5.O-O, then exd5 and e8=Q.');
if (tokens.map((token) => token.san).join(' ') !== 'c3 Nbd2 O-O exd5 e8=Q') errors.push(`self-test failed: move tokens ${tokens.map((token) => token.san).join(' ')}`);

if (errors.length) {
  console.error(`check-opening-explanations: ${errors.length} problem(s)`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
const count = Object.keys(output).length;
console.log(`check-opening-explanations: ok (${count} entries, all reviewed:false)`);

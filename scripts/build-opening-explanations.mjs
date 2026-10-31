// Builds public/data/opening-explanations.json: short HE+EN notes on how each variation line departs from its opening's
// main line (first star:true line, else the first line). Facts (departPly, mainMove, lineMove) are computed here by
// replaying the SAN lists with the site's rules engine; the text comes from data-src/opening-explanations/pilot.json and
// is validated against those facts (see scripts/lib/opening-explanations.mjs). Every entry is written with reviewed:false.
// Usage: node scripts/build-opening-explanations.mjs [--check]   (--check validates and compares, writes nothing)
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEntries } from './lib/opening-explanations.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SOURCE = resolve(root, 'data-src/opening-explanations/pilot.json');
const TARGET = resolve(root, 'public/data/opening-explanations.json');
const PILOT_OPENING_COUNT = 5;
const PILOT_MAX_LINES = 130;

const repertoire = JSON.parse(await readFile(resolve(root, 'public/data/repertoire.json'), 'utf8'));
const source = JSON.parse(await readFile(SOURCE, 'utf8'));
const errors = [];

const ids = Array.isArray(source.openings) ? source.openings : [];
if (ids.length !== PILOT_OPENING_COUNT || new Set(ids).size !== ids.length) errors.push(`pilot.json: "openings" must list exactly ${PILOT_OPENING_COUNT} distinct opening ids`);
for (const id of ids) if (!repertoire.some((opening) => opening.id === id)) errors.push(`pilot.json: unknown opening id ${id}`);

const texts = source.entries && typeof source.entries === 'object' ? source.entries : {};
const keys = Object.keys(texts);
if (!keys.length) errors.push('pilot.json: "entries" is empty');
if (keys.length > PILOT_MAX_LINES) errors.push(`pilot.json: ${keys.length} entries exceeds the pilot cap of ${PILOT_MAX_LINES}`);
for (const key of keys) {
  if (!ids.includes(key.split('/')[0])) errors.push(`${key}: opening is not one of the pilot openings`);
  const extra = Object.keys(texts[key]).filter((field) => !['he', 'en', 'confident'].includes(field));
  if (extra.length) errors.push(`${key}: unexpected field(s) ${extra.join(', ')} (facts are computed, not hand-written)`);
}

const { output, errors: entryErrors } = buildEntries(repertoire, texts);
errors.push(...entryErrors);

const perOpening = Object.fromEntries(ids.map((id) => [id, Object.keys(output).filter((key) => key.startsWith(`${id}/`)).length]));
for (const id of ids) if (!perOpening[id]) errors.push(`${id}: no entries`);

if (errors.length) {
  console.error(`build-opening-explanations: ${errors.length} problem(s)`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

const json = `${JSON.stringify(output, null, 1)}\n`;
if (process.argv.includes('--check')) {
  const current = await readFile(TARGET, 'utf8').catch(() => '');
  if (current !== json) { console.error('build-opening-explanations: public/data/opening-explanations.json is stale; re-run without --check'); process.exit(1); }
  console.log('build-opening-explanations: output is up to date');
} else {
  await writeFile(TARGET, json);
  const confidentCount = Object.values(output).filter((entry) => entry.confident !== false).length;
  console.log(`build-opening-explanations: wrote ${Object.keys(output).length} entries (${confidentCount} with strategy text, ${Object.keys(output).length - confidentCount} factual-only) ${JSON.stringify(perOpening)}`);
}

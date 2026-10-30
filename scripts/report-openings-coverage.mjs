// Heuristic coverage report: which items of Benzi's opening request already appear in the flat source files.
// Usage: node scripts/report-openings-coverage.mjs [--family="<text>"]
//   --family lists the existing source lines of one family (text before ':') instead of the report.
// Sources: data-src/veyra-openings.txt and data-src/openings-batches/*.txt (same default list as check-openings-source).
// Matching is by normalised name (accents, case and punctuation ignored); it is a heuristic, not a proof of coverage.
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const batchDir = resolve(root, 'data-src/openings-batches');
const norm = (s) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, "'")
  .replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();

const sourceFiles = [resolve(root, 'data-src/veyra-openings.txt'),
  ...(await readdir(batchDir).catch(() => [])).filter((f) => f.endsWith('.txt')).sort().map((f) => resolve(batchDir, f))];
const sourceLines = [];
for (const file of sourceFiles) {
  const rel = file.slice(root.length).replace(/\\/g, '/');
  const lines = (await readFile(file, 'utf8')).replace(/^\uFEFF/, '').split(/\r?\n/);
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('|')) return;
    const name = line.split('|')[0].trim();
    sourceLines.push({ where: `${rel}:${i + 1}`, name, norm: norm(name) });
  });
}

const familyArg = process.argv.find((a) => a.startsWith('--family='));
if (familyArg) {
  const want = norm(familyArg.slice('--family='.length));
  const hits = sourceLines.filter((l) => l.norm === want || l.norm.startsWith(`${want} `));
  for (const h of hits) console.log(`${h.where}  ${h.name}`);
  console.log(`${hits.length} line(s) for family "${familyArg.slice('--family='.length)}"`);
  process.exit(0);
}

const requested = JSON.parse(await readFile(resolve(root, 'data-src/openings-request-names.json'), 'utf8'));
const bySection = new Map();
const missing = [];
let present = 0;
for (const item of requested) {
  const n = norm(item.name);
  const f = norm(item.family);
  const hit = sourceLines.some((l) => l.norm === n || l.norm.includes(n) || (f && l.norm.includes(f) && l.norm.includes(n)));
  const s = bySection.get(item.section) || { total: 0, present: 0 };
  s.total++;
  if (hit) { present++; s.present++; } else missing.push(item);
  bySection.set(item.section, s);
}

console.log(`request items: ${requested.length} | present (name match): ${present} | missing: ${missing.length}`);
console.log(`source lines: ${sourceLines.length} from ${sourceFiles.length} files`);
for (const [section, s] of [...bySection].sort()) console.log(`section ${section}: ${s.total} items, ${s.present} present, ${s.total - s.present} missing`);
console.log('missing, by section:');
for (const [section] of [...bySection].sort()) {
  const rows = missing.filter((m) => m.section === section);
  if (rows.length) console.log(`  ${section}: ${rows.map((m) => (m.family ? `${m.family} / ${m.name}` : m.name)).join('; ')}`);
}

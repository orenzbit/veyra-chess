// Read-only validator for opening source files in the "Name | SAN moves" format (no move numbers).
// Usage: node scripts/check-openings-source.mjs [files...]
//   default files: data-src/veyra-openings.txt, then data-src/openings-batches/*.txt (sorted by name)
//   --baseline=<file>: that file is validated first and its existing errors are tolerated; batch files must add none.
// Errors: a line is not "Name | moves" (exactly one "|"); a move is illegal or not the engine's canonical SAN;
// a name repeats across files (case-, accent- and punctuation-insensitive); two names share one move list unless a
// line is marked "# alias"; "Family: Variation" needs the line "Family"; "Family: Variation, Sub" needs "Family: Variation".
// Warnings: a child whose moves do not start with its parent's moves. The transposition report never fails.
import { readFile, readdir } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { Chess } from '../public/vendor/veyra-rules/chess-compat.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const batchDir = resolve(root, 'data-src/openings-batches');
const argv = process.argv.slice(2);
const baselineArg = argv.find((a) => a.startsWith('--baseline='));
const baselinePath = baselineArg ? resolve(root, baselineArg.slice('--baseline='.length)) : null;
const fileArgs = argv.filter((a) => !a.startsWith('--')).map((f) => resolve(root, f));
const files = fileArgs.length > 0 || baselinePath
  ? [...(baselinePath ? [baselinePath] : []), ...fileArgs]
  : [resolve(root, 'data-src/veyra-openings.txt'),
    ...(await readdir(batchDir).catch(() => [])).filter((f) => f.endsWith('.txt')).sort().map((f) => resolve(batchDir, f))];

const errors = [];
const warnings = [];
const entries = [];
let plyCount = 0;

const keyOf = (s) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const parentNameOf = (name) => {
  const colon = name.indexOf(':');
  if (colon < 0) return null;
  const comma = name.lastIndexOf(',');
  return (comma > colon ? name.slice(0, comma) : name.slice(0, colon)).trim();
};
const startsWithMoves = (moves, prefix) => prefix.length <= moves.length && prefix.every((m, i) => moves[i] === m);

for (const file of files) {
  const rel = relative(root, file).split('\\').join('/');
  const lines = (await readFile(file, 'utf8')).replace(/^\uFEFF/, '').split(/\r?\n/);
  lines.forEach((raw, i) => {
    const where = `${rel}:${i + 1}`;
    let line = raw.trim();
    if (!line || line.startsWith('#')) return;
    let alias = false;
    const aliasMark = /\s+#\s*alias\s*$/i.exec(line);
    if (aliasMark) { alias = true; line = line.slice(0, aliasMark.index).trim(); }
    const parts = line.split('|');
    if (parts.length !== 2) { errors.push(`${where}: expected "Name | moves" with exactly one "|"`); return; }
    const name = parts[0].trim();
    if (!name) { errors.push(`${where}: empty name`); return; }
    if (!keyOf(name)) { errors.push(`${where}: name "${name}" has no letters or digits`); return; }
    const moves = parts[1].trim().split(/\s+/).filter(Boolean);
    if (moves.length === 0) { errors.push(`${where}: "${name}" has no moves`); return; }
    entries.push({ where, name, key: keyOf(name), moves, alias, finalKey: null });
  });
}

const firstByKey = new Map();
for (const e of entries) {
  const first = firstByKey.get(e.key);
  if (first) errors.push(`${e.where}: name "${e.name}" repeats ${first.where} ("${first.name}")`);
  else firstByKey.set(e.key, e);
}

const replayed = new Map();
const step = (fen, san) => {
  const k = `${fen}|${san}`;
  if (!replayed.has(k)) {
    const pos = new Chess(fen);
    try {
      const mv = pos.move(san);
      replayed.set(k, { canonical: mv.san, next: pos.fen() });
    } catch {
      replayed.set(k, null);
    }
  }
  return replayed.get(k);
};

for (const e of entries) {
  let fen = new Chess().fen();
  let ok = true;
  for (let i = 0; i < e.moves.length && ok; i++) {
    const san = e.moves[i];
    if (/[!?]/.test(san)) { errors.push(`${e.where} ply ${i + 1}: annotation in "${san}" is not allowed`); ok = false; break; }
    if (/^\d+\.+$/.test(san)) { errors.push(`${e.where} ply ${i + 1}: move numbers are not allowed ("${san}")`); ok = false; break; }
    const st = step(fen, san);
    if (!st) { errors.push(`${e.where} ply ${i + 1}: illegal move "${san}" in "${e.name}"`); ok = false; break; }
    if (st.canonical !== san) { errors.push(`${e.where} ply ${i + 1}: "${san}" is not the canonical SAN "${st.canonical}"`); ok = false; break; }
    fen = st.next;
  }
  if (ok) {
    e.finalKey = fen.split(' ').slice(0, 4).join(' ');
    plyCount += e.moves.length;
  }
}

for (const e of entries) {
  const parent = parentNameOf(e.name);
  if (parent === null) continue;
  const pe = firstByKey.get(keyOf(parent));
  if (!pe) { errors.push(`${e.where}: "${e.name}" needs its parent "${parent}" as a line in a source file`); continue; }
  if (!startsWithMoves(e.moves, pe.moves)) warnings.push(`${e.where}: transposition-style child: "${e.name}" does not start with the moves of "${pe.name}"`);
}

const byMoves = new Map();
for (const e of entries) {
  const mk = e.moves.join(' ');
  const first = byMoves.get(mk);
  if (!first) { byMoves.set(mk, e); continue; }
  if (!first.alias && !e.alias) errors.push(`${e.where}: "${e.name}" has the same moves as "${first.name}" (${first.where}); mark it "# alias" if intended`);
}

const positions = new Map();
for (const e of entries) {
  if (!e.finalKey) continue;
  if (!positions.has(e.finalKey)) positions.set(e.finalKey, new Set());
  positions.get(e.finalKey).add(e.name);
}
const groups = [...positions].filter(([, names]) => names.size >= 2);
console.log(`transpositions: ${groups.length} positions reached by 2+ different names`);
for (const [fenKey, names] of groups.slice(0, 20)) console.log(`  ${fenKey} : ${[...names].join(' = ')}`);

const baselineRel = baselinePath ? relative(root, baselinePath).split('\\').join('/') : null;
for (const w of warnings) if (!baselineRel || !w.startsWith(baselineRel + ':')) console.log(`WARNING ${w}`);
const normalise = (text) => text.replace(/^\S+:\d+(?: ply \d+)?: /, '').replace(/ repeats \S+:\d+ .*$/, ' repeats').replace(/ \(\S+:\d+\)/g, '');
let tolerated = 0;
let blocking = errors;
if (baselinePath) {
  const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), baselinePath], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const allowed = new Map();
  for (const line of child.stdout.split(/\r?\n/)) if (line.startsWith('ERROR ')) { const k = normalise(line.slice(6)); allowed.set(k, (allowed.get(k) || 0) + 1); }
  blocking = errors.filter((err) => { const k = normalise(err); const left = allowed.get(k) || 0; if (left > 0) { allowed.set(k, left - 1); tolerated++; return false; } return true; });
}
if (blocking.length) {
  for (const err of blocking) console.log(`ERROR ${err}`);
  console.log(`FAIL: ${blocking.length} new error(s) (${tolerated} pre-existing tolerated), ${warnings.length} warning(s).`);
  process.exitCode = 1;
} else {
  console.log(`PASS: ${files.length} files, ${entries.length} lines, ${plyCount} plies, ${tolerated} pre-existing errors tolerated, ${groups.length} transposition groups.`);
}

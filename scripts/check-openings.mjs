// Read-only check of the opening trainer data and its move matcher (src/opening-quiz.ts).
// Usage: node scripts/check-openings.mjs [path/to/repertoire.json]   (default: public/data/repertoire.json)
// Verifies: matcher self-tests; every line replays legally from the start; every stored SAN is the engine's canonical
// SAN; ids are unique; the matcher accepts the canonical, lower-case-piece, capture-without-x and UCI spellings of each
// expected move and rejects a different legal move. A first-move comment is reported as a warning only.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from '../rules-src/chess-compat.mjs';
import { quizMoveMatches } from '../src/opening-quiz.ts';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const file = resolve(root, process.argv[2] || 'public/data/repertoire.json');
const openings = JSON.parse(await readFile(file, 'utf8'));
const errors = [];
const warnings = [];

if (!Array.isArray(openings) || openings.length === 0) errors.push(`${file}: expected a non-empty array of openings`);

// Matcher self-tests on fixed positions: spellings the trainer must accept, and wrong or garbage input it must reject.
const START = new Chess().fen();
const PROMOTION = '4k3/P7/8/8/8/8/8/4K3 w - - 0 1';
const CAPTURE = '4k3/8/8/4p3/8/5N2/8/4K3 w - - 0 1';
const PAWN_TRAP = '4k3/8/2p5/1P6/8/8/8/4K2B w - - 0 1'; // Bxc6 (from h1) and bxc6 both legal; "bxc6" must mean the pawn
const SELF_TESTS = [
  [START, 'Nf3', 'Nf3', true], [START, 'Nf3', 'nf3', true], [START, 'Nf3', 'g1f3', true],
  [START, 'Nf3', 'e5', false], [START, 'Nf3', 'Ke2', false], [START, 'Nf3', 'zz9', false], [START, 'Nf3', '', false],
  [START, 'e4', 'e4', true], [START, 'e4', 'e2e4', true], [START, 'e4', 'e5', false], [START, 'e4', 'e2e5', false],
  [PROMOTION, 'a8=Q', 'a8Q', true], [PROMOTION, 'a8=Q', 'a8=Q', true], [PROMOTION, 'a8=Q', 'a7a8q', true],
  [PROMOTION, 'a8=Q', 'a8=N', false], [PROMOTION, 'a8=Q', 'a8N', false],
  [CAPTURE, 'Nxe5', 'Ne5', true], [CAPTURE, 'Nxe5', 'nxe5', true], [CAPTURE, 'Nxe5', 'f3e5', true], [CAPTURE, 'Nxe5', 'Nd4', false],
  [PAWN_TRAP, 'Bxc6', 'Bxc6', true], [PAWN_TRAP, 'Bxc6', 'bxc6', false], [PAWN_TRAP, 'Bxc6', 'bc6', false],
];
for (const [fen, expected, typed, want] of SELF_TESTS) {
  const got = quizMoveMatches(Chess, fen, typed, expected);
  if (got !== want) errors.push(`matcher self-test: "${typed}" for ${expected} gave ${got}, expected ${want}`);
}
const PAWN_SELF_TESTS = [
  ['4k3/8/8/8/8/8/1P6/4K3 w - - 0 1', 'b4', 'b4', true],
  ['4k3/8/8/8/8/8/1P6/4K3 w - - 0 1', 'b4', 'bb4', false],
  ['4k3/8/8/8/8/B7/1P6/4K3 w - - 0 1', 'Bb4', 'bb4', true],
  ['4k3/8/2p5/1P6/8/8/8/4K3 w - - 0 1', 'bxc6', 'bxc6', true],
  ['4k3/8/2p5/1P6/8/8/8/4K3 w - - 0 1', 'bxc6', 'bc6', true],
  ['r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'O-O', 'o-o', true],
  ['r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'O-O-O', 'O-O', false],
];
for (const [fen, expected, typed, want] of PAWN_SELF_TESTS) {
  const got = quizMoveMatches(Chess, fen, typed, expected);
  if (got !== want) errors.push(`pawn self-test: "${typed}" for ${expected} gave ${got}, expected ${want}`);
}

// Replays are memoized per (position, move): many lines share prefixes, and the engine's string parser is the slow part.
const replayed = new Map();
function replay(fen, san) {
  const key = fen + '|' + san;
  if (!replayed.has(key)) {
    const pos = new Chess(fen);
    try {
      const mv = pos.move(san);
      replayed.set(key, { canonical: mv.san, lan: mv.lan, next: pos.fen() });
    } catch {
      replayed.set(key, null);
    }
  }
  return replayed.get(key);
}
const matcherChecked = new Set();

const openingIds = new Set();
let lineCount = 0, plyCount = 0, matcherChecks = 0;
for (const opening of openings) {
  if (openingIds.has(opening.id)) errors.push(`duplicate opening id "${opening.id}"`);
  openingIds.add(opening.id);
  const lineIds = new Set();
  for (const line of opening.lines || []) {
    const where = `${opening.id}/${line.id}`;
    lineCount++;
    if (lineIds.has(line.id)) errors.push(`duplicate line id "${where}"`);
    lineIds.add(line.id);
    const moves = line.moves || [];
    if (moves.length === 0) { errors.push(`${where}: line has no moves`); continue; }
    if (moves[0][1]) warnings.push(`${where}: first move has a comment; the trainer renders moves[ply-1], which would read moves[-1] at ply 0`);
    let fen = new Chess().fen();
    for (let i = 0; i < moves.length; i++) {
      const stored = moves[i][0];
      const step = replay(fen, stored);
      if (!step) { errors.push(`${where} ply ${i + 1}: illegal move "${stored}"`); break; }
      plyCount++;
      if (step.canonical !== stored) errors.push(`${where} ply ${i + 1}: stored "${stored}" but canonical SAN is "${step.canonical}"`);
      const canonical = step.canonical;
      const checkKey = fen + '|' + canonical;
      if (!matcherChecked.has(checkKey)) {
        matcherChecked.add(checkKey);
        const spellings = new Set([canonical, step.lan]);
        if (/^[NBRQK]/.test(canonical)) spellings.add(canonical[0].toLowerCase() + canonical.slice(1));
        if (canonical.includes('x')) spellings.add(canonical.replace('x', ''));
        for (const typed of spellings) {
          matcherChecks++;
          if (!quizMoveMatches(Chess, fen, typed, canonical)) errors.push(`${where} ply ${i + 1}: matcher rejects "${typed}" for ${canonical}`);
        }
        const alt = new Chess(fen).moves({ verbose: true }).find((m) => m.from + m.to + (m.promotion || '') !== step.lan);
        if (alt) {
          const altSan = new Chess(fen).move({ from: alt.from, to: alt.to, promotion: alt.promotion }).san.replace(/[+#]$/, '');
          matcherChecks++;
          if (quizMoveMatches(Chess, fen, altSan, canonical)) errors.push(`${where} ply ${i + 1}: matcher accepts a different legal move "${altSan}" for ${canonical}`);
        }
      }
      fen = step.next;
    }
  }
}

for (const w of warnings) console.warn('WARN ' + w);
if (errors.length) {
  console.error(`FAIL: ${errors.length} problem(s) in ${file}\n` + errors.slice(0, 50).join('\n'));
  process.exit(1);
}
console.log(`PASS: ${openings.length} openings, ${lineCount} lines, ${plyCount} plies, ${matcherChecks} matcher checks, ${warnings.length} warning(s).`);

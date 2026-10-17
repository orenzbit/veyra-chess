// Validates the puzzle code that ships in the app: dist/src/puzzle/*.js (compiled from
// src/puzzle/*.ts) against data/puzzle-seed.json. Run after `tsc -p tsconfig.json`.
// Checks: ids, FEN, every solution move legal (king never left in check), missed_mate
// solutions end in checkmate, and checkAttempt accepts the solution and rejects a wrong move.
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = (name) => pathToFileURL(join(root, 'dist', 'src', 'puzzle', name)).href;
const { parseFEN, mirrorFEN } = await import(dist('board.js'));
const { applyUCIMove } = await import(dist('moves.js'));
const { inCheck, isCheckmate } = await import(dist('legal.js'));
const { hashPuzzleId } = await import(dist('repo.js'));
const { checkAttempt } = await import(dist('engine.js'));

const doc = JSON.parse(await readFile(join(root, 'data', 'puzzle-seed.json'), 'utf8'));
const failures = [];
const seen = new Set();
for (const p of doc.puzzles) {
  try {
    if (seen.has(p.id)) throw new Error('duplicate id');
    seen.add(p.id);
    if (hashPuzzleId(p.fen, p.solution) !== p.id) throw new Error('id mismatch');
    const parsed = parseFEN(p.fen);
    if (!parsed.ok) throw new Error('bad FEN: ' + parsed.error);
    let grid = parsed.grid, turn = parsed.turn;
    if (inCheck(grid, turn === 'w' ? 'b' : 'w')) throw new Error('illegal position: side not to move is in check');
    for (const step of p.solution) {
      grid = applyUCIMove(grid, step, turn).grid;
      if (inCheck(grid, turn)) throw new Error('illegal: leaves own king in check (' + step + ')');
      turn = turn === 'w' ? 'b' : 'w';
    }
    if (p.motif === 'missed_mate' && !isCheckmate(grid, turn)) throw new Error('missed_mate is not checkmate');
    if (checkAttempt(p, p.solution[0]) !== 'correct') throw new Error('checkAttempt rejects the solution');
    const wrong = p.solution[0] === 'a1a2' ? 'h1h2' : 'a1a2';
    if (checkAttempt(p, wrong) !== 'wrong') throw new Error('checkAttempt accepts a wrong move');
  } catch (e) {
    failures.push(`${p.id} ${p.fen}: ${e.message}`);
  }
}
if (doc.puzzles.length !== 24) failures.push('expected 24 puzzles, got ' + doc.puzzles.length);
if (failures.length) {
  console.log('FAIL:\n' + failures.join('\n'));
  process.exit(1);
}
console.log(`PASS: ${doc.puzzles.length} shipped puzzles are legal, mates verified, attempt checking works.`);

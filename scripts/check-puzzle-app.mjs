// Validates the puzzle code that ships in the app: dist/src/puzzle/*.js (compiled from
// src/puzzle/*.ts) against data/puzzle-seed.json. Run after `tsc -p tsconfig.json`.
// Checks: ids, FEN, every solution move legal (king never left in check), missed_mate
// solutions end in checkmate, and the app's move rule (judge, shared by the streak, personal and
// Rush views) accepts the solution, rejects a wrong move, and accepts every mating move.
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = (name) => pathToFileURL(join(root, 'dist', 'src', 'puzzle', name)).href;
const { parseFEN, mirrorFEN } = await import(dist('board.js'));
const { applyUCIMove } = await import(dist('moves.js'));
const { inCheck, isCheckmate } = await import(dist('legal.js'));
const { hashPuzzleId } = await import(dist('repo.js'));
// board-view.ts reads the browser globals when it loads: give it the app's rules layer and inert stand-ins.
const rules = await import(pathToFileURL(join(root, 'public', 'vendor', 'veyra-rules', 'chess-compat.js')).href);
globalThis.window = { ChessLib: rules, ChessBoardLib: { Chessboard: class {}, COLOR: { white: 'white', black: 'black' }, BORDER_TYPE: { none: 'none' } } };
globalThis.React = { createElement() {}, useState() {}, useRef() {}, useEffect() {} };
const { judge } = await import(dist('board-view.js'));

// The four seed positions with a second mating move (the seed declares them in accepted).
const ALT_MATES = { d0f171bb21e25cf3: 'e5b8', fabfe3b8f8f8254a: 'e4b1', '32bb4b89f8189607': 'b1b8', a8ca6644d39a869c: 'b8b1' };

const doc = JSON.parse(await readFile(join(root, 'data', 'puzzle-seed.json'), 'utf8'));
const failures = [];
const seen = new Set();
let altSeen = 0;
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
    if (judge(p, p.solution[0]).verdict !== 'correct') throw new Error('judge rejects the solution');
    const wrong = p.solution[0] === 'a1a2' ? 'h1h2' : 'a1a2';
    if (judge(p, wrong).verdict === 'correct') throw new Error('judge accepts a wrong move');
    const alt = ALT_MATES[p.id];
    if (alt) {
      // The streak view must count the alternative mate as solved, exactly as personal and Rush do.
      const shipped = judge(p, alt);
      if (shipped.verdict !== 'correct' || !shipped.viaAlt) throw new Error('judge rejects the alternative mate ' + alt);
      // The rule itself accepts any mate, even if the record did not declare it.
      if (judge({ ...p, accepted: [] }, alt).verdict !== 'correct') throw new Error('the rule does not accept the mating move ' + alt);
      altSeen++;
    }
  } catch (e) {
    failures.push(`${p.id} ${p.fen}: ${e.message}`);
  }
}
if (doc.puzzles.length !== 24) failures.push('expected 24 puzzles, got ' + doc.puzzles.length);
if (altSeen !== Object.keys(ALT_MATES).length) failures.push(`expected ${Object.keys(ALT_MATES).length} alternative-mate puzzles, found ${altSeen}`);
const streakSource = await readFile(join(root, 'src', 'puzzle-page.ts'), 'utf8');
if (/checkAttempt/.test(streakSource) || !/judge\(cur, uci\)/.test(streakSource)) {
  failures.push('src/puzzle-page.ts: the streak view must judge moves with judge(cur, uci), not the first-move-only checkAttempt');
}
if (failures.length) {
  console.log('FAIL:\n' + failures.join('\n'));
  process.exit(1);
}
console.log(`PASS: ${doc.puzzles.length} shipped puzzles are legal, mates verified; judge() accepts the solution, rejects a wrong move, and accepts all ${altSeen} alternative mates; the streak view uses judge().`);

// DNA page fixes (play-findings #21, #18). #21: the DNA page has its own username box. #18: a mating move is scored
// as a win, not as the 50% the engine gives a position with no moves, so the winner is not marked down for mating.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Chess } from '../rules-src/chess-compat.mjs';
import { analyzeGameMoves, computeReviewSummary } from '../src/review-metrics.ts';
let failed = 0;
async function test(name, fn) { try { await fn(); console.log(`PASS: ${name}`); } catch (e) { failed += 1; console.error(`FAIL: ${name}\n  ${String(e.message).slice(0, 300)}`); } }
const src = readFileSync('src/main.ts', 'utf8');
const dna = src.slice(src.indexOf("if(page==='dna'){"), src.indexOf("if(page==='dna'){") + 6000);
await test('the DNA page has a username input and a Chess.com / Lichess choice', () => {
  assert.match(dna, /className:'dna-user-row'/);
  assert.match(dna, /'aria-label':'שם משתמש לדוח DNA'/);
  assert.match(dna, /onClick:\(\)=>setArchiveProvider\('chesscom'\)/);
  assert.match(dna, /onClick:\(\)=>setArchiveProvider\('lichess'\)/);
});
await test('the DNA button waits for a username instead of failing in red', () => assert.match(dna, /disabled:dnaRunning\|\|!\(archiveProvider==='chesscom'\?username:lichessUsername\)\.trim\(\),onClick:runDnaReview/));
// Scholar's mate with a stub engine that answers like the real worker: 50% after a mating move (no moves to search)
const g = new Chess(); for (const san of ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#']) g.move(san);
const history = g.history({ verbose: true });
const analyzePosition = async (fen, afterFen, mover) => {
  const mate = new Chess(afterFen).isCheckmate();
  const white = fen.split(' ')[1] === 'w';
  return { bestUci: mover.from + mover.to + (mover.promotion || ''), whiteChanceBest: mate ? (white ? 100 : 0) : 55, whiteChanceAfter: mate ? 50 : 55, drop: 0, bestScore: mate ? 999999 : 40, afterScore: mate ? 0 : 40, afterBestUci: null, afterDepth: mate ? 0 : 10 };
};
await test('a mating move ends at 100% for the side that mated', async () => {
  const rows = await analyzeGameMoves(history, { Chess, analyzePosition, openingLines: new Set() });
  assert.equal(rows.at(-1).whiteChanceAfter, 100);
  const s = computeReviewSummary(rows);
  assert.ok(s.whiteAcc > 90, 'white accuracy ' + s.whiteAcc);
});
if (failed) { console.error(`${failed} DNA/review check(s) failed.`); process.exit(1); }
console.log('DNA page and mate scoring checks passed.');

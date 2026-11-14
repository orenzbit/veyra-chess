// One arrow style on every review board and in the coach panel: npm run check:review-arrows
// (also run from check:review-determinism). src/board-arrows.ts holds the colours, the meaning and the geometry;
// main.ts draws every review/coach arrow through drawBoardArrows(). This test checks:
// - the normal review board: the move just played is a faded arrow, the better move is drawn on the position BEFORE
//   the move (not after it), next to the played move in red when they differ;
// - the coach line: colours by who moves (green for the side whose move is explained, orange for the other side),
//   the mistake vs better-line toggle, the legend;
// - the geometry (arrowhead on the target square, both board orientations);
// - main.ts has no other arrow drawer left (the old head-less line arrow is gone).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Chess } from '../rules-src/chess-compat.mjs';
import { reviewArrows, arrowShape, squareCenter, legendFor, arrowColor, ARROW_COLOR, ARROW_LEGEND_HE } from '../src/board-arrows.ts';
import { explainBestMove } from '../src/coach-explain.ts';
import { coachBoardView } from '../src/coach-explain-panel.ts';

let passed = 0;
async function test(name, fn) {
  try { await fn(); passed += 1; console.log(`ok - ${name}`); } catch (error) { console.error(`FAIL - ${name}\n  ${error.message}`); process.exitCode = 1; }
}
const pick = arrows => arrows.map(a => [a.from, a.to, a.who, !!a.faded, !!a.mistake]);

await test('review board, normal: the played move is the only arrow, faded; the better move is NOT drawn on the position after the move', () => {
  const v = reviewArrows({ played: 'f3e5', bestUci: 'd2d4', afterBestUci: 'd8d4', mode: 'normal' });
  assert.equal(v.before, false);
  assert.deepEqual(pick(v.arrows), [['f3', 'e5', 'me', true, false]]);
});

await test('review board, "הסבר מהלך": the board goes to the position before the move; played move red dashed, better move green', () => {
  const v = reviewArrows({ played: 'f3e5', bestUci: 'd2d4', mode: 'best' });
  assert.equal(v.before, true, 'the better move belongs to the position before the move');
  assert.deepEqual(pick(v.arrows), [['f3', 'e5', 'me', false, true], ['d2', 'd4', 'me', false, false]]);
  const same = reviewArrows({ played: 'd2d4', bestUci: 'd2d4', mode: 'best' });
  assert.deepEqual(pick(same.arrows), [['d2', 'd4', 'me', false, false]], 'when he played the best move there is no red arrow');
  const promo = reviewArrows({ played: 'e7e8q', bestUci: 'e7e8q', mode: 'best' });
  assert.equal(promo.arrows.length, 1, 'promotion letter does not make it a different move');
});

await test('review board, "הסבר איום": the opponent\'s strongest reply is an orange full arrow after the faded played move', () => {
  const v = reviewArrows({ played: 'f3e5', bestUci: 'd2d4', afterBestUci: 'd8d4', mode: 'threat' });
  assert.equal(v.before, false);
  assert.deepEqual(pick(v.arrows), [['f3', 'e5', 'me', true, false], ['d8', 'd4', 'opp', false, false]]);
  assert.equal(arrowColor(v.arrows[1]), ARROW_COLOR.opp);
});

const KNIGHT_FORK = 'r1b1kbnr/pp3ppp/4p3/1N6/4p3/8/PPPP1PPP/R1BQ1RK1 w kq - 0 10';
await test('coach line: green for the side whose move is explained, orange for the other side (also when Black is explained)', () => {
  const ex = explainBestMove(Chess, KNIGHT_FORK, ['b5c7', 'e8d7', 'c7a8']);
  const v2 = coachBoardView(ex, 2);
  assert.deepEqual(pick(v2.arrows), [['e8', 'd7', 'opp', true, false], ['c7', 'a8', 'me', false, false]]);
  assert.equal(v2.arrows[1].color, ARROW_COLOR.me); assert.equal(v2.arrows[0].color, ARROW_COLOR.opp);
  // The same idea for a Black move: Black's move is green, White's reply orange.
  const c = new Chess(); c.move('e4'); const fenB = c.fen();
  const exB = explainBestMove(Chess, fenB, ['e7e5', 'g1f3', 'b8c6']);
  assert.deepEqual(pick(coachBoardView(exB, 1).arrows), [['e7', 'e5', 'me', true, false], ['g1', 'f3', 'opp', false, false]]);
});

await test('mistake toggle: the better line shows his move in red at the start; his line marks its first move red', () => {
  const c = new Chess(); c.move('e4'); c.move('e5'); const fen = c.fen();
  const best = explainBestMove(Chess, fen, ['g1f3', 'b8c6', 'f1b5']);
  const v0 = coachBoardView(best, 0, { mistakeUci: 'd1h5' });
  assert.deepEqual(pick(v0.arrows), [['d1', 'h5', 'me', false, true], ['g1', 'f3', 'me', false, false]]);
  assert.deepEqual(pick(coachBoardView(best, 1, { mistakeUci: 'd1h5' }).arrows), [['g1', 'f3', 'me', true, false], ['b8', 'c6', 'opp', false, false]], 'red only at the start');
  const his = explainBestMove(Chess, fen, ['d1h5', 'b8c6', 'f1c4']);
  assert.deepEqual(pick(coachBoardView(his, 0, { firstIsMistake: true }).arrows), [['d1', 'h5', 'me', false, true]]);
  assert.deepEqual(pick(coachBoardView(his, 1, { firstIsMistake: true }).arrows), [['d1', 'h5', 'me', true, true], ['b8', 'c6', 'opp', false, false]]);
  assert.deepEqual(pick(coachBoardView(his, 2, { firstIsMistake: true }).arrows), [['b8', 'c6', 'opp', true, false], ['f1', 'c4', 'me', false, false]]);
});

await test('legend: only the colours on the board, in a fixed order, in Hebrew', () => {
  assert.deepEqual(legendFor(reviewArrows({ played: 'f3e5', bestUci: 'd2d4', mode: 'best' }).arrows), ['me', 'mistake']);
  assert.deepEqual(legendFor(reviewArrows({ played: 'f3e5', afterBestUci: 'd8d4', mode: 'threat' }).arrows), ['opp', 'faded']);
  assert.deepEqual(legendFor([]), []);
  for (const k of Object.keys(ARROW_LEGEND_HE)) assert.match(ARROW_LEGEND_HE[k], /[\u0590-\u05FF]/);
});

await test('geometry: the arrowhead tip is the centre of the target square, for White and Black at the bottom', () => {
  for (const orient of ['white', 'black']) {
    const s = arrowShape('e2', 'e4', 480, orient); const t = squareCenter('e4', 480, orient);
    assert.deepEqual(s.points[0], [t.x, t.y]);
    assert.ok(Math.abs(s.width - 480 / 8 * 0.13) < 1e-9 && Math.abs(s.head - 480 / 8 * 0.34) < 1e-9, 'same proportions as the coach arrows');
  }
  assert.deepEqual(squareCenter('a1', 480, 'white'), { x: 30, y: 450 });
  assert.deepEqual(squareCenter('a1', 480, 'black'), { x: 450, y: 30 });
});

await test('main.ts: every review and coach arrow goes through drawBoardArrows; the old head-less arrow is gone', () => {
  const src = readFileSync('src/main.ts', 'utf8');
  assert.doesNotMatch(src, /function addArrow\(/, 'the old line-only arrow drawer is removed');
  assert.doesNotMatch(src, /createElementNS\([^)]*,\s*'polygon'\)/, 'no second copy of the arrow drawing in main.ts');
  assert.ok((src.match(/drawBoardArrows\(/g) || []).length >= 2, 'review overlay and coach arrows both use drawBoardArrows');
  assert.match(src, /ArrowLegend/);
  const css = readFileSync('public/styles.css', 'utf8');
  assert.match(css, /--arrow-me:#2f9e44;--arrow-opp:#e8590c;--arrow-mistake:#e03131/);
  assert.match(css, /\.coach-line-move\.who-me button\{border-color:var\(--arrow-me/, 'the line chips use the arrow colours too');
  assert.match(readFileSync('src/coach-explain-panel.ts', 'utf8'), /who-me/);
});

console.log(process.exitCode ? `FAILED (${passed} passed)` : `PASS: ${passed} review-arrows checks`);

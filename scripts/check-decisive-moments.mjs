// Decisive moments in game review: npm run check:decisive-moments (also run from check:review-determinism).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Chess } from '../rules-src/chess-compat.mjs';
import { decisiveMoments, MIN_SWING, DECISIVE_COUNT } from '../src/decisive-moments.ts';
import { createHandler } from '../netlify/functions/features.mjs';

let passed = 0;
async function test(name, fn) {
  try { await fn(); passed += 1; console.log(`ok - ${name}`); } catch (error) { console.error(`FAIL - ${name}\n  ${error.message}`); process.exitCode = 1; }
}
const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nd4', 'Nxe5', 'Qg5', 'Nxf7', 'Qxg2', 'Rf1', 'Qxe4+', 'Be2', 'Nf3#'];
const g = new Chess(); const history = sans.map(s => g.move(s));
// White's winning chance before (best play) and after each move, as the review engine reports it
const chances = [[50, 50], [50, 50], [52, 52], [52, 51], [53, 52], [52, 60], [60, 35], [35, 30], [30, 25], [25, 8], [8, 8], [8, 3], [3, 0], [0, 0]];
const moves = chances.map(([b, a], i) => ({ index: i, classification: i < 4 ? 'book' : 'good', whiteChanceBefore: b, whiteChanceAfter: a, bestUci: null }));
moves[6] = { ...moves[6], classification: 'blunder', bestUci: 'f3d4' };   // 7.Nxe5?? 60 -> 35
moves[9] = { ...moves[9], classification: 'great', bestUci: 'g5g2' };     // 5...Qxg2: best == played
moves[5] = { ...moves[5], classification: 'mistake', bestUci: 'g8f6' };   // 3...Nd4 52 -> 60 (Black lost 8: under the threshold)

await test(`the ${DECISIVE_COUNT} biggest swings of ${MIN_SWING}+ points, in game order, from the mover's side`, () => {
  const m = decisiveMoments(Chess, history, moves);
  assert.deepEqual(m.map(x => x.index), [6, 9], 'only two moves swing 15+ points');
  assert.deepEqual(m[0], { index: 6, moveNumber: 4, mover: 'white', san: 'Nxe5', bestSan: 'Nxd4', classification: 'blunder', moverBefore: 60, moverAfter: 35, swing: -25 });
  assert.deepEqual(m[1], { index: 9, moveNumber: 5, mover: 'black', san: 'Qxg2', bestSan: null, classification: 'great', moverBefore: 75, moverAfter: 92, swing: 17 }, 'a winning shot shows up too; best == played gives no "better was"');
});
await test('more than three: the biggest three win, ties go to the earlier move; book and forced moves never count', () => {
  const big = moves.map((r, i) => ({ ...r, classification: i < 2 ? 'book' : i === 12 ? 'forced' : 'good', whiteChanceBefore: i === 13 ? 0 : 50, whiteChanceAfter: i < 2 || i === 12 ? 0 : 50 - (i % 5) * 5 - 10 })); // 13 = the mate, already won
  // swings: i%5==4 -> 30; i%5==3 -> 25 ...; i=4,9 swing 30, i=3,8,13 swing 25
  const m = decisiveMoments(Chess, history, big);
  assert.deepEqual(m.map(x => x.index), [3, 4, 9]);
  assert.deepEqual(decisiveMoments(Chess, history, big, 1).map(x => x.index), [4]);
});
await test('a mating move is a win for the mover, not a 50% "after" the engine reports for a finished board', () => {
  const rows = moves.map(r => ({ ...r }));
  rows[12] = { ...rows[12], whiteChanceBefore: 3, whiteChanceAfter: 3 };
  rows[13] = { index: 13, classification: 'best', whiteChanceBefore: 0, whiteChanceAfter: 50, bestUci: 'd4f3' }; // 7...Nf3#
  assert.ok(!decisiveMoments(Chess, history, rows).some(m => m.index === 13), 'Nf3# was already winning: no swing');
  rows[13].whiteChanceBefore = 40; // had it been a surprise mate, it would be a +40 swing for Black (60 -> 100)
  const m = decisiveMoments(Chess, history, rows).find(x => x.index === 13);
  assert.deepEqual([m.mover, m.moverBefore, m.moverAfter, m.swing], ['black', 60, 100, 40]);
});
await test('no analysis, a quiet game or a broken history: nothing, no throw', () => {
  assert.deepEqual(decisiveMoments(Chess, history, moves.map(r => ({ ...r, whiteChanceAfter: r.whiteChanceBefore }))), []);
  assert.deepEqual(decisiveMoments(Chess, null, null), []);
  assert.deepEqual(decisiveMoments(Chess, [{ from: 'e2', to: 'e5', san: 'e5' }], [{ index: 0, classification: 'blunder', whiteChanceBefore: 90, whiteChanceAfter: 10 }]), []);
});
await test('flag DECISIVE_MOMENTS_ENABLED: off by default; the panel renders only with it on', async () => {
  const get = async env => { const r = await createHandler({ env })({ httpMethod: 'GET', headers: {} }); return { status: r.statusCode, body: JSON.parse(r.body) }; };
  assert.equal((await get({})).body.decisiveMoments, false);
  assert.equal((await get({ DECISIVE_MOMENTS_ENABLED: '1' })).body.decisiveMoments, false);
  assert.equal((await get({ DECISIVE_MOMENTS_ENABLED: 'TRUE' })).body.decisiveMoments, true);
  assert.equal((await createHandler({ env: {} })({ httpMethod: 'POST', headers: {} })).statusCode, 405);
  const main = readFileSync('src/main.ts', 'utf8');
  assert.match(main, /const \[decisiveEnabled,setDecisiveEnabled\]=useState\(false\);/);
  assert.match(main, /getJson\('\/api\/features'\)\.then\(r=>\{?setDecisiveEnabled\(r\.ok&&r\.data\?\.decisiveMoments===true\)/);
  assert.match(main, /const moments=decisiveEnabled&&analysis\?\.moves\?decisiveMoments\(Chess,history,analysis\.moves\):null;/);
  assert.match(main, /moments&&h\(DecisiveMomentsPanel,\{moments,selected,onPick:setSelected,lang:getLang\(\)\}\),\n\s+h\('section',\{className:'panel'\},\n\s+h\('div',\{className:'panel-title'\},h\('h2',null,'מהלכים'\)/, 'the panel sits right above the move list');
  assert.match(readFileSync('scripts/local-preview.mjs', 'utf8'), /name === 'features'\) return send\(res, 200, \{ ok: true, decisiveMoments: process\.env\.DECISIVE_MOMENTS_ENABLED === 'true'[,}]/);
  const panel = readFileSync('src/decisive-moments-panel.ts', 'utf8');
  assert.match(panel, /onClick: \(\) => onPick\(m\.index\)/, 'each moment is a button that selects that move');
  for (const he of ['שלושת', 'הרגעים המכריעים', 'הסיכוי של ', 'לנצח ירד מ-', 'עדיף היה: ', 'הצג על הלוח']) assert.ok(panel.includes(he), he);
});
console.log(`decisive moments: ${passed} passed`);

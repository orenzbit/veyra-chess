// The coach's "why?" on game review: npm run check:coach-explain (also run from check:review-determinism).
// The engine worker returns its line (principal variation); explainBestMove turns board facts into Hebrew reasons.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Chess } from '../rules-src/chess-compat.mjs';
import { explainBestMove, engineLine, lineSteps } from '../src/coach-explain.ts';
import { coachBoardView } from '../src/coach-explain-panel.ts';
import { createHandler } from '../netlify/functions/coach-flags.mjs';

let passed = 0;
async function test(name, fn) {
  try { await fn(); passed += 1; console.log(`ok - ${name}`); } catch (error) { console.error(`FAIL - ${name}\n  ${error.message}`); process.exitCode = 1; }
}

async function loadWorker() {
  const wasm = readFileSync('public/vendor/chessy-ai-fast.wasm'); const loader = readFileSync('public/vendor/wasm-engine.js', 'utf8');
  const source = readFileSync('public/engine-worker.js', 'utf8'); const messages = []; let ok, bad; const ready = new Promise((a, b) => { ok = a; bad = b; });
  let context;
  const sandbox = { console, WebAssembly, TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, DataView, BigInt, performance, setTimeout, clearTimeout,
    fetch: async () => ({ arrayBuffer: async () => wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) }),
    postMessage: m => { if (m === 'ready') ok(); else if (m?.type === 'boot-error') bad(new Error(m.error)); else messages.push(m); },
    importScripts: () => vm.runInContext(loader, context) };
  sandbox.self = sandbox; context = vm.createContext(sandbox); vm.runInContext(source, context); await ready;
  let n = 0;
  return async (req) => { messages.length = 0; const id = 'c' + (++n); await context.self.onmessage({ data: { id, ...req } }); const r = messages.find(m => m && m.id === id); if (!r) throw new Error('no response'); if (r.error) throw new Error(r.error); return r.result; };
}
const ask = await loadWorker();
const texts = ex => ex.reasons.map(r => r.text);
const keys = ex => ex.reasons.map(r => r.key);

// From orenzbit's own games (orenzbit-2026-10.pgn and -09.pgn in this repo).
const KNIGHT_FORK = 'r1b1kbnr/pp3ppp/4p3/1N6/4p3/8/PPPP1PPP/R1BQ1RK1 w kq - 0 10';
const BISHOP_FOR_ROOK = '4k2r/1p3pp1/4p2p/p3p3/1b4r1/P3B3/5P2/1R2RK2 b - - 0 27';
const QUEEN_ESCAPES = 'r1b1kbnr/pp1p1ppp/2p1p3/1B6/3qP3/8/PPPPNPPP/R1BQ1RK1 b kq - 1 7';

await test('the engine worker returns its line: at least 3 legal moves, the same line on a second ask', async () => {
  const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
  const a = await ask({ type: 'pv', fen, plies: 5 });
  assert.ok(Array.isArray(a.pv), 'result.pv is an array of UCI moves');
  assert.ok(a.pv.length >= 3 && a.pv.length <= 5, `3-5 moves, got ${a.pv.length}`);
  assert.equal(lineSteps(Chess, fen, a.pv).length, a.pv.length, 'every move of the line is legal in turn');
  const b = await ask({ type: 'pv', fen, plies: 5 });
  assert.deepEqual(b.pv, a.pv, 'deterministic');
});

await test('a cut-short line is continued from where it stopped, up to 3 moves', async () => {
  const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const calls = [];
  const fake = async req => { calls.push(req.fen); return { pv: calls.length === 1 ? ['e2e4'] : ['e7e5', 'g1f3'] }; };
  assert.deepEqual(await engineLine(Chess, fen, fake), ['e2e4', 'e7e5', 'g1f3']);
  assert.equal(calls[1], new Chess('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1').fen(), 'the second ask starts after 1.e4');
});

await test('mate in one is called mate', async () => {
  const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4';
  const ex = explainBestMove(Chess, fen, (await ask({ type: 'pv', fen, plies: 5 })).pv);
  assert.equal(ex.bestSan, 'Qxf7#');
  assert.equal(ex.reasons[0].text, 'Qxf7# הוא מט: למלך השחור אין לאן לברוח.');
});

await test('a real game: the knight fork Nc7+ (king and rook), and the rook it wins along the line', async () => {
  const pv = await engineLine(Chess, KNIGHT_FORK, q => ask(q));
  const ex = explainBestMove(Chess, KNIGHT_FORK, pv);
  assert.equal(ex.bestSan, 'Nc7+');
  assert.ok(texts(ex).includes('מזלג: הפרש נותן שח ובאותו זמן תוקף את הצריח ב-a8.'), texts(ex).join(' | '));
  assert.ok(ex.steps.length >= 3 && ex.steps[2].san === 'Nxa8', 'the line takes the rook: ' + ex.steps.map(s => s.san).join(' '));
});

await test('a real game: Bxe1 takes a rook with a bishop, and a recapture still loses the exchange', () => {
  const ex = explainBestMove(Chess, BISHOP_FOR_ROOK, ['b4e1', 'b1b7', 'e1f2', 'f1f2', 'h8f8']);
  assert.equal(ex.reasons[0].text, 'לוקח את הצריח ב-e1 עם הרץ: גם אם לבן ייקח בחזרה, שחור מרוויח בחילוף.');
  assert.ok(texts(ex).includes('אחרי 5 המהלכים של השורה, שחור מרוויח 2 נקודות חומר.'), texts(ex).join(' | '));
});

await test('a real game: Qxe4 takes a free pawn and gets the queen out of danger (feminine verbs)', () => {
  const ex = explainBestMove(Chess, QUEEN_ESCAPES, ['d4e4', 'e2g3', 'e4h4']);
  assert.deepEqual(keys(ex).slice(0, 2), ['capture_free', 'escape']);
  assert.equal(ex.reasons[0].text, 'לוקח את הרגלי ב-e4 בחינם: ללבן אין איך לקחת בחזרה.');
  assert.equal(ex.reasons[1].text, 'מוציא את המלכה מסכנה: ב-d4 היא הייתה מותקפת.');
});

await test('a back-rank mate threat that the move stops', () => {
  const fen = '3r2k1/5ppp/8/8/8/8/1B3PPP/6K1 w - - 0 1';
  const ex = explainBestMove(Chess, fen, ['h2h3', 'd8d2', 'b2c3']);
  assert.ok(texts(ex).includes('עוצר איום מט: שחור איים לשחק Rd1# ולתת מט.'), texts(ex).join(' | '));
});

await test('no claim without its fact: a quiet move gets the quiet sentence, never a capture or a threat', () => {
  const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const ex = explainBestMove(Chess, fen, ['g2g3', 'g7g6', 'f1g2']);
  assert.deepEqual(keys(ex), ['quiet']);
  for (const [fenX, uci] of [[KNIGHT_FORK, 'b5c7'], [BISHOP_FOR_ROOK, 'b4e1'], [QUEEN_ESCAPES, 'd4e4']]) {
    const e = explainBestMove(Chess, fenX, [uci]);
    for (const t of texts(e)) { assert.match(t, /[\u0590-\u05FF]/, 'Hebrew'); assert.doesNotMatch(t, /undefined|null|NaN/); }
  }
  assert.equal(explainBestMove(Chess, fen, ['e2e5']), null, 'an illegal first move gives no explanation');
});

await test('stepping the line: step 0 is the position before the move with its arrow; each step plays one move', () => {
  const ex = explainBestMove(Chess, KNIGHT_FORK, ['b5c7', 'e8d7', 'c7a8']);
  const v0 = coachBoardView(ex, 0);
  assert.equal(v0.fen, KNIGHT_FORK);
  assert.deepEqual(v0.arrows.map(a => [a.from, a.to, !!a.faded]), [['b5', 'c7', false]]);
  const v2 = coachBoardView(ex, 2);
  assert.equal(v2.fen, ex.steps[1].fenAfter);
  assert.deepEqual(v2.arrows.map(a => [a.from, a.to, !!a.faded]), [['e8', 'd7', true], ['c7', 'a8', false]]);
  assert.notEqual(v2.arrows[0].color, v2.arrows[1].color, 'white and black arrows differ');
  assert.equal(coachBoardView(ex, 99).fen, ex.steps[2].fenAfter, 'clamped at the end');
});

await test('COACH_EXPLAIN_ENABLED is off by default and on only for "true"', async () => {
  const flag = async (env, httpMethod = 'GET') => { const r = await createHandler({ env })({ httpMethod }); return [r.statusCode, JSON.parse(r.body).explain]; };
  assert.deepEqual(await flag({}), [200, false]);
  assert.deepEqual(await flag({ COACH_EXPLAIN_ENABLED: '1' }), [200, false]);
  assert.deepEqual(await flag({ COACH_EXPLAIN_ENABLED: 'TRUE' }), [200, true]);
  assert.equal((await flag({ COACH_EXPLAIN_ENABLED: 'true' }, 'POST'))[0], 405);
});

await test('game review wires the "why?" button behind the flag, next to the best-move button', () => {
  const main = readFileSync('src/main.ts', 'utf8');
  assert.match(main, /getJson\('\/api\/coach-flags'\)/);
  assert.match(main, /coachEnabled&&currentA\?\.bestUci&&h\('button',\{className:'coach-why'/);
  assert.match(main, /h\(CoachExplainPanel,/);
  assert.match(readFileSync('scripts/local-preview.mjs', 'utf8'), /name === 'coach-flags'/);
});

console.log(process.exitCode ? `FAIL: ${passed} passed` : `PASS: ${passed} coach-explain checks`);

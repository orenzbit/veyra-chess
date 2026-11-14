// Proves the "Analyze it yourself" score math (hand-computed cases plus an independent re-implementation over
// random inputs) and the endpoint's contract: off by default, signed-in only, answer key withheld until scoring.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  GRADED_CLASSES, MAX_DISTANCE, ScoreInputError, classDistance, headerElo, scoreAnalyzeYourself
} from '../netlify/functions/lib/analyze-yourself-score.mjs';
import { createHandler } from '../netlify/functions/analyze-yourself.mjs';
import { hashPgn } from '../netlify/functions/chess-dna.mjs';
import { MOVE_CLASS_KEYS } from '../src/move-class-style.ts';

const code = (fn) => { try { fn(); } catch (error) { assert.ok(error instanceof ScoreInputError, String(error)); return error.code; } return 'no error'; };
let checks = 0;
const ok = (label) => { checks++; console.log('PASS ' + label); };

// The graded ladder plus the two given classes are exactly the review's categories.
assert.deepEqual([...GRADED_CLASSES, 'book', 'forced'].sort(), [...MOVE_CLASS_KEYS].sort());
assert.equal(MAX_DISTANCE, 8);
ok('categories are the review categories (9 graded + book + forced)');

// Distance: known ranks, symmetry, identity, triangle inequality, bounds.
assert.equal(classDistance('best', 'best'), 0);
assert.equal(classDistance('great', 'best'), 1);
assert.equal(classDistance('brilliant', 'blunder'), 8);
assert.equal(classDistance('inaccuracy', 'mistake'), 1);
assert.equal(classDistance('mistake', 'blunder'), 2);
assert.equal(classDistance('miss', 'good'), 3);
for (const a of GRADED_CLASSES) for (const b of GRADED_CLASSES) {
  assert.equal(classDistance(a, b), classDistance(b, a));
  assert.equal(classDistance(a, b) === 0, a === b);
  assert.ok(classDistance(a, b) >= 0 && classDistance(a, b) <= MAX_DISTANCE);
  for (const c of GRADED_CLASSES) assert.ok(classDistance(a, c) <= classDistance(a, b) + classDistance(b, c));
}
assert.equal(code(() => classDistance('book', 'best')), 'bad_class');
ok('distance ladder: ranks, symmetry, identity, triangle inequality, bounds');

// Hand-computed game: 8 plies, 5 graded.
// best/best 0, inaccuracy vs mistake 1, blunder/blunder 0, best vs great 1, excellent vs good 1 => 2 correct, total 3.
const A = scoreAnalyzeYourself({
  actual: ['book', 'book', 'best', 'mistake', 'forced', 'blunder', 'great', 'good'],
  guesses: [null, null, 'best', 'inaccuracy', null, 'blunder', 'best', 'excellent'],
  eloGuess: { white: 1500, black: 1200 }, eloActual: { white: 1650, black: null }
});
assert.equal(A.gradedMoves, 5);
assert.equal(A.correct, 2);
assert.equal(A.accuracyPct, 40);
assert.equal(A.meanDistance, 0.6);
assert.equal(A.closenessPct, 92.5); // 100 * (1 - 3 / (5 * 8))
assert.deepEqual(A.perMove.map(m => m.graded ? m.distance : '-'), ['-', '-', 0, 1, '-', 0, 1, 1]);
assert.deepEqual(A.elo, { white: { guess: 1500, actual: 1650, error: 150 }, black: { guess: 1200, actual: null, error: null }, meanError: 150 });
ok('hand case A: 40.0% exact, 0.6 mean distance, 92.5% closeness, Elo error 150 (black unrated)');

const B = scoreAnalyzeYourself({ actual: ['best', 'good', 'blunder'], guesses: ['best', 'good', 'blunder'], eloGuess: { white: 800, black: 2900 }, eloActual: { white: 1000, black: 2500 } });
assert.deepEqual([B.accuracyPct, B.meanDistance, B.closenessPct, B.elo.white.error, B.elo.black.error, B.elo.meanError], [100, 0, 100, 200, 400, 300]);
ok('hand case B: all correct = 100% / 0 / 100%; Elo errors 200 and 400, mean 300');

const C = scoreAnalyzeYourself({ actual: ['brilliant'], guesses: ['blunder'], eloGuess: { white: 100, black: 3500 }, eloActual: { white: 100, black: 3500 } });
assert.deepEqual([C.accuracyPct, C.meanDistance, C.closenessPct, C.elo.meanError], [0, 8, 0, 0]);
ok('hand case C: worst guess = 0% / 8 / 0%; exact Elo at both bounds = error 0');

// Rounding: 3 graded, 1 correct, distances 1,1,0 => 33.3%, 0.67, 100*(1-2/24)=91.7.
const D = scoreAnalyzeYourself({ actual: ['good', 'mistake', 'miss'], guesses: ['excellent', 'miss', 'miss'], eloGuess: { white: 1234, black: 1234 }, eloActual: { white: null, black: null } });
assert.deepEqual([D.correct, D.accuracyPct, D.meanDistance, D.closenessPct, D.elo.meanError], [1, 33.3, 0.67, 91.7, null]);
ok('hand case D: rounding 33.3% / 0.67 / 91.7%; no ratings in PGN = Elo not scored');

// Bad input is refused, never scored as zero.
const base = { actual: ['best', 'book'], guesses: ['best', null], eloGuess: { white: 1500, black: 1500 }, eloActual: { white: 1500, black: 1500 } };
assert.equal(code(() => scoreAnalyzeYourself({ ...base, guesses: ['best'] })), 'bad_guesses');
assert.equal(code(() => scoreAnalyzeYourself({ ...base, guesses: [null, null] })), 'missing_guess');
assert.equal(code(() => scoreAnalyzeYourself({ ...base, guesses: ['book', null] })), 'missing_guess');
assert.equal(code(() => scoreAnalyzeYourself({ ...base, eloGuess: { white: 99, black: 1500 } })), 'bad_elo_guess');
assert.equal(code(() => scoreAnalyzeYourself({ ...base, eloGuess: { white: 1500.5, black: 1500 } })), 'bad_elo_guess');
assert.equal(code(() => scoreAnalyzeYourself({ ...base, eloGuess: { white: 1500 } })), 'bad_elo_guess');
assert.equal(code(() => scoreAnalyzeYourself({ ...base, eloGuess: { white: '1500', black: 1500 } })), 'bad_elo_guess');
assert.equal(code(() => scoreAnalyzeYourself({ ...base, actual: ['best', 'bestt'] })), 'bad_actual');
assert.equal(code(() => scoreAnalyzeYourself({ ...base, actual: ['best', ''] })), 'bad_actual');
const onlyGiven = scoreAnalyzeYourself({ ...base, actual: ['book', 'forced'], guesses: [null, null] });
assert.deepEqual([onlyGiven.gradedMoves, onlyGiven.accuracyPct, onlyGiven.meanDistance, onlyGiven.closenessPct], [0, null, null, null]);
ok('bad input refused (length, missing/given-class guess, unknown stored class, Elo out of range/non-integer/missing); no graded moves = null, not 0');

assert.deepEqual(['1520', ' 800 ', '?', '', '0', '-5', '15.5', '1e3', '0x10', '01500', undefined].map(headerElo), [1520, 800, null, null, null, null, null, null, null, null, null]);
ok('PGN header ratings: plain digits kept; "?", empty, 0, negative, fractional, exponent/hex, leading zero = no rating');

// Independent re-implementation over 2,000 random games (deterministic seed). Halves round up: 51/80 = 63.75% -> 63.8.
assert.equal(scoreAnalyzeYourself({ actual: Array(80).fill('best'), guesses: Array(80).fill('best').map((g, i) => i < 51 ? g : 'good'), eloGuess: { white: 1000, black: 1000 }, eloActual: {} }).accuracyPct, 63.8);
let seed = 42;
const rnd = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
const RANK = { brilliant: 0, great: 1, best: 2, excellent: 3, good: 4, inaccuracy: 5, mistake: 6, miss: 7, blunder: 8 };
const ALL = [...Object.keys(RANK), 'book', 'forced'];
for (let game = 0; game < 2000; game++) {
  const n = 1 + rnd(120);
  const actual = Array.from({ length: n }, () => ALL[rnd(ALL.length)]);
  const guesses = actual.map(cls => cls in RANK ? Object.keys(RANK)[rnd(9)] : null);
  const elo = { white: 100 + rnd(3401), black: 100 + rnd(3401) };
  const truth = { white: rnd(4) ? 100 + rnd(3000) : null, black: rnd(4) ? 100 + rnd(3000) : null };
  const got = scoreAnalyzeYourself({ actual, guesses, eloGuess: elo, eloActual: truth });
  let graded = 0, hit = 0, dist = 0;
  actual.forEach((cls, i) => { if (!(cls in RANK)) return; graded++; const d = Math.abs(RANK[cls] - RANK[guesses[i]]); dist += d; if (!d) hit++; });
  assert.equal(got.gradedMoves, graded);
  assert.equal(got.correct, hit);
  if (graded) {
    assert.equal(got.accuracyPct, Math.round(1000 * hit / graded) / 10);
    assert.equal(got.meanDistance, Math.round(100 * dist / graded) / 100);
    assert.equal(got.closenessPct, Math.round(1000 * (1 - dist / (8 * graded))) / 10);
  } else assert.equal(got.accuracyPct, null);
  const errs = ['white', 'black'].filter(s => truth[s] !== null).map(s => Math.abs(elo[s] - truth[s]));
  assert.equal(got.elo.meanError, errs.length ? Math.round(10 * errs.reduce((a, b) => a + b, 0) / errs.length) / 10 : null);
}
ok('2,000 random games: score equals an independent re-implementation');

// ---- Endpoint contract (fake session + fake database, no network) ----
const PGN = '[Event "Test"]\n[White "A"]\n[Black "B"]\n[WhiteElo "1650"]\n[BlackElo "?"]\n\n1. e4 e5 2. Ke2 Qh4 3. Ke1 Qxe4+ 4. Qe2 *';
const FP = hashPgn(PGN);
assert.equal(FP, createHash('sha256').update(PGN.split('\n').map(l => l.trim()).filter(Boolean).join('\n')).digest('hex'));
const STORED = ['book', 'book', 'blunder', 'great', 'mistake', 'best', 'forced'];
const row = { fingerprint: FP, game_json: { date: '2026-10-01', timeClass: 'blitz', playerColor: 'white', plies: 7,
  analysis: { summary: { whiteAcc: 41.2, blackAcc: 77.7 }, moves: STORED.map((classification, index) => ({ index, classification, whiteChanceBefore: 50, whiteChanceAfter: 12.3, cpLoss: 7 })) } } };
const calls = [];
// Answers like PostgREST: the list's JSON projection returns only the projected fields.
const project = (r, path) => path.includes('select=fingerprint,game_json') ? r
  : { fingerprint: r.fingerprint, date: r.game_json.date, timeClass: r.game_json.timeClass, playerColor: r.game_json.playerColor, plies: r.game_json.plies };
const db = async (path) => { calls.push(path); assert.ok(path.includes('user_id=eq.u1'), 'every read is scoped to the caller'); return path.includes(FP) ? [project(row, path)] : []; };
const ON = { ANALYZE_YOURSELF_ENABLED: 'true' };
const signedIn = () => ({ user_id: 'u1' });
const ev = (method, extra = {}) => ({ httpMethod: method, headers: { origin: 'https://app.test' }, rawUrl: 'https://app.test/api/analyze-yourself', ...extra });
const call = async (handler, event) => { const r = await handler(event); return { status: r.statusCode, body: JSON.parse(r.body), raw: r.body }; };

let r = await call(createHandler({ env: {}, db, session: signedIn }), ev('GET', { queryStringParameters: { action: 'list', fingerprints: FP } }));
assert.deepEqual([r.status, r.body.error], [404, 'DISABLED']);
r = await call(createHandler({ env: { ANALYZE_YOURSELF_ENABLED: '1' }, db, session: signedIn }), ev('GET', { queryStringParameters: { action: 'list', fingerprints: FP } }));
assert.deepEqual([r.status, r.body.error], [404, 'DISABLED']);
ok('flag: off unless ANALYZE_YOURSELF_ENABLED=true');

const on = createHandler({ env: ON, db, session: signedIn });
r = await call(createHandler({ env: ON, db, session: () => null }), ev('GET', { queryStringParameters: { action: 'list', fingerprints: FP } }));
assert.deepEqual([r.status, r.body.error], [401, 'UNAUTHENTICATED']);
r = await call(on, ev('POST', { headers: { origin: 'https://evil.test' }, body: JSON.stringify({ action: 'start', fingerprint: FP, pgn: PGN }) }));
assert.equal(r.status, 403);
ok('signed-in only; cross-origin POST refused');

r = await call(on, ev('GET', { queryStringParameters: { action: 'list', fingerprints: FP + ',' + 'a'.repeat(64) } }));
assert.equal(r.status, 200);
assert.deepEqual(r.body.games, [{ fingerprint: FP, date: '2026-10-01', timeClass: 'blitz', playerColor: 'white', plies: 7 }]);
assert.ok(calls.at(-1).includes('select=fingerprint,date:game_json->>date,') && !calls.at(-1).includes('select=fingerprint,game_json'), 'list does not read the stored analysis');
for (const leak of ['classification', 'Chance', 'Acc', 'cpLoss', 'blunder', 'great']) assert.ok(!r.raw.includes(leak), 'list leaks ' + leak);
r = await call(on, ev('GET', { queryStringParameters: { action: 'list', fingerprints: 'nothex' } }));
assert.deepEqual([r.status, r.body.error], [400, 'bad_fingerprints']);
ok('list: only analyzed games, no classification/chance/accuracy in the response');

r = await call(on, ev('POST', { body: JSON.stringify({ action: 'start', fingerprint: FP, pgn: PGN }) }));
assert.equal(r.status, 200);
assert.deepEqual(r.body.moves.map(m => m.given), ['book', 'book', null, null, null, null, 'forced']);
assert.deepEqual(r.body.moves.map(m => m.graded), [false, false, true, true, true, true, false]);
for (const leak of ['blunder', 'great', 'mistake', 'best', 'Chance', 'Acc', 'cpLoss']) assert.ok(!r.raw.includes(leak), 'start leaks ' + leak);
ok('start: book/forced given, graded moves carry no answer, no engine numbers');

r = await call(on, ev('POST', { body: JSON.stringify({ action: 'start', fingerprint: FP, pgn: PGN + ' ' }) }));
assert.deepEqual([r.status, r.body.error], [200, undefined], 'trailing whitespace normalizes like Chess DNA');
r = await call(on, ev('POST', { body: JSON.stringify({ action: 'start', fingerprint: FP, pgn: PGN.replace('Qe2', 'Qf3') }) }));
assert.deepEqual([r.status, r.body.error], [400, 'bad_game_identity']);
r = await call(on, ev('POST', { body: JSON.stringify({ action: 'start', fingerprint: 'b'.repeat(64), pgn: PGN }) }));
assert.deepEqual([r.status, r.body.error], [400, 'bad_game_identity']);
const other = '[Event "x"]\n\n1. d4 *';
r = await call(on, ev('POST', { body: JSON.stringify({ action: 'start', fingerprint: hashPgn(other), pgn: other }) }));
assert.deepEqual([r.status, r.body.error], [404, 'not_analyzed']);
ok('start: PGN must hash to the fingerprint; unknown game = not_analyzed');

const guesses = [null, null, 'mistake', 'best', 'mistake', 'best', null];
r = await call(on, ev('POST', { body: JSON.stringify({ action: 'score', fingerprint: FP, pgn: PGN, guesses, eloGuess: { white: 1500, black: 1300 } }) }));
assert.equal(r.status, 200);
// blunder vs mistake 2, great vs best 1, mistake 0, best 0 => 2/4, distance 3/4 = 0.75, closeness 100*(1-3/32) = 90.6
assert.deepEqual([r.body.score.correct, r.body.score.accuracyPct, r.body.score.meanDistance, r.body.score.closenessPct], [2, 50, 0.75, 90.6]);
assert.deepEqual(r.body.score.elo, { white: { guess: 1500, actual: 1650, error: 150 }, black: { guess: 1300, actual: null, error: null }, meanError: 150 });
assert.deepEqual(r.body.score.perMove.map(m => m.actual), STORED);
ok('score: server uses the stored classifications and the PGN ratings (2/4, 0.75, 90.6%, Elo error 150)');

r = await call(on, ev('POST', { body: JSON.stringify({ action: 'score', fingerprint: FP, pgn: PGN, guesses: guesses.slice(0, 6), eloGuess: { white: 1500, black: 1300 } }) }));
assert.deepEqual([r.status, r.body.error], [400, 'bad_guesses']);
r = await call(on, ev('POST', { body: JSON.stringify({ action: 'score', fingerprint: FP, pgn: PGN, guesses, eloGuess: { white: 5000, black: 1300 } }) }));
assert.deepEqual([r.status, r.body.error], [400, 'bad_elo_guess']);
const mismatched = createHandler({ env: ON, db: async () => [{ ...row, game_json: { ...row.game_json, plies: 6 } }], session: signedIn });
r = await call(mismatched, ev('POST', { body: JSON.stringify({ action: 'start', fingerprint: FP, pgn: PGN }) }));
assert.deepEqual([r.status, r.body.error], [409, 'analysis_mismatch']);
const corrupt = createHandler({ env: ON, db: async () => [{ ...row, game_json: { ...row.game_json, analysis: { ...row.game_json.analysis, moves: row.game_json.analysis.moves.map((m, i) => i === 3 ? { ...m, classification: 'greatt' } : m) } } }], session: signedIn });
r = await call(corrupt, ev('POST', { body: JSON.stringify({ action: 'start', fingerprint: FP, pgn: PGN }) }));
assert.deepEqual([r.status, r.body.error], [409, 'analysis_mismatch']);
ok('score: bad guesses/Elo refused with 400; stored analysis of another length or with an unknown class refused with 409');

assert.ok(calls.every(path => path.includes('engine_version=eq.') && path.includes('analysis_schema_version=eq.')));
ok('reads only the current Chess DNA engine/schema version');
console.log('analyze-yourself: ' + checks + ' checks passed');

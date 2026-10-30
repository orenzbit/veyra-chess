// Job runner tests: real engine + recorded games served through a fake Chess.com + in-memory fake Supabase.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const lib = (n) => import(pathToFileURL(join(root, 'netlify/functions/lib', n)).href);
const { createFakeSupabase } = await import(pathToFileURL(join(root, 'scripts/lib/fake-supabase.mjs')).href);
const J = await lib('puzzle-jobs.mjs');
const { store } = await lib('puzzle-store.mjs');
const { loadEngine } = await lib('engine-node.mjs');
const C = await lib('puzzle-config.mjs');
const engine = await loadEngine();

const U = '11111111-1111-1111-1111-111111111111';
const names = ['blunder_white', 'blunder_black', 'blunder_time', 'clean'];
const pgns = {};
for (const n of names) pgns[n] = await readFile(join(root, 'scripts/fixtures/puzzles', n + '.pgn'), 'utf8');
const gameList = names.map((n, i) => ({ url: 'https://www.chess.com/game/live/' + n, end_time: 1790000000 - i * 100, pgn: pgns[n] }));
const fakeChessCom = (opts = {}) => async (url) => {
  if (opts.status) return { ok: false, status: opts.status, json: async () => ({}), text: async () => '' };
  const body = url.endsWith('/games/archives') ? { archives: ['https://api.chess.com/pub/player/oren/games/2026/10'] } : { games: gameList };
  return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) };
};
const freshDb = () => {
  const db = createFakeSupabase();
  db.seed('user_app_state', [{ user_id: U, data: { usernames: { chesscom: 'Oren', lichess: '' } } }]);
  return db;
};
const clockFromEngine = (base = 1790000000000) => () => base + engine.searches * 100;

// ---- pure helpers
assert.deepEqual(J.normalizeJobParams({ source: 'x', limit: 999 }), { source: 'auto', limit: C.MAX_DNA_GAMES });
assert.deepEqual(J.normalizeJobParams({ source: 'lichess', limit: 5 }), { source: 'lichess', limit: 5 });
assert.deepEqual(J.providerPlan('auto', { chesscom: 'a', lichess: 'b' }), ['chesscom', 'lichess']);
assert.deepEqual(J.providerPlan('auto', { chesscom: '', lichess: '' }), ['saved']);
assert.deepEqual(J.providerPlan('lichess', { chesscom: 'a', lichess: '' }), []);
const mkP = (n, extra = {}) => ({ fen: `fen${n} w - -  0 1`, status: 'active', updatedAt: '2026-01-0' + (n % 9 + 1), rowId: 'r' + n, ...extra });
let plan = J.planInsert([mkP(1), mkP(2)], [{ fen: mkP(1).fen }, { fen: mkP(3).fen }, { fen: mkP(3).fen }], 150);
assert.deepEqual(plan.toInsert.map((p) => p.fen), [mkP(3).fen], 'dedupe against pool and within the batch');
plan = J.planInsert([mkP(1), mkP(2, { status: 'mastered' }), mkP(3, { status: 'mastered', updatedAt: '2025-01-01' })], [{ fen: 'new1 w' }, { fen: 'new2 w' }], 3);
assert.deepEqual(plan.toEvict.map((p) => p.rowId), ['r3', 'r2'], 'evict oldest mastered first');
assert.equal(plan.toInsert.length, 2);
plan = J.planInsert([mkP(1), mkP(2), mkP(3)], [{ fen: 'new1 w' }], 3);
assert.equal(plan.toInsert.length, 0, 'full pool of active puzzles: nothing is evicted, the new one waits');
assert.equal(plan.skippedFull, 1);
plan = J.planInsert([mkP(1), mkP(2, { status: 'retired' })], [{ fen: 'new1 w' }], 2);
assert.equal(plan.toInsert.length, 1, 'retired puzzles do not count against the cap');

// ---- A: full run
const dbA = freshDb();
const jobA = await store.createJob(dbA, U, 'dna', { source: 'auto', limit: 2 });
await assert.rejects(store.createJob(dbA, U, 'dna', { source: 'auto', limit: 2 }), (e) => e.status === 409, 'one active job per user');
const resA = await J.runJob({ db: dbA, engine, fetchImpl: fakeChessCom(), userId: U, jobId: jobA.id });
assert.equal(resA.outcome, 'done');
assert.equal(resA.progress.gamesDone, 2);
const puzA = dbA.rows('user_puzzles').map((r) => ({ ...r }));
assert.ok(puzA.length >= 2, 'two games with an injected blunder give at least two puzzles, got ' + puzA.length);
assert.equal(dbA.rows('puzzle_game_log').length, 2);
assert.equal(dbA.rows('puzzle_jobs')[0].status, 'done');
assert.equal(dbA.rows('puzzle_jobs')[0].lease_until, null);
assert.ok(resA.report.searches > 20 && resA.report.avgSearchMs >= 0 && resA.report.puzzlesPerGame > 0);
assert.equal(dbA.rows('user_puzzle_state')[0].cursors.chesscom, undefined, 'a page cut short by the limit is re-read, so the cursor does not move');
assert.equal(dbA.rows('user_puzzle_state')[0].counters.gamesAnalyzedToday, 2);
for (const r of puzA) assert.ok(r.accepted.includes(r.solution[0]) && r.user_id === U);

// ---- B: finished job cannot be claimed again; a new job re-reads and finds everything analysed
assert.equal((await J.runJob({ db: dbA, engine, fetchImpl: fakeChessCom(), userId: U, jobId: jobA.id })).outcome, 'not_claimed');
const jobA2 = await store.createJob(dbA, U, 'refill', { source: 'auto', limit: 2 });
const resA2 = await J.runJob({ db: dbA, engine, fetchImpl: fakeChessCom(), userId: U, jobId: jobA2.id });
assert.equal(resA2.progress.gamesDone, 2, 'continues with the next two games (3rd and 4th)');
assert.equal(dbA.rows('puzzle_game_log').length, 4);
const idsAfterTwo = dbA.rows('user_puzzles').map((r) => r.puzzle_id);
assert.equal(new Set(idsAfterTwo).size, idsAfterTwo.length, 'no duplicate puzzle ids');
const jobA3 = await store.createJob(dbA, U, 'refill', { source: 'auto', limit: 5 });
const resA3 = await J.runJob({ db: dbA, engine, fetchImpl: fakeChessCom(), userId: U, jobId: jobA3.id });
assert.equal(resA3.outcome, 'done');
assert.equal(resA3.progress.gamesDone, 0, 'nothing new to analyse');
assert.equal(dbA.rows('user_puzzles').length, idsAfterTwo.length);
assert.equal(dbA.rows('user_puzzle_state')[0].cursors.chesscom.exhausted, true, 'fully read page moves the cursor and marks the provider exhausted');

// ---- C: pause mid-game by time budget, then resume: same puzzles as the uninterrupted run
const dbC = freshDb();
const jobC = await store.createJob(dbC, U, 'dna', { source: 'auto', limit: 2 });
const t0 = engine.searches;
const pausedRes = await J.runJob({ db: dbC, engine, fetchImpl: fakeChessCom(), userId: U, jobId: jobC.id, now: () => 1790000000000 + (engine.searches - t0) * 100, budgetMs: 1500 });
assert.equal(pausedRes.outcome, 'paused');
assert.equal(dbC.rows('puzzle_jobs')[0].status, 'queued');
assert.equal(dbC.rows('puzzle_jobs')[0].lease_until, null);
assert.equal(dbC.rows('puzzle_game_log').length, 0, 'a game cut short is not logged');
const resumed = await J.runJob({ db: dbC, engine, fetchImpl: fakeChessCom(), userId: U, jobId: jobC.id });
assert.equal(resumed.outcome, 'done');
assert.deepEqual(dbC.rows('user_puzzles').map((r) => r.puzzle_id).sort(), puzA.map((r) => r.puzzle_id).sort(), 'resume gives the same puzzles as an uninterrupted run');
assert.ok(resumed.report.wallMs >= pausedRes.report.wallMs, 'report accumulates across calls');

// ---- D: two parallel starts: only one runs
const dbD = freshDb();
const jobD = await store.createJob(dbD, U, 'dna', { source: 'auto', limit: 1 });
const both = await Promise.all([
  J.runJob({ db: dbD, engine, fetchImpl: fakeChessCom(), userId: U, jobId: jobD.id }),
  J.runJob({ db: dbD, engine, fetchImpl: fakeChessCom(), userId: U, jobId: jobD.id }),
]);
assert.deepEqual(both.map((r) => r.outcome).sort(), ['done', 'not_claimed']);
assert.equal(dbD.rows('puzzle_game_log').length, 1);

// ---- E: crashed worker (lease expired) can be taken over; a live lease cannot
const dbE = freshDb();
const jobE = await store.createJob(dbE, U, 'dna', { source: 'auto', limit: 1 });
dbE.rows('puzzle_jobs')[0].status = 'running';
dbE.rows('puzzle_jobs')[0].lease_until = new Date(Date.now() + 600000).toISOString();
assert.equal((await J.runJob({ db: dbE, engine, fetchImpl: fakeChessCom(), userId: U, jobId: jobE.id })).outcome, 'not_claimed');
dbE.rows('puzzle_jobs')[0].lease_until = new Date(Date.now() - 1000).toISOString();
assert.equal((await J.runJob({ db: dbE, engine, fetchImpl: fakeChessCom(), userId: U, jobId: jobE.id })).outcome, 'done');
// someone else's job id is never claimable
const dbE2 = freshDb();
const jobE2 = await store.createJob(dbE2, U, 'dna', { source: 'auto', limit: 1 });
assert.equal((await J.runJob({ db: dbE2, engine, fetchImpl: fakeChessCom(), userId: '22222222-2222-2222-2222-222222222222', jobId: jobE2.id })).outcome, 'not_claimed');

// ---- F: daily cap, provider rate limit, unknown user, engine failure
const dbF = freshDb();
dbF.seed('user_puzzle_state', [{ user_id: U, counters: { dayKey: new Date().toISOString().slice(0, 10), gamesAnalyzedToday: C.DAILY_GAMES_CAP } }]);
const jobF = await store.createJob(dbF, U, 'dna', { source: 'auto', limit: 2 });
const capRes = await J.runJob({ db: dbF, engine, fetchImpl: fakeChessCom(), userId: U, jobId: jobF.id });
assert.equal(capRes.outcome, 'paused');
assert.equal(dbF.rows('puzzle_jobs')[0].error, 'daily_cap');
assert.equal(dbF.rows('puzzle_game_log').length, 0);

const dbG = freshDb();
const jobG = await store.createJob(dbG, U, 'dna', { source: 'auto', limit: 2 });
const rl = await J.runJob({ db: dbG, engine, fetchImpl: fakeChessCom({ status: 429 }), userId: U, jobId: jobG.id });
assert.equal(rl.outcome, 'paused');
assert.equal(dbG.rows('puzzle_jobs')[0].error, 'rate_limited');

const dbH = freshDb();
const jobH = await store.createJob(dbH, U, 'dna', { source: 'auto', limit: 2 });
const nf = await J.runJob({ db: dbH, engine, fetchImpl: fakeChessCom({ status: 404 }), userId: U, jobId: jobH.id });
assert.equal(nf.outcome, 'done');
assert.ok(nf.report.warnings.includes('chesscom:not_found'));

const dbI = freshDb();
const jobI = await store.createJob(dbI, U, 'dna', { source: 'auto', limit: 1 });
const boom = await J.runJob({ db: dbI, engine: { searches: 0, searchMs: 0, search() { throw new Error('engine exploded'); } }, fetchImpl: fakeChessCom(), userId: U, jobId: jobI.id });
assert.equal(boom.outcome, 'failed');
assert.equal(dbI.rows('puzzle_jobs')[0].status, 'failed');
assert.match(dbI.rows('puzzle_jobs')[0].error, /engine exploded/);
assert.equal(dbI.rows('puzzle_jobs')[0].lease_until, null);
// a failed job frees the user to start another
assert.ok(await store.createJob(dbI, U, 'dna', { source: 'auto', limit: 1 }));

// ---- no usernames: falls back to saved games and needs usernames to resolve colour => nothing analysable
const dbJ = createFakeSupabase();
const jobJ = await store.createJob(dbJ, U, 'dna', { source: 'auto', limit: 1 });
const none = await J.runJob({ db: dbJ, engine, fetchImpl: fakeChessCom(), userId: U, jobId: jobJ.id });
assert.equal(none.outcome, 'done');
assert.equal(none.progress.gamesDone, 0);

console.log(`PASS: puzzle job runner (full run, resume after pause, no duplicates, parallel start, lease takeover, caps, errors). ${puzA.length} puzzles from 2 games.`);

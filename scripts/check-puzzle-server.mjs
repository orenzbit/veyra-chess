// API tests for /api/puzzles and the background function entry, with injected session, flag and fake Supabase.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const fn = (p) => import(pathToFileURL(join(root, 'netlify/functions', p)).href);
const { createFakeSupabase } = await import(pathToFileURL(join(root, 'scripts/lib/fake-supabase.mjs')).href);
const { createHandler } = await fn('puzzles.mjs');
const bg = await fn('puzzle-refill-background.mjs');
const { loadSeeds } = await fn('lib/puzzle-kits.mjs');
const C = await fn('lib/puzzle-config.mjs');
const seeds = await loadSeeds();
assert.equal(seeds.length, 24);

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ORIGIN = 'https://veyra.test';
const NOW = Date.parse('2026-10-18T12:00:00Z');
const uuid = () => crypto.randomUUID();
const ENV = { PUZZLES_SERVER_ENABLED: '1' };

function setup(overrides = {}) {
  const db = createFakeSupabase();
  const handler = createHandler({
    db, now: () => overrides.now?.() ?? NOW, env: overrides.env || ENV, loadSeeds: async () => seeds,
    currentSession: (e) => (e.headers['x-test-user'] ? { user_id: e.headers['x-test-user'] } : null),
  });
  const call = async (method, action, { body, user = A, headers = {}, query = {} } = {}) => {
    const event = {
      httpMethod: method, queryStringParameters: { action, ...query }, rawUrl: `${ORIGIN}/api/puzzles?action=${action}`,
      headers: { origin: ORIGIN, ...(user ? { 'x-test-user': user } : {}), ...headers }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    };
    const res = await handler(event);
    return { status: res.statusCode, body: JSON.parse(res.body), headers: res.headers };
  };
  return { db, handler, call };
}
const seedRows = (userId, n = 20) => seeds.slice(0, n).map((s, i) => ({
  user_id: userId, puzzle_id: s.id, fen: s.fen, solution: s.solution, accepted: s.accepted, played: 'a2a3', motif: s.motif, phase: 'middlegame',
  class: 'mistake', severity: 0.3, rating: 600 + i * 10, origin: 'harvest', source: { gameKey: 'g' + (i % 7), provider: 'chesscom' }, stats: { shown: 0, solved: 0, fails: 0, streak: 0 },
  next_due: '2026-10-01T00:00:00.000Z', status: 'active', engine_version: 1,
}));
const att = (puzzle, solved = true, extra = {}) => ({ id: uuid(), puzzleId: puzzle.id, solved, ms: 4200, move: solved ? puzzle.solution[0] : (puzzle.solution[0] === 'a1a2' ? 'h1h2' : 'a1a2'), viaAlt: false, at: new Date(NOW - 5000).toISOString(), ...extra });
const cp = (attempts, extra = {}) => ({ sessionId: 's1', mode: 'regular', kitIds: {}, attempts, final: false, ...extra });

// ================= access control
{
  const { call } = setup();
  assert.equal((await call('GET', 'state', { user: null })).status, 401);
  assert.equal((await call('GET', 'state', { headers: { origin: 'https://evil.test' } })).status, 403);
  assert.equal((await call('POST', 'checkpoint', { body: cp([]), headers: { origin: '' } })).status, 403, 'POST without Origin/Referer is rejected');
  assert.equal((await call('PUT', 'state')).status, 405);
  assert.equal((await call('GET', 'nope')).status, 400);
  assert.equal((await call('POST', 'checkpoint', { body: '{bad json' })).status, 400);
  assert.equal((await call('POST', 'checkpoint', { body: 'x'.repeat(C.MAX_BODY_BYTES + 1) })).status, 413);
  const ok = await call('GET', 'state');
  assert.equal(ok.status, 200);
  assert.equal(ok.headers['cache-control'], 'no-store');
  assert.match(ok.headers['content-type'], /application\/json/);
}
{
  const off = setup({ env: {} });
  const r = await off.call('GET', 'state');
  assert.equal(r.status, 404); assert.equal(r.body.error, 'DISABLED');
  const listed = setup({ env: { PUZZLES_SERVER_ENABLED: '1', PUZZLES_ALLOWLIST: B } });
  assert.equal((await listed.call('GET', 'state', { user: A })).body.error, 'DISABLED');
  assert.equal((await listed.call('GET', 'state', { user: B })).status, 200);
  assert.equal(off.db.log.length, 0, 'a disabled feature never touches the database');
}
{
  const rl = setup();
  let last;
  for (let i = 0; i < C.RATE_LIMIT_PER_MIN + 1; i += 1) last = await rl.call('GET', 'state', { user: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' });
  assert.equal(last.status, 429);
  assert.equal(last.headers['retry-after'], '60');
}

// ================= brand new user: seed kits, no refill, no job
{
  const { call, db } = setup();
  const r = await call('GET', 'state');
  assert.equal(r.status, 200);
  assert.equal(r.body.pool.total, 0);
  assert.equal(r.body.kits.regular.puzzles.length, C.KIT_REGULAR);
  assert.equal(r.body.kits.rush.puzzles.length, 24, 'only 24 seeds exist, so the rush kit is as full as it can be');
  assert.ok(r.body.kits.regular.puzzles.every((p) => p.origin === 'seed' && p.accepted.length >= 1));
  assert.equal(r.body.refillNeeded, false, 'no background analysis before the user ran DNA once');
  assert.equal(r.body.job, null);
  const again = await call('GET', 'state');
  assert.equal(again.body.kits.regular.id, r.body.kits.regular.id, 'the kit is stable between opens');
  assert.equal(db.rows('user_puzzle_state').length, 1);
  // seed attempts count but have no stored puzzle to schedule
  const p = r.body.kits.regular.puzzles[0];
  const post = await call('POST', 'checkpoint', { body: cp([att(p)]) });
  assert.equal(post.body.accepted, 1);
  assert.equal(db.rows('user_puzzles').length, 0);
  assert.equal(db.rows('puzzle_attempts').length, 1);
}

// ================= checkpoint: validation, integrity, idempotency, spaced repetition
{
  const { call, db } = setup();
  db.seed('user_puzzles', seedRows(A));
  db.seed('user_puzzles', seedRows(B, 3).map((r) => ({ ...r, puzzle_id: 'bbbbbbbbbbbbbbb' + r.puzzle_id.slice(-1) })));
  const s = seeds[0];
  const bad = async (mut, field) => {
    const a = att(s); mut(a);
    const r = await call('POST', 'checkpoint', { body: cp([a]) });
    assert.equal(r.status, 400, field); assert.equal(r.body.field, field);
  };
  await bad((a) => { a.id = 'nope'; }, 'attempts[0].id');
  await bad((a) => { a.puzzleId = 'xyz'; }, 'attempts[0].puzzleId');
  await bad((a) => { a.solved = 'yes'; }, 'attempts[0].solved');
  await bad((a) => { a.ms = -1; }, 'attempts[0].ms');
  await bad((a) => { a.ms = 999999; }, 'attempts[0].ms');
  await bad((a) => { a.move = 'e2e9'; }, 'attempts[0].move');
  await bad((a) => { a.at = new Date(NOW + 2 * 864e5).toISOString(); }, 'attempts[0].at'); // beyond the one-day sanity bound
  assert.equal((await call('POST', 'checkpoint', { body: cp(Array.from({ length: 101 }, () => att(s))) })).status, 400);
  assert.equal((await call('POST', 'checkpoint', { body: { ...cp([]), mode: 'x' } })).status, 400);
  const dup = att(s);
  assert.equal((await call('POST', 'checkpoint', { body: cp([dup, { ...dup }]) })).status, 400, 'same attempt id twice in one batch');

  // wrong claim of success: move is wrong but marked solved
  const liar = att(s, true, { move: 'a1a2' });
  const lie = await call('POST', 'checkpoint', { body: cp([liar]) });
  assert.deepEqual(lie.body.rejected, [{ id: liar.id, reason: 'solved_mismatch' }]);
  // another user's puzzle (not a seed) is unknown
  const foreign = await call('POST', 'checkpoint', { body: cp([att({ id: 'bbbbbbbbbbbbbbb0', solution: ['e2e4'] })]) });
  assert.equal(foreign.body.rejected[0].reason, 'unknown_puzzle');

  // success: schedule +3 days (first solve), stats updated, profile elo moved
  const a1 = att(s, true);
  const first = await call('POST', 'checkpoint', { body: cp([a1]) });
  assert.equal(first.body.accepted, 1); assert.equal(first.body.duplicates, 0);
  let row = db.rows('user_puzzles').find((r) => r.user_id === A && r.puzzle_id === s.id);
  assert.equal(row.stats.shown, 1); assert.equal(row.stats.streak, 1);
  assert.equal(Date.parse(row.next_due) - Date.parse(a1.at), 3 * 864e5);
  const elo1 = db.rows('user_puzzle_state')[0].profile.puzzleElo;
  assert.ok(elo1 > 800);
  // resend: nothing changes
  const resend = await call('POST', 'checkpoint', { body: cp([a1]) });
  assert.equal(resend.body.accepted, 0); assert.equal(resend.body.duplicates, 1);
  row = db.rows('user_puzzles').find((r) => r.user_id === A && r.puzzle_id === s.id);
  assert.equal(row.stats.shown, 1, 'a re-sent attempt is not counted twice');
  assert.equal(db.rows('user_puzzle_state')[0].profile.puzzleElo, elo1);
  // wrong answer resets streak, due tomorrow
  const a2 = att(s, false, { at: new Date(NOW - 1000).toISOString() });
  await call('POST', 'checkpoint', { body: cp([a2]) });
  row = db.rows('user_puzzles').find((r) => r.user_id === A && r.puzzle_id === s.id);
  assert.equal(row.stats.streak, 0); assert.equal(row.stats.fails, 1);
  assert.equal(Date.parse(row.next_due) - Date.parse(a2.at), 864e5);
  // five correct in a row => mastered; attempts are applied in time order even if sent shuffled
  const t = seeds[1];
  const five = [0, 1, 2, 3, 4].map((i) => att(t, true, { at: new Date(NOW - 60000 + i * 1000).toISOString() }));
  await call('POST', 'checkpoint', { body: cp([five[3], five[0], five[4], five[2], five[1]]) });
  row = db.rows('user_puzzles').find((r) => r.user_id === A && r.puzzle_id === t.id);
  assert.equal(row.status, 'mastered'); assert.equal(row.stats.shown, 5);
  // two devices at once on the same puzzle: nothing lost
  const u = seeds[2];
  const [r1, r2] = await Promise.all([
    call('POST', 'checkpoint', { body: cp([att(u, true, { at: new Date(NOW - 3000).toISOString() })]) }),
    call('POST', 'checkpoint', { body: cp([att(u, true, { at: new Date(NOW - 2000).toISOString() })]) }),
  ]);
  assert.equal(r1.body.accepted + r2.body.accepted, 2);
  row = db.rows('user_puzzles').find((r) => r.user_id === A && r.puzzle_id === u.id);
  assert.equal(row.stats.shown, 2, 'optimistic lock keeps both updates');
  // user B's data was never touched
  assert.ok(db.rows('user_puzzles').filter((r) => r.user_id === B).every((r) => r.stats.shown === 0));
  // mate in one accepted even when not listed
  const mateFen = '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1';
  const { moveSolves } = await fn('lib/puzzle-service.mjs');
  assert.equal(moveSolves({ fen: mateFen, solution: ['a1a8'], accepted: ['a1a8'] }, 'a1a8'), true);
  assert.equal(moveSolves({ fen: mateFen, solution: ['g1f1'], accepted: ['g1f1'] }, 'a1a8'), true, 'any mating move counts');
  assert.equal(moveSolves({ fen: mateFen, solution: ['a1a8'], accepted: ['a1a8'] }, 'a1a2'), false);
  assert.equal(moveSolves({ fen: mateFen, solution: ['a1a8'], accepted: ['a1a8'] }, 'zzzz'), false);
}

// ================= device clock skew: a fast clock is clamped, an old item is reported per item, the rest of the batch is kept
{
  const { call, db } = setup();
  db.seed('user_puzzles', seedRows(A));
  const future = att(seeds[0], true, { at: new Date(NOW + 30 * 60e3).toISOString() });
  const stale = att(seeds[0], true, { at: new Date(NOW - 8 * 864e5).toISOString() });
  const fresh = att(seeds[1], true, { at: new Date(NOW - 1000).toISOString() });
  const mixed = await call('POST', 'checkpoint', { body: cp([future, stale, fresh]) });
  assert.equal(mixed.status, 200, 'an old or future attempt does not fail the whole batch');
  assert.equal(mixed.body.accepted, 2);
  assert.deepEqual(mixed.body.rejected, [{ id: stale.id, reason: 'time_window' }]);
  const stored = db.rows('puzzle_attempts');
  assert.equal(stored.length, 2, 'the stale attempt is not stored');
  assert.equal(Date.parse(stored.find((x) => x.id === future.id).attempted_at), NOW, 'a future time is stored as server time');
  assert.equal(Date.parse(stored.find((x) => x.id === fresh.id).attempted_at), NOW - 1000);
  assert.equal(db.rows('user_puzzles').find((r) => r.puzzle_id === seeds[0].id).stats.shown, 1, 'the clamped attempt is applied once');

  // Rush: a run that ends ahead of the server is clamped and keeps its length; a run outside the window is reported
  const ids = seeds.slice(0, 5).map((x) => x.id);
  const ahead = { id: uuid(), score: 4, strikes: 3, durationMs: 120000, puzzleIds: ids, startedAt: new Date(NOW + 10 * 60e3 - 130000).toISOString(), endedAt: new Date(NOW + 10 * 60e3).toISOString() };
  const ra = await call('POST', 'checkpoint', { body: cp([], { mode: 'rush', rushRun: ahead }) });
  assert.equal(ra.status, 200); assert.equal(ra.body.state.rushBest, 4);
  const runRow = db.rows('puzzle_rush_runs').find((x) => x.id === ahead.id);
  assert.equal(Date.parse(runRow.ended_at), NOW, 'a run that ends in the future is stored as ending now');
  assert.equal(Date.parse(runRow.ended_at) - Date.parse(runRow.started_at), Date.parse(ahead.endedAt) - Date.parse(ahead.startedAt), 'the run keeps its length');
  const old = { ...ahead, id: uuid(), startedAt: new Date(NOW - 8 * 864e5 - 130000).toISOString(), endedAt: new Date(NOW - 8 * 864e5).toISOString() };
  const ro = await call('POST', 'checkpoint', { body: cp([], { mode: 'rush', rushRun: old }) });
  assert.equal(ro.status, 200); assert.deepEqual(ro.body.rejected, [{ id: old.id, reason: 'time_window' }]);
  assert.equal(db.rows('puzzle_rush_runs').length, 1, 'an old run is not stored');
  const far = await call('POST', 'checkpoint', { body: cp([], { mode: 'rush', rushRun: { ...ahead, id: uuid(), startedAt: new Date(NOW + 2 * 864e5 - 130000).toISOString(), endedAt: new Date(NOW + 2 * 864e5).toISOString() } }) });
  assert.equal(far.status, 400); assert.equal(far.body.field, 'rushRun.range', 'beyond the sanity bound is still malformed');
}

// ================= Puzzle Rush results
{
  const { call, db } = setup();
  db.seed('user_puzzles', seedRows(A));
  const ids = seeds.slice(0, 5).map((s) => s.id);
  const run = { id: uuid(), score: 4, strikes: 3, durationMs: 120000, puzzleIds: ids, startedAt: new Date(NOW - 130000).toISOString(), endedAt: new Date(NOW - 10000).toISOString() };
  const ok = await call('POST', 'checkpoint', { body: cp([], { mode: 'rush', rushRun: run }) });
  assert.equal(ok.body.state.rushBest, 4);
  assert.equal(db.rows('puzzle_rush_runs').length, 1);
  await call('POST', 'checkpoint', { body: cp([], { mode: 'rush', rushRun: { ...run, id: uuid(), score: 2 } }) });
  assert.equal((await call('GET', 'state')).body.rushBest, 4, 'best score is the maximum');
  await call('POST', 'checkpoint', { body: cp([], { mode: 'rush', rushRun: run }) });
  assert.equal(db.rows('puzzle_rush_runs').length, 2, 'the same run is stored once');
  for (const [mut, field] of [[{ score: 6 }, 'rushRun.score'], [{ strikes: 4 }, 'rushRun.strikes'], [{ durationMs: 200000 }, 'rushRun.durationMs'], [{ id: 'x' }, 'rushRun.id'], [{ endedAt: new Date(NOW - 200000).toISOString() }, 'rushRun.times']]) {
    const r = await call('POST', 'checkpoint', { body: cp([], { mode: 'rush', rushRun: { ...run, id: uuid(), ...mut } }) });
    assert.equal(r.status, 400, field); assert.equal(r.body.field, field);
  }
}

// ================= kits: final replaces the kit; explicit kit request excludes ids
{
  const { call, db } = setup();
  db.seed('user_puzzles', seedRows(A, 24));
  const st = await call('GET', 'state');
  const kit = st.body.kits.regular;
  assert.equal(kit.puzzles.length, 15);
  const done = await call('POST', 'checkpoint', { body: cp(kit.puzzles.slice(0, 2).map((p) => att(p)), { kitIds: { regular: kit.id }, final: true }) });
  assert.ok(done.body.state.kits.regular.id !== kit.id, 'a new practice kit after a finished session');
  assert.equal(done.body.state.kits.regular.puzzles.length, 15);
  const stale = await call('POST', 'checkpoint', { body: cp([], { kitIds: { regular: kit.id }, final: true }) });
  assert.equal(stale.body.state.kits, undefined, 'an out-of-date kit id does not rebuild again');
  const ex = kit.puzzles.map((p) => p.id);
  const k2 = await call('POST', 'kit', { body: { mode: 'rush', excludeIds: ex } });
  assert.equal(k2.body.kit.puzzles.length, 24);
  assert.equal((await call('POST', 'kit', { body: { mode: 'bogus' } })).status, 400);
}

// ================= DNA job, refill rules, job status, remove
{
  const { call, db } = setup();
  const d = await call('POST', 'dna', { body: { source: 'auto', limit: 40 } });
  assert.equal(d.status, 202);
  const again = await call('POST', 'dna', { body: {} });
  assert.equal(again.status, 409); assert.equal(again.body.error, 'job_active'); assert.equal(again.body.jobId, d.body.jobId);
  const js = await call('GET', 'job', { query: { id: d.body.jobId } });
  assert.equal(js.body.job.status, 'queued');
  assert.equal((await call('GET', 'job', { query: { id: d.body.jobId }, user: B })).status, 404, 'other users cannot read my job');
  assert.equal((await call('GET', 'job', { query: { id: 'nope' } })).status, 400);
  const st = await call('GET', 'state');
  assert.equal(st.body.job.id, d.body.jobId);
  assert.equal(st.body.refillNeeded, false, 'never while a job is active');
  // after DNA finished once and the pool is thin: refill is offered, started once
  db.rows('puzzle_jobs')[0].status = 'done';
  db.seed('user_puzzle_state', []);
  const state0 = db.rows('user_puzzle_state')[0];
  state0.counters = { dnaDone: true };
  db.seed('user_app_state', [{ user_id: A, data: { usernames: { chesscom: 'Oren', lichess: '' } } }]);
  assert.equal((await call('GET', 'state')).body.refillNeeded, true);
  const rf = await call('POST', 'refill');
  assert.equal(rf.status, 202); assert.equal(rf.body.started, true);
  const rf2 = await call('POST', 'refill');
  assert.equal(rf2.body.started, false); assert.equal(rf2.body.jobId, rf.body.jobId);
  // plenty of fresh puzzles: no refill
  const { call: call2, db: db2 } = setup();
  db2.seed('user_puzzles', seedRows(A, 24).concat(seedRows(A, 24).map((r, i) => ({ ...r, puzzle_id: 'f' + String(i).padStart(15, '0') }))));
  db2.seed('user_puzzle_state', [{ user_id: A, counters: { dnaDone: true } }]);
  db2.seed('user_app_state', [{ user_id: A, data: { usernames: { chesscom: 'Oren' } } }]);
  assert.equal((await call2('GET', 'state')).body.pool.fresh, 48);
  assert.equal((await call2('POST', 'refill')).body.started, false);
  // daily cap
  const { call: call3, db: db3 } = setup();
  db3.seed('user_puzzle_state', [{ user_id: A, counters: { dnaDone: true, dayKey: '2026-10-18', gamesAnalyzedToday: C.DAILY_GAMES_CAP } }]);
  assert.equal((await call3('POST', 'dna', { body: {} })).status, 429);
  // remove
  const { call: call4, db: db4 } = setup();
  db4.seed('user_puzzles', seedRows(A, 3));
  const target = seeds[0].id;
  assert.equal((await call4('POST', 'remove', { body: { puzzleId: target } })).body.status, 'retired');
  assert.equal(db4.rows('user_puzzles').find((r) => r.puzzle_id === target).status, 'retired');
  const kitAfter = await call4('GET', 'state');
  assert.ok(!kitAfter.body.kits.regular.puzzles.some((p) => p.id === target && p.origin === 'harvest'), 'a removed puzzle leaves the kit');
  assert.equal((await call4('POST', 'remove', { body: { puzzleId: 'ffffffffffffffff' } })).status, 404);
  assert.equal((await call4('POST', 'remove', { body: { puzzleId: 'zz' } })).status, 400);
  assert.equal((await call4('POST', 'remove', { body: { puzzleId: target }, user: B })).status, 404, 'cannot remove someone else’s puzzle');
}

// ================= isolation: state of one user never contains another user's puzzles
{
  const { call, db } = setup();
  db.seed('user_puzzles', seedRows(A, 20));
  db.seed('user_puzzles', seedRows(B, 20).map((r, i) => ({ ...r, puzzle_id: 'b' + String(i).padStart(15, '0'), fen: 'SECRET-' + i })));
  const sa = JSON.stringify((await call('GET', 'state', { user: A })).body);
  assert.ok(!sa.includes('SECRET') && !sa.includes('b00000000000000'));
  assert.equal((await call('GET', 'state', { user: A })).body.pool.total, 20);
}

// ================= background function entry
{
  const db = createFakeSupabase();
  const calls = [];
  const mk = (env) => bg.createHandler({
    db, env, currentSession: (e) => (e.headers['x-test-user'] ? { user_id: e.headers['x-test-user'] } : null),
    loadEngine: async () => ({ searches: 0, searchMs: 0, search() { throw new Error('unused'); } }),
    runJob: async (args) => { calls.push(args); return { outcome: 'done' }; },
  });
  const ev = (body, headers = {}) => ({ httpMethod: 'POST', headers: { origin: ORIGIN, 'x-test-user': A, ...headers }, rawUrl: ORIGIN + '/api/puzzle-refill-background', body: JSON.stringify(body) });
  const jid = uuid();
  db.seed('puzzle_jobs', [{ id: jid, user_id: A, kind: 'dna', status: 'queued', params: {}, progress: {} }]);
  assert.equal((await mk(ENV)(ev({ jobId: jid }))).statusCode, 200);
  assert.equal(calls[0].userId, A); assert.equal(calls[0].jobId, jid);
  assert.equal((await mk(ENV)(ev({ jobId: jid }, { 'x-test-user': '' }))).statusCode, 401);
  assert.equal((await mk({})(ev({ jobId: jid }))).statusCode, 404);
  assert.equal((await mk(ENV)(ev({ jobId: 'bad' }))).statusCode, 400);
  assert.equal((await mk(ENV)(ev({ jobId: jid }, { origin: 'https://evil.test' }))).statusCode, 403);
  assert.equal((await mk(ENV)({ ...ev({ jobId: jid }), httpMethod: 'GET' })).statusCode, 403);
  assert.equal(calls.length, 1, 'rejected requests never start the runner');
  // user id comes from the session, not from the body
  await mk(ENV)(ev({ jobId: jid, userId: B }));
  assert.equal(calls[1].userId, A);
}

console.log('PASS: /api/puzzles (access, flag, rate limit, validation, integrity, idempotency, SR, concurrency, rush, kits, jobs, refill, isolation) and the background entry.');

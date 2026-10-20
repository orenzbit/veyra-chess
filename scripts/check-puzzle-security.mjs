// Attack tests for the puzzle engine: every case tries to break something and must be refused safely.
// Runs offline with the in-memory fake Supabase. See STATE.md for the threat model.
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
const S = await fn('lib/puzzle-sources.mjs');
const seeds = await loadSeeds();

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const C = 'cccccccc-dddd-4ccc-8ccc-cccccccccccc';
const ORIGIN = 'https://veyra.test';
const NOW = Date.parse('2026-10-18T12:00:00Z');
const uuid = () => crypto.randomUUID();
const ENV = { PUZZLES_SERVER_ENABLED: '1' };
const session = (e) => (e.headers['x-test-user'] ? { user_id: e.headers['x-test-user'] } : null);

function setup() {
  const db = createFakeSupabase();
  const handler = createHandler({ db, now: () => NOW, env: ENV, loadSeeds: async () => seeds, currentSession: session });
  const call = async (method, action, { body, user = A, headers = {}, query = {} } = {}) => {
    const event = {
      httpMethod: method, queryStringParameters: { action, ...query }, rawUrl: `${ORIGIN}/api/puzzles?action=${action}`,
      headers: { origin: ORIGIN, ...(user ? { 'x-test-user': user } : {}), ...headers }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    };
    const res = await handler(event);
    return { status: res.statusCode, body: JSON.parse(res.body) };
  };
  return { db, call };
}
const rowsFor = (userId, n = 20) => seeds.slice(0, n).map((s, i) => ({
  user_id: userId, puzzle_id: s.id, fen: s.fen, solution: s.solution, accepted: s.accepted, played: 'a2a3', motif: s.motif, phase: 'middlegame',
  class: 'mistake', severity: 0.3, rating: 600 + i * 10, origin: 'harvest', source: { gameKey: 'g' + (i % 7), provider: 'chesscom' }, stats: { shown: 0, solved: 0, fails: 0, streak: 0 },
  next_due: '2026-10-01T00:00:00.000Z', status: 'active', engine_version: 1,
}));
const good = (puzzle, extra = {}) => ({ id: uuid(), puzzleId: puzzle.id, solved: true, ms: 4000, move: puzzle.solution[0], viaAlt: false, at: new Date(NOW - 5000).toISOString(), ...extra });
const cp = (attempts, extra = {}) => ({ sessionId: 's1', mode: 'regular', kitIds: {}, attempts, final: false, ...extra });
const run = (ids, score, extra = {}) => ({ id: uuid(), score, strikes: 3, durationMs: 120000, puzzleIds: ids, startedAt: new Date(NOW - 130000).toISOString(), endedAt: new Date(NOW - 5000).toISOString(), ...extra });

// 1. Cross-user attacks: user B reaching for user A's data.
{
  const { db, call } = setup();
  db.seed('user_puzzles', rowsFor(A, 3).map((r, i) => ({ ...r, puzzle_id: 'aaaaaaaaaaaaaaa' + i })));
  db.seed('puzzle_jobs', [{ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', user_id: A, kind: 'dna', status: 'queued', params: { source: 'saved', limit: 5 }, progress: {} }]);
  const stolen = { id: 'aaaaaaaaaaaaaaa0', fen: seeds[0].fen, solution: seeds[0].solution };
  const r1 = await call('POST', 'checkpoint', { user: B, body: cp([good(stolen)]) });
  assert.equal(r1.body.rejected[0]?.reason, 'unknown_puzzle', "B cannot record attempts on A's puzzle");
  assert.equal((await call('POST', 'remove', { user: B, body: { puzzleId: 'aaaaaaaaaaaaaaa0' } })).status, 404, "B cannot retire A's puzzle");
  assert.equal(db.rows('user_puzzles').find((r) => r.puzzle_id === 'aaaaaaaaaaaaaaa0').status, 'active');
  assert.equal((await call('GET', 'job', { user: B, query: { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' } })).status, 404, "B cannot read A's job");
  const st = await call('GET', 'state', { user: B });
  assert.equal(st.body.pool.total, 0, "B's pool does not include A's puzzles");
  assert.ok(st.body.kits.regular.puzzles.every((p) => !p.id.startsWith('aaaaaaaaaaaaaaa')), "A's puzzles never leak into B's kit");
}

// 2. Injection into PostgREST filters through ids.
{
  const { db, call } = setup();
  for (const bad of ['x,y)&user_id=neq.0', 'aaaaaaaaaaaaaaaa"),puzzle_id.neq.("', '../../etc', 'a'.repeat(500), '*']) {
    assert.equal((await call('GET', 'job', { query: { id: bad } })).status, 400, 'job id ' + bad);
    assert.equal((await call('POST', 'remove', { body: { puzzleId: bad } })).status, 400, 'puzzle id ' + bad);
  }
  const bad = await call('POST', 'checkpoint', { body: cp([good(seeds[0], { puzzleId: 'aaaaaaaaaaaaaaa")' })]) });
  assert.equal(bad.status, 400);
  assert.equal(db.log.filter((l) => /neq\.|\)&/.test(String(l.path || l))).length, 0, 'no injected filter reached the database');
}

// 3. Type confusion: arrays and objects where strings are required must be a clean 400, never a 503 or a stored array.
{
  const { db, call } = setup();
  const base = good(seeds[0]);
  const cases = {
    'id as array': { ...base, id: [base.id] },
    'puzzleId as array': { ...base, puzzleId: [base.puzzleId] },
    'move as array': { ...base, move: [base.move] },
    'at as number': { ...base, at: NOW },
    'solved as string': { ...base, solved: 'true' },
    'ms as float': { ...base, ms: 12.5 },
    'ms negative': { ...base, ms: -1 },
  };
  for (const [name, attempt] of Object.entries(cases)) {
    const r = await call('POST', 'checkpoint', { body: cp([attempt]) });
    assert.equal(r.status, 400, name + ' must be 400, got ' + r.status);
  }
  assert.equal((await call('POST', 'checkpoint', { body: cp([base], { kitIds: { regular: ['x'] } }) })).status, 400, 'kitIds as array');
  assert.equal((await call('POST', 'checkpoint', { body: cp([], { rushRun: run([seeds[0].id], 1, { id: [uuid()] }) }) })).status, 400, 'rushRun.id as array');
  assert.equal((await call('POST', 'checkpoint', { body: cp([], { rushRun: run([[seeds[0].id]], 1) }) })).status, 400, 'rushRun.puzzleIds with array element');
  assert.equal((await call('POST', 'checkpoint', { body: cp(Array.from({ length: 101 }, () => good(seeds[0]))) })).status, 400, '101 attempts');
  assert.equal(db.rows('puzzle_attempts').length, 0, 'nothing was stored by any malformed request');
  assert.equal((await call('POST', 'checkpoint', { body: '{"__proto__":{"polluted":1},"mode":"regular","sessionId":"s","attempts":[]}' })).status, 200);
  assert.equal({}.polluted, undefined, 'prototype is not polluted');
  assert.equal((await call('POST', 'kit', { body: { mode: ['regular'] } })).status, 400);
}

// 4. Forged Rush scores: self-only, but the server must not store an impossible run as a best.
{
  const { db, call } = setup();
  db.seed('user_puzzles', rowsFor(A, 20));
  const ids = seeds.slice(0, 20).map((s) => s.id);
  const fakeIds = Array.from({ length: 300 }, (_, i) => crypto.createHash('sha256').update('f' + i).digest('hex').slice(0, 16));
  let r = await call('POST', 'checkpoint', { body: cp([], { mode: 'rush', rushRun: run(fakeIds, 300) }) });
  assert.equal(r.body.state.rushBest, 0, 'a run of invented puzzles does not set a best');
  assert.equal(r.body.rejected.some((x) => x.reason === 'run_implausible'), true);
  r = await call('POST', 'checkpoint', { body: cp([], { mode: 'rush', rushRun: run(ids, 20, { durationMs: 1000 }) }) });
  assert.equal(r.body.state.rushBest, 0, '20 solves in one second is impossible');
  r = await call('POST', 'checkpoint', { body: cp([], { mode: 'rush', rushRun: run(ids, 12) }) });
  assert.equal(r.body.state.rushBest, 12, 'a plausible run is stored');
  assert.equal(db.rows('puzzle_rush_runs').length, 1);
}

// 5. Usernames (they come from synced app state, so a user controls them).
{
  for (const bad of ['..', 'a..b', 'a&b=c', 'a@b', 'a:b', 'a b', 'a/b', 'a?b', '%2e%2e', 'x'.repeat(41), '', 'ü', '<script>']) assert.equal(S.cleanUsername(bad), '', 'rejects ' + JSON.stringify(bad));
  for (const ok of ['Hikaru', 'some_user-1', 'user.name', 'ab']) assert.equal(S.cleanUsername(ok), ok, 'accepts ' + ok);
}

// 6. A provider answer must not steer the server to other hosts.
{
  const called = [];
  const fetchImpl = async (url) => {
    called.push(url);
    if (url.endsWith('/games/archives')) return { ok: true, status: 200, json: async () => ({ archives: ['http://169.254.169.254/latest/meta-data', 'https://evil.test/x/2026/10', 'https://api.chess.com/pub/player/other/games/2026/10', 'https://api.chess.com/pub/player/hikaru/games/2026/10'] }) };
    return { ok: true, status: 200, json: async () => ({ games: [] }) };
  };
  await S.fetchChessComPage('hikaru', {}, 10, fetchImpl);
  assert.deepEqual(called, ['https://api.chess.com/pub/player/hikaru/games/archives', 'https://api.chess.com/pub/player/hikaru/games/2026/10'], 'only this user\'s Chess.com archive is fetched');
}

// 7. Background function: refuses before doing anything expensive.
{
  const db = createFakeSupabase();
  let engineLoads = 0; let runs = 0;
  const handler = bg.createHandler({ db, env: ENV, currentSession: session, loadEngine: async () => { engineLoads += 1; return {}; }, runJob: async () => { runs += 1; return { outcome: 'done' }; } });
  const ev = (over = {}) => ({ httpMethod: 'POST', headers: { origin: ORIGIN, 'x-test-user': A }, rawUrl: ORIGIN + '/api/puzzle-refill-background', body: JSON.stringify({ jobId: uuid() }), ...over });
  const status = async (e) => (await handler(e)).statusCode;
  assert.equal(await status(ev({ httpMethod: 'GET' })), 403);
  assert.equal(await status(ev({ headers: { origin: 'https://evil.test', 'x-test-user': A } })), 403);
  assert.equal(await status(ev({ headers: { origin: ORIGIN } })), 401);
  assert.equal(await status(ev({ body: '{"jobId":"nope"}' })), 400);
  assert.equal(await status(ev()), 200);
  assert.equal(engineLoads, 0, 'an unknown job never loads the engine');
  db.seed('puzzle_jobs', [{ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', user_id: B, kind: 'dna', status: 'queued', params: {}, progress: {} }]);
  assert.equal(await status(ev({ body: JSON.stringify({ jobId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' }) })), 200);
  assert.equal(engineLoads + runs, 0, "another user's job never runs for A");
  db.seed('puzzle_jobs', [{ id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', user_id: A, kind: 'dna', status: 'done', params: {}, progress: {} }]);
  assert.equal(await status(ev({ body: JSON.stringify({ jobId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' }) })), 200);
  assert.equal(engineLoads + runs, 0, 'a finished job never runs again');
  db.seed('puzzle_jobs', [{ id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', user_id: A, kind: 'dna', status: 'queued', params: {}, progress: {} }]);
  assert.equal(await status(ev({ body: JSON.stringify({ jobId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' }) })), 200);
  assert.equal(runs, 1, 'own queued job runs');
  const off = bg.createHandler({ db, env: {}, currentSession: session, loadEngine: async () => { engineLoads += 1; return {}; }, runJob: async () => { runs += 1; return {}; } });
  assert.equal((await off({ httpMethod: 'POST', headers: { origin: ORIGIN, 'x-test-user': A }, rawUrl: ORIGIN + '/x', body: JSON.stringify({ jobId: uuid() }) })).statusCode, 404);
  assert.equal(runs, 1);
}

// 8. Rate limit per user even when the attacker rotates IP addresses.
{
  const { call } = setup();
  let limited = 0;
  for (let i = 0; i < 160; i += 1) {
    const r = await call('GET', 'nope', { headers: { 'x-nf-client-connection-ip': '10.0.0.' + (i % 250) } });
    if (r.status === 429) limited += 1;
  }
  assert.ok(limited > 0, 'rotating the IP does not escape the per-user limit');
}

// 9. Storage growth: a script that posts endless Rush runs or jobs must not grow the tables without limit.
{
  const { db, call } = setup();
  db.seed('user_puzzles', rowsFor(C, 20));
  const ids = seeds.slice(0, 20).map((s) => s.id);
  db.seed('puzzle_rush_runs', Array.from({ length: 230 }, (_, i) => ({ id: crypto.randomUUID(), user_id: C, score: 3, strikes: 3, duration_ms: 90000, puzzle_ids: ids.slice(0, 5), started_at: new Date(NOW - (400 - i) * 1000).toISOString(), ended_at: new Date(NOW - (390 - i) * 1000).toISOString() })));
  const r0 = await call('POST', 'checkpoint', { user: C, body: cp([], { mode: 'rush', rushRun: run(ids, 5) }) });
  assert.equal(r0.status, 200);
  assert.ok(db.rows('puzzle_rush_runs').length <= 200, 'rush runs are capped per user: ' + db.rows('puzzle_rush_runs').length);
  const old = Array.from({ length: 45 }, (_, i) => ({ id: crypto.randomUUID(), user_id: C, kind: 'dna', status: 'done', params: {}, progress: {}, result: {}, created_at: new Date(NOW - (100 - i) * 60000).toISOString() }));
  db.seed('puzzle_jobs', old);
  const r = await call('POST', 'dna', { user: C, body: { source: 'saved', limit: 3 } });
  assert.equal(r.status, 202);
  assert.ok(db.rows('puzzle_jobs').filter((j) => j.status === 'done').length <= 30, 'finished jobs are capped per user');
}

console.log('PASS: puzzle security (cross-user, filter injection, type confusion, forged Rush runs, usernames, provider redirection, background function guards, per-user rate limit, storage growth).');

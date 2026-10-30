// Tests for the compiled client modules: dist/src/puzzle/{api,outbox,rush}.js. Run after `tsc -p tsconfig.json`.
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const mod = (n) => import(pathToFileURL(join(root, 'dist', 'src', 'puzzle', n)).href);
const { createPuzzleApi } = await mod('api.js');
const { Outbox, MAX_ITEMS, DEAD_KEY } = await mod('outbox.js');
const R = await mod('rush.js');

// ============================== api
const reply = (status, body, type = 'application/json; charset=utf-8') => async () => ({ status, headers: { get: (k) => (k.toLowerCase() === 'content-type' ? type : null) }, json: async () => body });
const kind = async (fetchImpl) => (await createPuzzleApi(fetchImpl).getState()).kind;
assert.equal(await kind(reply(200, { ok: true })), 'ok');
assert.equal(await kind(reply(200, '<html>', 'text/html')), 'network', 'service worker HTML is not a result');
assert.equal(await kind(async () => { throw new Error('offline'); }), 'network');
assert.equal(await kind(reply(401, { ok: false, error: 'UNAUTHENTICATED' })), 'auth');
assert.equal(await kind(reply(404, { ok: false, error: 'DISABLED' })), 'disabled');
assert.equal(await kind(reply(404, { ok: false, error: 'not_found' })), 'error');
assert.equal(await kind(reply(429, { ok: false })), 'rate');
assert.equal(await kind(reply(409, { ok: false, jobId: 'x' })), 'conflict');
assert.equal(await kind(reply(503, { ok: false })), 'network', 'server trouble is retried like a network failure');
assert.equal(await kind(reply(400, { ok: false, error: 'bad_request' })), 'error');
assert.equal(await kind(async () => ({ status: 200, headers: { get: () => 'application/json' }, json: async () => { throw new Error('bad'); } })), 'network');
let seen;
await createPuzzleApi(async (u, i) => { seen = { u, i }; return reply(200, { ok: true })(); }).checkpoint({ sessionId: 's', mode: 'regular', kitIds: {}, attempts: [], final: false }, true);
assert.equal(seen.u, '/api/puzzles?action=checkpoint');
assert.equal(seen.i.keepalive, true); assert.equal(seen.i.credentials, 'same-origin'); assert.equal(seen.i.method, 'POST');
assert.equal(JSON.parse(seen.i.body).sessionId, 's');
await createPuzzleApi(async (u) => { seen = { u }; return reply(200, { ok: true })(); }).getJob('abc');
assert.equal(seen.u, '/api/puzzles?action=job&id=abc');
assert.equal(await createPuzzleApi(reply(202, {})).runBackground('j'), true);
assert.equal(await createPuzzleApi(async () => { throw new Error('x'); }).runBackground('j'), false);

// ============================== outbox
const store = () => { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = v; }, m }; };
let clock = 1_000_000;
const att = (n, extra = {}) => ({ id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`, puzzleId: 'abcdef0123456789', mode: 'regular', solved: true, ms: 1000, move: 'e2e4', viaAlt: false, at: new Date(clock).toISOString(), ...extra });
const ok = (extra = {}) => ({ kind: 'ok', status: 200, data: { ok: true, accepted: 1, duplicates: 0, rejected: [], state: {}, refillNeeded: false, ...extra } });
const meta = { sessionId: 's1' };

{ // survives reload, no duplicates, success clears
  const s = store();
  const a = new Outbox('u1', s, () => clock);
  a.add(att(1)); a.add(att(1)); a.add(att(2));
  assert.equal(a.size(), 2);
  assert.equal(new Outbox('u1', s, () => clock).size(), 2, 'a new page load sees the queue');
  assert.equal(new Outbox('u2', s, () => clock).size(), 0, 'queues are per account');
  const sent = [];
  const res = await a.flush(async (b) => { sent.push(b); return ok(); }, meta);
  assert.equal(res.status, 'sent'); assert.equal(res.sent, 2);
  assert.equal(sent[0].attempts.length, 2); assert.equal(sent[0].mode, 'regular');
  assert.ok(!('tries' in sent[0].attempts[0]) && !('mode' in sent[0].attempts[0]), 'internal fields are not sent');
  assert.equal(a.size(), 0);
  assert.equal((await a.flush(async () => ok(), meta)).status, 'empty');
}
{ // network failure keeps items, backs off 15s, 30s, 60s, caps at 5 min; recovery resets
  const s = store(); const a = new Outbox('u1', s, () => clock); a.add(att(1));
  let calls = 0; const failing = async () => { calls += 1; return { kind: 'network' }; };
  assert.equal((await a.flush(failing, meta)).waitMs, 15000);
  assert.equal((await a.flush(failing, meta)).status, 'waiting'); assert.equal(calls, 1, 'no retry before the delay passes');
  clock += 15000; assert.equal((await a.flush(failing, meta)).waitMs, 30000);
  clock += 30000; assert.equal((await a.flush(failing, meta)).waitMs, 60000);
  for (let i = 0; i < 6; i += 1) { clock += 400000; await a.flush(failing, meta); }
  clock += 400000; assert.equal((await a.flush(failing, meta)).waitMs, 300000, 'capped at five minutes');
  assert.equal(a.size(), 1, 'nothing is lost while offline');
  clock += 400000; assert.equal((await a.flush(async () => ok(), meta)).status, 'sent');
  a.add(att(2)); assert.equal((await a.flush(failing, meta)).waitMs, 15000, 'a success resets the backoff');
  clock += 400000;
  // page hide: keepalive flush ignores the backoff
  const flights = []; assert.equal((await a.flush(async (b, k) => { flights.push(k); return ok(); }, meta, true)).status, 'sent'); assert.deepEqual(flights, [true]);
}
{ // 401 and DISABLED stop without deleting
  const a = new Outbox('u1', store(), () => clock); a.add(att(1));
  assert.equal((await a.flush(async () => ({ kind: 'auth' }), meta)).status, 'auth');
  assert.equal((await a.flush(async () => ({ kind: 'disabled' }), meta)).status, 'disabled');
  assert.equal(a.size(), 1);
}
{ // refusals: one bad item is isolated, then buried after 3 tries; others still go through
  const s = store(); const a = new Outbox('u1', s, () => clock);
  a.add(att(1)); a.add(att(2)); a.add(att(3));
  const bad = att(2).id;
  const picky = async (b) => (b.attempts.some((x) => x.id === bad) ? { kind: 'error', status: 400, data: {} } : ok());
  let r = await a.flush(picky, meta); assert.equal(r.status, 'waiting');
  assert.equal(a.items().every((i) => i.tries === 1), true);
  r = await a.flush(picky, meta); assert.equal(r.sent, 1, 'now sent one by one');
  r = await a.flush(picky, meta); r = await a.flush(picky, meta); r = await a.flush(picky, meta);
  assert.equal(a.size(), 0);
  assert.equal(a.dead().length, 1); assert.equal(a.dead()[0].id, bad);
}
{ // server-side rejected ids move to the dead list
  const a = new Outbox('u1', store(), () => clock); a.add(att(1)); a.add(att(2));
  await a.flush(async (b) => ok({ rejected: [{ id: b.attempts[0].id, reason: 'unknown_puzzle' }], accepted: 1 }), meta);
  assert.equal(a.size(), 0); assert.equal(a.dead()[0].reason, 'unknown_puzzle');
}
{ // a run the server rejects (time window) is buried with its reason, not dropped silently
  const a = new Outbox('u1', store(), () => clock);
  const run = { id: '22222222-2222-4222-8222-222222222222', score: 1, strikes: 0, durationMs: 60000, puzzleIds: ['abcdef0123456789'], startedAt: new Date(clock).toISOString(), endedAt: new Date(clock).toISOString() };
  a.addRun(run);
  await a.flush(async () => ok({ rejected: [{ id: run.id, reason: 'time_window' }] }), meta);
  assert.equal(a.size(), 0); assert.equal(a.dead().length, 1); assert.equal(a.dead()[0].id, run.id); assert.equal(a.dead()[0].reason, 'time_window');
}
{ // cap, modes, batches of 100, concurrent flushes share one request
  const a = new Outbox('u1', store(), () => clock);
  for (let i = 0; i < MAX_ITEMS + 20; i += 1) a.add(att(i));
  assert.equal(a.size(), MAX_ITEMS); assert.equal(a.items()[0].id, att(20).id, 'oldest dropped first');
  const sizes = [];
  await a.flush(async (b) => { sizes.push(b.attempts.length); return ok(); }, meta);
  assert.deepEqual(sizes, [100]);
  const b2 = new Outbox('u1', store(), () => clock); b2.add(att(1, { mode: 'rush' })); b2.add(att(2)); b2.add(att(3, { mode: 'rush' }));
  const modes = []; await b2.flush(async (b) => { modes.push(b.mode + b.attempts.length); return ok(); }, meta);
  assert.deepEqual(modes, ['rush2'], 'a request carries one mode');
  const c = new Outbox('u1', store(), () => clock); c.add(att(1));
  let n = 0; const slow = async () => { n += 1; await new Promise((r) => setTimeout(r, 10)); return ok(); };
  await Promise.all([c.flush(slow, meta), c.flush(slow, meta)]);
  assert.equal(n, 1);
}
{ // runs: sent after attempts, idempotent id
  const a = new Outbox('u1', store(), () => clock);
  const run = { id: '11111111-1111-4111-8111-111111111111', score: 3, strikes: 3, durationMs: 90000, puzzleIds: ['abcdef0123456789'], startedAt: new Date(clock).toISOString(), endedAt: new Date(clock + 1).toISOString() };
  a.addRun(run); a.addRun(run); a.add(att(1, { mode: 'rush' }));
  assert.equal(a.size(), 2);
  const bodies = []; const send = async (b) => { bodies.push(b); return ok(); };
  await a.flush(send, meta); await a.flush(send, meta);
  assert.equal(bodies[0].rushRun, undefined); assert.equal(bodies[1].rushRun.id, run.id); assert.deepEqual(bodies[1].attempts, []);
  assert.equal(a.size(), 0);
}
{ // blocked storage falls back to memory
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const a = new Outbox('u1', broken, () => clock); a.add(att(1));
  assert.equal(a.size(), 1);
  assert.equal(new Outbox('u1', null, () => clock).size(), 0);
}

// ============================== rush state machine
const kit = (n) => Array.from({ length: n }, (_, i) => ({ id: String(i).padStart(16, '0'), fen: 'x', solution: ['e2e4'], accepted: ['e2e4'], played: '', motif: i % 2 ? 'general' : 'endgame', phase: 'middlegame', rating: 600, class: 'mistake', origin: 'harvest', source: {} }));
const T0 = 5_000_000;
let s = R.createRush(kit(4));
assert.equal(s.phase, 'idle');
s = R.tick(s, T0); assert.equal(s.phase, 'idle');
s = R.start(s, T0); assert.equal(s.phase, 'countdown'); assert.equal(R.countdownSeconds(s, T0), 3); assert.equal(R.countdownSeconds(s, T0 + 1100), 2);
s = R.answer(s, T0 + 500, 'e2e4', true); assert.equal(s.score, 0, 'no answers during the countdown');
s = R.tick(s, T0 + 3000); assert.equal(s.phase, 'playing'); assert.equal(s.startedAt, T0 + 3000); assert.equal(s.remainingMs, R.RUSH_DURATION_MS);
s = R.tick(s, T0 + 3000 + 10000); assert.equal(s.remainingMs, R.RUSH_DURATION_MS - 10000);
let now = T0 + 13000;
s = R.answer(s, now, 'e2e4', true);
assert.equal(s.score, 1); assert.equal(s.index, 1); assert.equal(s.answers[0].ms, 10000);
assert.equal(R.answer(s, now + 100, 'e2e4', true).score, 1, 'input is locked for 300 ms after a correct answer');
now += 400; s = R.answer(s, now, 'a2a3', false);
assert.equal(s.phase, 'feedback'); assert.equal(s.strikes, 1);
assert.equal(R.answer(s, now + 100, 'e2e4', true).score, 1, 'no answers while the correct move is shown');
assert.equal(R.currentPuzzle(s).id, kit(4)[1].id, 'the failed puzzle stays on screen during feedback');
let t = R.tick(s, now + 1200); assert.equal(t.phase, 'playing'); assert.equal(t.index, 2);
assert.equal(t.remainingMs, R.RUSH_DURATION_MS - 10000 - 400 - 1200, 'the clock keeps running during feedback');
// hidden tab pauses the clock
let p = R.hide(t, now + 1200 + 5000);
assert.equal(p.phase, 'paused'); const left = p.remainingMs;
p = R.tick(p, now + 1200 + 50000); assert.equal(p.remainingMs, left);
p = R.show(p, now + 1200 + 60000); assert.equal(p.phase, 'playing');
assert.equal(R.tick(p, now + 1200 + 61000).remainingMs, left - 1000, 'time resumes after the pause');
assert.equal(R.answer(p, now + 1200 + 60000, 'e2e4', true).answers.at(-1).ms, 5000, 'think time excludes the pause');
// pause during feedback keeps the feedback window
let f = R.answer(R.tick(R.start(R.createRush(kit(4)), T0), T0 + 3000), T0 + 4000, 'a2a3', false);
f = R.hide(f, T0 + 4500); f = R.show(f, T0 + 9500);
assert.equal(f.phase, 'feedback'); assert.equal(R.tick(f, T0 + 9500 + 600).phase, 'feedback'); assert.equal(R.tick(f, T0 + 9500 + 800).phase, 'playing');
// 3 strikes end the run after the feedback
let k = R.tick(R.start(R.createRush(kit(10)), T0), T0 + 3000); let at = T0 + 3000;
for (let i = 0; i < 3; i += 1) { at += 100; k = R.answer(k, at, 'a2a3', false); at += 1300; k = R.tick(k, at); if (i < 2) assert.equal(k.phase, 'playing'); }
assert.equal(k.phase, 'finished'); assert.equal(k.finishReason, 'strikes'); assert.equal(k.strikes, 3);
// time ends the run exactly at 3:00
let q = R.tick(R.start(R.createRush(kit(10)), T0), T0 + 3000);
q = R.tick(q, T0 + 3000 + 179999); assert.equal(q.phase, 'playing');
q = R.tick(q, T0 + 3000 + 181000); assert.equal(q.phase, 'finished'); assert.equal(q.finishReason, 'time'); assert.equal(q.endedAt, T0 + 3000 + 180000);
assert.equal(R.answer(q, T0 + 190000, 'e2e4', true).score, 0, 'no points after time is up');
// kit runs out: ask for more, continue, or end
let e = R.tick(R.start(R.createRush(kit(2)), T0), T0 + 3000); let et = T0 + 3000;
et += 1000; e = R.answer(e, et, 'e2e4', true); et += 400; e = R.answer(e, et, 'e2e4', true);
assert.equal(e.needMore, true); assert.equal(R.answer(e, et + 400, 'e2e4', true).score, 2, 'nothing to answer until more puzzles arrive');
const more = R.appendKit(e, kit(3).slice(1), et + 500);
assert.equal(more.needMore, false); assert.equal(more.kit.length, 3, 'puzzles already in the kit are not added twice'); assert.equal(R.currentPuzzle(more).id, kit(3)[2].id);
const none = R.appendKit(e, [], et + 500); assert.equal(none.phase, 'finished'); assert.equal(none.finishReason, 'no_puzzles');
assert.equal(R.start(R.createRush([]), T0).finishReason, 'no_puzzles');
// result satisfies the server's sanity limits
const res = R.result(R.tick(R.answer(R.tick(R.start(R.createRush(kit(5)), T0), T0 + 3000), T0 + 4000, 'e2e4', true), T0 + 3000 + 181000));
assert.ok(res.score <= res.puzzleIds.length && res.durationMs <= 180000 && res.strikes <= 3);
assert.equal(res.accuracy, 100); assert.deepEqual(res.byMotif, { endgame: { seen: 1, solved: 1 } });
// idempotent no-ops
assert.equal(R.show(R.createRush(kit(1)), T0).phase, 'idle'); assert.equal(R.hide(R.createRush(kit(1)), T0).phase, 'idle');
assert.equal(R.start(R.start(R.createRush(kit(1)), T0), T0 + 1).countdownEndsAt, T0 + 3000);


// ============================== PuzzleData hub
const { PuzzleData, cacheKey, STALE_JOB_MS } = await mod('data.js');
const dto = (i) => ({ id: String(i).padStart(16, '0'), fen: 'x', solution: ['e2e4'], accepted: ['e2e4'], played: '', motif: 'general', phase: 'middlegame', rating: 600, class: 'mistake', origin: 'harvest', source: {} });
const stateDto = (extra = {}) => ({ ok: true, serverTime: 'x', pool: { active: 3, mastered: 0, total: 3, fresh: 3, cap: 150, lowWater: 45, byMotif: {}, byPhase: {} }, kits: { regular: { id: 'kit_a', builtAt: 'x', puzzles: [dto(1), dto(2)] }, rush: { id: 'kit_r', builtAt: 'x', puzzles: [dto(3)] } }, rushBest: 5, profile: { puzzleElo: 800, nextFocus: 'general' }, job: null, refillNeeded: false, ...extra });
const mkApi = (over = {}) => {
  const calls = [];
  const api = {
    calls,
    getState: async () => { calls.push('state'); return { kind: 'ok', status: 200, data: stateDto() }; },
    checkpoint: async (b, ka) => { calls.push(['checkpoint', b, ka]); return { kind: 'ok', status: 200, data: { ok: true, accepted: b.attempts.length, duplicates: 0, rejected: [], state: { pool: stateDto().pool, profile: { puzzleElo: 810, nextFocus: 'general' }, rushBest: 7, ...(b.final ? { kits: { regular: { id: 'kit_b', builtAt: 'y', puzzles: [dto(9)] } } } : {}) }, refillNeeded: false } }; },
    newKit: async () => ({ kind: 'ok', status: 200, data: { ok: true, kit: { id: 'k', builtAt: 'x', puzzles: [dto(4), dto(5)] } } }),
    startDna: async () => { calls.push('dna'); return { kind: 'ok', status: 202, data: { ok: true, jobId: 'job1' } }; },
    startRefill: async () => { calls.push('refill'); return { kind: 'ok', status: 202, data: { ok: true, started: true, jobId: 'job2' } }; },
    getJob: async (id) => { calls.push(['job', id]); return { kind: 'ok', status: 200, data: { ok: true, job: { id, kind: 'dna', status: 'done', gamesDone: 3, gamesTotal: 3, puzzlesAdded: 4, error: null, updatedAt: 'x', report: { puzzlesAdded: 4, gamesScanned: 3 } } } }; },
    remove: async () => ({ kind: 'ok', status: 200, data: { ok: true, status: 'retired' } }),
    runBackground: async (id) => { calls.push(['bg', id]); return true; },
    ...over,
  };
  return api;
};
const mkData = (api, st = store(), extra = {}) => new PuzzleData({ userId: 'u1', api, storage: st, now: () => clock, uuid: (() => { let n = 100; return () => `00000000-0000-4000-8000-${String(n++).padStart(12, '0')}`; })(), ...extra });
const P = dto(1);
{ // load, cache, attempts, flush, final kit
  const st = store(); const api = mkApi(); const d = mkData(api, st);
  await d.load();
  assert.equal(d.snap.phase, 'ready'); assert.equal(d.snap.offline, false);
  assert.ok(st.getItem(cacheKey('u1')), 'state cached for offline use');
  d.recordAttempt('regular', P, { solved: true, ms: 1234.6, move: 'e2e4', viaAlt: false });
  assert.equal(d.snap.pending, 1);
  const r = await d.flush({ final: true });
  assert.equal(r.accepted, 1);
  const sent = api.calls.find((c) => c[0] === 'checkpoint')[1];
  assert.equal(sent.final, true); assert.equal(sent.kitIds.regular, 'kit_a'); assert.equal(sent.attempts[0].ms, 1235); assert.equal(sent.sessionId, d.sessionId);
  assert.equal(d.snap.state.kits.regular.id, 'kit_b', 'the new kit replaces the finished one'); assert.equal(d.snap.state.kits.rush.id, 'kit_r');
  assert.equal(d.snap.state.profile.puzzleElo, 810); assert.equal(d.snap.state.rushBest, 7); assert.equal(d.snap.pending, 0);
}
{ // offline start: cached state is used and flagged; no cache => offline phase
  const st = store(); st.setItem(cacheKey('u1'), JSON.stringify(stateDto()));
  const d = mkData(mkApi({ getState: async () => ({ kind: 'network' }) }), st);
  await d.load(); assert.equal(d.snap.phase, 'ready'); assert.equal(d.snap.offline, true);
  const d2 = mkData(mkApi({ getState: async () => ({ kind: 'network' }) }), store());
  await d2.load(); assert.equal(d2.snap.phase, 'offline');
  // results made offline are kept and sent later
  d.recordAttempt('regular', P, { solved: false, ms: 10, move: 'a2a3', viaAlt: false });
  let ok = false; d.api = null;
}
{ // auth / disabled
  const a = mkData(mkApi({ getState: async () => ({ kind: 'auth' }) })); await a.load(); assert.equal(a.snap.phase, 'auth');
  const b = mkData(mkApi({ getState: async () => ({ kind: 'disabled' }) })); await b.load(); assert.equal(b.snap.phase, 'disabled');
  const c = mkData(mkApi()); await c.load(); c.recordAttempt('regular', P, { solved: true, ms: 1, move: 'e2e4', viaAlt: false });
  c.api = null;
}
{ // session expiry while playing: attempts stay queued and the UI is told
  const api = mkApi({ checkpoint: async () => ({ kind: 'auth' }) }); const d = mkData(api); await d.load();
  d.recordAttempt('regular', P, { solved: true, ms: 1, move: 'e2e4', viaAlt: false });
  assert.equal(await d.flush(), null); assert.equal(d.snap.authLost, true); assert.equal(d.snap.pending, 1);
}
{ // DNA: starts the job, triggers the background function, then polling finishes it
  const api = mkApi({ getState: async () => ({ kind: 'ok', status: 200, data: stateDto({ job: { id: 'job1', kind: 'dna', status: 'queued', gamesDone: 0, gamesTotal: 40, puzzlesAdded: 0, error: null, updatedAt: new Date(clock).toISOString() } }) }) });
  const d = mkData(api); await d.load();
  assert.ok(api.calls.some((c) => c[0] === 'bg' && c[1] === 'job1'), 'a queued job is started when the screen opens');
  await d.startDna(); assert.ok(api.calls.includes('dna'));
  await d.pollJob();
  assert.equal(d.snap.lastReport.puzzlesAdded, 4); assert.equal(d.snap.lastJob.status, 'done');
}
{ // running job: no second trigger while fresh, trigger once the worker looks dead
  const mk = (age) => mkApi({ getState: async () => ({ kind: 'ok', status: 200, data: stateDto({ job: { id: 'j', kind: 'dna', status: 'running', gamesDone: 1, gamesTotal: 40, puzzlesAdded: 0, error: null, updatedAt: new Date(clock - age).toISOString() } }) }) });
  const fresh = mk(5000); await mkData(fresh).load(); assert.ok(!fresh.calls.some((c) => c[0] === 'bg'));
  const dead = mk(STALE_JOB_MS + 1000); await mkData(dead).load(); assert.ok(dead.calls.some((c) => c[0] === 'bg'));
}
{ // refill when the server asks for it, once
  const api = mkApi({ getState: async () => ({ kind: 'ok', status: 200, data: stateDto({ refillNeeded: true }) }) });
  const d = mkData(api); await d.load();
  assert.equal(api.calls.filter((c) => c === 'refill').length, 1); assert.ok(api.calls.some((c) => c[0] === 'bg' && c[1] === 'job2'));
}
{ // DNA errors are mapped, never thrown
  const d = mkData(mkApi({ startDna: async () => ({ kind: 'error', status: 429, data: { error: 'daily_cap' } }) })); await d.load(); await d.startDna();
  assert.equal(d.snap.message, 'daily_cap'); assert.equal(d.snap.dnaBusy, false);
  const e = mkData(mkApi({ startDna: async () => ({ kind: 'network' }) })); await e.load(); await e.startDna(); assert.equal(e.snap.message, 'network');
}
{ // more rush puzzles; subscribe notifications
  const d = mkData(mkApi()); let n = 0; d.subscribe(() => { n += 1; });
  await d.load(); assert.ok(n > 0);
  assert.equal((await d.moreRushPuzzles(['x'])).length, 2);
  assert.equal((await mkData(mkApi({ newKit: async () => ({ kind: 'network' }) })).moreRushPuzzles([])).length, 0);
}

console.log('PASS: client api (HTML guard, status mapping), outbox (reload, backoff, 401, poison item, cap, runs) and Rush state machine.');
void DEAD_KEY;

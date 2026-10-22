import assert from 'node:assert/strict';
import { createHandler } from '../netlify/functions/daily-streak.mjs';

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const EVENT1 = '11111111-1111-4111-8111-111111111111';
const EVENT2 = '22222222-2222-4222-8222-222222222222';
const ORIGIN = 'https://veyra.test';
const seed = { id: 'aaaaaaaaaaaaaaaa', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', solution: ['e2e4'], accepted: ['e2e4'] };
const lines = Array.from({ length: 6 }, (_, i) => ({ id: 'line-' + i, star: i === 0, moves: [['e4']] }));
const repertoire = [{ id: 'opening-one', lines }];

function setup({ now = Date.parse('2026-10-22T12:00:00Z'), seedEvents = [], settings = [] } = {}) {
  let clock = now;
  const dbState = { events: seedEvents.map((e, i) => ({ id: String(i + 1), ...e })), settings: settings.map((s) => ({ ...s })) };
  const db = async (path, options = {}) => {
    const [table, query = ''] = path.split('?');
    const params = new URLSearchParams(query);
    const method = options.method || 'GET';
    const payload = options.body ? JSON.parse(options.body) : null;
    if (table === 'user_daily_streak_settings' && method === 'GET') {
      return dbState.settings.filter((s) => s.user_id === params.get('user_id')?.replace(/^eq\./, '')).slice(0, 1);
    }
    if (table === 'user_daily_streak_settings' && method === 'POST') {
      const i = dbState.settings.findIndex((s) => s.user_id === payload.user_id);
      if (i >= 0) dbState.settings[i] = { ...dbState.settings[i], ...payload };
      else dbState.settings.push({ ...payload });
      return [{ ...dbState.settings.find((s) => s.user_id === payload.user_id) }];
    }
    if (table === 'user_daily_streak_events' && method === 'GET') {
      const userId = (params.get('user_id') || '').replace(/^eq\./, '');
      const from = (params.get('local_date') || '').replace(/^gte\./, '');
      return dbState.events.filter((e) => e.user_id === userId && (!from || e.local_date >= from)).sort((a, b) => a.local_date.localeCompare(b.local_date));
    }
    if (table === 'user_daily_streak_events' && method === 'POST') {
      const duplicate = dbState.events.some((e) => e.user_id === payload.user_id && e.source_event_id === payload.source_event_id);
      if (duplicate) return [];
      const row = { id: String(dbState.events.length + 1), ...payload };
      dbState.events.push(row);
      return [{ ...row }];
    }
    if (table === 'user_puzzles' && method === 'GET') return [];
    throw new Error('unexpected db request ' + method + ' ' + path);
  };
  const handler = createHandler({
    db, now: () => clock,
    currentSession: (event) => event.headers?.['x-test-user'] ? { user_id: event.headers['x-test-user'] } : null,
    loadSeeds: async () => [seed],
    loadRepertoire: async () => repertoire,
  });
  const call = async (method, action, { user = A, body, headers = {}, rawUrl, query = {} } = {}) => {
    const qs = new URLSearchParams({ action, ...query }).toString();
    const event = {
      httpMethod: method, queryStringParameters: { action, ...query },
      rawUrl: rawUrl || `${ORIGIN}/api/daily-streak?${qs}`,
      headers: { origin: ORIGIN, ...(user ? { 'x-test-user': user } : {}), ...headers },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    };
    const response = await handler(event);
    return { status: response.statusCode, body: JSON.parse(response.body), headers: response.headers };
  };
  return { call, dbState, setNow: (v) => { clock = v; } };
}

const puzzle = (sourceEventId = EVENT1, move = 'e2e4') => ({ sourceEventId, activityType: 'puzzle', puzzleId: seed.id, move });
const training = (sourceEventId = EVENT2, completedLineIds = lines.map((l) => l.id)) => ({ sourceEventId, activityType: 'training', openingId: 'opening-one', completedLineIds });

// Access control, routing, and body validation (1-8)
{
  const { call } = setup();
  assert.equal((await call('GET', 'state', { user: null })).status, 401);
  assert.equal((await call('PUT', 'state')).status, 405);
  assert.equal((await call('GET', 'unknown')).status, 400);
  assert.equal((await call('POST', 'settings', { headers: { origin: 'https://evil.test' }, body: { timezoneId: 'UTC' } })).status, 403);
  assert.equal((await call('POST', 'settings', { headers: { origin: '', referer: '' }, body: { timezoneId: 'UTC' } })).status, 403);
  assert.equal((await call('POST', 'settings', { body: '{bad json' })).status, 400);
  assert.equal((await call('POST', 'activity', { body: 'x'.repeat(17000) })).status, 413);
  const state = await call('GET', 'state');
  assert.equal(state.status, 200);
  assert.equal(state.headers['cache-control'], 'no-store');
  assert.equal(state.body.timezoneId, 'Asia/Jerusalem');
}

// Timezone preferences and effective-next-day policy (9-14)
{
  const ctx = setup();
  const first = await ctx.call('POST', 'settings', { body: { timezoneId: 'UTC' } });
  assert.equal(first.status, 200);
  assert.equal(first.body.timezoneId, 'UTC');
  const change = await ctx.call('POST', 'settings', { body: { timezoneId: 'America/New_York' } });
  assert.equal(change.body.pendingTimezoneId, 'America/New_York');
  assert.equal(change.body.timezoneEffectiveOn, '2026-10-23');
  assert.equal((await ctx.call('GET', 'state')).body.timezoneId, 'UTC');
  ctx.setNow(Date.parse('2026-10-23T12:00:00Z'));
  assert.equal((await ctx.call('GET', 'state')).body.timezoneId, 'America/New_York');
  assert.equal((await ctx.call('POST', 'settings', { body: { timezoneId: 'Not/AZone' } })).status, 400);
}

// Server-verifiable puzzle activity and idempotency (15-22)
{
  const ctx = setup();
  const accepted = await ctx.call('POST', 'activity', { body: puzzle() });
  assert.equal(accepted.status, 200);
  assert.equal(accepted.body.accepted, true);
  assert.equal(accepted.body.currentStreak, 1);
  assert.equal(ctx.dbState.events.length, 1);
  const duplicate = await ctx.call('POST', 'activity', { body: puzzle() });
  assert.equal(duplicate.body.duplicate, true);
  assert.equal(ctx.dbState.events.length, 1);
  assert.equal((await ctx.call('POST', 'activity', { body: puzzle(EVENT2, 'e2e5') })).status, 400);
  assert.equal((await ctx.call('POST', 'activity', { body: { ...puzzle(), sourceEventId: 'bad' } })).status, 400);
  assert.equal((await ctx.call('POST', 'activity', { body: { ...puzzle(), activityType: 'unknown' } })).status, 400);
  assert.equal((await ctx.call('POST', 'activity', { body: { ...puzzle(), puzzleId: 'not-a-puzzle' } })).status, 400);
  const other = await ctx.call('GET', 'state', { user: B });
  assert.equal(other.body.currentStreak, 0);
}

// Catalog-checked training completion (23-27)
{
  const ctx = setup();
  assert.equal((await ctx.call('POST', 'activity', { body: training() })).status, 200);
  assert.equal(ctx.dbState.events[0].activity_type, 'training');
  assert.equal((await ctx.call('POST', 'activity', { body: training(EVENT1, ['line-0']) })).status, 400);
  assert.equal((await ctx.call('POST', 'activity', { body: { ...training(EVENT1), openingId: 'unknown' } })).status, 400);
  assert.equal((await ctx.call('POST', 'activity', { body: { ...training(EVENT1), completedLineIds: 'all' } })).status, 400);
  assert.equal((await ctx.call('POST', 'activity', { body: { ...training(EVENT1), completedLineIds: [...lines.map((l) => l.id), 'forged-line'] } })).status, 200);
}

// Server time, streak summaries, milestone retention (28-33)
{
  const ctx = setup();
  const r = await ctx.call('POST', 'activity', { body: { ...puzzle(), completedAt: '2001-01-01T00:00:00Z' } });
  assert.equal(r.body.calendar.at(-1).date, '2026-10-22', 'client timestamp is ignored; server time determines the day');
  const dates = ['2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21'];
  ctx.dbState.events.push(...dates.map((local_date, i) => ({ id: 'old-' + i, user_id: A, local_date, source_event_id: 'old-source-' + i, activity_type: 'puzzle' })));
  const state = await ctx.call('GET', 'state');
  assert.equal(state.body.currentStreak, 7);
  assert.ok(state.body.bestStreak >= 7);
  assert.ok(state.body.milestones.some((m) => m.days === 7 && m.earned));
  assert.ok(Array.isArray(state.body.calendar));
}

console.log('Daily streak endpoint: 33 assertions passed.');

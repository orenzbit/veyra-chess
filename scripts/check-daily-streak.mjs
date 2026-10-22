import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  addDateDays, buildCalendar, calculateStreak, isValidDateKey, localDateFor,
  normalizeTimezone, shouldApplyPendingTimezone, validateActivityBody,
} from '../netlify/functions/lib/daily-streak.mjs';

let checks = 0;
function check(condition, message) { assert.ok(condition, message); checks += 1; }
function equal(actual, expected, message) { assert.equal(actual, expected, message); checks += 1; }
function throws(fn, message) { assert.throws(fn, undefined, message); checks += 1; }

const today = '2026-10-22';
const uuid = '8f5b2cb1-1b3d-4a8c-a1c7-9a8fbb2a2a10';

// Part A: date math, local time and streak rules (30+ independent checks).
check(isValidDateKey('2024-02-29'), 'leap day should be valid');
check(!isValidDateKey('2025-02-29'), 'non-leap February 29 should be invalid');
check(!isValidDateKey('2026-13-01'), 'month 13 should be invalid');
check(!isValidDateKey('2026-04-31'), 'April 31 should be invalid');
check(!isValidDateKey('22-10-2026'), 'date must use ISO local-date format');
equal(addDateDays('2024-02-28', 1), '2024-02-29', 'date math must cross leap day');
equal(addDateDays('2024-02-29', 1), '2024-03-01', 'date math must leave leap day');
equal(addDateDays('2026-01-01', -1), '2025-12-31', 'date math must cross year backwards');
equal(addDateDays('2026-12-31', 1), '2027-01-01', 'date math must cross year forwards');
throws(() => addDateDays('bad-date', 1), 'bad date arithmetic must reject invalid dates');
equal(normalizeTimezone('Asia/Jerusalem'), 'Asia/Jerusalem', 'valid IANA timezone should survive');
equal(normalizeTimezone('not/a-zone', 'UTC'), 'UTC', 'invalid timezone should use safe fallback');
equal(normalizeTimezone('x'.repeat(101), 'UTC'), 'UTC', 'oversized timezone should be rejected');
equal(localDateFor('2026-10-22T21:30:00.000Z', 'Asia/Jerusalem'), '2026-10-23', 'local date must be computed in requested timezone');
equal(localDateFor('2026-10-22T20:30:00.000Z', 'Asia/Jerusalem'), '2026-10-22', 'local date before midnight must stay on same day');
equal(localDateFor('2026-03-29T00:30:00.000Z', 'Asia/Jerusalem'), '2026-03-29', 'DST transition must not shift the calendar date incorrectly');
throws(() => localDateFor('not-a-time', 'UTC'), 'invalid instant must be rejected');
throws(() => localDateFor('2026-01-01T00:00:00Z', 'bad-zone'), 'invalid timezone must be rejected by local date conversion');
equal(calculateStreak([], today).currentStreak, 0, 'new user should have zero current streak');
equal(calculateStreak([today], today).currentStreak, 1, 'today activity should count today');
equal(calculateStreak(['2026-10-21'], today).currentStreak, 1, 'yesterday activity remains active while today is open');
equal(calculateStreak(['2026-10-20'], today).currentStreak, 0, 'streak older than yesterday should be broken');
equal(calculateStreak(['2026-10-20', '2026-10-21', today], today).currentStreak, 3, 'three consecutive dates should make three-day streak');
equal(calculateStreak(['2026-10-18', '2026-10-19', '2026-10-21'], today).longestStreak, 2, 'gap must split historical streaks');
equal(calculateStreak([today, today, today], today).longestStreak, 1, 'duplicate activity dates count once');
equal(calculateStreak([today, '2026-10-20', '2026-10-21'], today).currentStreak, 3, 'unordered input should be normalized');
equal(calculateStreak([today, '2027-01-01'], today).longestStreak, 1, 'future dates must never inflate a streak');
check(calculateStreak(Array.from({ length: 7 }, (_, i) => addDateDays(today, i - 6)), today).milestonesReached.includes(7), 'seven-day milestone should be derived from history');
check(!calculateStreak(['2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21'], today).milestonesReached.includes(7), 'six days must not grant seven-day milestone');
equal(buildCalendar([{ local_date: today }, { local_date: today }, { local_date: '2026-10-20' }], today, 3)[2].activityCount, 2, 'calendar must count multiple events without creating extra streak days');
equal(buildCalendar([{ local_date: today }], today, 3)[2].qualified, true, 'calendar must mark qualified day');
equal(buildCalendar([], today, 3)[2].isToday, true, 'calendar must mark today');
throws(() => buildCalendar([], today, 0), 'calendar must reject empty range');
throws(() => calculateStreak([], 'bad-date'), 'streak calculator must reject invalid today');

// Part B: request validation, timezone transition policy and server/API contract (20+ checks).
const validBody = { eventId: uuid, puzzleId: '0123456789abcdef', move: 'e2e4', timezoneId: 'Asia/Jerusalem', completedAt: '2099-01-01T00:00:00Z' };
check(validateActivityBody(validBody).ok, 'valid puzzle activity payload should pass');
equal(validateActivityBody(null).field, 'body', 'null payload must fail');
equal(validateActivityBody([]).field, 'body', 'array payload must fail');
equal(validateActivityBody({ ...validBody, eventId: 'not-uuid' }).field, 'eventId', 'event id must be a UUID');
equal(validateActivityBody({ ...validBody, puzzleId: 'bad' }).field, 'puzzleId', 'puzzle id must match the seed identifier format');
equal(validateActivityBody({ ...validBody, move: 'e9e4' }).field, 'move', 'illegal square format must fail validation');
equal(validateActivityBody({ ...validBody, move: 'e2e4qxyz' }).field, 'move', 'oversized move string must fail validation');
equal(validateActivityBody({ ...validBody, timezoneId: 7 }).field, 'timezoneId', 'timezone type must be validated');
equal(validateActivityBody({ ...validBody, timezoneId: 'x'.repeat(101) }).field, 'timezoneId', 'timezone length must be bounded');
equal(validateActivityBody(validBody).value.eventId, uuid, 'valid event id should be normalized without mutation');
check(shouldApplyPendingTimezone('Asia/Jerusalem', 'Europe/London', '2026-10-22T08:00:00Z', '2026-10-22T20:00:00Z') === false, 'timezone change must not apply on request day');
check(shouldApplyPendingTimezone('Asia/Jerusalem', 'Europe/London', '2026-10-22T08:00:00Z', '2026-10-22T22:30:00Z') === true, 'timezone change should apply after old-zone local day boundary');
check(shouldApplyPendingTimezone('Asia/Jerusalem', 'Europe/London', '2026-10-22T08:00:00Z', '2026-10-23T22:00:00Z', '2026-10-24') === false, 'timezone change must wait if the new zone would put the latest qualified date in the future');
check(shouldApplyPendingTimezone('Asia/Jerusalem', 'Europe/London', '2026-10-22T08:00:00Z', '2026-10-24T22:00:00Z', '2026-10-24') === true, 'timezone change may apply once the new zone catches up to the last qualified date');
check(shouldApplyPendingTimezone('UTC', 'UTC', '2026-10-22T08:00:00Z', '2026-10-23T08:00:00Z') === false, 'same timezone should not trigger a change');
check(shouldApplyPendingTimezone('UTC', 'Europe/London', 'bad-time', '2026-10-23T08:00:00Z') === false, 'invalid timezone request timestamp should not apply');
const endpoint = await readFile('netlify/functions/daily-streak.mjs', 'utf8');
for (const token of [
  'sameOrigin(event)', 'strictSameOrigin(event)', 'currentSession', 'DAILY_STREAK_ENABLED',
  'user_daily_streak_settings', 'user_daily_streak_events', 'moveSolves(record, activity.move)', 'normalizeTimezone(activity.timezoneId, \'\')',
  'localDateFor(completedAt, settings.timezone_id)', 'event_id', 'activity_not_verified',
  'rateLimit(requests', 'Buffer.byteLength', 'method_not_allowed', 'UNAUTHENTICATED',
  'pending_timezone_id', 'shouldApplyPendingTimezone', 'newZoneHasCaughtUp', 'latestRows', 'cache-control', 'offset=' ,
  'calculateStreak(events.map((e) => e.local_date), today)', 'buildCalendar(events, today, 35)',
]) check(endpoint.includes(token), 'API security/data contract missing: ' + token);
check(!/body\.(completedAt|localDate|qualifiedDate)\s*\)/.test(endpoint), 'server must not trust client-provided completion date');

// Part C: database schema isolation and idempotency contract (20+ checks).
const schema = await readFile('public/data/supabase-schema.sql', 'utf8');
const migration = await readFile('supabase/migrations/20261022000000_daily_streak.sql', 'utf8');
for (const token of [
  'user_daily_streak_settings', 'user_daily_streak_events', 'references auth.users(id) on delete cascade',
  'timezone_id text not null', 'pending_timezone_id text', 'timezone_change_requested_at timestamptz',
  'event_id uuid not null', 'activity_type text not null', 'source_id text not null',
  'completed_at timestamptz not null', 'local_date date not null', 'primary key (user_id, event_id)',
  "activity_type in ('puzzle', 'training')", 'enable row level security',
  'revoke all on table public.user_daily_streak_settings, public.user_daily_streak_events from public, anon, authenticated',
  'grant select, insert, update, delete on table public.user_daily_streak_settings, public.user_daily_streak_events to service_role',
  'user_daily_streak_events_user_date_idx', 'user_daily_streak_events_user_completed_idx', 'user_daily_streak_events_user_date_type_uidx',
]) check(migration.includes(token), 'migration contract missing: ' + token);
check(schema.includes(migration.trim()), 'canonical schema should include the exact migration SQL');
check(!/grant .* to anon|grant .* to authenticated/i.test(migration), 'migration must not grant direct browser access');
check(!/create policy/i.test(migration), 'migration must not add direct browser policies');
check(migration.includes('primary key (user_id, event_id)'), 'event ID must be idempotent per account');
check(migration.includes('on public.user_daily_streak_events(user_id, local_date, activity_type)'), 'unique daily category index must bound event growth');
check(migration.includes('activity_type in (\'puzzle\', \'training\')'), 'only known activity classes may be stored');
check(migration.includes('updated_at timestamptz not null default now()'), 'settings must track update time');
check(migration.includes('timezone_change_requested_at timestamptz'), 'timezone changes must be staged');
check(migration.includes('on public.user_daily_streak_events(user_id, local_date desc)'), 'date lookup must be indexed');
check(migration.includes('on public.user_daily_streak_events(user_id, completed_at desc)'), 'event history must be indexed');


const { createHandler } = await import('../netlify/functions/daily-streak.mjs');
let nowMs = Date.parse('2026-10-22T21:30:00.000Z');
let settings = null;
const events = [];
function makeDb() {
  return async (path, options = {}) => {
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body) : {};
    if (path === 'user_daily_streak_settings' && method === 'POST') {
      if (settings) throw Object.assign(new Error('duplicate settings'), { status: 409 });
      settings = { ...body, pending_timezone_id: null, timezone_change_requested_at: null };
      return [settings];
    }
    if (path.startsWith('user_daily_streak_settings?')) {
      if (method === 'PATCH') { settings = { ...(settings || {}), ...body }; return settings ? [settings] : []; }
      return settings ? [{ ...settings }] : [];
    }
    if (path === 'user_daily_streak_events' && method === 'POST') {
      if (events.some((e) => e.user_id === body.user_id && e.event_id === body.event_id)) throw Object.assign(new Error('duplicate event'), { status: 409 });
      if (events.some((e) => e.user_id === body.user_id && e.local_date === body.local_date && e.activity_type === body.activity_type)) throw Object.assign(new Error('duplicate daily category'), { status: 409 });
      events.push({ ...body });
      return [];
    }
    if (path.startsWith('user_daily_streak_events?')) {
      const url = new URL('https://db.test/' + path);
      const userFilter = url.searchParams.get('user_id') || '';
      const eventFilter = url.searchParams.get('event_id') || '';
      let rows = events.filter((e) => !userFilter || userFilter === 'eq.' + e.user_id);
      if (eventFilter) rows = rows.filter((e) => eventFilter === 'eq.' + e.event_id);
      const dateFilter = url.searchParams.get('local_date') || '';
      const activityFilter = url.searchParams.get('activity_type') || '';
      if (dateFilter) rows = rows.filter((e) => dateFilter === 'eq.' + e.local_date);
      if (activityFilter) rows = rows.filter((e) => activityFilter === 'eq.' + e.activity_type);
      const offset = Number(url.searchParams.get('offset') || 0);
      const limit = Number(url.searchParams.get('limit') || 1000);
      return rows.slice(offset, offset + limit).map((e) => ({ ...e }));
    }
    throw new Error('unexpected database path: ' + path);
  };
}
const baseEvent = { headers: { origin: 'https://app.test' }, rawUrl: 'https://app.test/api/daily-streak' };
const enabledHandler = createHandler({
  currentSession: () => ({ user_id: 'user-1' }), db: makeDb(), now: () => nowMs,
  env: { DAILY_STREAK_ENABLED: 'true' },
  loadSeeds: async () => [{ id: '0123456789abcdef', solution: ['e2e4'], accepted: ['e2e4'] }],
});
const response = async (handler, event) => {
  const result = await handler({ ...baseEvent, ...event });
  let body = {};
  try { body = JSON.parse(result.body); } catch {}
  return { status: result.statusCode, body };
};
let r = await response(enabledHandler, { httpMethod: 'GET', queryStringParameters: { action: 'state', timezoneId: 'Asia/Jerusalem' } });
equal(r.status, 200, 'state endpoint should return success for authenticated user');
equal(r.body.timezoneId, 'Asia/Jerusalem', 'state should use the supplied IANA timezone before settings exist');
equal(settings, null, 'read-only state request must not create database settings');
equal(r.body.currentStreak, 0, 'new account should start at zero');
equal(r.body.calendar.length, 35, 'state should include 35 calendar days');
r = await response(enabledHandler, { httpMethod: 'GET', queryStringParameters: { action: 'state', timezoneId: 'not/a-zone' } });
equal(r.status, 400, 'invalid timezone must be rejected');
r = await response(enabledHandler, { httpMethod: 'POST', queryStringParameters: { action: 'record' }, body: '{bad json}' });
equal(r.status, 400, 'malformed JSON must be rejected');
r = await response(enabledHandler, { httpMethod: 'POST', queryStringParameters: { action: 'missing' }, body: '{}' });
equal(r.status, 400, 'unknown action must be rejected');
r = await response(enabledHandler, { httpMethod: 'PUT', queryStringParameters: { action: 'state' } });
equal(r.status, 405, 'unsupported HTTP method must be rejected');
r = await response(enabledHandler, { httpMethod: 'GET', rawUrl: 'https://evil.test/api/daily-streak', queryStringParameters: { action: 'state' } });
equal(r.status, 403, 'cross-origin GET must be rejected');
r = await response(enabledHandler, { httpMethod: 'POST', headers: {}, rawUrl: 'https://app.test/api/daily-streak', queryStringParameters: { action: 'record' }, body: '{}' });
equal(r.status, 403, 'state-changing request without Origin or Referer must be rejected');
const disabledHandler = createHandler({ currentSession: () => ({ user_id: 'user-1' }), db: makeDb(), now: () => nowMs, env: {}, loadSeeds: async () => [] });
r = await response(disabledHandler, { httpMethod: 'GET', queryStringParameters: { action: 'state' } });
equal(r.status, 404, 'feature flag must keep daily streak dormant by default');
const anonymousHandler = createHandler({ currentSession: () => null, db: makeDb(), now: () => nowMs, env: { DAILY_STREAK_ENABLED: 'true' }, loadSeeds: async () => [] });
r = await response(anonymousHandler, { httpMethod: 'GET', queryStringParameters: { action: 'state' } });
equal(r.status, 401, 'anonymous account access must be rejected');
r = await response(enabledHandler, { httpMethod: 'POST', queryStringParameters: { action: 'record' }, body: JSON.stringify({ eventId: 'bad', puzzleId: '0123456789abcdef', move: 'e2e4' }) });
equal(r.status, 400, 'invalid event ID must be rejected by API');
r = await response(enabledHandler, { httpMethod: 'POST', queryStringParameters: { action: 'record' }, body: JSON.stringify({ eventId: uuid, puzzleId: '0123456789abcdef', move: 'd2d4', timezoneId: 'Asia/Jerusalem' }) });
equal(r.status, 422, 'unverified puzzle answer must not qualify');
r = await response(enabledHandler, { httpMethod: 'POST', queryStringParameters: { action: 'record' }, body: JSON.stringify({ eventId: uuid, puzzleId: '0123456789abcdef', move: 'e2e4', timezoneId: 'not/a-zone' }) });
equal(r.status, 400, 'invalid timezone must be rejected on activity submission');
r = await response(enabledHandler, { httpMethod: 'POST', queryStringParameters: { action: 'record' }, body: 'x'.repeat(17000) });
equal(r.status, 413, 'oversized request body must be rejected');
const eventId1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
r = await response(enabledHandler, { httpMethod: 'POST', queryStringParameters: { action: 'record' }, body: JSON.stringify({ eventId: eventId1, puzzleId: '0123456789abcdef', move: 'e2e4', timezoneId: 'Asia/Jerusalem', completedAt: '2099-01-01T00:00:00Z' }) });
equal(r.status, 200, 'verified puzzle solve should be recorded');
equal(r.body.today, '2026-10-23', 'server time and timezone must determine the qualified date, not client timestamp');
equal(r.body.currentStreak, 1, 'first verified day should produce a one-day streak');
equal(events.length, 1, 'first event should create exactly one database row');
r = await response(enabledHandler, { httpMethod: 'POST', queryStringParameters: { action: 'record' }, body: JSON.stringify({ eventId: eventId1, puzzleId: '0123456789abcdef', move: 'e2e4', timezoneId: 'Asia/Jerusalem' }) });
equal(r.body.duplicate, true, 'retry with same event ID should be idempotent');
equal(events.length, 1, 'retry must not create duplicate row');
r = await response(enabledHandler, { httpMethod: 'POST', queryStringParameters: { action: 'record' }, body: JSON.stringify({ eventId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', puzzleId: '0123456789abcdef', move: 'e2e4', timezoneId: 'Asia/Jerusalem' }) });
equal(r.body.currentStreak, 1, 'multiple verified activities on one day must count as one streak day');
equal(r.body.duplicate, true, 'same activity category on the same date should not create another row');
equal(events.length, 1, 'same-day repeated puzzle solves must be bounded to one event row');
events.push({ user_id: 'user-1', event_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', activity_type: 'training', source_id: 'training-test', completed_at: new Date(nowMs).toISOString(), local_date: '2026-10-23', timezone_id: 'Asia/Jerusalem' });
r = await response(enabledHandler, { httpMethod: 'GET', queryStringParameters: { action: 'state', timezoneId: 'Asia/Jerusalem' } });
equal(r.body.calendar.find((d) => d.date === '2026-10-23').activityCount, 2, 'calendar should distinguish puzzle and training activity categories while streak counts one day');
r = await response(enabledHandler, { httpMethod: 'POST', queryStringParameters: { action: 'timezone' }, body: JSON.stringify({ timezoneId: 'Europe/London' }) });
equal(r.status, 200, 'timezone change request should be accepted');
equal(r.body.timezoneId, 'Asia/Jerusalem', 'timezone change must not apply immediately');
equal(r.body.pendingTimezoneId, 'Europe/London', 'pending timezone should be visible');
nowMs = Date.parse('2026-10-23T22:00:00.000Z');
r = await response(enabledHandler, { httpMethod: 'GET', queryStringParameters: { action: 'state', timezoneId: 'Europe/London' } });
equal(r.body.timezoneId, 'Europe/London', 'pending timezone should apply after the next old-zone local day starts');
equal(events.length, 2, 'timezone change must not duplicate activity events');

const page = await readFile('src/puzzle-page.ts', 'utf8');
const styles = await readFile('public/styles.css', 'utf8');
const apiClient = await readFile('src/puzzle/api.ts', 'utf8');
const outbox = await readFile('src/puzzle/outbox.ts', 'utf8');
const puzzleService = await readFile('netlify/functions/lib/puzzle-service.mjs', 'utf8');
const pkgText = await readFile('package.json', 'utf8');
const workflowText = await readFile('.github/workflows/verify.yml', 'utf8');
for (const token of [
  'daily-streak-card', 'daily-streak-calendar', 'daily-streak-numbers', 'daily-streak-milestone', 'currentStreak',
  'longestStreak', 'dailyPending', 'dailyEventId()', 'dailyQueueKey(userId)',
  'readDailyQueue()', 'writeDailyQueue(', 'flushDailyQueue()', 'bounded.length', 'recordDailyActivity(cur.id, uci)',
  '\'aria-label\': \'לוח פעילות של 35 ימים\'', 'הרצף נשאר פעיל עד סוף היום המקומי', 'pendingTimezoneId', 'החל אזור זמן של המכשיר מהיום הבא',
  'setDailyStatus(\'disabled\')', 'התחבר כדי לשמור רצף יומי', 'addEventListener(\'online\'', 'credentials: \'same-origin\'',
  'DAILY_STREAK_ENABLED', 'const activityType = attempt.mode === \'regular\' ? \'training\' : \'puzzle\'',
  'localDateFor(completedAt, timezoneId)', 'timezoneId?: string', 'timezoneId: (() =>',
  'check:daily-streak', 'npm run check:daily-streak',
]) check((page + '\n' + puzzleService + '\n' + apiClient + '\n' + outbox + '\n' + pkgText + '\n' + workflowText).includes(token), 'UI/integration wiring missing: ' + token);
for (const token of [
  '.daily-streak-calendar', 'grid-template-columns: repeat(7, minmax(0, 1fr))',
  '.daily-streak-day.is-qualified', '.daily-streak-day.is-today',
  '@media (max-width: 520px)', '@media (prefers-reduced-motion: reduce)',
  'aspect-ratio: 1', 'font-variant-numeric: tabular-nums',
]) check(styles.includes(token), 'responsive/accessibility CSS missing: ' + token);

console.log('PASS: ' + checks + ' daily-streak checks across date math, timezone policy, API runtime/security, UI wiring, schema isolation and idempotency.');

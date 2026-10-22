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
check(shouldApplyPendingTimezone('UTC', 'UTC', '2026-10-22T08:00:00Z', '2026-10-23T08:00:00Z') === false, 'same timezone should not trigger a change');
check(shouldApplyPendingTimezone('UTC', 'Europe/London', 'bad-time', '2026-10-23T08:00:00Z') === false, 'invalid timezone request timestamp should not apply');
const endpoint = await readFile('netlify/functions/daily-streak.mjs', 'utf8');
for (const token of [
  'sameOrigin(event)', 'strictSameOrigin(event)', 'currentSession', 'DAILY_STREAK_ENABLED',
  'user_daily_streak_settings', 'user_daily_streak_events', 'moveSolves(record, activity.move)',
  'localDateFor(completedAt, settings.timezone_id)', 'event_id', 'activity_not_verified',
  'rateLimit(requests', 'Buffer.byteLength', 'method_not_allowed', 'UNAUTHENTICATED',
  'pending_timezone_id', 'shouldApplyPendingTimezone', 'cache-control',
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
  'user_daily_streak_events_user_date_idx', 'user_daily_streak_events_user_completed_idx',
]) check(migration.includes(token), 'migration contract missing: ' + token);
check(schema.includes(migration.trim()), 'canonical schema should include the exact migration SQL');
check(!/grant .* to anon|grant .* to authenticated/i.test(migration), 'migration must not grant direct browser access');
check(!/create policy/i.test(migration), 'migration must not add direct browser policies');
check(migration.includes('primary key (user_id, event_id)'), 'event ID must be idempotent per account');
check(migration.includes('activity_type in (\'puzzle\', \'training\')'), 'only known activity classes may be stored');
check(migration.includes('updated_at timestamptz not null default now()'), 'settings must track update time');
check(migration.includes('timezone_change_requested_at timestamptz'), 'timezone changes must be staged');
check(migration.includes('on public.user_daily_streak_events(user_id, local_date desc)'), 'date lookup must be indexed');
check(migration.includes('on public.user_daily_streak_events(user_id, completed_at desc)'), 'event history must be indexed');

console.log('PASS: ' + checks + ' daily-streak checks across date math, timezone policy, API security contracts, schema isolation and idempotency.');

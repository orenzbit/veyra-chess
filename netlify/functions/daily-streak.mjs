import { clientIp, json, rateLimit, sameOrigin, strictSameOrigin, supabaseRequest } from './_lib.mjs';
import { currentSession } from './auth.mjs';
import { loadSeeds } from './lib/puzzle-kits.mjs';
import { moveSolves } from './lib/puzzle-service.mjs';
import {
  buildCalendar, calculateStreak, localDateFor, normalizeTimezone, shouldApplyPendingTimezone, validateActivityBody,
} from './lib/daily-streak.mjs';

const NO_STORE = { 'cache-control': 'no-store' };
const requests = new Map();
const MAX_BODY_BYTES = 16 * 1024;
const EVENT_SELECT = 'event_id,activity_type,source_id,completed_at,local_date,timezone_id';

export function createHandler(deps = {}) {
  const session = deps.currentSession || currentSession;
  const db = deps.db || supabaseRequest;
  const now = deps.now || Date.now;
  const env = deps.env || process.env;
  const getSeeds = deps.loadSeeds || loadSeeds;

  const fail = (status, error, extra = {}) => json(status, { ok: false, error, ...extra }, NO_STORE);

  async function settingsFor(userId, candidateTimezone, createIfMissing = false) {
    const path = 'user_daily_streak_settings?user_id=eq.' + encodeURIComponent(userId) + '&select=user_id,timezone_id,pending_timezone_id,timezone_change_requested_at&limit=1';
    let rows = await db(path);
    let settings = Array.isArray(rows) ? rows[0] : null;
    if (!settings && !createIfMissing) {
      return { user_id: userId, timezone_id: normalizeTimezone(candidateTimezone || 'UTC', 'UTC'), pending_timezone_id: null, timezone_change_requested_at: null };
    }
    if (!settings) {
      const timezoneId = normalizeTimezone(candidateTimezone || 'UTC', 'UTC');
      try {
        const inserted = await db('user_daily_streak_settings', {
          method: 'POST', headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ user_id: userId, timezone_id: timezoneId }),
        });
        settings = Array.isArray(inserted) ? inserted[0] : inserted;
      } catch {
        rows = await db(path);
        settings = Array.isArray(rows) ? rows[0] : null;
        if (!settings) throw new Error('STREAK_SETTINGS_UNAVAILABLE');
      }
    }
    if (settings.pending_timezone_id) {
      const latestRows = await db('user_daily_streak_events?user_id=eq.' + encodeURIComponent(userId) + '&select=local_date&order=local_date.desc&limit=1');
      const lastQualifiedDate = Array.isArray(latestRows) && latestRows[0] ? latestRows[0].local_date : null;
      if (shouldApplyPendingTimezone(settings.timezone_id, settings.pending_timezone_id, settings.timezone_change_requested_at, now(), lastQualifiedDate)) {
      const pending = settings.pending_timezone_id;
      await db('user_daily_streak_settings?user_id=eq.' + encodeURIComponent(userId), {
        method: 'PATCH', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ timezone_id: pending, pending_timezone_id: null, timezone_change_requested_at: null, updated_at: new Date(now()).toISOString() }),
      });
      settings = { ...settings, timezone_id: pending, pending_timezone_id: null, timezone_change_requested_at: null };
      }
    }
    return settings;
  }

  async function readEvents(userId) {
    const all = [];
    for (let offset = 0; offset < 10000; offset += 1000) {
      const rows = await db('user_daily_streak_events?user_id=eq.' + encodeURIComponent(userId) + '&select=' + EVENT_SELECT + '&order=local_date.asc&limit=1000&offset=' + offset);
      if (!Array.isArray(rows) || !rows.length) break;
      all.push(...rows);
      if (rows.length < 1000) break;
    }
    return all;
  }

  async function stateFor(userId, candidateTimezone) {
    const settings = await settingsFor(userId, candidateTimezone, false);
    const events = await readEvents(userId);
    const today = localDateFor(now(), settings.timezone_id);
    const streak = calculateStreak(events.map((e) => e.local_date), today);
    return {
      ok: true,
      serverTime: new Date(now()).toISOString(),
      timezoneId: settings.timezone_id,
      pendingTimezoneId: settings.pending_timezone_id || null,
      today,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastQualifiedDate: streak.lastQualifiedDate,
      milestonesReached: streak.milestonesReached,
      calendar: buildCalendar(events, today, 35),
      qualifiedDates: streak.qualifiedDates,
    };
  }

  return async function handler(event) {
    try {
      if (!sameOrigin(event)) return fail(403, 'forbidden');
      const method = event.httpMethod;
      if (method !== 'GET' && method !== 'POST') return fail(405, 'method_not_allowed');
      if (method === 'POST' && !strictSameOrigin(event)) return fail(403, 'forbidden');
      if (Buffer.byteLength(String(event.body || ''), 'utf8') > MAX_BODY_BYTES) return fail(413, 'too_large');
      if (String(env.DAILY_STREAK_ENABLED || '').toLowerCase() !== 'true') return fail(404, 'DISABLED');
      const user = session(event);
      if (!user?.user_id) return fail(401, 'UNAUTHENTICATED');
      if (!rateLimit(requests, clientIp(event) + '|' + user.user_id, 60, 60000)
        || !rateLimit(requests, 'user|' + user.user_id, 120, 60000)) return fail(429, 'rate_limited');

      const query = event.queryStringParameters || {};
      const action = String(query.action || '');
      if (method === 'GET' && action === 'state') {
        const timezoneId = query.timezoneId ? normalizeTimezone(query.timezoneId, '') : 'UTC';
        if (!timezoneId) return fail(400, 'bad_request', { field: 'timezoneId' });
        return json(200, await stateFor(String(user.user_id), timezoneId), NO_STORE);
      }
      if (method !== 'POST') return fail(400, 'bad_request', { field: 'action' });
      let body = {};
      try { body = event.body ? JSON.parse(event.body) : {}; } catch { return fail(400, 'bad_request', { field: 'json' }); }

      if (action === 'timezone') {
        const timezoneId = normalizeTimezone(body.timezoneId, '');
        if (!timezoneId) return fail(400, 'bad_request', { field: 'timezoneId' });
        const settings = await settingsFor(String(user.user_id), timezoneId, true);
        if (settings.timezone_id !== timezoneId) {
          await db('user_daily_streak_settings?user_id=eq.' + encodeURIComponent(user.user_id), {
            method: 'PATCH', headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({ pending_timezone_id: timezoneId, timezone_change_requested_at: new Date(now()).toISOString(), updated_at: new Date(now()).toISOString() }),
          });
        }
        return json(200, await stateFor(String(user.user_id), timezoneId), NO_STORE);
      }

      if (action !== 'record') return fail(400, 'bad_request', { field: 'action' });
      const validated = validateActivityBody(body);
      if (!validated.ok) return fail(400, 'bad_request', { field: validated.field });
      const activity = validated.value;
      if (activity.timezoneId !== undefined && !normalizeTimezone(activity.timezoneId, '')) return fail(400, 'bad_request', { field: 'timezoneId' });
      const settings = await settingsFor(String(user.user_id), activity.timezoneId || 'UTC', true);
      const seeds = await getSeeds();
      const record = (Array.isArray(seeds) ? seeds : []).find((p) => p.id === activity.puzzleId);
      if (!record || !moveSolves(record, activity.move)) return fail(422, 'activity_not_verified');
      const eventPath = 'user_daily_streak_events?user_id=eq.' + encodeURIComponent(user.user_id) + '&event_id=eq.' + encodeURIComponent(activity.eventId) + '&select=event_id&limit=1';
      const existing = await db(eventPath);
      const completedAt = new Date(now()).toISOString();
      const localDate = localDateFor(completedAt, settings.timezone_id);
      let duplicate = Array.isArray(existing) && existing.length > 0;
      if (!duplicate) {
        const sameDayPath = 'user_daily_streak_events?user_id=eq.' + encodeURIComponent(user.user_id) + '&local_date=eq.' + encodeURIComponent(localDate) + '&activity_type=eq.puzzle&select=event_id&limit=1';
        const sameDay = await db(sameDayPath);
        duplicate = Array.isArray(sameDay) && sameDay.length > 0;
        if (!duplicate) {
          try {
            await db('user_daily_streak_events', {
              method: 'POST', headers: { Prefer: 'return=minimal' },
              body: JSON.stringify({
                user_id: String(user.user_id), event_id: activity.eventId, activity_type: 'puzzle',
                source_id: activity.puzzleId, completed_at: completedAt,
                local_date: localDate, timezone_id: settings.timezone_id,
              }),
            });
          } catch (error) {
            const [byId, byDay] = await Promise.all([
              db(eventPath).catch(() => []),
              db(sameDayPath).catch(() => []),
            ]);
            if ((!Array.isArray(byId) || !byId.length) && (!Array.isArray(byDay) || !byDay.length)) throw error;
            duplicate = true;
          }
        }
      }
      const state = await stateFor(String(user.user_id), settings.timezone_id);
      return json(200, { ...state, accepted: true, duplicate }, NO_STORE);
    } catch {
      return fail(503, 'streak_unavailable');
    }
  };
}

export const handler = createHandler();

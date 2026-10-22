import { readFile } from 'node:fs/promises';
import { clientIp, json, rateLimit, sameOrigin, strictSameOrigin, supabaseRequest } from './_lib.mjs';
import { currentSession } from './auth.mjs';
import { loadSeeds } from './lib/puzzle-kits.mjs';
import { moveSolves } from './lib/puzzle-service.mjs';
import {
  DEFAULT_TIMEZONE, STREAK_MILESTONES, addDateDays, calculateStreak, isDateKey,
  isValidTimeZone, localDateAt, nextLocalDate, summarizeDailyStreak,
} from './lib/daily-streak-core.mjs';

const NO_STORE = { 'cache-control': 'no-store' };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 16 * 1024;
const DEFAULT_SETTINGS = Object.freeze({
  timezone_id: DEFAULT_TIMEZONE, pending_timezone_id: null, timezone_effective_on: null,
  best_streak: 0, milestones_awarded: [],
});
const requests = new Map();
let seedCache;
let repertoireCache;

async function readRepertoire() {
  if (!repertoireCache) {
    repertoireCache = readFile(new URL('../../public/data/repertoire.json', import.meta.url), 'utf8')
      .then((raw) => JSON.parse(raw))
      .catch((error) => { repertoireCache = null; throw error; });
  }
  return repertoireCache;
}

function validBody(event) {
  try {
    if (Buffer.byteLength(String(event.body || ''), 'utf8') > MAX_BODY_BYTES) return { error: 'too_large', status: 413 };
    return { body: event.body ? JSON.parse(event.body) : {} };
  } catch { return { error: 'bad_request', status: 400 }; }
}

function effectiveTimezone(settings, nowMs) {
  const current = settings?.timezone_id || DEFAULT_TIMEZONE;
  if (settings?.pending_timezone_id && isValidTimeZone(settings.pending_timezone_id)
    && isDateKey(settings.timezone_effective_on)
    && localDateAt(nowMs, current) >= settings.timezone_effective_on) {
    return settings.pending_timezone_id;
  }
  return current;
}

function normalizeSettings(row, nowMs) {
  const settings = { ...DEFAULT_SETTINGS, ...(row || {}) };
  if (settings.pending_timezone_id && isDateKey(settings.timezone_effective_on)
    && localDateAt(nowMs, settings.timezone_id || DEFAULT_TIMEZONE) >= settings.timezone_effective_on) {
    settings.timezone_id = settings.pending_timezone_id;
    settings.pending_timezone_id = null;
    settings.timezone_effective_on = null;
  }
  settings.best_streak = Number.isInteger(Number(settings.best_streak)) ? Math.max(0, Number(settings.best_streak)) : 0;
  settings.milestones_awarded = Array.isArray(settings.milestones_awarded)
    ? settings.milestones_awarded.filter((n) => STREAK_MILESTONES.includes(Number(n))).map(Number)
    : [];
  return settings;
}

function coreLines(opening) {
  const lines = Array.isArray(opening?.lines) ? opening.lines : [];
  const need = Math.min(6, lines.length);
  const selected = lines.filter((line) => line.star);
  for (const line of lines) {
    if (selected.length >= need) break;
    if (!line.star) selected.push(line);
  }
  return selected;
}

async function verifyActivity(db, userId, body, getSeeds, getRepertoire) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, field: 'body' };
  if (!UUID_RE.test(String(body.sourceEventId || ''))) return { ok: false, field: 'sourceEventId' };
  if (body.activityType === 'puzzle') {
    const puzzleId = String(body.puzzleId || '');
    const move = String(body.move || '');
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(puzzleId) || !/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(move)) {
      return { ok: false, field: 'puzzle' };
    }
    let rec = (await getSeeds()).find((item) => item.id === puzzleId) || null;
    if (!rec && /^[0-9a-f]{16}$/i.test(puzzleId)) {
      try {
        const rows = await db(`user_puzzles?select=puzzle_id,fen,solution,accepted&user_id=eq.${encodeURIComponent(userId)}&puzzle_id=eq.${encodeURIComponent(puzzleId)}&limit=1`);
        if (Array.isArray(rows) && rows[0]) rec = { id: rows[0].puzzle_id, ...rows[0] };
      } catch { /* Personal puzzle tables may not be migrated; seed puzzles remain verifiable. */ }
    }
    if (!rec || !moveSolves(rec, move.toLowerCase())) return { ok: false, field: 'puzzle_not_solved' };
    return { ok: true, activityType: 'puzzle', sourceEventId: body.sourceEventId.toLowerCase(), metadata: { puzzleId } };
  }
  if (body.activityType === 'training') {
    const openingId = String(body.openingId || '');
    if (!/^[a-z0-9_-]{1,80}$/i.test(openingId) || !Array.isArray(body.completedLineIds)
      || body.completedLineIds.length > 100 || !body.completedLineIds.every((id) => typeof id === 'string' && id.length <= 100)) {
      return { ok: false, field: 'training' };
    }
    const repertoire = await getRepertoire();
    const opening = Array.isArray(repertoire) ? repertoire.find((item) => item.id === openingId) : null;
    if (!opening) return { ok: false, field: 'openingId' };
    const required = coreLines(opening).map((line) => line.id);
    const completed = new Set(body.completedLineIds);
    if (!required.length || required.some((id) => !completed.has(id))) return { ok: false, field: 'incomplete_training' };
    return { ok: true, activityType: 'training', sourceEventId: body.sourceEventId.toLowerCase(), metadata: { openingId } };
  }
  return { ok: false, field: 'activityType' };
}

export function createHandler(deps = {}) {
  const session = deps.currentSession || currentSession;
  const db = deps.db || supabaseRequest;
  const now = deps.now || Date.now;
  const getSeeds = deps.loadSeeds || (async () => (seedCache ||= await loadSeeds()));
  const getRepertoire = deps.loadRepertoire || readRepertoire;

  async function getSettings(userId) {
    const rows = await db(`user_daily_streak_settings?select=*&user_id=eq.${encodeURIComponent(userId)}&limit=1`);
    const settings = normalizeSettings(Array.isArray(rows) ? rows[0] : null, now());
    settings._exists = Array.isArray(rows) && rows.length > 0;
    return settings;
  }
  async function saveSettings(userId, settings) {
    const payload = {
      user_id: userId, timezone_id: settings.timezone_id || DEFAULT_TIMEZONE,
      pending_timezone_id: settings.pending_timezone_id || null,
      timezone_effective_on: settings.timezone_effective_on || null,
      best_streak: Math.max(0, Number(settings.best_streak) || 0),
      milestones_awarded: [...new Set((settings.milestones_awarded || []).filter((n) => STREAK_MILESTONES.includes(n)))],
      updated_at: new Date(now()).toISOString(),
    };
    const rows = await db('user_daily_streak_settings?on_conflict=user_id', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(payload),
    });
    const saved = normalizeSettings(Array.isArray(rows) && rows[0] ? rows[0] : payload, now());
    saved._exists = true;
    return saved;
  }
  async function getEvents(userId, today, timezoneId) {
    const from = addDateDays(today, -400);
    const rows = await db(`user_daily_streak_events?select=id,activity_type,source_event_id,local_date,timezone_id,verified_at&user_id=eq.${encodeURIComponent(userId)}&local_date=gte.${from}&order=local_date.asc&limit=10000`);
    return Array.isArray(rows) ? rows : [];
  }
  async function stateFor(userId) {
    let settings = await getSettings(userId);
    const nowMs = now();
    const tz = effectiveTimezone(settings, nowMs);
    if (tz !== settings.timezone_id) {
      settings = await saveSettings(userId, { ...settings, timezone_id: tz, pending_timezone_id: null, timezone_effective_on: null });
    }
    const today = localDateAt(nowMs, settings.timezone_id);
    const events = await getEvents(userId, today, settings.timezone_id);
    const summary = summarizeDailyStreak(events, settings, nowMs);
    const bestStreak = Math.max(settings.best_streak, summary.bestStreak);
    const awarded = new Set(settings.milestones_awarded);
    const newlyEarned = STREAK_MILESTONES.filter((days) => bestStreak >= days && !awarded.has(days));
    const allAwarded = [...awarded, ...newlyEarned];
    if (bestStreak !== settings.best_streak || newlyEarned.length) {
      settings = await saveSettings(userId, { ...settings, best_streak: bestStreak, milestones_awarded: allAwarded });
    }
    return {
      ok: true, timezoneId: settings.timezone_id, pendingTimezoneId: settings.pending_timezone_id,
      timezoneEffectiveOn: settings.timezone_effective_on, today: summary.today,
      currentStreak: summary.currentStreak, bestStreak: Math.max(bestStreak, summary.bestStreak),
      todayQualified: summary.todayQualified, canMaintainToday: summary.canMaintainToday,
      missedYesterday: summary.missedYesterday, streakThroughDate: summary.streakThroughDate,
      calendar: summary.calendar, milestones: STREAK_MILESTONES.map((days) => ({ days, earned: allAwarded.includes(days) })),
      newlyEarned,
    };
  }

  return async function handler(event) {
    const fail = (status, error, extra = {}) => json(status, { ok: false, error, ...extra }, NO_STORE);
    try {
      if (!sameOrigin(event)) return fail(403, 'forbidden');
      const method = event.httpMethod;
      if (method !== 'GET' && method !== 'POST') return fail(405, 'method_not_allowed');
      if (method === 'POST' && !strictSameOrigin(event)) return fail(403, 'forbidden');
      const user = session(event);
      if (!user?.user_id) return fail(401, 'UNAUTHENTICATED');
      if (!rateLimit(requests, `${clientIp(event)}|${user.user_id}`, 90, 60000)
        || !rateLimit(requests, `user|${user.user_id}`, 180, 60000)) {
        return json(429, { ok: false, error: 'rate_limited' }, { ...NO_STORE, 'retry-after': '60' });
      }
      const q = event.queryStringParameters || {};
      const action = String(q.action || '');
      if (method === 'GET' && action === 'state') return json(200, await stateFor(String(user.user_id)), NO_STORE);
      if (method !== 'POST') return fail(400, 'bad_request', { field: 'action' });
      const parsed = validBody(event);
      if (parsed.error) return fail(parsed.status, parsed.error);
      const body = parsed.body;
      if (action === 'settings') {
        const timezoneId = String(body.timezoneId || '');
        if (!isValidTimeZone(timezoneId)) return fail(400, 'bad_request', { field: 'timezoneId' });
        const current = await getSettings(String(user.user_id));
        const nowMs = now();
        const currentTz = effectiveTimezone(current, nowMs);
        if (currentTz === timezoneId) {
          const settings = await saveSettings(String(user.user_id), { ...current, timezone_id: currentTz, pending_timezone_id: null, timezone_effective_on: null });
          return json(200, { ok: true, timezoneId: settings.timezone_id, pendingTimezoneId: null, timezoneEffectiveOn: null }, NO_STORE);
        }
        if (!current._exists) {
          const settings = await saveSettings(String(user.user_id), { ...current, timezone_id: timezoneId, pending_timezone_id: null, timezone_effective_on: null });
          return json(200, { ok: true, timezoneId: settings.timezone_id, pendingTimezoneId: null, timezoneEffectiveOn: null }, NO_STORE);
        }
        const effectiveOn = nextLocalDate(nowMs, currentTz);
        const settings = await saveSettings(String(user.user_id), {
          ...current, timezone_id: currentTz, pending_timezone_id: timezoneId, timezone_effective_on: effectiveOn,
        });
        return json(200, { ok: true, timezoneId: settings.timezone_id, pendingTimezoneId: settings.pending_timezone_id, timezoneEffectiveOn: settings.timezone_effective_on }, NO_STORE);
      }
      if (action === 'activity') {
        const verified = await verifyActivity(db, String(user.user_id), body, getSeeds, getRepertoire);
        if (!verified.ok) return fail(400, 'activity_rejected', { field: verified.field });
        const settings = await getSettings(String(user.user_id));
        const timezoneId = effectiveTimezone(settings, now());
        const localDate = localDateAt(now(), timezoneId);
        const rows = await db('user_daily_streak_events?on_conflict=user_id,source_event_id', {
          method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
          body: JSON.stringify({
            user_id: String(user.user_id), source_event_id: verified.sourceEventId, activity_type: verified.activityType,
            local_date: localDate, timezone_id: timezoneId, verified_at: new Date(now()).toISOString(), metadata: verified.metadata,
          }),
        });
        const state = await stateFor(String(user.user_id));
        return json(200, { ...state, accepted: Array.isArray(rows) && rows.length > 0, duplicate: !(Array.isArray(rows) && rows.length > 0) }, NO_STORE);
      }
      return fail(400, 'bad_request', { field: 'action' });
    } catch (error) {
      return fail(503, 'streak_unavailable', { message: error?.message === 'invalid_time_zone' ? 'invalid_time_zone' : undefined });
    }
  };
}

export const handler = createHandler();

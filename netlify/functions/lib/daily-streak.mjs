const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PUZZLE_ID_RE = /^[0-9a-f]{16}$/;
const MOVE_RE = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
export const STREAK_MILESTONES = Object.freeze([7, 14, 30, 50, 100, 365]);

export function isValidDateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00.000Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function normalizeTimezone(value, fallback = 'UTC') {
  if (typeof value !== 'string' || value.length > 100) return fallback;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date(0));
    return value;
  } catch {
    return fallback;
  }
}

export function localDateFor(instant, timezoneId) {
  const time = instant instanceof Date ? instant : new Date(instant);
  if (!Number.isFinite(time.getTime())) throw new TypeError('invalid_instant');
  const tz = normalizeTimezone(timezoneId, '');
  if (!tz) throw new TypeError('invalid_timezone');
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(time);
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return values.year + '-' + values.month + '-' + values.day;
}

export function addDateDays(dateKey, amount) {
  if (!isValidDateKey(dateKey) || !Number.isInteger(amount)) throw new TypeError('invalid_date_arithmetic');
  const date = new Date(dateKey + 'T00:00:00.000Z');
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function validateActivityBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, field: 'body' };
  if (typeof body.eventId !== 'string' || !UUID_RE.test(body.eventId)) return { ok: false, field: 'eventId' };
  if (typeof body.puzzleId !== 'string' || !PUZZLE_ID_RE.test(body.puzzleId)) return { ok: false, field: 'puzzleId' };
  if (typeof body.move !== 'string' || !MOVE_RE.test(body.move)) return { ok: false, field: 'move' };
  if (body.timezoneId !== undefined && (typeof body.timezoneId !== 'string' || body.timezoneId.length > 100)) return { ok: false, field: 'timezoneId' };
  return { ok: true, value: { eventId: body.eventId.toLowerCase(), puzzleId: body.puzzleId, move: body.move, timezoneId: body.timezoneId } };
}

function normalizeDates(values) {
  return [...new Set((values || []).filter(isValidDateKey))].sort();
}

export function calculateStreak(values, today) {
  if (!isValidDateKey(today)) throw new TypeError('invalid_today');
  const dates = normalizeDates(values);
  const set = new Set(dates);
  let longestStreak = 0;
  let run = 0;
  let previous = null;
  for (const date of dates) {
    run = previous && addDateDays(previous, 1) === date ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    previous = date;
  }
  const yesterday = addDateDays(today, -1);
  let cursor = set.has(today) ? today : yesterday;
  let currentStreak = 0;
  while (set.has(cursor)) {
    currentStreak += 1;
    cursor = addDateDays(cursor, -1);
  }
  const lastQualifiedDate = dates.length ? dates[dates.length - 1] : null;
  const milestonesReached = STREAK_MILESTONES.filter((milestone) => longestStreak >= milestone);
  return { currentStreak, longestStreak, lastQualifiedDate, qualifiedDates: dates, milestonesReached };
}

export function buildCalendar(eventRows, today, days = 35) {
  if (!isValidDateKey(today) || !Number.isInteger(days) || days < 1 || days > 366) throw new TypeError('invalid_calendar_range');
  const counts = new Map();
  for (const row of Array.isArray(eventRows) ? eventRows : []) {
    if (row && isValidDateKey(row.local_date)) counts.set(row.local_date, (counts.get(row.local_date) || 0) + 1);
  }
  const start = addDateDays(today, -(days - 1));
  return Array.from({ length: days }, (_, i) => {
    const date = addDateDays(start, i);
    const count = counts.get(date) || 0;
    return { date, qualified: count > 0, activityCount: count, isToday: date === today };
  });
}

export function shouldApplyPendingTimezone(currentTimezone, pendingTimezone, requestedAt, now) {
  if (!pendingTimezone || pendingTimezone === currentTimezone || !Number.isFinite(Date.parse(requestedAt))) return false;
  try {
    return localDateFor(now, currentTimezone) > localDateFor(requestedAt, currentTimezone);
  } catch {
    return false;
  }
}

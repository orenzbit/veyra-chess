export const STREAK_MILESTONES = Object.freeze([7, 14, 30, 50, 100, 365]);
export const DEFAULT_TIMEZONE = 'Asia/Jerusalem';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidTimeZone(timeZone) {
  if (typeof timeZone !== 'string' || !timeZone.trim() || timeZone.length > 100) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(0);
    return true;
  } catch {
    return false;
  }
}

export function localDateAt(instant, timeZone) {
  if (!isValidTimeZone(timeZone)) throw new RangeError('invalid_time_zone');
  const date = instant instanceof Date ? instant : new Date(instant);
  if (!Number.isFinite(date.getTime())) throw new RangeError('invalid_instant');
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const part = (type) => parts.find((p) => p.type === type)?.value;
  return part('year') + '-' + part('month') + '-' + part('day');
}

export function isDateKey(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const d = new Date(value + 'T00:00:00.000Z');
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function addDateDays(dateKey, amount) {
  if (!isDateKey(dateKey) || !Number.isInteger(amount)) throw new RangeError('invalid_date_arithmetic');
  const d = new Date(dateKey + 'T00:00:00.000Z');
  d.setUTCDate(d.getUTCDate() + amount);
  return d.toISOString().slice(0, 10);
}

export function calculateStreak(dates, today) {
  if (!isDateKey(today)) throw new RangeError('invalid_today');
  const qualified = new Set((Array.isArray(dates) ? dates : []).filter(isDateKey));
  const sorted = [...qualified].sort();
  let bestStreak = 0;
  let run = 0;
  let previous = null;
  for (const date of sorted) {
    run = previous && addDateDays(previous, 1) === date ? run + 1 : 1;
    if (run > bestStreak) bestStreak = run;
    previous = date;
  }

  const yesterday = addDateDays(today, -1);
  const anchor = qualified.has(today) ? today : qualified.has(yesterday) ? yesterday : null;
  let currentStreak = 0;
  let streakThroughDate = null;
  if (anchor) {
    streakThroughDate = anchor;
    let cursor = anchor;
    while (qualified.has(cursor)) {
      currentStreak += 1;
      cursor = addDateDays(cursor, -1);
    }
  }
  return {
    todayQualified: qualified.has(today),
    currentStreak,
    bestStreak,
    streakThroughDate,
    canMaintainToday: !qualified.has(today) && qualified.has(yesterday),
    missedYesterday: !qualified.has(yesterday) && !qualified.has(today) && sorted.length > 0,
    qualifiedDates: sorted,
    milestones: STREAK_MILESTONES.map((days) => ({ days, reached: bestStreak >= days })),
  };
}

export function buildCalendar(dates, today, length = 42) {
  if (!isDateKey(today) || !Number.isInteger(length) || length < 1 || length > 400) {
    throw new RangeError('invalid_calendar_range');
  }
  const qualified = new Set((Array.isArray(dates) ? dates : []).filter(isDateKey));
  const start = addDateDays(today, -(length - 1));
  const result = [];
  for (let i = 0; i < length; i += 1) {
    const date = addDateDays(start, i);
    const isToday = date === today;
    result.push({
      date,
      qualified: qualified.has(date),
      isToday,
      status: qualified.has(date) ? 'qualified' : isToday ? 'today-open' : 'missed',
    });
  }
  return result;
}

export function nextLocalDate(instant, timeZone) {
  return addDateDays(localDateAt(instant, timeZone), 1);
}

export function summarizeDailyStreak(events, settings, nowMs = Date.now()) {
  const timeZone = settings?.pending_timezone_id
    && settings?.timezone_effective_on
    && isDateKey(settings.timezone_effective_on)
    && localDateAt(nowMs, settings.timezone_id || DEFAULT_TIMEZONE) >= settings.timezone_effective_on
      ? settings.pending_timezone_id
      : settings?.timezone_id || DEFAULT_TIMEZONE;
  const today = localDateAt(nowMs, timeZone);
  const eventRows = Array.isArray(events) ? events : [];
  const dates = [...new Set(eventRows.map((event) => event.local_date).filter(isDateKey))];
  const calc = calculateStreak(dates, today);
  const counts = new Map();
  for (const event of eventRows) {
    if (isDateKey(event.local_date)) counts.set(event.local_date, (counts.get(event.local_date) || 0) + 1);
  }
  return {
    ...calc,
    timezoneId: timeZone,
    today,
    calendar: buildCalendar(dates, today).map((day) => ({
      ...day, activityCount: counts.get(day.date) || 0,
    })),
  };
}

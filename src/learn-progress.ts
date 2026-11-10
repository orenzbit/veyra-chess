// Progress and the forgiving daily streak of the Learn path. Pure data, no DOM.
//
// Streak rule (Veyra's own):
// - The daily goal is DAILY_GOAL finished node(s) on the user's local calendar date.
// - Every REST_DAY_EVERY goal days inside a streak earn one rest day; at most MAX_REST_DAYS are held.
// - A missed day uses a held rest day automatically: the streak survives (it does not grow that day).
// - A missed day with no rest day held resets the streak to 0 (and the rest-day counters with it).
// - Today never counts as missed: until the local day is over the streak stands, it just has not grown yet.

export const DAILY_GOAL = 1;
export const REST_DAY_EVERY = 7;
export const MAX_REST_DAYS = 2;
const MAX_DONE = 1000;
const MAX_DAYS = 3660; // ten years of goal days (~48 KB), so a long streak is never truncated

export type LearnProgress = { done: string[]; days: string[] };
export type LearnStreak = { streak: number; best: number; restDays: number; todayDone: boolean; coveredDays: string[] };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[a-z0-9:_-]{1,120}$/i;

/** The user's local calendar date (device time zone) as YYYY-MM-DD. */
export function localDateKey(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function nextDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

const validDay = (day: unknown): day is string => {
  if (typeof day !== 'string' || !DATE_RE.test(day)) return false;
  const time = Date.parse(day + 'T00:00:00Z');
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === day; // rejects 2026-02-30 and 2026-99-99 without throwing
};

export function normalizeLearnProgress(input: unknown): LearnProgress {
  const raw = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {};
  const done = Array.isArray(raw.done) ? [...new Set(raw.done.filter((id): id is string => typeof id === 'string' && ID_RE.test(id)))].slice(-MAX_DONE) : [];
  const days = Array.isArray(raw.days) ? [...new Set(raw.days.filter(validDay))].sort().slice(-MAX_DAYS) : [];
  return { done, days };
}

/** Union of two devices' progress: nothing finished on either side is lost. */
export function mergeLearnProgress(a: unknown, b: unknown): LearnProgress {
  const x = normalizeLearnProgress(a); const y = normalizeLearnProgress(b);
  return normalizeLearnProgress({ done: [...x.done, ...y.done], days: [...x.days, ...y.days] });
}

/** Marks a node finished and today's goal met. Returns the same object when nothing changed. */
export function recordNodeDone(progress: LearnProgress, nodeId: string, today: string): LearnProgress {
  if (!ID_RE.test(nodeId) || !validDay(today)) return progress;
  if (progress.done.includes(nodeId) && progress.days.includes(today)) return progress;
  return normalizeLearnProgress({ done: [...progress.done, nodeId], days: [...progress.days, today] });
}

export function learnStreak(daysInput: string[], today: string): LearnStreak {
  const active = new Set(daysInput.filter(d => validDay(d) && d <= today));
  const first = [...active].sort()[0];
  let streak = 0, best = 0, restDays = 0, sinceEarned = 0;
  const coveredDays: string[] = [];
  for (let day = first; day && day <= today; day = nextDay(day)) {
    if (active.has(day)) {
      streak += 1; best = Math.max(best, streak); sinceEarned += 1;
      if (sinceEarned === REST_DAY_EVERY) { sinceEarned = 0; restDays = Math.min(MAX_REST_DAYS, restDays + 1); }
    } else if (day === today) {
      break; // today is not over yet
    } else if (streak > 0 && restDays > 0) {
      restDays -= 1; coveredDays.push(day);
    } else {
      streak = 0; restDays = 0; sinceEarned = 0; coveredDays.length = 0;
    }
  }
  return { streak, best, restDays, todayDone: active.has(today), coveredDays };
}

/**
 * Weekly progress read model for the statistics page.
 *
 * Groups the per-game entries of the saved Chess DNA report by ISO week
 * (Monday start) and compares each week with the previous non-empty one.
 * Pure: no engine, no storage, no DOM. Dates are calendar dates, so results do
 * not depend on the machine time zone except for the default "today".
 */
export type WeeklyTrend = "better" | "worse" | "stable" | "none";

export const WEEKLY_WINDOW = 8;
export const ACCURACY_STABLE_POINTS = 1.0;
export const ACPL_STABLE_CP = 5;

export interface WeeklyProgressOptions {
  /** Local calendar date (YYYY-MM-DD) treated as today. Defaults to the local date. */
  today?: string;
  weeks?: number;
  /** Bullet is excluded from headline averages by default. */
  includeBullet?: boolean;
}

export interface WeeklyRow {
  weekStart: string;
  weekEnd: string;
  isoYear: number;
  isoWeek: number;
  /** dd.mm–dd.mm */
  label: string;
  games: number;
  accuracy: number | null;
  acpl: number | null;
  acplGames: number;
  accuracyTrend: WeeklyTrend;
  acplTrend: WeeklyTrend;
}

export interface WeeklyProgress {
  /** Newest week first. */
  rows: WeeklyRow[];
  nonEmptyWeeks: number;
  hasEnoughData: boolean;
  hasAcpl: boolean;
  bulletExcluded: boolean;
}

const DAY_MS = 86400000;
const pad = (value: number) => String(value).padStart(2, "0");

function toDayNumber(year: number, month: number, day: number): number | null {
  const ms = Date.UTC(year, month - 1, day);
  const check = new Date(ms);
  return check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day
    ? Math.round(ms / DAY_MS)
    : null;
}

/** Day number (days since epoch) for a YYYY-MM-DD date, or a full timestamp converted to the local date. */
export function gameDayNumber(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) return toDayNumber(Number(dateOnly[1]), Number(dateOnly[2]), Number(dateOnly[3]));
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return null;
    return toDayNumber(date.getFullYear(), date.getMonth() + 1, date.getDate());
  }
  return null;
}

function formatDay(day: number): { iso: string; short: string; year: number; month: number; date: number } {
  const date = new Date(day * DAY_MS);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const dom = date.getUTCDate();
  return { iso: year + "-" + pad(month) + "-" + pad(dom), short: pad(dom) + "." + pad(month), year, month, date: dom };
}

/** Monday of the ISO week containing the day (day 0 = 1970-01-01, a Thursday). */
export function isoWeekStartDay(day: number): number {
  const mondayBased = (((day + 3) % 7) + 7) % 7;
  return day - mondayBased;
}

export function isoWeekInfo(weekStartDay: number): { isoYear: number; isoWeek: number } {
  const thursday = weekStartDay + 3;
  const isoYear = formatDay(thursday).year;
  const jan1 = toDayNumber(isoYear, 1, 1) as number;
  return { isoYear, isoWeek: Math.floor((thursday - jan1) / 7) + 1 };
}

export function localTodayIso(now = new Date()): string {
  return now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
}

function finiteAccuracy(value: unknown): number | null {
  const number = typeof value === "number" ? value : NaN;
  return Number.isFinite(number) && number >= 0 && number <= 100 ? number : null;
}

function finiteAcpl(value: unknown): number | null {
  const number = typeof value === "number" ? value : NaN;
  return Number.isFinite(number) && number >= 0 ? number : null;
}

const round1 = (value: number) => Math.round(value * 10) / 10;

function judge(delta: number, threshold: number, higherIsBetter: boolean): WeeklyTrend {
  const rounded = Math.round(delta * 10) / 10;
  if (Math.abs(rounded) <= threshold) return "stable";
  return (rounded > 0) === higherIsBetter ? "better" : "worse";
}

interface Entry { day: number; accuracy: number; acpl: number | null }

function collectEntries(report: any, includeBullet: boolean): Entry[] {
  const entries: Entry[] = [];
  const seen = new Set<string>();
  const controls = report && typeof report === "object" ? report.timeControls : null;
  if (!controls || typeof controls !== "object") return entries;
  for (const timeClass of Object.keys(controls)) {
    if (timeClass === "bullet" && !includeBullet) continue;
    const games = controls[timeClass]?.games;
    if (!Array.isArray(games)) continue;
    for (const game of games) {
      if (!game || typeof game !== "object") continue;
      if (!includeBullet && game.timeClass === "bullet") continue;
      const day = gameDayNumber(game.date);
      const accuracy = finiteAccuracy(game.accuracy);
      if (day === null || accuracy === null) continue;
      if (typeof game.fingerprint === "string" && game.fingerprint) {
        if (seen.has(game.fingerprint)) continue;
        seen.add(game.fingerprint);
      }
      entries.push({ day, accuracy, acpl: finiteAcpl(game.acpl) });
    }
  }
  return entries;
}

export function buildWeeklyProgress(report: unknown, options: WeeklyProgressOptions = {}): WeeklyProgress {
  const includeBullet = options.includeBullet === true;
  const windowSize = Math.max(1, Math.floor(options.weeks || WEEKLY_WINDOW));
  const todayDay = gameDayNumber(options.today || localTodayIso()) as number;
  const currentWeekStart = isoWeekStartDay(todayDay);
  const oldestWeekStart = currentWeekStart - (windowSize - 1) * 7;

  const buckets = new Map<number, Entry[]>();
  for (const entry of collectEntries(report, includeBullet)) {
    const weekStart = isoWeekStartDay(entry.day);
    if (weekStart < oldestWeekStart || weekStart > currentWeekStart) continue;
    const list = buckets.get(weekStart);
    if (list) list.push(entry); else buckets.set(weekStart, [entry]);
  }

  const rowsOldestFirst: WeeklyRow[] = [];
  let previousAccuracy: number | null = null;
  let previousAcpl: number | null = null;
  let nonEmptyWeeks = 0;
  let hasAcpl = false;
  for (let weekStart = oldestWeekStart; weekStart <= currentWeekStart; weekStart += 7) {
    const list = buckets.get(weekStart) || [];
    const first = formatDay(weekStart);
    const last = formatDay(weekStart + 6);
    const { isoYear, isoWeek } = isoWeekInfo(weekStart);
    const acplValues = list.map(entry => entry.acpl).filter((value): value is number => value !== null);
    const entryCount = list.length;
    const accuracy = entryCount ? round1(list.reduce((sum, entry) => sum + entry.accuracy, 0) / entryCount) : null;
    const acpl = acplValues.length ? round1(acplValues.reduce((sum, value) => sum + value, 0) / acplValues.length) : null;
    const row: WeeklyRow = {
      weekStart: first.iso,
      weekEnd: last.iso,
      isoYear,
      isoWeek,
      label: first.short + "–" + last.short,
      games: list.length,
      accuracy,
      acpl,
      acplGames: acplValues.length,
      accuracyTrend: "none",
      acplTrend: "none",
    };
    if (accuracy !== null) {
      if (previousAccuracy !== null) row.accuracyTrend = judge(accuracy - previousAccuracy, ACCURACY_STABLE_POINTS, true);
      previousAccuracy = accuracy;
    }
    if (acpl !== null) {
      if (previousAcpl !== null) row.acplTrend = judge(acpl - previousAcpl, ACPL_STABLE_CP, false);
      previousAcpl = acpl;
      hasAcpl = true;
    }
    if (list.length) nonEmptyWeeks++;
    rowsOldestFirst.push(row);
  }

  return {
    rows: rowsOldestFirst.reverse(),
    nonEmptyWeeks,
    hasEnoughData: nonEmptyWeeks >= 2,
    hasAcpl,
    bulletExcluded: !includeBullet,
  };
}

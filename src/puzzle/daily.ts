// Puzzle of the day: everyone gets the same puzzle for the same calendar date. Pure module (no DOM).

// Same calendar-date rule as the daily streak (localDateFor in netlify/functions/lib/daily-streak.mjs):
// the date in the given IANA time zone, formatted with en-CA parts; an unknown zone falls back to UTC.
// The server file is not importable from src/, so scripts/check-daily-puzzle.mjs pins the two together.
export function dateKey(date: Date | number | string, timeZone = 'UTC'): string {
  const time = date instanceof Date ? date : new Date(date);
  if (!Number.isFinite(time.getTime())) throw new TypeError('invalid_instant');
  let zone = 'UTC';
  try {
    if (typeof timeZone === 'string' && timeZone.length <= 100) {
      new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date(0));
      zone = timeZone;
    }
  } catch { /* unknown zone: use UTC */ }
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(time);
  const values: Record<string, string> = {};
  for (const p of parts) values[p.type] = p.value;
  return values.year + '-' + values.month + '-' + values.day;
}

// FNV-1a, 32-bit.
export function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

// Picks the day's puzzle id. Ids are sorted first, so the order of the input list never matters.
export function dailyPuzzleId(key: string, puzzles: ReadonlyArray<{ id: string } | string>): string | null {
  const ids = Array.from(new Set(puzzles.map(p => typeof p === 'string' ? p : p.id))).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  if (!ids.length) return null;
  return ids[fnv1a(key) % ids.length];
}

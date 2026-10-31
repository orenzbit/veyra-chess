export interface DailyStreakState {
  ok: true;
  serverTime: string;
  timezoneId: string;
  pendingTimezoneId: string | null;
  today: string;
  currentStreak: number;
  longestStreak: number;
  lastQualifiedDate: string | null;
  qualifiedDates: string[];
  milestonesReached: number[];
  calendar: Array<{ date: string; qualified: boolean; activityCount: number; isToday: boolean }>;
}
export type DailyStreakResult =
  | { kind: 'ready'; state: DailyStreakState }
  | { kind: 'disabled' | 'signed-out' | 'error' };

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const count = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const date = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

export function isDailyStreakState(value: unknown): value is DailyStreakState {
  return record(value) && value.ok === true && typeof value.serverTime === 'string' && Number.isFinite(Date.parse(value.serverTime))
    && typeof value.timezoneId === 'string' && value.timezoneId.length > 0
    && (value.pendingTimezoneId === null || typeof value.pendingTimezoneId === 'string')
    && date(value.today) && count(value.currentStreak) && count(value.longestStreak) && value.currentStreak <= value.longestStreak
    && (value.lastQualifiedDate === null || date(value.lastQualifiedDate))
    && Array.isArray(value.qualifiedDates) && value.qualifiedDates.every(date)
    && Array.isArray(value.milestonesReached) && value.milestonesReached.every(count)
    && Array.isArray(value.calendar) && value.calendar.length === 35 && value.calendar.every(day =>
      record(day) && date(day.date) && typeof day.qualified === 'boolean' && count(day.activityCount) && typeof day.isToday === 'boolean');
}

export function dailyTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}
export function dailyQueueKey(userId: string): string { return 'veyra_daily_streak_outbox_v1:' + userId; }

export function pendingQueueCount(storage: Pick<Storage, 'getItem'>, key: string): number {
  const raw = storage.getItem(key);
  const items: unknown = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(items)) throw new Error('Invalid activity queue; stored data was not changed.');
  return items.length;
}

async function request(url: string, init: RequestInit, signal?: AbortSignal): Promise<DailyStreakResult> {
  const timeout = AbortSignal.timeout(15000);
  const response = await fetch(url, {
    ...init, credentials: 'same-origin', cache: 'no-store',
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  const data: unknown = await response.json();
  if (response.status === 401 || response.status === 403) return { kind: 'signed-out' };
  if (response.status === 404 && record(data) && data.error === 'DISABLED') return { kind: 'disabled' };
  if (!response.ok || !isDailyStreakState(data)) return { kind: 'error' };
  return { kind: 'ready', state: data };
}
export function getDailyStreakState(userId: string, signal?: AbortSignal) {
  const query = new URLSearchParams({ action: 'state', timezoneId: dailyTimezone(), ownerId: userId });
  return request('/api/daily-streak?' + query, {}, signal);
}
export function setDailyStreakTimezone(userId: string, signal?: AbortSignal) {
  return request('/api/daily-streak?action=timezone', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ timezoneId: dailyTimezone(), ownerId: userId }),
  }, signal);
}

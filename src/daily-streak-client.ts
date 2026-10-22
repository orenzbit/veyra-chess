export type DailyStreakActivity =
  | { activityType: 'puzzle'; puzzleId: string; move: string }
  | { activityType: 'training'; openingId: string; completedLines: Array<{ lineId: string; moves: string[] }> };

type QueuedActivity = DailyStreakActivity & { sourceEventId: string };
export interface DailyStreakState {
  ok: true; timezoneId: string; pendingTimezoneId: string | null; timezoneEffectiveOn: string | null;
  today: string; currentStreak: number; bestStreak: number; todayQualified: boolean; canMaintainToday: boolean;
  missedYesterday: boolean; streakThroughDate: string | null;
  calendar: Array<{ date: string; qualified: boolean; isToday: boolean; status: string; activityCount: number }>;
  milestones: Array<{ days: number; earned: boolean }>; newlyEarned: number[];
}
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
const queueKey = (userId: string) => 'veyra_daily_streak_outbox_v1:' + userId;
const uuid = () => {
  try { if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID(); } catch {}
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16);
  });
};
function storage(): StorageLike | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}
function readQueue(userId: string): QueuedActivity[] {
  try {
    const raw = storage()?.getItem(queueKey(userId));
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value.filter((v) => v && typeof v.sourceEventId === 'string') : [];
  } catch { return []; }
}
function writeQueue(userId: string, queue: QueuedActivity[]) {
  try { storage()?.setItem(queueKey(userId), JSON.stringify(queue.slice(-100))); } catch {}
}
function enqueue(userId: string, item: QueuedActivity) {
  const queue = readQueue(userId);
  if (!queue.some((old) => old.sourceEventId === item.sourceEventId)) queue.push(item);
  writeQueue(userId, queue);
}
async function send(item: QueuedActivity): Promise<'sent' | 'retry' | 'drop'> {
  let response: Response;
  try {
    response = await fetch('/api/daily-streak?action=activity', {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify(item),
    });
  } catch { return 'retry'; }
  if (response.status === 429 || response.status >= 500) return 'retry';
  if (response.status === 404 || response.status === 401 || response.status === 400 || response.status === 403) return 'drop';
  const type = String(response.headers.get('content-type') || '');
  if (!type.includes('application/json')) return 'retry';
  try {
    const data = await response.json();
    return response.ok && data?.ok ? 'sent' : response.status >= 500 ? 'retry' : 'drop';
  } catch { return 'retry'; }
}
export async function recordDailyStreakActivity(userId: string | undefined, activity: DailyStreakActivity): Promise<void> {
  if (!userId) return;
  const item = { ...activity, sourceEventId: uuid() } as QueuedActivity;
  const result = await send(item);
  if (result === 'retry') enqueue(userId, item);
}
export async function flushDailyStreakQueue(userId: string): Promise<number> {
  const queue = readQueue(userId);
  const keep: QueuedActivity[] = [];
  for (let i = 0; i < queue.length; i += 1) {
    const result = await send(queue[i]);
    if (result === 'retry') { keep.push(...queue.slice(i)); break; }
  }
  writeQueue(userId, keep);
  return keep.length;
}
export function pendingDailyStreakCount(userId: string): number {
  return readQueue(userId).length;
}
export async function setDailyStreakTimezone(timezoneId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/daily-streak?action=settings', {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ timezoneId }),
    });
    const data = await response.json();
    return response.ok && data?.ok === true;
  } catch { return false; }
}
export async function getDailyStreakState(): Promise<DailyStreakState | null> {
  try {
    const response = await fetch('/api/daily-streak?action=state', { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok || !String(response.headers.get('content-type') || '').includes('application/json')) return null;
    const data = await response.json();
    return data?.ok ? data as DailyStreakState : null;
  } catch { return null; }
}

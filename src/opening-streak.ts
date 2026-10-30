export type CompletedOpeningLine = { lineId: string; moves: string[] };
type Activity = { eventId: string; openingId: string; completedLines: CompletedOpeningLine[] };
export type OpeningStreakStatus = 'idle' | 'saving' | 'accepted' | 'pending' | 'disabled' | 'error';
export type OpeningStreakUpdate = { status: OpeningStreakStatus; pending: number; error?: string };
export const openingStreakQueueKey = (userId: string) => 'veyra_opening_streak_outbox_v1:' + userId;

export function createOpeningStreakClient(options: {
  userId: string;
  storage: Pick<Storage, 'getItem' | 'setItem'>;
  fetch: typeof fetch;
  uuid: () => string;
  timezone: string;
  onChange: (update: OpeningStreakUpdate) => void;
}) {
  const key = openingStreakQueueKey(options.userId);
  const controller = new AbortController();
  let running: Promise<void> | null = null;
  const publish = (update: OpeningStreakUpdate) => {
    if (!controller.signal.aborted) options.onChange(update);
  };
  function read(): Activity[] {
    const raw = options.storage.getItem(key);
    const items: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(items) || !items.every(item => item && typeof item.eventId === 'string'
      && typeof item.openingId === 'string' && Array.isArray(item.completedLines))) {
      throw new Error('Invalid opening activity queue; stored data was not changed.');
    }
    return items;
  }
  function write(items: Activity[]) { options.storage.setItem(key, JSON.stringify(items)); }
  function fail(error: unknown) {
    publish({ status: 'error', pending: 0, error: error instanceof Error ? error.message : String(error) });
  }
  async function sendPending() {
    try {
      let queue = read();
      if (!queue.length) return;
      publish({ status: 'saving', pending: queue.length });
      while (queue.length && !controller.signal.aborted) {
        const item = queue[0];
        let response: Response;
        try {
          response = await options.fetch('/api/daily-streak?action=record', {
            method: 'POST', credentials: 'same-origin', cache: 'no-store',
            signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ ...item, activityType: 'training', ownerId: options.userId, timezoneId: options.timezone }),
          });
        } catch (error) {
          if (!controller.signal.aborted) publish({ status: 'pending', pending: read().length, error: String(error) });
          return;
        }
        if (controller.signal.aborted) return;
        const data = await response.json();
        if (controller.signal.aborted) return;
        if (!response.ok || data?.ok !== true || data?.accepted !== true) {
          const status = response.status === 404 && data?.error === 'DISABLED' ? 'disabled'
            : response.status >= 500 || response.status === 429 ? 'pending' : 'error';
          publish({ status, pending: read().length, error: String(data?.error || 'Activity was not accepted.') });
          return;
        }
        // Remove only the acknowledged event; preserve any completion added during the request.
        queue = read().filter(entry => entry.eventId !== item.eventId);
        write(queue);
        publish({ status: queue.length ? 'saving' : 'accepted', pending: queue.length });
      }
    } catch (error) { fail(error); }
  }
  function flush() {
    if (controller.signal.aborted) return Promise.resolve();
    if (!running) running = sendPending().finally(() => { running = null; });
    return running;
  }
  function record(openingId: string, completedLines: CompletedOpeningLine[]) {
    if (controller.signal.aborted) return Promise.resolve();
    try {
      const queue = read();
      if (queue.length >= 100) throw new Error('Opening activity queue is full; existing activities were preserved.');
      write([...queue, { eventId: options.uuid(), openingId, completedLines }]);
    } catch (error) {
      fail(error);
      return Promise.resolve();
    }
    return flush();
  }
  return { record, flush, dispose: () => controller.abort() };
}

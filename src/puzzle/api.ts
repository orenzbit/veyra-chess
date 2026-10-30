// Browser client for /api/puzzles. Never trusts the response shape: the service worker can answer a failed
// GET with an HTML page, so anything that is not JSON counts as a network failure.
export interface PuzzleDto {
  id: string; fen: string; solution: string[]; accepted: string[]; played: string; motif: string; phase: string;
  rating: number; class: string; origin: string;
  source: { date: string; opponent: string; moveNumber: number; provider: string; url: string };
}
export interface KitDto { id: string; builtAt: string; puzzles: PuzzleDto[] }
export interface JobDto { id: string; kind: string; status: string; gamesDone: number; gamesTotal: number; puzzlesAdded: number; error: string | null; updatedAt: string }
export interface PuzzleStateDto {
  ok: true; serverTime: string;
  pool: { active: number; mastered: number; total: number; fresh: number; cap: number; lowWater: number; byMotif: Record<string, number>; byPhase: Record<string, number> };
  kits: { regular: KitDto | null; rush: KitDto | null };
  rushBest: number; profile: { puzzleElo: number; nextFocus: string }; job: JobDto | null; refillNeeded: boolean;
}
export interface AttemptDto { id: string; puzzleId: string; solved: boolean; ms: number; move: string; viaAlt: boolean; at: string }
export interface RushRunDto { id: string; score: number; strikes: number; durationMs: number; puzzleIds: string[]; startedAt: string; endedAt: string }
export interface CheckpointBody { sessionId: string; mode: 'regular' | 'rush' | 'streak'; kitIds: { regular?: string; rush?: string }; attempts: AttemptDto[]; rushRun?: RushRunDto; final: boolean; timezoneId?: string }
export interface CheckpointResponse {
  ok: true; accepted: number; duplicates: number; rejected: { id: string; reason: string }[];
  state: { pool: PuzzleStateDto['pool']; profile: PuzzleStateDto['profile']; rushBest: number; kits?: { regular?: KitDto; rush?: KitDto } };
  refillNeeded: boolean;
}

export type ApiResult<T> =
  | { kind: 'ok'; status: number; data: T }
  | { kind: 'auth' }
  | { kind: 'disabled' }
  | { kind: 'rate' }
  | { kind: 'conflict'; data: any }
  | { kind: 'network' }
  | { kind: 'error'; status: number; data: any };

type FetchLike = (input: string, init?: any) => Promise<any>;

export function createPuzzleApi(fetchImpl: FetchLike = (u, i) => fetch(u, i)) {
  async function call<T>(method: 'GET' | 'POST', action: string, body?: unknown, query: Record<string, string> = {}, keepalive = false): Promise<ApiResult<T>> {
    const qs = new URLSearchParams({ action, ...query }).toString();
    let res: any;
    try {
      res = await fetchImpl('/api/puzzles?' + qs, {
        method, credentials: 'same-origin', cache: 'no-store', keepalive,
        headers: body === undefined ? {} : { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch { return { kind: 'network' }; }
    const type = String(res?.headers?.get?.('content-type') || '');
    if (!type.includes('application/json')) return { kind: 'network' };
    let data: any;
    try { data = await res.json(); } catch { return { kind: 'network' }; }
    if (res.status === 401) return { kind: 'auth' };
    if (res.status === 404 && data?.error === 'DISABLED') return { kind: 'disabled' };
    if (res.status === 429) return { kind: 'rate' };
    if (res.status === 409) return { kind: 'conflict', data };
    if (res.status >= 500) return { kind: 'network' };
    if (res.status >= 200 && res.status < 300 && data?.ok) return { kind: 'ok', status: res.status, data: data as T };
    return { kind: 'error', status: res.status, data };
  }
  return {
    getState: () => call<PuzzleStateDto>('GET', 'state'),
    checkpoint: (body: CheckpointBody, keepalive = false) => call<CheckpointResponse>('POST', 'checkpoint', body, {}, keepalive),
    newKit: (mode: 'regular' | 'rush', excludeIds: string[]) => call<{ ok: true; kit: KitDto }>('POST', 'kit', { mode, excludeIds }),
    startDna: (source = 'auto', limit = 40) => call<{ ok: true; jobId: string }>('POST', 'dna', { source, limit }),
    startRefill: () => call<{ ok: true; started: boolean; jobId?: string }>('POST', 'refill', {}),
    getJob: (id: string) => call<{ ok: true; job: JobDto & { report?: any } }>('GET', 'job', undefined, { id }),
    remove: (puzzleId: string) => call<{ ok: true; status: string }>('POST', 'remove', { puzzleId }),
    /** Starts/continues the background analysis. Netlify answers 202 at once; the outcome is read through getJob. */
    async runBackground(jobId: string): Promise<boolean> {
      try {
        const res = await fetchImpl('/api/puzzle-refill-background', {
          method: 'POST', credentials: 'same-origin', keepalive: true,
          headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jobId }),
        });
        return res.status === 202 || res.status === 200;
      } catch { return false; }
    },
  };
}
export type PuzzleApi = ReturnType<typeof createPuzzleApi>;

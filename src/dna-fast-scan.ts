// Fast Parallel DNA Scan Engine & Custom Typed Per-Time-Class Game Count Selector.
// 100% MIT TypeScript, zero external dependencies, safe to import in Node tests.
// Six safe, deterministic speedups without changing engine evaluation results:
//  1. Early-stop archive fetching once typed per-class quotas (+ short-game buffer) are met
//  2. Batched cache fingerprint lookups (40 per request instead of 5 -> 8x fewer round-trips)
//  3. Dynamic Chessy MIT Web Worker pool (up to 4 desktop, max 2 mobile/low-memory; immediate terminate on cancel)
//  4. Deterministic cross-game FEN position-eval cache keyed by `${fen}|${engineVersion}` (100% bit-for-bit identical)
//  5. Pipelined async save-game queue (max 2 concurrent + automatic retry on HTTP 429 + strict all-saved barrier)
//  6. Single PGN parse per game + parallel load of openings.json & SHA-256 game fingerprints

import {
  DNA_ENGINE_VERSION,
  DNA_MAX_PER_CLASS,
  DNA_MAX_TOTAL_GAMES,
  DNA_WARN_TOTAL_GAMES,
  normalizeDnaCustomCounts,
  type DnaCustomCounts,
} from './chess-dna.js';

export interface DnaCountPreset {
  id: string;
  labelHe: string;
  counts: DnaCustomCounts;
}

export const DNA_CUSTOM_PRESETS: DnaCountPreset[] = [
  { id: 'fast', labelHe: 'מהיר (5 / 5 / 5)', counts: { bullet: 5, blitz: 5, rapid: 5 } },
  { id: 'standard', labelHe: 'רגיל (15 / 15 / 15)', counts: { bullet: 15, blitz: 15, rapid: 15 } },
  { id: 'deep', labelHe: 'עומק (25 / 25 / 25)', counts: { bullet: 25, blitz: 25, rapid: 25 } },
];

export const DEFAULT_DNA_CUSTOM_COUNTS: DnaCustomCounts = { bullet: 15, blitz: 15, rapid: 15 };

/** Computes a bounded archive fetch ceiling instead of unconditionally downloading 1,000 games. */
export function computeEarlyStopFetchLimit(counts: DnaCustomCounts): number {
  const norm = normalizeDnaCustomCounts(counts);
  if (norm.total <= 0) return 60;
  return Math.min(1000, Math.max(60, norm.total * 4));
}

/** Splits an array into fixed-size batches (default 40 fingerprints per cache lookup). */
export function batchItems<T>(items: readonly T[], batchSize = 40): T[][] {
  const size = Math.max(1, Math.min(100, Math.floor(batchSize || 40)));
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Resolves a safe Chessy Web Worker pool size: up to 4 on desktop, max 2 on mobile/low-memory devices. */
export function resolveWorkerPoolSize(env?: {
  isMobile?: boolean;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  gamesToAnalyze?: number;
}): number {
  const nav: any = typeof navigator !== 'undefined' ? navigator : {};
  const win: any = typeof window !== 'undefined' ? window : {};
  const isMobile = env?.isMobile ?? (
    (typeof win.innerWidth === 'number' && win.innerWidth > 0 && win.innerWidth < 768) ||
    /Mobi|Android|iPhone|iPad/i.test(String(nav.userAgent || ''))
  );
  const cores = Math.max(1, Number(env?.hardwareConcurrency ?? nav.hardwareConcurrency ?? 4) || 4);
  const mem = Number(env?.deviceMemory ?? nav.deviceMemory ?? 8) || 8;
  const maxByDevice = (isMobile || mem <= 4) ? 2 : 4;
  const desired = Math.max(1, Math.min(maxByDevice, cores > 1 ? cores - 1 : 1));
  if (env?.gamesToAnalyze != null) {
    return Math.max(1, Math.min(desired, Math.max(1, Math.floor(env.gamesToAnalyze))));
  }
  return desired;
}

/** Rough ETA estimate in seconds for UI transparency (not a guarantee). */
export function estimateDnaScanSeconds(totalGames: number, workerCount: number): number {
  const g = Math.max(0, Number(totalGames) || 0);
  if (g === 0) return 0;
  const w = Math.max(1, workerCount || 1);
  return Math.max(2, Math.round((g * 2.2) / w));
}

// Exact same win-chance curve as public/engine-worker.js so cached lookups are 100% bit-for-bit identical!
function cpToWinExact(cp: number): number {
  if (cp >= 90000) return 100;
  if (cp <= -90000) return 0;
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

export interface CachedEngineEval {
  fen: string;
  score: number;
  depth: number;
  bestUci: string | null;
}

/**
 * Deterministic cross-game FEN position evaluation cache keyed by `${fen}|${engineVersion}`.
 * Reuses exact WASM search results for repeated opening/transposition positions across games.
 */
export class DnaPositionEvalCache {
  private readonly map = new Map<string, CachedEngineEval>();
  private readonly maxEntries: number;
  public hits = 0;
  public misses = 0;

  constructor(private readonly engineVersion = DNA_ENGINE_VERSION, maxEntries = 8000) {
    this.maxEntries = maxEntries;
  }

  private key(fen: string): string {
    return `${fen}|${this.engineVersion}`;
  }

  get(fen: string): CachedEngineEval | undefined {
    const found = this.map.get(this.key(fen));
    if (found) this.hits += 1;
    else this.misses += 1;
    return found;
  }

  set(fen: string, value: CachedEngineEval): void {
    if (!fen || !Number.isFinite(value.score)) return;
    const k = this.key(fen);
    if (!this.map.has(k) && this.map.size >= this.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(k, { fen, score: value.score, depth: value.depth, bestUci: value.bestUci ?? null });
  }

  get size(): number {
    return this.map.size;
  }
}

export type BaseAnalyzePositionFn = (
  fen: string,
  afterFen: string,
  mover: { from: string; to: string; promotion?: string | null },
  cachedBefore?: CachedEngineEval,
  alternatives?: string[],
  cachedAfter?: CachedEngineEval
) => Promise<any>;

/**
 * Wraps any position analyzer with the deterministic DnaPositionEvalCache.
 * - If BOTH before & after are cached AND secondBestChance is NOT needed, computes the exact
 *   identical response in O(1) without touching a worker.
 * - Whenever secondBestChance may run (`alternatives` present & `bestUci === playedUci`), still
 *   delegates to the worker passing BOTH `cachedBefore` and `cachedAfter` so WASM skips both
 *   main searches and runs exact `secondBestChance`.
 */
export function createCachedAnalyzePosition(
  baseAnalyze: BaseAnalyzePositionFn,
  cache: DnaPositionEvalCache
): BaseAnalyzePositionFn {
  return async (fen, afterFen, mover, cachedBefore, alternatives) => {
    const beforeHit = cachedBefore?.fen === fen ? cachedBefore : cache.get(fen);
    const afterHit = cache.get(afterFen);
    const playedUci = mover.from + mover.to + (mover.promotion || '');

    if (beforeHit && afterHit) {
      const moverTurn = fen.split(' ')[1] === 'w' ? 'w' : 'b';
      const isMateMove = (afterHit.score >= 90000 && moverTurn === 'w') || (afterHit.score <= -90000 && moverTurn === 'b');
      const needsSecondBest = Array.isArray(alternatives) && alternatives.length > 0 && beforeHit.bestUci === playedUci && !isMateMove;
      if (!needsSecondBest) {
        const bestWin = cpToWinExact(beforeHit.score);
        const beforeWin = bestWin;
        const afterWin = cpToWinExact(afterHit.score);
        const moverPovBest = moverTurn === 'w' ? bestWin : 100 - bestWin;
        const moverPovAfter = moverTurn === 'w' ? afterWin : 100 - afterWin;
        const drop = (beforeHit.bestUci === playedUci || isMateMove || moverPovAfter >= 99.9)
          ? 0
          : Math.max(0, (moverPovBest - moverPovAfter) / 100);
        const classification = beforeHit.bestUci === playedUci
          ? 'best'
          : drop < 0.02 ? 'excellent'
          : drop < 0.05 ? 'good'
          : drop < 0.10 ? 'inaccuracy'
          : drop < 0.25 ? 'mistake'
          : 'blunder';
        return {
          bestUci: beforeHit.bestUci,
          whiteChanceBefore: beforeWin,
          whiteChanceAfter: afterWin,
          whiteChanceBest: bestWin,
          afterBestUci: afterHit.bestUci,
          afterScore: afterHit.score,
          bestScore: beforeHit.score,
          afterDepth: afterHit.depth,
          moverSecondBestChance: null,
          drop,
          classification,
          depth: beforeHit.depth,
          isMateMove,
          explanation:
            classification === 'best' ? 'מהלך מדויק מאוד.'
            : classification === 'blunder' ? 'המהלך איבד יתרון משמעותי.'
            : classification === 'mistake' ? 'המהלך החליש את העמדה.'
            : 'המהלך סביר, אבל יש אפשרות טובה יותר.',
        };
      }
    }

    const res = await baseAnalyze(fen, afterFen, mover, beforeHit, alternatives, afterHit);
    if (res && Number.isFinite(res.bestScore)) {
      cache.set(fen, { fen, score: res.bestScore, depth: res.depth, bestUci: res.bestUci ?? null });
    }
    if (res && Number.isFinite(res.afterScore)) {
      cache.set(afterFen, { fen: afterFen, score: res.afterScore, depth: res.afterDepth, bestUci: res.afterBestUci ?? null });
    }
    return res;
  };
}

/** Browser Web Worker pool for parallel Chessy MIT WASM evaluation with immediate teardown on cancel. */
export class DnaWorkerPool {
  private workers: Worker[] = [];
  private terminated = false;

  constructor(public readonly size: number, private readonly workerUrl = '/engine-worker.js') {}

  private spawnOne(): Promise<Worker> {
    return new Promise((resolve, reject) => {
      if (this.terminated) { reject(new Error('DNA worker pool terminated')); return; }
      const w = new Worker(this.workerUrl);
      this.workers.push(w);
      let settled = false;
      const done = (fn: (v: any) => void, val: any) => {
        if (settled) return;
        settled = true;
        w.removeEventListener('message', onMsg);
        w.removeEventListener('error', onErr);
        clearTimeout(timer);
        fn(val);
      };
      const onMsg = (e: MessageEvent) => {
        if (e.data === 'ready') done(resolve, w);
        else if (e.data?.type === 'boot-error') done(reject, new Error(e.data.error || 'engine boot failed'));
      };
      const onErr = (e: ErrorEvent) => done(reject, new Error(e.message || 'worker error'));
      const timer = setTimeout(() => done(reject, new Error('engine worker startup timeout')), 15000);
      w.addEventListener('message', onMsg);
      w.addEventListener('error', onErr);
    });
  }

  async init(): Promise<BaseAnalyzePositionFn[]> {
    const spawned = await Promise.all(Array.from({ length: this.size }, () => this.spawnOne()));
    return spawned.map(worker => (fen, afterFen, mover, cachedBefore, alternatives, cachedAfter) => {
      if (this.terminated) return Promise.reject(new Error('DNA scan cancelled'));
      return new Promise((resolve, reject) => {
        const id = Math.random().toString(36).slice(2);
        let done = false;
        const finish = (fn: (v: any) => void, value: any) => {
          if (done) return;
          done = true;
          worker.removeEventListener('message', handler);
          clearTimeout(timer);
          fn(value);
        };
        const handler = (e: MessageEvent) => {
          if (e.data?.id !== id) return;
          if (e.data.error) finish(reject, new Error(e.data.error));
          else finish(resolve, e.data.result);
        };
        const timer = setTimeout(() => finish(reject, new Error('analysis timeout')), 12000);
        worker.addEventListener('message', handler);
        worker.postMessage({
          id,
          fen,
          afterFen,
          mover: { from: mover.from, to: mover.to, promotion: mover.promotion || null },
          cachedBefore,
          cachedAfter,
          alternatives,
        });
      });
    });
  }

  terminateAll(): void {
    this.terminated = true;
    for (const w of this.workers) {
      try { w.terminate(); } catch {}
    }
    this.workers = [];
  }
}

/**
 * Pipelined save-game queue: saves analyzed games concurrently (max 2 in flight) while the
 * engine evaluates the next game, retries HTTP 429 cleanly with backoff, and strictly verifies
 * EVERY game returned ok:true before save-report is allowed.
 */
export class SaveGamePipeline {
  private readonly maxConcurrent: number;
  private active = 0;
  private readonly queue: Array<() => void> = [];
  private readonly promises: Array<Promise<void>> = [];
  private firstError: Error | null = null;
  public savedCount = 0;
  public retryCount = 0;

  constructor(
    private readonly saveFn: (payload: any) => Promise<{ ok: boolean; status?: number; data?: any }>,
    options?: { maxConcurrent?: number; maxRetries429?: number; baseRetryMs?: number }
  ) {
    this.maxConcurrent = Math.max(1, Math.min(2, options?.maxConcurrent ?? 2));
    this.maxRetries429 = Math.max(0, options?.maxRetries429 ?? 3);
    this.baseRetryMs = Math.max(10, options?.baseRetryMs ?? 450);
  }
  private readonly maxRetries429: number;
  private readonly baseRetryMs: number;

  private acquire(): Promise<void> {
    if (this.active < this.maxConcurrent) {
      this.active += 1;
      return Promise.resolve();
    }
    return new Promise(resolve => this.queue.push(resolve));
  }

  private release(): void {
    this.active -= 1;
    const next = this.queue.shift();
    if (next) {
      this.active += 1;
      next();
    }
  }

  enqueue(payload: any, label: string): void {
    const task = (async () => {
      await this.acquire();
      try {
        if (this.firstError) return;
        let attempt = 0;
        while (true) {
          const res = await this.saveFn(payload);
          if (res?.ok) {
            this.savedCount += 1;
            return;
          }
          if (res?.status === 429 && attempt < this.maxRetries429) {
            attempt += 1;
            this.retryCount += 1;
            await new Promise(r => setTimeout(r, this.baseRetryMs * attempt));
            continue;
          }
          const err = new Error(`שמירת ${label} בשרת נכשלה (סטטוס ${res?.status ?? 0}). דוח חלקי לא יישמר.`);
          if (!this.firstError) this.firstError = err;
          throw err;
        }
      } catch (err: any) {
        if (!this.firstError) this.firstError = err instanceof Error ? err : new Error(String(err));
        throw this.firstError;
      } finally {
        this.release();
      }
    })();
    // Prevent unhandled rejection before flushAndVerify inspects all settled promises
    task.catch(() => {});
    this.promises.push(task);
  }

  async flushAndVerify(): Promise<{ ok: boolean; savedCount: number; retryCount: number }> {
    await Promise.allSettled(this.promises);
    if (this.firstError) throw this.firstError;
    return { ok: true, savedCount: this.savedCount, retryCount: this.retryCount };
  }
}

/** Clean RTL Hebrew numeric selector for Bullet / Blitz / Rapid custom game counts + quick presets. */
export function DnaCustomCountsBar({
  counts,
  disabled,
  onChange,
}: {
  counts: DnaCustomCounts;
  disabled?: boolean;
  onChange: (next: DnaCustomCounts) => void;
}) {
  const ReactObj = (globalThis as any).React;
  const h = ReactObj.createElement;
  const norm = normalizeDnaCustomCounts(counts);
  const workers = resolveWorkerPoolSize({ gamesToAnalyze: Math.max(1, norm.total) });
  const etaSec = estimateDnaScanSeconds(norm.total, workers);

  const fields: Array<{ key: keyof DnaCustomCounts; labelHe: string }> = [
    { key: 'bullet', labelHe: 'Bullet' },
    { key: 'blitz', labelHe: 'Blitz' },
    { key: 'rapid', labelHe: 'Rapid' },
  ];

  function handleInput(key: keyof DnaCustomCounts, raw: string) {
    const parsed = raw === '' ? 0 : Math.max(0, Math.min(DNA_MAX_PER_CLASS, Math.floor(Number(raw) || 0)));
    const next = normalizeDnaCustomCounts({ ...counts, [key]: parsed }).counts;
    onChange(next);
  }

  return h('div', { className: 'dna-custom-counts', 'data-dna-custom-counts': 'true', dir: 'rtl' },
    h('div', { className: 'dna-counts-head' },
      h('strong', null, 'כמה משחקים לסרוק מכל סוג זמן?'),
      h('span', { className: 'muted', 'data-dna-total-summary': 'true' },
        `סה״כ ${norm.total} משחקים (תקרה ${DNA_MAX_TOTAL_GAMES}) · ~${etaSec} שנ׳ (${workers} ליבות מקביליות)`
      )
    ),
    h('div', { className: 'dna-counts-presets' },
      DNA_CUSTOM_PRESETS.map(p =>
        h('button', {
          key: p.id,
          type: 'button',
          className: 'dna-preset-btn ' + (
            counts.bullet === p.counts.bullet && counts.blitz === p.counts.blitz && counts.rapid === p.counts.rapid
              ? 'is-active' : ''
          ),
          'data-dna-preset': p.id,
          disabled,
          onClick: () => onChange({ ...p.counts }),
        }, p.labelHe)
      )
    ),
    h('div', { className: 'dna-counts-inputs' },
      fields.map(f =>
        h('label', { key: f.key, className: 'dna-count-field' },
          h('span', null, f.labelHe),
          h('input', {
            type: 'number',
            min: 0,
            max: DNA_MAX_PER_CLASS,
            step: 1,
            inputMode: 'numeric',
            dir: 'ltr',
            disabled,
            'data-dna-count-input': f.key,
            'aria-label': `כמות משחקי ${f.labelHe} לסריקה`,
            value: String(counts[f.key]),
            onChange: (e: any) => handleInput(f.key, e.target.value),
          })
        )
      )
    ),
    norm.highVolumeWarning && h('p', { className: 'dna-volume-warn', role: 'status', 'data-dna-volume-warn': 'true' },
      `⚠️ בחרת מעל ${DNA_WARN_TOTAL_GAMES} משחקים (${norm.total}) — הסריקה תרוץ במקביל אך עשויה לקחת יותר זמן במובייל.`
    ),
    !norm.valid && h('p', { className: 'dna-error', role: 'alert' }, 'בחר לפחות משחק אחד באחד מסוגי הזמן כדי להתחיל סריקה.')
  );
}

export interface FastDnaScanParams {
  identified: any[];
  cached: Map<string, any>;
  openingSet: Set<string>;
  Chess: any;
  makeBoardState: (pgn: string) => { hist: any[] };
  parseGameClocks: (pgn: string, moves: any[]) => (number | null)[];
  buildSaveGamePayload: (archived: any, analysis: any) => any;
  analyzeGameMoves: (moves: any[], opts: any) => Promise<any[]>;
  computeReviewSummary: (results: any[]) => any;
  ReviewAnalysisError: any;
  dnaRequest: (url: string, opts: any) => Promise<{ ok: boolean; status?: number; data?: any }>;
  onGameReady?: (hist: any[], moves: any[], archived: any) => void;
  assertSameOwner: () => void;
  setStatus: (msg: string) => void;
  setProgress: (p: { done: number; total: number }) => void;
  onPoolCreated: (pool: DnaWorkerPool | null) => void;
}

async function analyzeOneGameInLane(params: FastDnaScanParams, archived: any, idx: number, cachedFn: BaseAnalyzePositionFn) {
  const parsed = params.makeBoardState(archived.pgn);
  const moves = parsed.hist || [];
  if (!moves.length) throw new Error('המשחק ' + archived.id + ' לא מכיל מהלכים שאפשר לנתח.');
  const clockSeconds = params.parseGameClocks(archived.pgn, moves);
  let analyzedMoves: any[];
  try {
    analyzedMoves = await params.analyzeGameMoves(moves, {
      Chess: params.Chess, analyzePosition: cachedFn, openingLines: params.openingSet, beforeMove: params.assertSameOwner,
    });
  } catch (error: any) {
    if (error instanceof params.ReviewAnalysisError && error.reason === 'illegal-move') {
      throw new Error('נמצא מהלך לא חוקי במשחק ' + archived.id + '.');
    }
    throw error instanceof params.ReviewAnalysisError && error.reason === 'engine' ? error.cause : error;
  }
  const results = analyzedMoves.map(row => ({ ...row, clockSeconds: clockSeconds.length ? clockSeconds[row.index] : null }));
  const gameAnalysis = { moves: results, summary: params.computeReviewSummary(results) };
  return { moves, gameAnalysis, idx };
}

/** Runs cache reuse + parallel Web Worker pool analysis + pipelined save-game barrier cleanly. */
export async function executeFastDnaScan(params: FastDnaScanParams): Promise<{
  analyzed: any[];
  scanMistakes: any[];
  reusedCount: number;
  analyzedCount: number;
  completedGames: number;
}> {
  const { identified, cached } = params;
  const analyzed: any[] = new Array(identified.length);
  const scanMistakes: any[] = [];
  const toAnalyzeIndices: number[] = [];
  let reusedCount = 0;
  let analyzedCount = 0;
  let completedGames = 0;

  const savePipeline = new SaveGamePipeline(
    payload => params.dnaRequest('/api/chess-dna', { method: 'POST', timeoutMs: 30000, body: payload }),
    { maxConcurrent: 2, maxRetries429: 3 }
  );

  for (let idx = 0; idx < identified.length; idx++) {
    const archived = identified[idx];
    const stored = cached.get(archived.fingerprint);
    const valid = Boolean(stored?.analysis && Array.isArray(stored.analysis.moves) && stored.analysis.summary);
    if (!valid) { toAnalyzeIndices.push(idx); continue; }
    reusedCount++;
    if (stored.timeClass !== archived.timeClass || stored.playerColor !== archived.playerColor || stored.date !== archived.date || stored.source !== archived.source) {
      savePipeline.enqueue(params.buildSaveGamePayload(archived, stored.analysis), 'עדכון פרטי משחק ' + (idx + 1));
    }
    if (params.onGameReady) params.onGameReady(params.makeBoardState(archived.pgn).hist, stored.analysis.moves, archived);
    analyzed[idx] = { ...archived, analysis: stored.analysis };
    completedGames++;
    params.setProgress({ done: completedGames, total: identified.length });
  }

  if (toAnalyzeIndices.length > 0) {
    const poolSize = resolveWorkerPoolSize({ gamesToAnalyze: toAnalyzeIndices.length });
    const posCache = new DnaPositionEvalCache(DNA_ENGINE_VERSION);
    const pool = new DnaWorkerPool(poolSize);
    params.onPoolCreated(pool);
    try {
      params.setStatus(`מאתחל ${poolSize} מנועי ניתוח מקביליים (${toAnalyzeIndices.length} משחקים חדשים, ${reusedCount} מהמטמון)...`);
      const workerAnalyzers = await pool.init();
      let cursor = 0;
      await Promise.all(workerAnalyzers.map(async (laneFn) => {
        const cachedFn = createCachedAnalyzePosition(laneFn, posCache);
        while (cursor < toAnalyzeIndices.length) {
          params.assertSameOwner();
          const idx = toAnalyzeIndices[cursor++];
          const archived = identified[idx];
          params.setStatus(`מנתח במקביל (${poolSize} ליבות): ${completedGames + 1} / ${identified.length} (${archived.timeClass}) · מטמון עמדות: ${posCache.hits}`);
          const { moves, gameAnalysis } = await analyzeOneGameInLane(params, archived, idx, cachedFn);
          params.assertSameOwner();
          savePipeline.enqueue(params.buildSaveGamePayload(archived, gameAnalysis), 'משחק ' + (idx + 1));
          if (params.onGameReady) params.onGameReady(moves, gameAnalysis.moves, archived);
          analyzed[idx] = { ...archived, analysis: gameAnalysis };
          analyzedCount++;
          completedGames++;
          params.setProgress({ done: completedGames, total: identified.length });
        }
      }));
    } finally {
      pool.terminateAll();
      params.onPoolCreated(null);
    }
  }

  params.assertSameOwner();
  params.setStatus('מוודא שכל ניתוחי המשחקים נשמרו בשרת...');
  await savePipeline.flushAndVerify();
  return { analyzed, scanMistakes, reusedCount, analyzedCount, completedGames };
}

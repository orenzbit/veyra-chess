// Page-side client for the background bot search (src/bot-worker.ts).
// One worker per page session, one request in flight. A newer request or cancel() terminates a
// busy worker (a running search cannot be interrupted). Replies are applied only if their id and
// FEN match the request in flight and the move is legal there. If the worker is unavailable, does
// not finish booting, crashes, misses its deadline or answers badly, the same search runs on the
// page instead: bounded by the same deadline in timed games, today's full search in untimed play.
// Untimed searches have no time cap once the worker is ready.
import { chooseBotMoveTimed } from './bot-engine.js';
import { botNow } from './bot-time.js';

export type BotMove = { from: string; to: string; promotion?: string };
export type BotMoveOptions = { deadlineAt?: number | null; ChessCtor: any };
export type BotMoveReply = { move: BotMove | null; source: 'worker' | 'fallback'; depth: number | null; complete: boolean };
export type BotMoveChooser = (fen: string, bot: any, options: BotMoveOptions) => Promise<BotMoveReply>;

export const BOT_WORKER_WATCHDOG_GRACE_MS = 1000;
export const BOT_WORKER_BOOT_TIMEOUT_MS = 5000;
const MAX_WORKER_CRASHES = 2;
const CRASH_FORGIVE_AFTER_REPLIES = 10;
const MAX_BOOT_TIMEOUTS = 2;

export class BotMoveCancelledError extends Error {
  constructor(reason: string) {
    super(`Bot move ${reason}`);
    this.name = 'BotMoveCancelled';
  }
}
export function isBotMoveCancelled(error: any): boolean {
  return Boolean(error) && error.name === 'BotMoveCancelled';
}

// The only bot fields the search reads; keeps the message small and cloneable.
export const BOT_WORKER_BOT_FIELDS = ['elo', 'style', 'openingsAsWhite', 'openingsAsBlack', 'gambits', 'searchDepthCap', 'openingMatchMode'];
export function workerBotFields(bot: any) {
  const fields: any = {};
  for (const key of BOT_WORKER_BOT_FIELDS) fields[key] = bot?.[key];
  return fields;
}

export function legalBotMove(ChessCtor: any, fen: string, move: any): BotMove | null {
  if (!move || typeof move.from !== 'string' || typeof move.to !== 'string') return null;
  try {
    const probe = new ChessCtor(fen);
    const applied = probe.move({ from: move.from, to: move.to, promotion: move.promotion || undefined });
    return applied ? { from: applied.from, to: applied.to, promotion: applied.promotion || undefined } : null;
  } catch {
    return null;
  }
}

// Last-resort move on the page: a depth-1 search (a few ms), else the first legal move.
export function botMoveOnPage(fen: string, bot: any, ChessCtor: any): BotMove | null {
  try {
    const result = chooseBotMoveTimed(new ChessCtor(fen), bot || {}, ChessCtor, { deadlineAt: botNow() });
    const move = legalBotMove(ChessCtor, fen, result.move);
    if (move) return move;
  } catch {}
  try {
    return legalBotMove(ChessCtor, fen, new ChessCtor(fen).moves({ verbose: true })[0]);
  } catch {
    return null;
  }
}

type WorkerLike = {
  postMessage: (message: any) => void;
  terminate: () => void;
  onmessage: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onmessageerror?: ((event: any) => void) | null;
};

type ClientEnv = {
  createWorker: () => WorkerLike | null;
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => any;
  clearTimer?: (handle: any) => void;
};

type PendingRequest = {
  id: number;
  fen: string;
  bot: any;
  ChessCtor: any;
  deadlineAt: number | null;
  worker: WorkerLike | null;
  watchdog: any;
  resolve: (reply: BotMoveReply) => void;
  reject: (error: any) => void;
};

export function createBotWorkerClient(env: ClientEnv) {
  const now = env.now || botNow;
  const setTimer = env.setTimer || ((fn: () => void, ms: number) => setTimeout(fn, ms));
  const clearTimer = env.clearTimer || ((handle: any) => clearTimeout(handle));
  let worker: WorkerLike | null = null;
  let ready = false;
  let bootTimer: any = null;
  let disabled = false;
  let crashes = 0;
  let repliesSinceCrash = 0;
  let bootTimeouts = 0;
  let nextId = 0;
  let inflight: PendingRequest | null = null;
  const stats = { created: 0, terminated: 0, fallbacks: 0, staleReplies: 0, workerReplies: 0 };

  function dispose() {
    clearTimer(bootTimer);
    bootTimer = null;
    if (!worker) return;
    const old = worker;
    worker = null;
    ready = false;
    old.onmessage = null;
    old.onerror = null;
    if ('onmessageerror' in old) old.onmessageerror = null;
    try { old.terminate(); } catch {}
    stats.terminated++;
  }

  function disable() {
    disabled = true;
    dispose();
  }

  function spawn(): WorkerLike | null {
    if (disabled) return null;
    if (worker) return worker;
    let created: WorkerLike | null = null;
    try { created = env.createWorker(); } catch { created = null; }
    if (!created) { disabled = true; return null; }
    stats.created++;
    worker = created;
    ready = false;
    created.onmessage = (event: any) => onMessage(created, event?.data);
    created.onerror = (event: any) => { try { event?.preventDefault?.(); } catch {} onWorkerFailure(created); };
    created.onmessageerror = () => onWorkerFailure(created);
    bootTimer = setTimer(() => onBootFailure(created), BOT_WORKER_BOOT_TIMEOUT_MS);
    return created;
  }

  function settle(req: PendingRequest, reply: BotMoveReply) {
    if (inflight !== req) return;
    inflight = null;
    clearTimer(req.watchdog);
    req.resolve(reply);
  }

  function fallback(req: PendingRequest) {
    if (inflight !== req) return;
    clearTimer(req.watchdog);
    stats.fallbacks++;
    let move: BotMove | null = null;
    let depth: number | null = null;
    let complete = true;
    try {
      const result = chooseBotMoveTimed(new req.ChessCtor(req.fen), req.bot, req.ChessCtor, { deadlineAt: req.deadlineAt, now });
      move = legalBotMove(req.ChessCtor, req.fen, result.move);
      depth = result.depth;
      complete = result.complete;
    } catch {}
    settle(req, { move, source: 'fallback', depth, complete });
  }

  function fallbackIfOn(failed: WorkerLike) {
    if (inflight && inflight.worker === failed) fallback(inflight);
  }

  // Script/rules did not load, or no 'ready' in time: no further workers this page session.
  function onBootFailure(failed: WorkerLike) {
    if (failed !== worker || ready) return;
    disable();
    fallbackIfOn(failed);
  }

  function countCrash() {
    repliesSinceCrash = 0;
    if (++crashes >= MAX_WORKER_CRASHES) disable();
  }

  function onWorkerFailure(failed: WorkerLike) {
    if (failed !== worker) return;
    if (!ready) { onBootFailure(failed); return; }
    dispose();
    countCrash();
    fallbackIfOn(failed);
  }

  function onMessage(source: WorkerLike, data: any) {
    if (source !== worker) return;
    if (data?.type === 'ready') { ready = true; bootTimeouts = 0; clearTimer(bootTimer); bootTimer = null; return; }
    if (data?.type === 'boot-error') { onBootFailure(source); return; }
    const req = inflight;
    if (!req || req.worker !== source || data?.id !== req.id) { stats.staleReplies++; return; }
    if (data.type === 'move' && data.fen === req.fen) {
      const move = legalBotMove(req.ChessCtor, req.fen, data.move);
      if (move) {
        stats.workerReplies++;
        if (crashes && ++repliesSinceCrash >= CRASH_FORGIVE_AFTER_REPLIES) { crashes = 0; repliesSinceCrash = 0; }
        settle(req, { move, source: 'worker', depth: typeof data.depth === 'number' ? data.depth : null, complete: Boolean(data.complete) });
        return;
      }
    }
    if (data?.type === 'error') {
      if (data.fatal) disable();
      else countCrash();
    }
    fallback(req);
  }

  function onWatchdog(req: PendingRequest) {
    if (inflight !== req) return;
    if (req.worker && req.worker === worker) {
      const wasReady = ready;
      dispose();
      if (!wasReady && ++bootTimeouts >= MAX_BOOT_TIMEOUTS) disabled = true;
    }
    fallback(req);
  }

  function abort(req: PendingRequest, reason: string) {
    if (inflight !== req) return;
    inflight = null;
    clearTimer(req.watchdog);
    // Still waiting for this worker's answer, so it is busy: restart instead of queueing behind it.
    if (req.worker && req.worker === worker) dispose();
    req.reject(new BotMoveCancelledError(reason));
  }

  function choose(fen: string, bot: any, options: BotMoveOptions): Promise<BotMoveReply> {
    if (inflight) abort(inflight, 'superseded');
    const deadlineAt = typeof options?.deadlineAt === 'number' && Number.isFinite(options.deadlineAt) ? options.deadlineAt : null;
    const req = { id: ++nextId, fen: String(fen), bot, ChessCtor: options?.ChessCtor, deadlineAt, worker: null, watchdog: null } as PendingRequest;
    const promise = new Promise<BotMoveReply>((resolve, reject) => { req.resolve = resolve; req.reject = reject; });
    inflight = req;
    const target = spawn();
    if (target) {
      try {
        target.postMessage({ type: 'choose', id: req.id, fen: req.fen, bot: workerBotFields(bot), deadlineAt });
        req.worker = target;
      } catch {
        // This request could not be sent (e.g. not cloneable); the worker itself is fine.
      }
    }
    if (!req.worker) {
      setTimer(() => fallback(req), 0);
      return promise;
    }
    if (deadlineAt != null) req.watchdog = setTimer(() => onWatchdog(req), Math.max(0, deadlineAt + BOT_WORKER_WATCHDOG_GRACE_MS - now()));
    return promise;
  }

  function cancel() {
    if (inflight) abort(inflight, 'cancelled');
  }

  return { choose, cancel, stats, state: () => ({ hasWorker: Boolean(worker), ready, disabled, inflight: Boolean(inflight), crashes }) };
}

function createBrowserBotWorker(): WorkerLike | null {
  if (typeof Worker === 'undefined') return null;
  return new Worker(new URL('./bot-worker.js', import.meta.url), { type: 'module' }) as any;
}

let pageClient: ReturnType<typeof createBotWorkerClient> | null = null;
function getPageClient() {
  if (!pageClient) pageClient = createBotWorkerClient({ createWorker: createBrowserBotWorker });
  return pageClient;
}

export const chooseBotMoveAsync: BotMoveChooser = (fen, bot, options) => getPageClient().choose(fen, bot, options);

// No-op when nothing is in flight, so the idle worker stays warm between moves.
export function cancelBotMove() {
  if (pageClient) pageClient.cancel();
}

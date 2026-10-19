// Durable queue for attempts and Rush runs. Everything has a client-made UUID so re-sending is always safe.
import type { AttemptDto, ApiResult, CheckpointBody, CheckpointResponse, RushRunDto } from './api.js';

export interface OutboxItem extends AttemptDto { mode: 'regular' | 'rush' | 'streak'; tries: number }
export interface StorageLike { getItem(k: string): string | null; setItem(k: string, v: string): void }
export type SendFn = (body: CheckpointBody, keepalive?: boolean) => Promise<ApiResult<CheckpointResponse>>;

export const MAX_ITEMS = 500;
export const MAX_DEAD = 50;
export const BATCH = 100;
export const MAX_TRIES = 3;
const BACKOFF_BASE_MS = 15000;
const BACKOFF_MAX_MS = 300000;
export const DEAD_KEY = 'veyra_puzzle_dead_v1';

export type FlushStatus = 'empty' | 'sent' | 'waiting' | 'auth' | 'disabled';
export interface FlushResult { status: FlushStatus; sent: number; waitMs: number; last?: CheckpointResponse }

export function outboxKey(userId: string) { return 'veyra_puzzle_outbox_v1:' + userId; }

export class Outbox {
  private mem: Record<string, string> = {};
  private failures = 0;
  private nextAt = 0;
  private flushing: Promise<FlushResult> | null = null;

  constructor(private userId: string, private storage: StorageLike | null, private now: () => number = Date.now) {}

  private read(): { items: OutboxItem[]; runs: RushRunDto[] } {
    try {
      const raw = this.get(outboxKey(this.userId));
      if (!raw) return { items: [], runs: [] };
      const v = JSON.parse(raw);
      return { items: Array.isArray(v.items) ? v.items : [], runs: Array.isArray(v.runs) ? v.runs : [] };
    } catch { return { items: [], runs: [] }; }
  }
  private write(v: { items: OutboxItem[]; runs: RushRunDto[] }) {
    if (v.items.length > MAX_ITEMS) v.items = v.items.slice(v.items.length - MAX_ITEMS);
    this.set(outboxKey(this.userId), JSON.stringify(v));
  }
  private get(k: string): string | null {
    try { const s = this.storage?.getItem(k); if (s !== null && s !== undefined) return s; } catch { /* storage blocked */ }
    return Object.prototype.hasOwnProperty.call(this.mem, k) ? this.mem[k] : null;
  }
  private set(k: string, val: string) {
    try { if (this.storage) { this.storage.setItem(k, val); delete this.mem[k]; return; } } catch { /* quota or blocked */ }
    this.mem[k] = val;
  }
  private bury(entries: unknown[]) {
    try {
      const list = JSON.parse(this.get(DEAD_KEY) || '[]');
      const next = (Array.isArray(list) ? list : []).concat(entries).slice(-MAX_DEAD);
      this.set(DEAD_KEY, JSON.stringify(next));
    } catch { /* debugging aid only */ }
  }

  add(a: Omit<OutboxItem, 'tries'>) {
    const v = this.read();
    if (v.items.some((i) => i.id === a.id)) return;
    v.items.push({ ...a, tries: 0 });
    this.write(v);
  }
  addRun(run: RushRunDto) {
    const v = this.read();
    if (v.runs.some((r) => r.id === run.id)) return;
    v.runs.push(run);
    this.write(v);
  }
  size() { const v = this.read(); return v.items.length + v.runs.length; }
  items() { return this.read().items; }
  runs() { return this.read().runs; }
  dead(): unknown[] { try { return JSON.parse(this.get(DEAD_KEY) || '[]'); } catch { return []; } }

  /** Sends one batch (or one run). Concurrent calls share the same flight. */
  flush(send: SendFn, meta: { sessionId: string; kitIds?: { regular?: string; rush?: string }; final?: boolean }, keepalive = false): Promise<FlushResult> {
    if (this.flushing) return this.flushing;
    this.flushing = this.run(send, meta, keepalive).finally(() => { this.flushing = null; });
    return this.flushing;
  }

  private async run(send: SendFn, meta: { sessionId: string; kitIds?: { regular?: string; rush?: string }; final?: boolean }, keepalive: boolean): Promise<FlushResult> {
    const v = this.read();
    if (!v.items.length && !v.runs.length) return { status: 'empty', sent: 0, waitMs: 0 };
    const wait = this.nextAt - this.now();
    if (wait > 0 && !keepalive) return { status: 'waiting', sent: 0, waitMs: wait };

    let body: CheckpointBody;
    let batchIds: string[] = [];
    let runId: string | null = null;
    if (v.items.length) {
      const mode = v.items[0].mode;
      const same = v.items.filter((i) => i.mode === mode);
      // After a rejected batch we send items one by one so a single bad item cannot block the others.
      const batch = same[0].tries > 0 ? same.slice(0, 1) : same.slice(0, BATCH);
      batchIds = batch.map((b) => b.id);
      body = {
        sessionId: meta.sessionId, mode, kitIds: meta.kitIds || {}, final: !!meta.final && v.items.length === batch.length && !v.runs.length,
        attempts: batch.map(({ tries: _t, mode: _m, ...a }) => a),
      };
    } else {
      const run = v.runs[0];
      runId = run.id;
      body = { sessionId: meta.sessionId, mode: 'rush', kitIds: meta.kitIds || {}, attempts: [], rushRun: run, final: !!meta.final };
    }

    const res = await send(body, keepalive);
    if (res.kind === 'ok') {
      this.failures = 0; this.nextAt = 0;
      const fresh = this.read();
      const rejected = new Map((res.data.rejected || []).map((r) => [r.id, r.reason]));
      const dead = fresh.items.filter((i) => rejected.has(i.id)).map((i) => ({ ...i, reason: rejected.get(i.id) }));
      if (dead.length) this.bury(dead);
      fresh.items = fresh.items.filter((i) => !batchIds.includes(i.id));
      if (runId) fresh.runs = fresh.runs.filter((r) => r.id !== runId);
      this.write(fresh);
      return { status: 'sent', sent: batchIds.length + (runId ? 1 : 0), waitMs: 0, last: res.data };
    }
    if (res.kind === 'auth') return { status: 'auth', sent: 0, waitMs: 0 };
    if (res.kind === 'disabled') return { status: 'disabled', sent: 0, waitMs: 0 };
    if (res.kind === 'network' || res.kind === 'rate') {
      this.failures += 1;
      const delay = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** (this.failures - 1));
      this.nextAt = this.now() + delay;
      return { status: 'waiting', sent: 0, waitMs: delay };
    }
    // The server refused this content (4xx other than auth): count a try, bury after MAX_TRIES.
    const fresh = this.read();
    const buried: unknown[] = [];
    fresh.items = fresh.items.filter((i) => {
      if (!batchIds.includes(i.id)) return true;
      i.tries += 1;
      if (i.tries >= MAX_TRIES) { buried.push({ ...i, reason: 'server_rejected' }); return false; }
      return true;
    });
    if (runId) {
      // Runs carry no per-item counter; a refused run is buried at once.
      buried.push({ ...fresh.runs.find((r) => r.id === runId), reason: 'server_rejected' });
      fresh.runs = fresh.runs.filter((r) => r.id !== runId);
    }
    if (buried.length) this.bury(buried);
    this.write(fresh);
    return { status: 'waiting', sent: 0, waitMs: 0 };
  }
}

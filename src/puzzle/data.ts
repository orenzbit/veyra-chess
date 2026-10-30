// Client-side data hub for personal puzzles: loads server state, caches it, queues attempts, drives the
// background analysis job. Plain class (no React) so Node tests can exercise it with fakes.
import type { ApiResult, CheckpointResponse, JobDto, KitDto, PuzzleApi, PuzzleDto, PuzzleStateDto, RushRunDto } from './api.js';
import { Outbox } from './outbox.js';
import type { StorageLike } from './outbox.js';

export type DataPhase = 'loading' | 'ready' | 'auth' | 'disabled' | 'offline';
export interface Snapshot {
  phase: DataPhase; state: PuzzleStateDto | null; offline: boolean; pending: number; authLost: boolean;
  dnaBusy: boolean; lastReport: any | null; lastJob: JobDto | null; message: string;
}
export const STALE_JOB_MS = 90000;
export const cacheKey = (userId: string) => 'veyra_puzzle_state_v2:' + userId;

interface Opts {
  userId: string; api: PuzzleApi; storage: StorageLike | null; now?: () => number; uuid?: () => string;
}

export class PuzzleData {
  snap: Snapshot = { phase: 'loading', state: null, offline: false, pending: 0, authLost: false, dnaBusy: false, lastReport: null, lastJob: null, message: '' };
  readonly outbox: Outbox;
  readonly sessionId: string;
  private listeners = new Set<() => void>();
  private api: PuzzleApi;
  private storage: StorageLike | null;
  private now: () => number;
  private refilling = false;

  constructor(private o: Opts) {
    this.api = o.api; this.storage = o.storage; this.now = o.now || Date.now;
    const uuid = o.uuid || (() => (globalThis.crypto && (globalThis.crypto as any).randomUUID ? (globalThis.crypto as any).randomUUID() : fallbackUuid()));
    this.sessionId = uuid();
    this.uuid = uuid;
    this.outbox = new Outbox(o.userId, o.storage, this.now);
    this.snap.pending = this.outbox.size();
  }
  readonly uuid: () => string;

  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private set(patch: Partial<Snapshot>) { this.snap = { ...this.snap, ...patch, pending: this.outbox.size() }; this.listeners.forEach((l) => l()); }

  private readCache(): PuzzleStateDto | null {
    try { const raw = this.storage?.getItem(cacheKey(this.o.userId)); return raw ? (JSON.parse(raw) as PuzzleStateDto) : null; } catch { return null; }
  }
  private writeCache(s: PuzzleStateDto) { try { this.storage?.setItem(cacheKey(this.o.userId), JSON.stringify(s)); } catch { /* quota: the cache is optional */ } }

  /** Handles results every call can produce. Returns true when the result is usable. */
  private gate<T>(r: ApiResult<T>): r is Extract<ApiResult<T>, { kind: 'ok' }> {
    if (r.kind === 'ok') return true;
    if (r.kind === 'auth') this.set({ authLost: true });
    return false;
  }

  async load(): Promise<void> {
    const r = await this.api.getState();
    if (r.kind === 'ok') {
      this.writeCache(r.data);
      this.set({ phase: 'ready', state: r.data, offline: false, authLost: false });
      await this.afterState(r.data);
      return;
    }
    if (r.kind === 'auth') { this.set({ phase: 'auth', authLost: true }); return; }
    if (r.kind === 'disabled') { this.set({ phase: 'disabled' }); return; }
    const cached = this.readCache();
    if (cached) this.set({ phase: 'ready', state: cached, offline: true });
    else this.set({ phase: 'offline', offline: true });
  }

  /** Pool numbers, profile, job and refill flag, without replacing the kit the user is working on. */
  async refreshMeta(): Promise<void> {
    const r = await this.api.getState();
    if (!this.gate(r)) { if (r.kind === 'network') this.set({ offline: true }); return; }
    const cur = this.snap.state;
    const merged: PuzzleStateDto = { ...r.data, kits: cur?.kits?.regular || cur?.kits?.rush ? cur.kits : r.data.kits };
    this.writeCache(merged);
    this.set({ state: merged, offline: false });
    await this.afterState(merged);
  }

  private async afterState(s: PuzzleStateDto) {
    if (s.job) { await this.continueJob(s.job); return; }
    if (s.refillNeeded) await this.maybeRefill();
  }

  async maybeRefill(): Promise<void> {
    if (this.refilling) return;
    this.refilling = true;
    try {
      const r = await this.api.startRefill();
      if (this.gate(r) && r.data.started && r.data.jobId) await this.api.runBackground(r.data.jobId);
    } finally { this.refilling = false; }
  }

  /** Starts (or continues) the background function when the job is idle, paused or its worker has stopped. */
  private async continueJob(job: JobDto) {
    const stale = this.now() - Date.parse(job.updatedAt) > STALE_JOB_MS;
    if (job.status === 'queued' || (job.status === 'running' && stale)) await this.api.runBackground(job.id);
  }

  async startDna(): Promise<void> {
    this.set({ dnaBusy: true, message: '', lastReport: null });
    const r = await this.api.startDna('auto', 40);
    if (r.kind === 'ok') { await this.api.runBackground(r.data.jobId); await this.refreshMeta(); this.set({ dnaBusy: false }); return; }
    if (r.kind === 'conflict') { await this.refreshMeta(); this.set({ dnaBusy: false }); return; }
    const message = r.kind === 'rate' ? 'daily_or_rate_limit' : r.kind === 'error' && r.data?.error === 'daily_cap' ? 'daily_cap' : r.kind === 'network' ? 'network' : r.kind === 'auth' ? 'auth' : 'error';
    this.set({ dnaBusy: false, message });
  }

  /** Called every few seconds while a job is active. */
  async pollJob(): Promise<void> {
    const job = this.snap.state?.job;
    if (!job) return;
    const r = await this.api.getJob(job.id);
    if (!this.gate(r)) return;
    const j = r.data.job;
    if (j.status === 'done' || j.status === 'failed' || j.status === 'cancelled') {
      this.set({ lastReport: j.report || null, lastJob: j, message: j.status === 'failed' ? 'job_failed' : '' });
      await this.refreshMetaAfterJob();
      return;
    }
    const s = this.snap.state as PuzzleStateDto;
    this.set({ state: { ...s, job: j } });
    await this.continueJob(j);
  }
  private async refreshMetaAfterJob() {
    const r = await this.api.getState();
    if (!this.gate(r)) return;
    const cur = this.snap.state;
    // The pool changed; the kit in use stays, new kits come after the next finished session.
    const merged: PuzzleStateDto = { ...r.data, kits: cur?.kits || r.data.kits };
    this.writeCache(merged);
    this.set({ state: merged });
  }

  // ---- attempts
  recordAttempt(mode: 'regular' | 'rush' | 'streak', p: PuzzleDto, a: { solved: boolean; ms: number; move: string; viaAlt: boolean }) {
    this.outbox.add({ id: this.uuid(), puzzleId: p.id, mode, solved: a.solved, ms: Math.max(0, Math.min(600000, Math.round(a.ms))), move: a.move, viaAlt: a.viaAlt, at: new Date(this.now()).toISOString() });
    this.set({});
  }
  recordRun(run: RushRunDto) { this.outbox.addRun(run); this.set({}); }

  /** Sends what is queued. `final` marks the end of a session so the server can hand out a new kit. */
  async flush(opts: { final?: boolean; keepalive?: boolean } = {}): Promise<CheckpointResponse | null> {
    const s = this.snap.state;
    const kitIds = { regular: s?.kits?.regular?.id, rush: s?.kits?.rush?.id };
    const res = await this.outbox.flush((body, ka) => this.api.checkpoint(body, ka), { sessionId: this.sessionId, kitIds, final: opts.final }, !!opts.keepalive);
    if (res.status === 'auth') { this.set({ authLost: true }); return null; }
    if (res.status === 'waiting') { this.set({ offline: true }); return null; }
    if (res.status === 'sent' && res.last) {
      const cur = this.snap.state;
      if (cur) {
        const kits = res.last.state.kits ? { ...cur.kits, ...res.last.state.kits } : cur.kits;
        const merged: PuzzleStateDto = { ...cur, pool: res.last.state.pool, profile: res.last.state.profile, rushBest: res.last.state.rushBest, kits, refillNeeded: res.last.refillNeeded };
        this.writeCache(merged);
        this.set({ state: merged, offline: false });
        if (res.last.refillNeeded) await this.maybeRefill();
      }
      // More queued (several batches, or the run after the attempts)?
      if (this.outbox.size() > 0 && !opts.keepalive) return (await this.flush(opts)) || res.last;
      return res.last;
    }
    this.set({});
    return null;
  }

  /** More Rush puzzles when the kit ran out. Never repeats puzzles already played. */
  async moreRushPuzzles(excludeIds: string[]): Promise<PuzzleDto[]> {
    const r = await this.api.newKit('rush', excludeIds);
    return r.kind === 'ok' ? r.data.kit.puzzles : [];
  }
  takeKit(mode: 'regular' | 'rush', kit: KitDto) {
    const s = this.snap.state;
    if (s) this.set({ state: { ...s, kits: { ...s.kits, [mode]: kit } } });
  }
  async remove(puzzleId: string): Promise<boolean> {
    const r = await this.api.remove(puzzleId);
    return r.kind === 'ok';
  }
}

function fallbackUuid() {
  const b = new Uint8Array(16);
  for (let i = 0; i < 16; i += 1) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const x = Array.from(b, (n) => n.toString(16).padStart(2, '0')).join('');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

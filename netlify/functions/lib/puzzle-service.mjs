// Business logic behind /api/puzzles. Takes a context { db, userId, nowMs, seeds } so it can be tested without HTTP.
import { Chess } from '../../../rules-src/chess-compat.mjs';
import { store } from './puzzle-store.mjs';
import { buildKits, kitMeta, toDto, applyAttempt, updateElo, refreshProfile, freshProfile, seedFromString } from './puzzle-kits.mjs';
import { providerPlan, normalizeJobParams } from './puzzle-jobs.mjs';
import { localDateFor, normalizeTimezone, shouldApplyPendingTimezone } from './daily-streak.mjs';
import {
  DAILY_GAMES_CAP, KIT_REGULAR, KIT_RUSH, MAX_ATTEMPTS_PER_USER, MAX_CHECKPOINT_ATTEMPTS, MAX_FINISHED_JOBS_PER_USER, MAX_RUSH_RUNS_PER_USER, POOL_CAP, POOL_LOW_WATER,
  RUSH_DURATION_MS, RUSH_GRACE_MS, RUSH_MAX_STRIKES,
} from './puzzle-config.mjs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PUZZLE_ID_RE = /^[0-9a-f]{16}$/;
const MOVE_RE = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
const MODES = ['regular', 'rush'];
const EXHAUSTED_RESET_MS = 6 * 60 * 60 * 1000;

export class ApiError extends Error {
  constructor(status, error, field) { super(error); this.status = status; this.error = error; this.field = field; }
}

const isStr = (v) => typeof v === 'string';
const isoOk = (v) => isStr(v) && Number.isFinite(Date.parse(v));
const RUSH_MIN_MS_PER_SOLVE = 400; // the client locks input for 300 ms after a correct answer; nobody solves faster

// ---------------------------------------------------------------- validation
export function validateCheckpoint(body, nowMs) {
  const bad = (field) => { throw new ApiError(400, 'bad_request', field); };
  if (!body || typeof body !== 'object' || Array.isArray(body)) bad('body');
  const mode = body.mode;
  if (!['regular', 'rush', 'streak'].includes(mode)) bad('mode');
  const timezoneId = normalizeTimezone(body.timezoneId || 'UTC', '');
  if (!timezoneId) bad('timezoneId');
  const sessionId = String(body.sessionId || '');
  if (!sessionId || sessionId.length > 64) bad('sessionId');
  const kitIds = {};
  for (const m of MODES) {
    const v = body.kitIds?.[m];
    if (v === undefined || v === null) continue;
    if (typeof v !== 'string' || v.length > 40) bad('kitIds');
    kitIds[m] = v;
  }
  if (!Array.isArray(body.attempts)) bad('attempts');
  if (body.attempts.length > MAX_CHECKPOINT_ATTEMPTS) throw new ApiError(400, 'bad_request', 'attempts_count');
  const seenIds = new Set();
  const attempts = body.attempts.map((a, i) => {
    if (!a || typeof a !== 'object') bad(`attempts[${i}]`);
    if (!isStr(a.id) || !UUID_RE.test(a.id)) bad(`attempts[${i}].id`);
    if (seenIds.has(a.id)) bad(`attempts[${i}].id_repeated`);
    seenIds.add(a.id);
    if (!isStr(a.puzzleId) || !PUZZLE_ID_RE.test(a.puzzleId)) bad(`attempts[${i}].puzzleId`);
    if (typeof a.solved !== 'boolean') bad(`attempts[${i}].solved`);
    if (!Number.isInteger(a.ms) || a.ms < 0 || a.ms > 600000) bad(`attempts[${i}].ms`);
    if (!isStr(a.move) || !MOVE_RE.test(a.move)) bad(`attempts[${i}].move`);
    if (a.viaAlt !== undefined && typeof a.viaAlt !== 'boolean') bad(`attempts[${i}].viaAlt`);
    const at = Date.parse(a.at);
    if (!isoOk(a.at) || at < nowMs - 7 * 864e5 || at > nowMs + 5 * 60 * 1000) bad(`attempts[${i}].at`);
    return { id: a.id.toLowerCase(), puzzleId: a.puzzleId, mode, solved: a.solved, ms: a.ms, move: a.move, viaAlt: !!a.viaAlt, at: new Date(at).toISOString() };
  });
  let rushRun = null;
  if (body.rushRun !== undefined && body.rushRun !== null) {
    const r = body.rushRun;
    if (typeof r !== 'object') bad('rushRun');
    if (!isStr(r.id) || !UUID_RE.test(r.id)) bad('rushRun.id');
    if (!Array.isArray(r.puzzleIds) || r.puzzleIds.length > 300 || !r.puzzleIds.every((x) => isStr(x) && PUZZLE_ID_RE.test(x))) bad('rushRun.puzzleIds');
    if (!Number.isInteger(r.score) || r.score < 0 || r.score > r.puzzleIds.length) bad('rushRun.score');
    if (!Number.isInteger(r.strikes) || r.strikes < 0 || r.strikes > RUSH_MAX_STRIKES) bad('rushRun.strikes');
    if (!Number.isInteger(r.durationMs) || r.durationMs < 0 || r.durationMs > RUSH_DURATION_MS + RUSH_GRACE_MS) bad('rushRun.durationMs');
    if (!isoOk(r.startedAt) || !isoOk(r.endedAt) || Date.parse(r.endedAt) < Date.parse(r.startedAt)) bad('rushRun.times');
    if (Date.parse(r.endedAt) > nowMs + 5 * 60 * 1000 || Date.parse(r.startedAt) < nowMs - 7 * 864e5) bad('rushRun.range');
    rushRun = { id: r.id.toLowerCase(), score: r.score, strikes: r.strikes, durationMs: r.durationMs, puzzleIds: r.puzzleIds, startedAt: new Date(r.startedAt).toISOString(), endedAt: new Date(r.endedAt).toISOString() };
  }
  return { mode, sessionId, kitIds, attempts, rushRun, final: body.final === true, timezoneId };
}

/** Is `move` a correct answer for this puzzle? Accepted list, or any checkmate (never wrong to play mate). */
export function moveSolves(rec, move) {
  const accepted = rec.accepted && rec.accepted.length ? rec.accepted : rec.solution;
  if (accepted.includes(move)) return true;
  try {
    const g = new Chess(rec.fen);
    g.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] });
    return g.isCheckmate();
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- state
export function poolSummary(pool) {
  const live = pool.filter((p) => p.status !== 'retired');
  const byMotif = {}; const byPhase = {};
  for (const p of live) { byMotif[p.motif] = (byMotif[p.motif] || 0) + 1; byPhase[p.phase] = (byPhase[p.phase] || 0) + 1; }
  return {
    active: live.filter((p) => p.status === 'active').length, mastered: live.filter((p) => p.status === 'mastered').length,
    total: live.length, fresh: live.filter((p) => !(p.stats?.shown > 0)).length, cap: POOL_CAP, lowWater: POOL_LOW_WATER, byMotif, byPhase,
  };
}

export function computeRefillNeeded({ pool, state, usernames, activeJob, nowMs }) {
  if (activeJob) return false;
  if (!state.counters?.dnaDone) return false; // background refills start only after the user ran DNA once
  if (poolSummary(pool).fresh >= POOL_LOW_WATER) return false;
  const counters = state.counters || {};
  if (counters.dayKey === new Date(nowMs).toISOString().slice(0, 10) && (counters.gamesAnalyzedToday || 0) >= DAILY_GAMES_CAP) return false;
  const plan = providerPlan('auto', usernames);
  const cursors = state.cursors || {};
  const allExhausted = plan.every((p) => cursors[p]?.exhausted && nowMs - (cursors[p].exhaustedAt || 0) < EXHAUSTED_RESET_MS);
  return !allExhausted;
}

const jobDto = (j) => (j ? { id: j.id, kind: j.kind, status: j.status, gamesDone: j.progress?.gamesDone || 0, gamesTotal: j.progress?.gamesTotal || 0, puzzlesAdded: j.progress?.puzzlesAdded || 0, error: j.error || null, updatedAt: j.updated_at } : null);

function kitDtos(kit, poolMap, seedMap) {
  const out = [];
  for (const id of kit?.puzzleIds || []) {
    const p = poolMap.get(id);
    const rec = p ? (p.status === 'retired' ? null : p) : seedMap.get(id);
    if (rec) out.push(toDto(rec));
  }
  return out;
}

async function ensureKits(ctx, pool, state, only = null, exclude = {}) {
  const poolMap = new Map(pool.map((p) => [p.id, p]));
  const seedMap = new Map((ctx.seeds || []).map((s) => [s.id, s]));
  const kits = { ...(state.kits || {}) };
  const profile = state.profile && Object.keys(state.profile).length ? state.profile : freshProfile();
  let changed = false;
  for (const mode of MODES) {
    if (only && !only.includes(mode)) continue;
    const size = mode === 'regular' ? KIT_REGULAR : KIT_RUSH;
    const existing = kits[mode];
    const resolved = existing ? kitDtos(existing, poolMap, seedMap).length : 0;
    if (!only && existing && resolved >= Math.ceil(size * 0.6)) continue;
    const last = { [mode]: { puzzleIds: [...(existing?.puzzleIds || []), ...(exclude[mode] || [])] } };
    const built = buildKits(pool, profile, last, ctx.nowMs, seedFromString(`${ctx.userId}|${mode}|${ctx.nowMs}`), ctx.seeds || []);
    kits[mode] = kitMeta(built[mode], mode, ctx.nowMs);
    changed = true;
  }
  if (changed) await store.saveState(ctx.db, ctx.userId, { kits });
  return { kits, poolMap, seedMap, profile };
}

export async function getPuzzleState(ctx) {
  const { db, userId, nowMs } = ctx;
  const [pool, state, activeJob, usernames] = await Promise.all([store.listPuzzles(db, userId), store.getState(db, userId), store.activeJob(db, userId), store.appUsernames(db, userId)]);
  const { kits, poolMap, seedMap, profile } = await ensureKits(ctx, pool, state);
  return {
    ok: true, serverTime: new Date(nowMs).toISOString(), pool: poolSummary(pool),
    kits: {
      regular: kits.regular ? { id: kits.regular.id, builtAt: kits.regular.builtAt, puzzles: kitDtos(kits.regular, poolMap, seedMap) } : null,
      rush: kits.rush ? { id: kits.rush.id, builtAt: kits.rush.builtAt, puzzles: kitDtos(kits.rush, poolMap, seedMap) } : null,
    },
    rushBest: state.rush_best || 0, profile: { puzzleElo: profile.puzzleElo, nextFocus: profile.nextFocus },
    job: jobDto(activeJob), refillNeeded: computeRefillNeeded({ pool, state, usernames, activeJob, nowMs }),
  };
}

// ---------------------------------------------------------------- checkpoint
async function applyWithLock(ctx, rec, attempt) {
  let current = rec;
  for (let tryNo = 0; tryNo < 3; tryNo += 1) {
    const patch = applyAttempt(current, attempt);
    const updated = await store.updatePuzzleIf(ctx.db, ctx.userId, current.rowId, current.updatedAt, { stats: patch.stats, next_due: patch.next_due, status: patch.status, rating: current.rating });
    if (updated) return updated;
    const [fresh] = await store.getPuzzlesByIds(ctx.db, ctx.userId, [current.id]);
    if (!fresh) return null;
    current = fresh;
  }
  return null;
}


async function recordDailyStreakEvent(ctx, attempt, timezoneCandidate) {
  if (String(ctx.env?.DAILY_STREAK_ENABLED || '').toLowerCase() !== 'true' || !attempt.solved) return;
  const { db, userId, nowMs } = ctx;
  const settingsPath = 'user_daily_streak_settings?user_id=eq.' + encodeURIComponent(userId) + '&select=user_id,timezone_id,pending_timezone_id,timezone_change_requested_at&limit=1';
  let rows = await db(settingsPath);
  let settings = Array.isArray(rows) ? rows[0] : null;
  if (!settings) {
    try {
      const inserted = await db('user_daily_streak_settings', {
        method: 'POST', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ user_id: userId, timezone_id: normalizeTimezone(timezoneCandidate, 'UTC') }),
      });
      settings = Array.isArray(inserted) ? inserted[0] : inserted;
    } catch {
      rows = await db(settingsPath);
      settings = Array.isArray(rows) ? rows[0] : null;
    }
  }
  if (settings?.pending_timezone_id && shouldApplyPendingTimezone(settings.timezone_id, settings.pending_timezone_id, settings.timezone_change_requested_at, nowMs)) {
    const pending = settings.pending_timezone_id;
    await db('user_daily_streak_settings?user_id=eq.' + encodeURIComponent(userId), {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ timezone_id: pending, pending_timezone_id: null, timezone_change_requested_at: null, updated_at: new Date(nowMs).toISOString() }),
    });
    settings = { ...settings, timezone_id: pending, pending_timezone_id: null, timezone_change_requested_at: null };
  }
  const timezoneId = settings?.timezone_id || 'UTC';
  const eventPath = 'user_daily_streak_events?user_id=eq.' + encodeURIComponent(userId) + '&event_id=eq.' + encodeURIComponent(attempt.id) + '&select=event_id&limit=1';
  const existing = await db(eventPath);
  if (Array.isArray(existing) && existing.length) return;
  const activityType = attempt.mode === 'regular' ? 'training' : 'puzzle';
  const completedAt = new Date(nowMs).toISOString();
  const localDate = localDateFor(completedAt, timezoneId);
  const sameDayPath = 'user_daily_streak_events?user_id=eq.' + encodeURIComponent(userId) + '&local_date=eq.' + encodeURIComponent(localDate) + '&activity_type=eq.' + activityType + '&select=event_id&limit=1';
  const sameDay = await db(sameDayPath);
  if (Array.isArray(sameDay) && sameDay.length) return;
  try {
    await db('user_daily_streak_events', {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        user_id: userId, event_id: attempt.id,
        activity_type: activityType,
        source_id: attempt.puzzleId, completed_at: completedAt,
        local_date: localDate, timezone_id: timezoneId,
      }),
    });
  } catch (error) {
    const [byId, byDay] = await Promise.all([
      db(eventPath).catch(() => []),
      db(sameDayPath).catch(() => []),
    ]);
    if ((!Array.isArray(byId) || !byId.length) && (!Array.isArray(byDay) || !byDay.length)) throw error;
  }
}

export async function postCheckpoint(ctx, rawBody) {
  const { db, userId, nowMs } = ctx;
  const cp = validateCheckpoint(rawBody, nowMs);
  const seedMap = new Map((ctx.seeds || []).map((s) => [s.id, s]));
  const wanted = new Set(cp.attempts.map((a) => a.puzzleId));
  if (cp.rushRun) for (const id of cp.rushRun.puzzleIds.slice(0, 300)) wanted.add(id);
  const owned = await store.getPuzzlesByIds(db, userId, [...wanted]);
  const ownedMap = new Map(owned.map((p) => [p.id, p]));
  const rejected = [];
  const valid = [];
  for (const a of cp.attempts) {
    const rec = ownedMap.get(a.puzzleId) || seedMap.get(a.puzzleId);
    if (!rec) { rejected.push({ id: a.id, reason: 'unknown_puzzle' }); continue; }
    if (moveSolves(rec, a.move) !== a.solved) { rejected.push({ id: a.id, reason: 'solved_mismatch' }); continue; }
    valid.push(a);
  }
  const inserted = await store.insertAttempts(db, userId, valid);
  const insertedIds = new Set(inserted.map((r) => r.id));
  const fresh = valid.filter((a) => insertedIds.has(a.id)).sort((x, y) => x.at.localeCompare(y.at));
  // Retry streak-event writes for every verified attempt, including puzzle-attempt duplicates.
  // This recovers if the puzzle attempt committed but the separate streak insert transiently failed.
  for (const attempt of valid) await recordDailyStreakEvent(ctx, attempt, cp.timezoneId);

  let state = await store.getState(db, userId);
  const profile = state.profile && Object.keys(state.profile).length ? state.profile : freshProfile();
  const profileAttempts = [];
  const current = new Map(owned.map((p) => [p.id, p]));
  for (const a of fresh) {
    const rec = current.get(a.puzzleId);
    const view = rec || { ...seedMap.get(a.puzzleId) };
    updateElo(profile, view, a.solved);
    profileAttempts.push({ motif: view.motif, phase: view.phase, solved: a.solved, date: a.at.slice(0, 10), fen: view.fen });
    if (rec) {
      const updated = await applyWithLock(ctx, { ...rec, rating: view.rating }, a);
      if (updated) current.set(a.puzzleId, updated);
    }
  }
  refreshProfile(profile, profileAttempts);

  let rushBest = state.rush_best || 0;
  if (cp.rushRun) {
    // The score is the client's claim: it must fit the puzzles the run names (all ours or seeds) and the time it took.
    const known = new Set(cp.rushRun.puzzleIds.filter((id) => ownedMap.has(id) || seedMap.has(id)));
    const plausible = cp.rushRun.score <= known.size && cp.rushRun.score <= Math.ceil(cp.rushRun.durationMs / RUSH_MIN_MS_PER_SOLVE);
    if (!plausible) rejected.push({ id: cp.rushRun.id, reason: 'run_implausible' });
    else if (await store.insertRushRun(db, userId, cp.rushRun)) { rushBest = Math.max(rushBest, cp.rushRun.score); await store.trimRushRuns(db, userId, MAX_RUSH_RUNS_PER_USER); }
  }
  await store.saveState(db, userId, { profile, rush_best: rushBest });
  if (inserted.length) await store.trimAttempts(db, userId, MAX_ATTEMPTS_PER_USER);

  state = await store.getState(db, userId);
  const [pool, activeJob, usernames] = await Promise.all([store.listPuzzles(db, userId), store.activeJob(db, userId), store.appUsernames(db, userId)]);
  // A finished kit is replaced; the response carries the new one so the client never reuses an old set.
  const only = cp.final ? MODES.filter((m) => cp.kitIds[m] && state.kits?.[m]?.id === cp.kitIds[m]) : [];
  let kitsOut;
  if (only.length) {
    const { kits, poolMap, seedMap: sm } = await ensureKits(ctx, pool, state, only, Object.fromEntries(only.map((m) => [m, state.kits[m].puzzleIds])));
    kitsOut = {};
    for (const m of only) kitsOut[m] = { id: kits[m].id, builtAt: kits[m].builtAt, puzzles: kitDtos(kits[m], poolMap, sm) };
  }
  const summary = poolSummary(pool);
  return {
    ok: true, accepted: inserted.length, duplicates: valid.length - inserted.length, rejected,
    state: { pool: summary, profile: { puzzleElo: profile.puzzleElo, nextFocus: profile.nextFocus }, rushBest, ...(kitsOut ? { kits: kitsOut } : {}) },
    refillNeeded: computeRefillNeeded({ pool, state, usernames, activeJob, nowMs }),
  };
}

// ---------------------------------------------------------------- other actions
export async function postKit(ctx, body) {
  const mode = body?.mode;
  if (!MODES.includes(mode)) throw new ApiError(400, 'bad_request', 'mode');
  const exclude = Array.isArray(body?.excludeIds) ? body.excludeIds.filter((x) => isStr(x) && PUZZLE_ID_RE.test(x)).slice(0, 300) : [];
  const [pool, state] = await Promise.all([store.listPuzzles(ctx.db, ctx.userId), store.getState(ctx.db, ctx.userId)]);
  const { kits, poolMap, seedMap } = await ensureKits(ctx, pool, state, [mode], { [mode]: exclude });
  return { ok: true, kit: { id: kits[mode].id, builtAt: kits[mode].builtAt, puzzles: kitDtos(kits[mode], poolMap, seedMap) } };
}

async function createJobOrConflict(ctx, kind, params) {
  try {
    const job = await store.createJob(ctx.db, ctx.userId, kind, params);
    return { job };
  } catch (error) {
    if (error?.status === 409) {
      const active = await store.activeJob(ctx.db, ctx.userId);
      throw Object.assign(new ApiError(409, 'job_active'), { jobId: active?.id || null });
    }
    throw error;
  }
}

export async function postDna(ctx, body) {
  const params = normalizeJobParams({ source: ['auto', 'chesscom', 'lichess', 'saved'].includes(body?.source) ? body.source : 'auto', limit: body?.limit });
  const state = await store.getState(ctx.db, ctx.userId);
  const dayKey = new Date(ctx.nowMs).toISOString().slice(0, 10);
  if (state.counters?.dayKey === dayKey && (state.counters.gamesAnalyzedToday || 0) >= DAILY_GAMES_CAP) throw new ApiError(429, 'daily_cap');
  const { job } = await createJobOrConflict(ctx, 'dna', params);
  await store.trimFinishedJobs(ctx.db, ctx.userId, MAX_FINISHED_JOBS_PER_USER);
  return { ok: true, jobId: job.id };
}

/** Starts a background refill only when the server itself agrees one is needed. */
export async function postRefill(ctx) {
  const [pool, state, activeJob, usernames] = await Promise.all([store.listPuzzles(ctx.db, ctx.userId), store.getState(ctx.db, ctx.userId), store.activeJob(ctx.db, ctx.userId), store.appUsernames(ctx.db, ctx.userId)]);
  if (activeJob) return { ok: true, started: false, jobId: activeJob.id };
  if (!computeRefillNeeded({ pool, state, usernames, activeJob, nowMs: ctx.nowMs })) return { ok: true, started: false };
  const { job } = await createJobOrConflict(ctx, 'refill', normalizeJobParams({ source: 'auto', limit: 10 }));
  await store.trimFinishedJobs(ctx.db, ctx.userId, MAX_FINISHED_JOBS_PER_USER);
  return { ok: true, started: true, jobId: job.id };
}

export async function getJobStatus(ctx, id) {
  if (!isStr(id) || !UUID_RE.test(id)) throw new ApiError(400, 'bad_request', 'id');
  const job = await store.getJob(ctx.db, ctx.userId, id);
  if (!job) throw new ApiError(404, 'not_found');
  return { ok: true, job: { ...jobDto(job), report: job.status === 'done' || job.status === 'failed' ? job.result : undefined } };
}

export async function postRemove(ctx, body) {
  const puzzleId = body?.puzzleId;
  if (!isStr(puzzleId) || !PUZZLE_ID_RE.test(puzzleId)) throw new ApiError(400, 'bad_request', 'puzzleId');
  const [rec] = await store.getPuzzlesByIds(ctx.db, ctx.userId, [puzzleId]);
  if (!rec) throw new ApiError(404, 'not_found');
  await store.updatePuzzleIf(ctx.db, ctx.userId, rec.rowId, rec.updatedAt, { status: 'retired' });
  return { ok: true, status: 'retired' };
}


// Job runner for DNA / refill: walks the user's games, extracts puzzles, saves progress after every game.
// Safe to stop at any moment and to call again: games already logged are skipped, inserts are idempotent.
import { store } from './puzzle-store.mjs';
import { scanGame, positionKey } from './puzzle-harvest.mjs';
import { fetchChessComPage, fetchLichessPage, fetchSavedPage, extractClocks, SourceError } from './puzzle-sources.mjs';
import {
  DAILY_GAMES_CAP, ENGINE_VERSION, JOB_LEASE_MS, MAX_DNA_GAMES, POOL_CAP, TIME_BUDGET_MS,
} from './puzzle-config.mjs';

const PAGE_SIZE = 10;
const EXHAUSTED_RESET_MS = 6 * 60 * 60 * 1000;
const iso = (ms) => new Date(ms).toISOString();

export function normalizeJobParams(input) {
  const source = ['auto', 'chesscom', 'lichess', 'saved'].includes(input?.source) ? input.source : 'auto';
  const limit = Math.max(1, Math.min(MAX_DNA_GAMES, Math.floor(Number(input?.limit)) || MAX_DNA_GAMES));
  return { source, limit };
}

/** Which providers to walk, in order. `auto` = every provider the user has a username for, else saved games. */
export function providerPlan(source, usernames) {
  if (source === 'chesscom') return usernames.chesscom ? ['chesscom'] : [];
  if (source === 'lichess') return usernames.lichess ? ['lichess'] : [];
  if (source === 'saved') return ['saved'];
  const plan = [];
  if (usernames.chesscom) plan.push('chesscom');
  if (usernames.lichess) plan.push('lichess');
  return plan.length ? plan : ['saved'];
}

/**
 * Decides which new puzzles fit in the pool. Pure.
 * Dedup by position (any status), cap POOL_CAP non-retired puzzles; mastered are evicted first (oldest first),
 * then retired ones are simply not counted. Puzzles never shown are never evicted.
 */
export function planInsert(pool, candidates, cap = POOL_CAP) {
  const known = new Set(pool.map((p) => positionKey(p.fen)));
  const fresh = [];
  for (const c of candidates) {
    const key = positionKey(c.fen);
    if (known.has(key)) continue;
    known.add(key);
    fresh.push(c);
  }
  const live = pool.filter((p) => p.status !== 'retired');
  let room = cap - live.length;
  const evict = [];
  if (room < fresh.length) {
    const mastered = live.filter((p) => p.status === 'mastered').sort((a, b) => String(a.updatedAt).localeCompare(String(b.updatedAt)));
    for (const m of mastered) { if (room >= fresh.length) break; evict.push(m); room += 1; }
  }
  return { toInsert: fresh.slice(0, Math.max(0, room)), toEvict: evict, skippedFull: Math.max(0, fresh.length - Math.max(0, room)) };
}

function emptyReport() {
  return {
    gamesScanned: 0, gamesSkipped: {}, pliesScanned: 0, searches: 0, searchMs: 0, candidatesStage1: 0,
    droppedAmbiguous: 0, puzzlesAdded: 0, wallMs: 0, warnings: [],
  };
}

function finalizeReport(r) {
  return {
    ...r,
    avgSearchMs: r.searches ? Math.round(r.searchMs / r.searches) : 0,
    puzzlesPerGame: r.gamesScanned ? Math.round((r.puzzlesAdded / r.gamesScanned) * 100) / 100 : 0,
  };
}

async function fetchPage(provider, ctx, cursor) {
  if (provider === 'chesscom') return fetchChessComPage(ctx.usernames.chesscom, cursor, PAGE_SIZE, ctx.fetchImpl);
  if (provider === 'lichess') return fetchLichessPage(ctx.usernames.lichess, cursor, PAGE_SIZE, ctx.fetchImpl);
  return fetchSavedPage(ctx.db, ctx.userId, [ctx.usernames.chesscom, ctx.usernames.lichess].filter(Boolean), cursor, PAGE_SIZE);
}

/**
 * Runs (or continues) one job. Returns { outcome: 'not_claimed'|'done'|'paused'|'failed', progress, report }.
 * `pausedAfter` outcome 'paused' leaves the job queued with progress saved; the client calls again.
 */
export async function runJob({ db, engine, fetchImpl = fetch, userId, jobId, now = Date.now, budgetMs = TIME_BUDGET_MS }) {
  const started = now();
  const claimed = await store.claimJob(db, userId, jobId, iso(started), iso(started + JOB_LEASE_MS));
  if (!claimed) return { outcome: 'not_claimed' };

  const params = normalizeJobParams(claimed.params);
  const progress = { gamesTotal: params.limit, gamesDone: 0, puzzlesAdded: 0, ...(claimed.progress || {}) };
  const report = { ...emptyReport(), ...(claimed.result || {}) };
  report.gamesSkipped = { ...(report.gamesSkipped || {}) };
  report.warnings = [...(report.warnings || [])];
  const engineStart = { searches: engine.searches || 0, ms: engine.searchMs || 0 };
  const shouldStop = () => now() - started >= budgetMs;

  let latestCounters = null;
  const finish = async (outcome, error) => {
    // The first finished DNA run switches background refills on for this user (never before).
    if (outcome === 'done' && claimed.kind === 'dna' && latestCounters) await store.saveState(db, userId, { counters: { ...latestCounters, dnaDone: true } });
    report.wallMs = (claimed.result?.wallMs || 0) + (now() - started);
    report.searches = (claimed.result?.searches || 0) + ((engine.searches || 0) - engineStart.searches);
    report.searchMs = (claimed.result?.searchMs || 0) + ((engine.searchMs || 0) - engineStart.ms);
    const patch = {
      status: outcome === 'done' ? 'done' : outcome === 'failed' ? 'failed' : 'queued',
      lease_until: null, progress, result: finalizeReport(report), error: error || null,
    };
    await store.patchJob(db, userId, jobId, patch);
    return { outcome, progress: { ...progress }, report: patch.result };
  };

  try {
    const [state, usernames] = await Promise.all([store.getState(db, userId), store.appUsernames(db, userId)]);
    const ctx = { db, userId, usernames, fetchImpl };
    const cursors = { ...(state.cursors || {}) };
    const counters = { ...(state.counters || {}) };
    const dayKey = iso(started).slice(0, 10);
    if (counters.dayKey !== dayKey) { counters.dayKey = dayKey; counters.gamesAnalyzedToday = 0; }
    latestCounters = counters;
    let pool = await store.listPuzzles(db, userId);
    const plan = providerPlan(params.source, usernames);
    if (!plan.length) { report.warnings.push('no_source'); return await finish('done'); }

    const persistState = () => store.saveState(db, userId, { cursors, counters });

    for (const provider of plan) {
      let cursor = cursors[provider] || {};
      if (cursor.exhausted && started - (cursor.exhaustedAt || 0) < EXHAUSTED_RESET_MS) continue;
      if (cursor.exhausted) cursor = {};
      for (;;) {
        if (progress.gamesDone >= params.limit) break;
        if (shouldStop()) { await persistState(); return await finish('paused'); }
        let page;
        try {
          page = await fetchPage(provider, ctx, cursor);
        } catch (error) {
          if (error instanceof SourceError && (error.code === 'not_found' || error.code === 'bad_username')) { report.warnings.push(`${provider}:${error.code}`); break; }
          if (error instanceof SourceError && error.code === 'rate_limited') { await persistState(); return await finish('paused', 'rate_limited'); }
          throw error;
        }
        const seen = await store.analyzedKeys(db, userId, page.games.map((g) => g.key));
        let pageComplete = true;
        for (const game of page.games) {
          if (progress.gamesDone >= params.limit) { pageComplete = false; break; }
          if (seen.has(game.key)) continue;
          if ((counters.gamesAnalyzedToday || 0) >= DAILY_GAMES_CAP) { report.warnings.push('daily_cap'); await persistState(); return await finish('paused', 'daily_cap'); }
          if (shouldStop()) { await persistState(); return await finish('paused'); }
          const result = scanGame({ ...game, clocks: extractClocks(game.pgn) }, engine, { shouldStop });
          if (result.log.stopped) { await persistState(); return await finish('paused'); }
          const plan2 = planInsert(pool, result.puzzles);
          for (const e of plan2.toEvict) await store.deletePuzzleRow(db, userId, e.rowId);
          const inserted = await store.insertPuzzles(db, userId, plan2.toInsert, iso(now()));
          pool = pool.filter((p) => !plan2.toEvict.includes(p)).concat(inserted);
          await store.logGame(db, userId, {
            key: game.key, provider: game.provider, pliesScanned: result.log.pliesScanned, candidates: result.log.candidates,
            puzzlesAdded: inserted.length, skipReason: result.log.skipReason, engineVersion: ENGINE_VERSION,
          });
          report.gamesScanned += 1;
          if (result.log.skipReason) report.gamesSkipped[result.log.skipReason] = (report.gamesSkipped[result.log.skipReason] || 0) + 1;
          report.pliesScanned += result.log.pliesScanned;
          report.candidatesStage1 += result.log.candidates;
          report.droppedAmbiguous += result.log.droppedAmbiguous;
          report.puzzlesAdded += inserted.length;
          progress.gamesDone += 1;
          progress.puzzlesAdded += inserted.length;
          counters.gamesAnalyzedToday = (counters.gamesAnalyzedToday || 0) + 1;
          await store.patchJob(db, userId, jobId, { progress, lease_until: iso(now() + JOB_LEASE_MS) });
        }
        // Move the cursor only past pages we fully consumed; a page cut short by the limit is re-read next time
        // (its analysed games are skipped through the game log).
        if (pageComplete) {
          cursor = page.cursor;
          cursors[provider] = page.exhausted ? { ...cursor, exhausted: true, exhaustedAt: now() } : cursor;
        }
        await persistState();
        if (page.exhausted || !pageComplete) break;
      }
    }
    return await finish('done');
  } catch (error) {
    return await finish('failed', String(error?.code || error?.message || 'error').slice(0, 200));
  }
}

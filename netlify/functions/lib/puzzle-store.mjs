// Data access for the puzzle engine. Every function takes `db(path, options)`, a supabaseRequest-like
// function, so tests can run against an in-memory fake that speaks the same PostgREST dialect.
const enc = encodeURIComponent;
const quote = (v) => '"' + String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
const inList = (values) => '(' + values.map(quote).join(',') + ')';

const PUZZLE_COLUMNS = 'id,puzzle_id,fen,solution,accepted,played,motif,phase,class,severity,rating,origin,source,stats,next_due,status,engine_version,created_at,updated_at';

export function rowToRecord(row) {
  return {
    rowId: row.id, id: row.puzzle_id, fen: row.fen, solution: row.solution || [], accepted: row.accepted || [],
    played: row.played || '', motif: row.motif, phase: row.phase, class: row.class, severity: row.severity,
    rating: row.rating, origin: row.origin, source: row.source || {}, stats: row.stats || {},
    nextDue: row.next_due, status: row.status, updatedAt: row.updated_at, createdAt: row.created_at,
  };
}

export function recordToRow(userId, p, nowIso) {
  return {
    user_id: userId, puzzle_id: p.puzzleId || p.id, fen: p.fen, solution: p.solution, accepted: p.accepted || p.solution,
    played: p.played || '', motif: p.motif || 'general', phase: p.phase || 'middlegame', class: p.class,
    severity: p.severity, rating: p.rating, origin: p.origin || 'harvest', source: p.source || {},
    stats: p.stats || { shown: 0, solved: 0, fails: 0, streak: 0 }, next_due: p.nextDue || nowIso, status: 'active',
  };
}

export const store = {
  // ---- puzzles
  async listPuzzles(db, userId, { limit = 1000 } = {}) {
    const rows = await db(`user_puzzles?select=${PUZZLE_COLUMNS}&user_id=eq.${enc(userId)}&order=created_at.asc&limit=${limit}`);
    return (Array.isArray(rows) ? rows : []).map(rowToRecord);
  },
  async getPuzzlesByIds(db, userId, puzzleIds) {
    if (!puzzleIds.length) return [];
    const rows = await db(`user_puzzles?select=${PUZZLE_COLUMNS}&user_id=eq.${enc(userId)}&puzzle_id=in.${enc(inList(puzzleIds))}`);
    return (Array.isArray(rows) ? rows : []).map(rowToRecord);
  },
  /** Inserts new puzzles; existing (user_id, puzzle_id) pairs are ignored. Returns the rows that were really added. */
  async insertPuzzles(db, userId, puzzles, nowIso) {
    if (!puzzles.length) return [];
    const rows = await db('user_puzzles?on_conflict=user_id,puzzle_id', {
      method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify(puzzles.map((p) => recordToRow(userId, p, nowIso))),
    });
    return (Array.isArray(rows) ? rows : []).map(rowToRecord);
  },
  /** Optimistic update: succeeds only if the row still has the updated_at we read. Returns the new row or null. */
  async updatePuzzleIf(db, userId, rowId, expectedUpdatedAt, patch) {
    const rows = await db(`user_puzzles?id=eq.${enc(rowId)}&user_id=eq.${enc(userId)}&updated_at=eq.${enc(expectedUpdatedAt)}`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    });
    return Array.isArray(rows) && rows.length ? rowToRecord(rows[0]) : null;
  },
  async deletePuzzleRow(db, userId, rowId) {
    await db(`user_puzzles?id=eq.${enc(rowId)}&user_id=eq.${enc(userId)}`, { method: 'DELETE' });
  },

  // ---- per-user state
  async getState(db, userId) {
    const rows = await db(`user_puzzle_state?select=*&user_id=eq.${enc(userId)}&limit=1`);
    const row = Array.isArray(rows) && rows[0] ? rows[0] : null;
    return row || { user_id: userId, profile: {}, kits: {}, rush_best: 0, counters: {}, cursors: {}, updated_at: null };
  },
  async saveState(db, userId, patch) {
    await db('user_puzzle_state?on_conflict=user_id', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ user_id: userId, ...patch, updated_at: new Date().toISOString() }),
    });
  },

  // ---- attempts and rush runs
  /** Inserts attempts, ignoring ids that already exist. Returns only the rows that were really inserted. */
  async insertAttempts(db, userId, attempts) {
    if (!attempts.length) return [];
    const rows = await db('puzzle_attempts?on_conflict=id', {
      method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify(attempts.map((a) => ({
        id: a.id, user_id: userId, puzzle_id: a.puzzleId, mode: a.mode, solved: !!a.solved, ms: a.ms, move: a.move,
        via_alt: !!a.viaAlt, attempted_at: a.at,
      }))),
    });
    return Array.isArray(rows) ? rows : [];
  },
  async insertRushRun(db, userId, run) {
    const rows = await db('puzzle_rush_runs?on_conflict=id', {
      method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify({
        id: run.id, user_id: userId, score: run.score, strikes: run.strikes, duration_ms: run.durationMs,
        puzzle_ids: run.puzzleIds, started_at: run.startedAt, ended_at: run.endedAt,
      }),
    });
    return Array.isArray(rows) && rows.length > 0;
  },
  async trimAttempts(db, userId, keep) {
    const rows = await db(`puzzle_attempts?select=id&user_id=eq.${enc(userId)}&order=attempted_at.desc&offset=${keep}&limit=500`);
    const ids = (Array.isArray(rows) ? rows : []).map((r) => r.id);
    if (ids.length) await db(`puzzle_attempts?user_id=eq.${enc(userId)}&id=in.${enc(inList(ids))}`, { method: 'DELETE' });
    return ids.length;
  },

  // ---- analysed-games log
  async analyzedKeys(db, userId, keys) {
    if (!keys.length) return new Set();
    const rows = await db(`puzzle_game_log?select=game_key&user_id=eq.${enc(userId)}&game_key=in.${enc(inList(keys))}`);
    return new Set((Array.isArray(rows) ? rows : []).map((r) => r.game_key));
  },
  async logGame(db, userId, entry) {
    await db('puzzle_game_log?on_conflict=user_id,game_key', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        user_id: userId, game_key: entry.key, provider: entry.provider, plies_scanned: entry.pliesScanned || 0,
        candidates: entry.candidates || 0, puzzles_added: entry.puzzlesAdded || 0, skip_reason: entry.skipReason || null,
        engine_version: entry.engineVersion || 1, analyzed_at: new Date().toISOString(),
      }),
    });
  },
  async countUnanalyzedHint(db, userId) {
    const rows = await db(`puzzle_game_log?select=game_key&user_id=eq.${enc(userId)}&limit=1`);
    return Array.isArray(rows) ? rows.length : 0;
  },

  // ---- jobs
  async activeJob(db, userId) {
    const rows = await db(`puzzle_jobs?select=*&user_id=eq.${enc(userId)}&status=in.(queued,running)&limit=1`);
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  },
  async getJob(db, userId, jobId) {
    const rows = await db(`puzzle_jobs?select=*&id=eq.${enc(jobId)}&user_id=eq.${enc(userId)}&limit=1`);
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  },
  async createJob(db, userId, kind, params) {
    const rows = await db('puzzle_jobs', {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ user_id: userId, kind, params, progress: { gamesTotal: params.limit || 0, gamesDone: 0, puzzlesAdded: 0 } }),
    });
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  },
  /** Takes the lease. Returns the job row, or null when someone else holds a live lease. */
  async claimJob(db, userId, jobId, nowIso, leaseUntilIso) {
    const rows = await db(
      `puzzle_jobs?id=eq.${enc(jobId)}&user_id=eq.${enc(userId)}&status=in.(queued,running)&or=(lease_until.is.null,lease_until.lt.${enc(nowIso)})`,
      { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ status: 'running', lease_until: leaseUntilIso, updated_at: nowIso }) },
    );
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  },
  async patchJob(db, userId, jobId, patch) {
    await db(`puzzle_jobs?id=eq.${enc(jobId)}&user_id=eq.${enc(userId)}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    });
  },
  async appUsernames(db, userId) {
    const rows = await db(`user_app_state?select=data&user_id=eq.${enc(userId)}&limit=1`);
    const u = Array.isArray(rows) && rows[0]?.data?.usernames ? rows[0].data.usernames : {};
    return { chesscom: String(u.chesscom || '').trim(), lichess: String(u.lichess || '').trim() };
  },
};

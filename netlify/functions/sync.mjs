import crypto from 'node:crypto';
import { json, rateLimit, sameOrigin, supabaseRequest } from './_lib.mjs';
import { currentSession } from './auth.mjs';

// Cross-device sync for a signed-in account: app preferences, archive reviews, opening progress, and saved games.
// The user id always comes from the encrypted session cookie, never from the request.
const requests = new Map();
const MAX_PROGRESS_BYTES = 200 * 1024;
const MAX_APP_STATE_BYTES = 200 * 1024;
const MAX_PGN_BYTES = 200 * 1024;
const MAX_GAMES = 500;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeAppState(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const reviews = {};
  const source = input.archiveReviews && typeof input.archiveReviews === 'object' && !Array.isArray(input.archiveReviews)
    ? input.archiveReviews : {};
  for (const [id, value] of Object.entries(source).sort((a, b) => Date.parse(String(b[1]?.reviewedAt || '')) - Date.parse(String(a[1]?.reviewedAt || ''))).slice(0, 500)) {
    if (!id || id.length > 300 || !value || typeof value !== 'object') continue;
    const accuracy = Number(value.accuracy);
    const time = Date.parse(String(value.reviewedAt || ''));
    if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100 || !Number.isFinite(time)) continue;
    reviews[id] = { accuracy, reviewedAt: new Date(time).toISOString() };
  }
  const usernames = input.usernames && typeof input.usernames === 'object' && !Array.isArray(input.usernames)
    ? input.usernames : {};
  const result = { version: 1, archiveReviews: reviews };
  result.usernames = {
    chesscom: typeof usernames.chesscom === 'string' ? usernames.chesscom.trim().slice(0, 100) : '',
    lichess: typeof usernames.lichess === 'string' ? usernames.lichess.trim().slice(0, 100) : '',
  };
  if (input.language === 'he' || input.language === 'en') result.language = input.language;
  if (typeof input.adaptiveOptIn === 'boolean') result.adaptiveOptIn = input.adaptiveOptIn;
  return result;
}

export async function handler(event) {
  if (!sameOrigin(event)) return json(403, { ok: false, error: 'forbidden' });
  const session = currentSession(event);
  if (!session?.user_id) return json(401, { ok: false, error: 'UNAUTHENTICATED' });
  const ip = event.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (!rateLimit(requests, `${ip}|${session.user_id}`, 60, 60 * 1000)) return json(429, { ok: false, error: 'rate_limited' });
  const uid = encodeURIComponent(session.user_id);
  const q = event.queryStringParameters || {};

  try {
    if (event.httpMethod === 'GET') {
      if (q.game) {
        if (!UUID_RE.test(q.game)) return json(400, { ok: false, error: 'bad_id' });
        const rows = await supabaseRequest(`user_games?select=id,pgn,meta,created_at&user_id=eq.${uid}&id=eq.${q.game}&limit=1`);
        return json(200, { ok: true, game: rows?.[0] || null });
      }
      const [prog, games, appState] = await Promise.all([
        supabaseRequest(`user_progress?select=data,updated_at&user_id=eq.${uid}&limit=1`),
        supabaseRequest(`user_games?select=id,meta,created_at&user_id=eq.${uid}&order=created_at.desc&limit=${MAX_GAMES}`),
        supabaseRequest(`user_app_state?select=data,updated_at&user_id=eq.${uid}&limit=1`),
      ]);
      return json(200, {
        ok: true,
        progress: prog?.[0]?.data || {},
        updatedAt: prog?.[0]?.updated_at || null,
        appState: appState?.[0]?.data || null,
        appStateUpdatedAt: appState?.[0]?.updated_at || null,
        games: games || [],
      });
    }

    let body = {};
    if (event.httpMethod === 'PUT' || event.httpMethod === 'POST') {
      if ((event.body || '').length > MAX_PROGRESS_BYTES + MAX_PGN_BYTES) return json(413, { ok: false, error: 'too_large' });
      try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { ok: false, error: 'invalid_json' }); }
    }

    if (event.httpMethod === 'PUT') {
      let updated = false;
      if (Object.prototype.hasOwnProperty.call(body, 'progress')) {
        const data = body.progress;
        if (!data || typeof data !== 'object' || Array.isArray(data)) return json(400, { ok: false, error: 'bad_progress' });
        if (JSON.stringify(data).length > MAX_PROGRESS_BYTES) return json(413, { ok: false, error: 'too_large' });
        await supabaseRequest('user_progress?on_conflict=user_id', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify([{ user_id: session.user_id, data, updated_at: new Date().toISOString() }]),
        });
        updated = true;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'appState')) {
        const data = sanitizeAppState(body.appState);
        if (!data) return json(400, { ok: false, error: 'bad_app_state' });
        if (JSON.stringify(data).length > MAX_APP_STATE_BYTES) return json(413, { ok: false, error: 'too_large' });
        await supabaseRequest('user_app_state?on_conflict=user_id', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify([{ user_id: session.user_id, data, updated_at: new Date().toISOString() }]),
        });
        updated = true;
      }
      if (!updated) return json(400, { ok: false, error: 'missing_sync_data' });
      return json(200, { ok: true });
    }

    if (event.httpMethod === 'POST') {
      const pgn = String(body.pgn || '').trim();
      if (!pgn || pgn.length > MAX_PGN_BYTES) return json(400, { ok: false, error: 'bad_pgn' });
      const meta = body.meta && typeof body.meta === 'object' && !Array.isArray(body.meta) ? body.meta : {};
      const safeMeta = {
        white: String(meta.white || '').slice(0, 60),
        black: String(meta.black || '').slice(0, 60),
        result: String(meta.result || '').slice(0, 12),
        source: String(meta.source || 'upload').slice(0, 20),
        moves: Math.max(0, Math.min(1000, Number(meta.moves) || 0)),
      };
      const count = await supabaseRequest(`user_games?select=id&user_id=eq.${uid}&limit=${MAX_GAMES + 1}`);
      if ((count || []).length >= MAX_GAMES) return json(409, { ok: false, error: 'game_limit' });
      const pgn_hash = crypto.createHash('sha256').update(pgn.replace(/\s+/g, ' ')).digest('hex');
      await supabaseRequest('user_games?on_conflict=user_id,pgn_hash', {
        method: 'POST',
        headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
        body: JSON.stringify([{ user_id: session.user_id, pgn_hash, pgn, meta: safeMeta }]),
      });
      return json(200, { ok: true });
    }

    if (event.httpMethod === 'DELETE') {
      if (!UUID_RE.test(String(q.game || ''))) return json(400, { ok: false, error: 'bad_id' });
      await supabaseRequest(`user_games?user_id=eq.${uid}&id=eq.${q.game}`, { method: 'DELETE' });
      return json(200, { ok: true });
    }

    return json(405, { ok: false, error: 'method_not_allowed' });
  } catch {
    return json(503, { ok: false, error: 'sync_unavailable' });
  }
}

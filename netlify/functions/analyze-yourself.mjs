// "Analyze it yourself": replay one of your own games that Chess DNA already analyzed and stored, guess each
// move's review classification and both players' ratings, then get a score. The stored engine numbers and the
// answer key never leave the server before the guesses are submitted. Off unless ANALYZE_YOURSELF_ENABLED=true.
import { clientIp, json, rateLimit, sameOrigin, strictSameOrigin, supabaseRequest } from './_lib.mjs';
import { currentSession } from './auth.mjs';
import { ANALYSIS_SCHEMA_VERSION, ENGINE_VERSION, hashPgn } from './chess-dna.mjs';
import { GIVEN_CLASSES, ScoreInputError, headerElo, isGraded, scoreAnalyzeYourself } from './lib/analyze-yourself-score.mjs';

const RATE = new Map();
const MAX_BODY_BYTES = 256 * 1024;
const MAX_PGN_BYTES = 200 * 1024;
const HASH_RE = /^[a-f0-9]{64}$/;
const NO_STORE = { 'cache-control': 'no-store' };

function header(pgn, name) {
  const match = new RegExp('^\\[' + name + '\\s+"([^"]*)"\\]', 'mi').exec(pgn);
  return match ? match[1] : '';
}

export function createHandler({ env = process.env, db = supabaseRequest, session = currentSession, limit = rateLimit } = {}) {
  const fail = (status, error) => json(status, { ok: false, error }, NO_STORE);
  const rowsFor = (userId, fingerprints) => db(
    'user_chess_dna_games?select=fingerprint,game_json&user_id=eq.' + encodeURIComponent(userId) +
    '&fingerprint=in.' + encodeURIComponent('(' + fingerprints.join(',') + ')') +
    '&engine_version=eq.' + encodeURIComponent(ENGINE_VERSION) + '&analysis_schema_version=eq.' + ANALYSIS_SCHEMA_VERSION + '&limit=75');

  // The stored analysis of one game the caller proves they hold (its PGN hashes to the fingerprint).
  async function storedGame(userId, body) {
    const pgn = typeof body.pgn === 'string' ? body.pgn : '';
    const fingerprint = String(body.fingerprint || '').toLowerCase();
    if (!pgn || Buffer.byteLength(pgn, 'utf8') > MAX_PGN_BYTES || !HASH_RE.test(fingerprint) || hashPgn(pgn) !== fingerprint) return { error: fail(400, 'bad_game_identity') };
    const row = (await rowsFor(userId, [fingerprint]))?.[0];
    const moves = row?.game_json?.analysis?.moves;
    if (!Array.isArray(moves) || !moves.length) return { error: fail(404, 'not_analyzed') };
    const actual = moves.map(move => String(move?.classification || ''));
    if (row.game_json.plies !== actual.length) return { error: fail(409, 'analysis_mismatch') };
    if (!actual.some(isGraded)) return { error: fail(409, 'nothing_to_grade') };
    return { pgn, actual };
  }

  return async function handler(event) {
    try {
      if (!sameOrigin(event)) return fail(403, 'forbidden');
      const method = event.httpMethod || 'GET';
      if (method !== 'GET' && method !== 'POST') return fail(405, 'method_not_allowed');
      if (method === 'POST' && !strictSameOrigin(event)) return fail(403, 'forbidden');
      if (Buffer.byteLength(String(event.body || ''), 'utf8') > MAX_BODY_BYTES) return fail(413, 'too_large');
      if (String(env.ANALYZE_YOURSELF_ENABLED || '').toLowerCase() !== 'true') return fail(404, 'DISABLED');
      const user = session(event);
      if (!user?.user_id) return fail(401, 'UNAUTHENTICATED');
      if (!limit(RATE, clientIp(event) + '|' + user.user_id, 60, 60000)) return fail(429, 'rate_limited');
      const userId = String(user.user_id);
      const query = event.queryStringParameters || {};

      if (method === 'GET') {
        if (query.action !== 'list') return fail(400, 'bad_action');
        const fingerprints = String(query.fingerprints || '').toLowerCase().split(',').filter(Boolean);
        if (!fingerprints.length || fingerprints.length > 75 || fingerprints.some(value => !HASH_RE.test(value))) return fail(400, 'bad_fingerprints');
        const rows = await rowsFor(userId, fingerprints);
        // Only identity and size: no classification, chance or accuracy is listed.
        const games = (rows || []).map(row => ({
          fingerprint: row.fingerprint,
          date: row.game_json?.date || null,
          timeClass: row.game_json?.timeClass || null,
          playerColor: row.game_json?.playerColor || null,
          plies: Array.isArray(row.game_json?.analysis?.moves) ? row.game_json.analysis.moves.length : 0
        }));
        return json(200, { ok: true, games }, NO_STORE);
      }

      let body;
      try { body = JSON.parse(event.body || '{}'); } catch { return fail(400, 'invalid_json'); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return fail(400, 'invalid_json');
      const game = await storedGame(userId, body);
      if (game.error) return game.error;

      if (body.action === 'start') {
        // Book and forced plies are shown as given; every other ply is a question.
        return json(200, { ok: true, moves: game.actual.map((cls, index) => ({ index, given: GIVEN_CLASSES.includes(cls) ? cls : null, graded: isGraded(cls) })) }, NO_STORE);
      }
      if (body.action === 'score') {
        const eloActual = { white: headerElo(header(game.pgn, 'WhiteElo')), black: headerElo(header(game.pgn, 'BlackElo')) };
        try {
          const score = scoreAnalyzeYourself({ actual: game.actual, guesses: body.guesses, eloGuess: body.eloGuess, eloActual });
          return json(200, { ok: true, score }, NO_STORE);
        } catch (error) {
          if (error instanceof ScoreInputError) return fail(400, error.code);
          throw error;
        }
      }
      return fail(400, 'bad_action');
    } catch (error) {
      console.error('analyze-yourself failed', error);
      return fail(500, 'server_error');
    }
  };
}

export const handler = createHandler();

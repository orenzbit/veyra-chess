import crypto from 'node:crypto';
import { clientIp, json, rateLimit, sameOrigin, strictSameOrigin, supabaseRequest } from './_lib.mjs';
import { currentSession } from './auth.mjs';

const RATE = new Map();
const MAX_BODY_BYTES = 1024 * 1024;
const MAX_PGN_BYTES = 200 * 1024;
const MAX_ANALYSIS_BYTES = 650 * 1024;
const MAX_REPORT_BYTES = 450 * 1024;
const ENGINE_VERSION = 'chessy-ai-fast-v2-depth16-node250000-scoring-2026-10-26';
const ANALYSIS_SCHEMA_VERSION = 2;
const REPORT_SCHEMA_VERSION = 2;
const HASH_RE = /^[a-f0-9]{64}$/i;
const UUID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const CLASSES = new Set(['bullet', 'blitz', 'rapid']);

function normalizePgn(pgn) {
  if (typeof pgn !== 'string') return '';
  return pgn.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
    .split('\n').map(line => line.trim()).filter(Boolean).join('\n');
}
function hashPgn(pgn) {
  return crypto.createHash('sha256').update(normalizePgn(pgn)).digest('hex');
}
function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}
function safeText(value, max = 120) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function parseBody(event) {
  try { return JSON.parse(event.body || '{}'); } catch { return null; }
}
function authorized(event, write = false, dependencies = {}) {
  if (!sameOrigin(event)) return { response: json(403, { ok: false, error: 'forbidden' }, { 'cache-control': 'no-store' }) };
  if (write && !strictSameOrigin(event)) return { response: json(403, { ok: false, error: 'forbidden' }, { 'cache-control': 'no-store' }) };
  const session = (dependencies.currentSession || currentSession)(event);
  if (!session?.user_id) return { response: json(401, { ok: false, error: 'UNAUTHENTICATED' }, { 'cache-control': 'no-store' }) };
  const ip = clientIp(event);
  if (!(dependencies.rateLimit || rateLimit)(RATE, ip + '|' + session.user_id, 100, 60 * 1000)) {
    return { response: json(429, { ok: false, error: 'rate_limited' }, { 'cache-control': 'no-store' }) };
  }
  return { session };
}
function validateAnalysis(input) {
  if (!plainObject(input) || !Array.isArray(input.moves) || input.moves.length === 0 || !plainObject(input.summary)) return false;
  if (input.moves.length > 3000) return false;
  for (let index = 0; index < input.moves.length; index++) {
    const move = input.moves[index];
    if (!plainObject(move) || move.index !== index ||
        typeof move.classification !== 'string' || move.classification.length > 32 ||
        typeof move.whiteChanceBefore !== 'number' || !Number.isFinite(move.whiteChanceBefore) ||
        move.whiteChanceBefore < 0 || move.whiteChanceBefore > 100 ||
        typeof move.whiteChanceAfter !== 'number' || !Number.isFinite(move.whiteChanceAfter) ||
        move.whiteChanceAfter < 0 || move.whiteChanceAfter > 100 ||
        (move.clockSeconds !== undefined && move.clockSeconds !== null &&
          (typeof move.clockSeconds !== 'number' || !Number.isFinite(move.clockSeconds) || move.clockSeconds < 0))) return false;
  }
  for (const key of ['whiteAcc', 'blackAcc']) {
    if (typeof input.summary[key] !== 'number' || !Number.isFinite(input.summary[key]) || input.summary[key] < 0 || input.summary[key] > 100) return false;
  }
  return true;
}

function closeNumber(a, b) { return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 0.11; }

// Rebuild all currently exposed report aggregates from account-scoped persisted game analyses.
// Report metadata that is not persisted (for example opening names and time-control clock labels)
// is deliberately excluded from trusted calculations until the source data is stored server-side.
function validateReportAgainstSavedGames(report, savedRows, structure) {
  const saved = new Map((savedRows || []).map(row => [String(row.fingerprint || '').toLowerCase(), row.game_json]));
  for (const fingerprint of structure.fingerprints) {
    const stored = saved.get(fingerprint);
    const claimed = structure.classesByFingerprint[fingerprint];
    if (!stored || stored.timeClass !== claimed.timeClass || stored.playerColor !== claimed.playerColor || stored.date !== claimed.date || !validateAnalysis(stored.analysis)) return false;
  }
  for (const timeClass of CLASSES) {
    const section = report.timeControls[timeClass];
    const entries = section.games.map(game => ({ game, stored: saved.get(String(game.fingerprint).toLowerCase()) }));
    const accuracy = entries.map(({stored}) => stored?.playerColor === 'white' ? stored.analysis.summary.whiteAcc : stored?.playerColor === 'black' ? stored.analysis.summary.blackAcc : NaN);
    if (accuracy.some(value => !Number.isFinite(value) || value < 0 || value > 100)) return false;
    const avg = accuracy.length ? Math.round(accuracy.reduce((sum, value) => sum + value, 0) / accuracy.length * 10) / 10 : null;
    if (section.averageAccuracy !== avg) return false;
    let ownMoves = 0;
    const counts = Object.fromEntries(['best','brilliant','great','excellent','good','book','forced','inaccuracy','mistake','miss','blunder'].map(k => [k, 0]));
    for (const {stored} of entries) {
      const parity = stored.playerColor === 'white' ? 0 : 1;
      for (const move of stored.analysis.moves) {
        if (move.index % 2 !== parity) continue;
        ownMoves++;
        if (Object.hasOwn(counts, move.classification)) counts[move.classification]++;
      }
    }
    if (section.userMoves !== ownMoves) return false;
    for (const [classification, count] of Object.entries(counts)) {
      if (Number(section.classificationCounts?.[classification] || 0) !== count) return false;
    }
    for (const classification of ['inaccuracy','mistake','miss','blunder']) {
      const expected = ownMoves ? Math.round(counts[classification] / ownMoves * 1000) / 10 : 0;
      if (!closeNumber(section.issueRatesPer100Moves?.[classification], expected)) return false;
    }
  }
  return true;
}

function validateReportStructure(report) {
  if (!plainObject(report) || Number(report.schemaVersion) !== REPORT_SCHEMA_VERSION ||
      report.engineVersion !== ENGINE_VERSION || !plainObject(report.timeControls)) return null;
  const classesByFingerprint = {};
  for (const timeClass of CLASSES) {
    const section = report.timeControls[timeClass];
    if (!plainObject(section) || !Array.isArray(section.games) || section.games.length > 25 ||
        Number(section.count) !== section.games.length) return null;
    for (const game of section.games) {
      const fingerprint = String(game?.fingerprint || '');
      if (!HASH_RE.test(fingerprint) || Object.prototype.hasOwnProperty.call(classesByFingerprint, fingerprint) ||
          !['white', 'black'].includes(game?.playerColor) || !/^\d{4}-\d{2}-\d{2}$/.test(String(game?.date || ''))) return null;
      classesByFingerprint[fingerprint] = { timeClass, playerColor: game.playerColor, date: game.date };
    }
  }
  return { fingerprints: Object.keys(classesByFingerprint), classesByFingerprint };
}

export async function handler(event, dependencies = {}) {
  const method = event.httpMethod || 'GET';
  if (method !== 'GET' && method !== 'POST' && method !== 'PUT') {
    return json(405, { ok: false, error: 'method_not_allowed' });
  }
  if (Buffer.byteLength(String(event.body || ''), 'utf8') > MAX_BODY_BYTES) return json(413, { ok: false, error: 'too_large' });
  const auth = authorized(event, method !== 'GET', dependencies);
  if (auth.response) return auth.response;
  const userId = auth.session.user_id;
  const db = dependencies.supabaseRequest || supabaseRequest;
  const query = event.queryStringParameters || {};

  try {
    if (method === 'GET') {
      const action = safeText(query.action, 20) || 'latest';
      if (action === 'latest') {
        const rows = await db(
          'user_chess_dna_reports?select=report_id,report_schema_version,report_json,created_at&user_id=eq.' +
          encodeURIComponent(userId) + '&report_schema_version=eq.' + REPORT_SCHEMA_VERSION + '&order=created_at.desc&limit=1'
        );
        return json(200, { ok: true, report: rows?.[0] || null }, { 'cache-control': 'no-store' });
      }
      if (action === 'games') {
        const fingerprints = String(query.fingerprints || '').split(',').filter(Boolean);
        if (!fingerprints.length || fingerprints.length > 75 || fingerprints.some(value => !HASH_RE.test(value))) {
          return json(400, { ok: false, error: 'bad_fingerprints' });
        }
        const engineVersion = safeText(query.engineVersion, 100);
        const analysisVersion = Number(query.analysisVersion);
        if (!engineVersion || !Number.isInteger(analysisVersion) || analysisVersion !== ANALYSIS_SCHEMA_VERSION || engineVersion !== ENGINE_VERSION) {
          return json(400, { ok: false, error: 'bad_version' });
        }
        const filter = '(' + fingerprints.join(',') + ')';
        const rows = await db(
          'user_chess_dna_games?select=fingerprint,engine_version,analysis_schema_version,game_json,updated_at&user_id=eq.' +
          encodeURIComponent(userId) + '&fingerprint=in.' + encodeURIComponent(filter) +
          '&engine_version=eq.' + encodeURIComponent(engineVersion) +
          '&analysis_schema_version=eq.' + analysisVersion + '&limit=75'
        );
        return json(200, { ok: true, games: rows || [] }, { 'cache-control': 'no-store' });
      }
      return json(400, { ok: false, error: 'bad_action' });
    }

    const body = parseBody(event);
    if (!plainObject(body)) return json(400, { ok: false, error: 'invalid_json' });

    if (body.action === 'save-game') {
      const pgn = typeof body.pgn === 'string' ? body.pgn : '';
      if (!pgn || Buffer.byteLength(pgn, 'utf8') > MAX_PGN_BYTES || !plainObject(body.game) ||
          !HASH_RE.test(String(body.fingerprint || '')) || hashPgn(pgn) !== String(body.fingerprint).toLowerCase()) {
        return json(400, { ok: false, error: 'bad_game_identity' });
      }
      const game = body.game;
      const timeClass = safeText(game.timeClass, 20).toLowerCase();
      if (!CLASSES.has(timeClass) || !['white', 'black'].includes(game.playerColor) ||
          typeof game.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(game.date) ||
          !validateAnalysis(game.analysis)) return json(400, { ok: false, error: 'bad_game_analysis' });
      const gameJson = {
        date: game.date,
        timeClass,
        playerColor: game.playerColor,
        source: ['chesscom', 'lichess'].includes(game.source) ? game.source : 'unknown',
        analysis: game.analysis,
        completedAt: new Date().toISOString(),
      };
      if (Buffer.byteLength(JSON.stringify(gameJson), 'utf8') > MAX_ANALYSIS_BYTES) return json(413, { ok: false, error: 'game_analysis_too_large' });
      await db('user_chess_dna_games?on_conflict=user_id,fingerprint,engine_version,analysis_schema_version', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify([{
          user_id: userId,
          fingerprint: String(body.fingerprint).toLowerCase(),
          engine_version: ENGINE_VERSION,
          analysis_schema_version: ANALYSIS_SCHEMA_VERSION,
          game_json: gameJson,
          updated_at: new Date().toISOString(),
        }]),
      });
      return json(200, { ok: true, saved: true, engineVersion: ENGINE_VERSION, analysisSchemaVersion: ANALYSIS_SCHEMA_VERSION });
    }

    if (body.action === 'save-report') {
      if (!UUID_RE.test(String(body.reportId || ''))) return json(400, { ok: false, error: 'bad_report' });
      const reportStructure = validateReportStructure(body.report);
      if (!reportStructure) return json(400, { ok: false, error: 'bad_report_games' });
      const fingerprints = reportStructure.fingerprints;
      const reportFingerprintClasses = reportStructure.classesByFingerprint;
      if (fingerprints.length) {
        const filter = '(' + fingerprints.join(',') + ')';
        const savedRows = await db(
          'user_chess_dna_games?select=fingerprint,game_json&user_id=eq.' + encodeURIComponent(userId) +
          '&fingerprint=in.' + encodeURIComponent(filter) +
          '&engine_version=eq.' + encodeURIComponent(ENGINE_VERSION) +
          '&analysis_schema_version=eq.' + ANALYSIS_SCHEMA_VERSION + '&limit=75'
        );
        if (fingerprints.some(fingerprint => {
          const row = (savedRows || []).find(item => String(item.fingerprint || '').toLowerCase() === fingerprint.toLowerCase());
          const stored = row?.game_json;
          const expected = reportFingerprintClasses[fingerprint];
          return !stored || stored.timeClass !== expected.timeClass || stored.playerColor !== expected.playerColor || stored.date !== expected.date;
        })) {
          return json(409, { ok: false, error: 'report_has_unsaved_games' });
        }
        if (!validateReportAgainstSavedGames(body.report, savedRows, reportStructure)) {
          return json(422, { ok: false, error: 'report_metrics_mismatch' });
        }
      } else {
        for (const timeClass of CLASSES) {
          const section = body.report.timeControls[timeClass];
          if (section.averageAccuracy !== null || section.userMoves !== 0 || Object.values(section.classificationCounts || {}).some(value => Number(value) !== 0)) {
            return json(422, { ok: false, error: 'report_metrics_mismatch' });
          }
        }
      }
      const reportJson = { ...body.report, savedAt: new Date().toISOString() };
      if (Buffer.byteLength(JSON.stringify(reportJson), 'utf8') > MAX_REPORT_BYTES) return json(413, { ok: false, error: 'report_too_large' });
      await db('user_chess_dna_reports?on_conflict=user_id,report_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
        body: JSON.stringify([{
          user_id: userId,
          report_id: String(body.reportId).toLowerCase(),
          report_schema_version: REPORT_SCHEMA_VERSION,
          report_json: reportJson,
          created_at: new Date().toISOString(),
        }]),
      });
      return json(200, { ok: true, saved: true, reportId: String(body.reportId).toLowerCase() });
    }

    return json(400, { ok: false, error: 'bad_action' });
  } catch {
    return json(503, { ok: false, error: 'chess_dna_storage_unavailable' }, { 'cache-control': 'no-store' });
  }
}

export const _test = { normalizePgn, hashPgn, validateAnalysis, validateReportStructure, validateReportAgainstSavedGames };

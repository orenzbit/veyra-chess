import crypto from 'node:crypto';
import { clientIp, json, rateLimit, sameOrigin, strictSameOrigin, supabaseRequest } from './_lib.mjs';
import { currentSession } from './auth.mjs';

const RATE = new Map();
const MAX_BODY_BYTES = 1024 * 1024;
const MAX_PGN_BYTES = 200 * 1024;
const MAX_ANALYSIS_BYTES = 650 * 1024;
const MAX_REPORT_BYTES = 450 * 1024;
const ENGINE_VERSION = 'chessy-ai-fast-v2-depth14-node100000';
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
function authorized(event, write = false) {
  if (!sameOrigin(event)) return { response: json(403, { ok: false, error: 'forbidden' }, { 'cache-control': 'no-store' }) };
  if (write && !strictSameOrigin(event)) return { response: json(403, { ok: false, error: 'forbidden' }, { 'cache-control': 'no-store' }) };
  const session = currentSession(event);
  if (!session?.user_id) return { response: json(401, { ok: false, error: 'UNAUTHENTICATED' }, { 'cache-control': 'no-store' }) };
  const ip = clientIp(event);
  if (!rateLimit(RATE, ip + '|' + session.user_id, 100, 60 * 1000)) {
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
      if (!HASH_RE.test(fingerprint) || Object.prototype.hasOwnProperty.call(classesByFingerprint, fingerprint)) return null;
      classesByFingerprint[fingerprint] = timeClass;
    }
  }
  return { fingerprints: Object.keys(classesByFingerprint), classesByFingerprint };
}

export async function handler(event) {
  const method = event.httpMethod || 'GET';
  if (method !== 'GET' && method !== 'POST' && method !== 'PUT') {
    return json(405, { ok: false, error: 'method_not_allowed' });
  }
  if (Buffer.byteLength(String(event.body || ''), 'utf8') > MAX_BODY_BYTES) return json(413, { ok: false, error: 'too_large' });
  const auth = authorized(event, method !== 'GET');
  if (auth.response) return auth.response;
  const userId = auth.session.user_id;
  const query = event.queryStringParameters || {};

  try {
    if (method === 'GET') {
      const action = safeText(query.action, 20) || 'latest';
      if (action === 'latest') {
        const rows = await supabaseRequest(
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
        const rows = await supabaseRequest(
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
      await supabaseRequest('user_chess_dna_games?on_conflict=user_id,fingerprint,engine_version,analysis_schema_version', {
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
        const savedRows = await supabaseRequest(
          'user_chess_dna_games?select=fingerprint,game_json&user_id=eq.' + encodeURIComponent(userId) +
          '&fingerprint=in.' + encodeURIComponent(filter) +
          '&engine_version=eq.' + encodeURIComponent(ENGINE_VERSION) +
          '&analysis_schema_version=eq.' + ANALYSIS_SCHEMA_VERSION + '&limit=75'
        );
        const saved = new Map((savedRows || []).map(row => [row.fingerprint, row.game_json?.timeClass]));
        if (fingerprints.some(fingerprint => !saved.has(fingerprint) || saved.get(fingerprint) !== reportFingerprintClasses[fingerprint])) {
          return json(409, { ok: false, error: 'report_has_unsaved_games' });
        }
      }
      const reportJson = { ...body.report, savedAt: new Date().toISOString() };
      if (Buffer.byteLength(JSON.stringify(reportJson), 'utf8') > MAX_REPORT_BYTES) return json(413, { ok: false, error: 'report_too_large' });
      await supabaseRequest('user_chess_dna_reports?on_conflict=user_id,report_id', {
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

export const _test = { normalizePgn, hashPgn, validateAnalysis, validateReportStructure };

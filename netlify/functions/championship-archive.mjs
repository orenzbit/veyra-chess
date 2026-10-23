import { createHash } from 'node:crypto';
import { json, supabaseRequest, timingSafeEqualText } from './_lib.mjs';

const MAX_BODY_BYTES = 6 * 1024 * 1024;
const MAX_GAMES_PER_BATCH = 100;
const RESULT_TOKENS = new Set(['1-0', '0-1', '1/2-1/2']);
const RUN_STATUSES = new Set(['running', 'incomplete', 'completed', 'failed']);

function validRunId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9._:-]{1,128}$/.test(value);
}
function validGameId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9._:-]{1,200}$/.test(value);
}
function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}
function authorized(event) {
  const expected = String(process.env.CHAMPIONSHIP_ARCHIVE_TOKEN || '');
  const header = String(event.headers?.authorization || event.headers?.Authorization || '');
  const supplied = header.startsWith('Bearer ') ? header.slice(7) : '';
  return Boolean(expected && supplied && timingSafeEqualText(supplied, expected));
}
function configured() {
  return Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));
}
function parseBody(event) {
  if (String(event.body || '').length > MAX_BODY_BYTES) return { error: 'too_large' };
  try {
    const value = JSON.parse(event.body || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? { value } : { error: 'invalid_json' };
  } catch {
    return { error: 'invalid_json' };
  }
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' }, { allow: 'POST', 'cache-control': 'no-store' });
  if (!authorized(event)) return json(401, { ok: false, error: 'unauthorized' }, { 'cache-control': 'no-store' });
  if (!configured()) return json(503, { ok: false, error: 'archive_not_configured' }, { 'cache-control': 'no-store' });
  const parsed = parseBody(event);
  if (parsed.error) return json(parsed.error === 'too_large' ? 413 : 400, { ok: false, error: parsed.error });
  const body = parsed.value;
  if (!validRunId(body.runId)) return json(400, { ok: false, error: 'invalid_run_id' });
  try {
    if (body.action === 'save-run') {
      const run = body.run;
      if (!run || typeof run !== 'object' || !Number.isInteger(run.botCount) || run.botCount < 2 ||
          !Number.isInteger(run.expectedGames) || run.expectedGames !== run.botCount * (run.botCount - 1) ||
          !Number.isInteger(run.scheduledGames) || run.scheduledGames < 1 || run.scheduledGames > run.expectedGames ||
          !Number.isInteger(run.completedGames) || run.completedGames < 0 || run.completedGames > run.expectedGames ||
          !RUN_STATUSES.has(run.status) || typeof run.manifestHash !== 'string' || !/^[a-f0-9]{64}$/.test(run.manifestHash)) {
        return json(400, { ok: false, error: 'invalid_run_payload' });
      }
      await supabaseRequest('championship_runs?on_conflict=run_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify([{
          run_id: body.runId,
          manifest_sha256: run.manifestHash,
          bot_count: run.botCount,
          expected_games: run.expectedGames,
          scheduled_games: run.scheduledGames,
          completed_games: run.completedGames,
          status: run.status,
          config: run.config && typeof run.config === 'object' ? run.config : {},
          summary: run.summary && typeof run.summary === 'object' ? run.summary : {},
          updated_at: new Date().toISOString(),
        }]),
      });
      return json(200, { ok: true, action: body.action, stored: true });
    }
    if (body.action === 'save-games') {
      if (!Array.isArray(body.games) || body.games.length < 1 || body.games.length > MAX_GAMES_PER_BATCH) {
        return json(400, { ok: false, error: 'invalid_game_batch' });
      }
      const rows = [];
      for (const game of body.games) {
        if (!game || game.status !== 'completed' || !validGameId(game.gameId) ||
            typeof game.white?.id !== 'string' || typeof game.black?.id !== 'string' || game.white.id === game.black.id ||
            !RESULT_TOKENS.has(game.result) || typeof game.pgn !== 'string' || !game.pgn.trim() ||
            typeof game.finalFen !== 'string' || !Number.isInteger(game.plies) || game.plies < 0) {
          return json(400, { ok: false, error: 'invalid_game_record' });
        }
        const serialized = JSON.stringify(game);
        rows.push({
          run_id: body.runId,
          game_id: game.gameId,
          game_sha256: digest(serialized),
          white_bot_id: game.white.id,
          black_bot_id: game.black.id,
          result: game.result,
          pgn: game.pgn,
          final_fen: game.finalFen,
          record: game,
        });
      }
      await supabaseRequest('championship_games?on_conflict=run_id,game_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(rows),
      });
      return json(200, { ok: true, action: body.action, stored: rows.length });
    }
    if (body.action === 'save-dna') {
      const report = body.report;
      if (!report || typeof report !== 'object' || !Array.isArray(report.bots) || typeof report.manifestHash !== 'string' ||
          !/^[a-f0-9]{64}$/.test(report.manifestHash) || report.bots.length > 500) {
        return json(400, { ok: false, error: 'invalid_dna_report' });
      }
      const rows = [];
      for (const bot of report.bots) {
        if (!bot || typeof bot.id !== 'string' || !bot.id.trim()) return json(400, { ok: false, error: 'invalid_dna_bot' });
        const serialized = JSON.stringify(bot);
        rows.push({
          run_id: body.runId,
          bot_id: bot.id,
          report_sha256: digest(serialized),
          report: bot,
          archived_at: new Date().toISOString(),
        });
      }
      await supabaseRequest('championship_dna_reports?on_conflict=run_id,bot_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(rows),
      });
      await supabaseRequest('championship_runs?on_conflict=run_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify([{
          run_id: body.runId,
          manifest_sha256: report.manifestHash,
          dna_report: report,
          updated_at: new Date().toISOString(),
        }]),
      });
      return json(200, { ok: true, action: body.action, stored: rows.length });
    }
    if (body.action === 'load-run') {
      const rows = await supabaseRequest('championship_runs?run_id=eq.' + encodeURIComponent(body.runId) + '&select=*', { method: 'GET' });
      if (!Array.isArray(rows) || !rows.length) return json(404, { ok: false, error: 'run_not_found' });
      return json(200, { ok: true, run: rows[0] });
    }
    if (body.action === 'load-games') {
      const limit = Number.isInteger(body.limit) ? Math.max(1, Math.min(50, body.limit)) : 50;
      const offset = Number.isInteger(body.offset) ? Math.max(0, body.offset) : 0;
      const query = 'championship_games?run_id=eq.' + encodeURIComponent(body.runId) +
        '&select=game_id,game_sha256,white_bot_id,black_bot_id,result,pgn,final_fen,record,archived_at' +
        '&order=game_id.asc&limit=' + limit + '&offset=' + offset;
      const rows = await supabaseRequest(query, { method: 'GET' });
      if (!Array.isArray(rows)) return json(502, { ok: false, error: 'invalid_archive_response' });
      return json(200, { ok: true, games: rows.map((row) => row.record), offset, nextOffset: offset + rows.length, hasMore: rows.length === limit });
    }
    if (body.action === 'load-dna') {
      const rows = await supabaseRequest('championship_dna_reports?run_id=eq.' + encodeURIComponent(body.runId) + '&select=bot_id,report_sha256,report,archived_at&order=bot_id.asc&limit=500', { method: 'GET' });
      if (!Array.isArray(rows)) return json(502, { ok: false, error: 'invalid_archive_response' });
      return json(200, { ok: true, reports: rows });
    }
    return json(400, { ok: false, error: 'invalid_action' });
  } catch (error) {
    return json(502, { ok: false, error: 'archive_write_failed', detail: error instanceof Error ? error.message : String(error) }, { 'cache-control': 'no-store' });
  }
}

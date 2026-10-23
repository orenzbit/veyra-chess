import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

process.env.CHAMPIONSHIP_ARCHIVE_TOKEN = 'test-championship-token-with-sufficient-length';
process.env.SUPABASE_URL = 'https://supabase.test';
process.env.SUPABASE_SECRET_KEY = 'test-service-role-key';

const calls = [];
globalThis.fetch = async (url, options = {}) => {
  calls.push({ url: String(url), options });
  return new Response(null, { status: 204 });
};
const { handler } = await import('../netlify/functions/championship-archive.mjs?test=championship');
const event = (body, headers = {}) => ({
  httpMethod: 'POST',
  headers: { authorization: 'Bearer ' + process.env.CHAMPIONSHIP_ARCHIVE_TOKEN, ...headers },
  body: JSON.stringify(body),
});
const payload = (response) => JSON.parse(response.body);

assert.equal((await handler({ httpMethod: 'GET', headers: {} })).statusCode, 405);
assert.equal((await handler({ ...event({ action: 'save-run', runId: 'test-run', run: {} }), headers: {} })).statusCode, 401);
assert.equal((await handler(event({ action: 'unknown', runId: 'test-run' }))).statusCode, 400);

const manifestHash = 'a'.repeat(64);
const runResponse = await handler(event({
  action: 'save-run', runId: 'test-run',
  run: { manifestHash, botCount: 2, expectedGames: 2, scheduledGames: 2, completedGames: 0, status: 'running', config: {}, summary: {} },
}));
assert.equal(runResponse.statusCode, 200);
assert.equal(payload(runResponse).stored, true);
assert.ok(calls.at(-1).url.includes('championship_runs?on_conflict=run_id'));
assert.equal(JSON.parse(calls.at(-1).options.body)[0].scheduled_games, 2);

const game = {
  schemaVersion: 1, gameId: 'alpha__vs__beta', status: 'completed',
  white: { id: 'alpha', name: 'Alpha' }, black: { id: 'beta', name: 'Beta' },
  result: '1-0', pgn: '[Result "1-0"]\n\n1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0',
  finalFen: 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 1 4',
  plies: 7,
};
const gameResponse = await handler(event({ action: 'save-games', runId: 'test-run', games: [game] }));
assert.equal(gameResponse.statusCode, 200);
assert.equal(payload(gameResponse).stored, 1);
assert.ok(calls.at(-1).url.includes('championship_games?on_conflict=run_id,game_id'));
const archivedGame = JSON.parse(calls.at(-1).options.body)[0];
assert.equal(archivedGame.game_id, game.gameId);
assert.equal(archivedGame.pgn, game.pgn);
assert.match(archivedGame.game_sha256, /^[a-f0-9]{64}$/);

const analysis = {
  schemaVersion: 1, analysisSchemaVersion: 1, engineFingerprint: 'b'.repeat(64),
  analysisId: 'alpha__vs__beta__ply-0001', positionFingerprint: 'c'.repeat(64),
  gameId: game.gameId, ply: 1, botId: 'alpha', side: 'white', san: 'e4',
  beforeFen: 'start-fen', afterFen: 'after-fen', elapsedMs: 12.5, bestUci: 'e2e4',
  classification: 'best', depth: 4, whiteChanceBefore: 50, whiteChanceAfter: 51,
  whiteChanceBest: 51, drop: 0,
};
const analysisResponse = await handler(event({ action: 'save-analyses', runId: 'test-run', analyses: [analysis] }));
assert.equal(analysisResponse.statusCode, 200);
assert.equal(payload(analysisResponse).stored, 1);
assert.ok(calls.at(-1).url.includes('championship_move_analyses?on_conflict=run_id,analysis_id'));
assert.equal(JSON.parse(calls.at(-1).options.body)[0].analysis_id, analysis.analysisId);

const dnaResponse = await handler(event({
  action: 'save-dna', runId: 'test-run',
  report: { schemaVersion: 1, manifestHash, bots: [{ id: 'alpha', games: 1 }, { id: 'beta', games: 1 }] },
}));
assert.equal(dnaResponse.statusCode, 200);
assert.equal(payload(dnaResponse).stored, 2);
assert.ok(calls.some((call) => call.url.includes('championship_dna_reports?on_conflict=run_id,bot_id')));
assert.ok(calls.some((call) => call.url.includes('championship_runs?on_conflict=run_id') && String(call.options.body).includes('"dna_report"') && String(call.options.body).includes('"dna_report_sha256"')));
const schema = await readFile('public/data/supabase-schema.sql', 'utf8');
for (const token of [
  'create table if not exists public.championship_runs',
  'create table if not exists public.championship_games',
  'create table if not exists public.championship_dna_reports',
  'create table if not exists public.championship_move_analyses',
  'analysis_positions integer not null',
  'analysis_fingerprint text check',
  'analysis_summary jsonb',
  'scheduled_games integer not null',
  'dna_report_sha256 text check',
  'primary key (run_id, game_id)',
  'primary key (run_id, bot_id)',
  'enable row level security',
  'revoke all on table public.championship_runs, public.championship_games, public.championship_dna_reports, public.championship_move_analyses from public, anon, authenticated',
  'grant select, insert, update, delete on table public.championship_runs, public.championship_games, public.championship_dna_reports, public.championship_move_analyses to service_role',
]) assert.ok(schema.includes(token), 'Championship archive schema contract missing: ' + token);
console.log('PASS: championship archive enforces bearer auth and validates run, PGN, and DNA writes.');

import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Chess } from '../public/vendor/veyra-rules/chess-compat.js';

const arg = (name, fallback = '') => process.argv.find((value) => value.startsWith('--' + name + '='))?.slice(name.length + 3) || fallback;
const inputPath = resolve(arg('input', 'artifacts/legends-tournament/games.jsonl'));
const summaryPath = resolve(arg('summary', 'artifacts/legends-tournament/summary.json'));
const manifest = JSON.parse(await readFile('public/data/bots/index.json', 'utf8'));
const summary = JSON.parse(await readFile(summaryPath, 'utf8'));
const records = (await readFile(inputPath, 'utf8')).split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
const ids = manifest.map((bot) => bot.id);
const byId = new Map(manifest.map((bot) => [bot.id, bot]));
const expectedGames = manifest.length * (manifest.length - 1);
const errors = [];
const checks = [];
const counts = new Map(ids.map((id) => [id, { games: 0, white: 0, black: 0, wins: 0, draws: 0, losses: 0, timeForfeits: 0, points: 0, plies: 0 }]));
const pairs = new Map();
function pass(name, detail) { checks.push({ name, status: 'passed', detail }); }
function fail(name, detail) { errors.push({ name, detail }); }
function assertCheck(condition, name, detail) { if (condition) pass(name, detail); else fail(name, detail); }

assertCheck(summary.status === 'passed', 'runner-status', 'Tournament runner reported ' + summary.status);
assertCheck(summary.botCount === manifest.length, 'manifest-count', 'Runner and manifest bot counts agree at ' + manifest.length);
assertCheck(summary.expectedGames === expectedGames && summary.scheduledGames === expectedGames, 'schedule-size', 'Expected complete double round-robin: ' + expectedGames + ' games');
assertCheck(records.length === expectedGames && summary.completedGames === expectedGames, 'completion-count', 'All scheduled games have a record');
assertCheck(summary.failedGames === 0 && summary.adjudicatedGames === 0, 'no-failures-or-caps', 'No failed games or artificial ply-cap stops');
assertCheck(summary.timeControlSeconds === 600, 'ten-minute-clock', 'Each side receives 600 seconds with no increment');

for (const [index, record] of records.entries()) {
  const errorsBeforeGame = errors.length;
  const label = 'game-' + (record.gameIndex ?? index + 1);
  if (!record.white?.id || !record.black?.id || record.white.id === record.black.id) { fail(label, 'Missing or duplicate players'); continue; }
  if (!byId.has(record.white.id) || !byId.has(record.black.id)) { fail(label, 'Player id is not present in manifest'); continue; }
  const white = counts.get(record.white.id), black = counts.get(record.black.id);
  white.games += 1; white.white += 1; black.games += 1; black.black += 1;
  const pairKey = [record.white.id, record.black.id].sort().join('|');
  if (!pairs.has(pairKey)) pairs.set(pairKey, []);
  pairs.get(pairKey).push(record);
  if (record.result === '1-0') { white.wins += 1; black.losses += 1; white.points += 1; }
  else if (record.result === '0-1') { black.wins += 1; white.losses += 1; black.points += 1; }
  else if (record.result === '1/2-1/2') { white.draws += 1; black.draws += 1; white.points += 0.5; black.points += 0.5; }
  else fail(label, 'Invalid or missing result: ' + record.result);
  if (record.reason === 'time-forfeit') {
    const timedOut = record.moveTimes?.at(-1)?.botId;
    if (timedOut === record.white.id) white.timeForfeits += 1;
    else if (timedOut === record.black.id) black.timeForfeits += 1;
    else fail(label, 'Time forfeit lacks a final timed-out bot move');
    const expectedWinner = timedOut === record.white.id ? '0-1' : '1-0';
    if (record.result !== expectedWinner) fail(label, 'Time-forfeit result does not award the win to the opponent of the timed-out bot');
  } else if (!['checkmate', 'stalemate', 'draw'].includes(record.reason)) fail(label, 'Unknown termination reason: ' + record.reason);
  const expectedClockSamples = record.plies + (record.reason === 'time-forfeit' ? 1 : 0);
  if (expectedClockSamples !== record.moveTimes?.length) fail(label, 'Ply count and clock samples do not match the termination reason');
  if (record.timeControlSeconds !== 600) fail(label, 'Game does not use the required 10-minute-per-side clock');
  if (!record.playedAt || !record.pgn || !record.finalFen) fail(label, 'Missing timestamp, PGN or final FEN');
  if (record.status !== 'completed') fail(label, 'Game status is ' + record.status);
  for (const side of ['white', 'black']) {
    const seconds = record.remainingClocks?.[side];
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > 600) fail(label, 'Invalid remaining clock for ' + side);
  }
  try {
    const game = new Chess();
    game.loadPgn(record.pgn, { sloppy: true });
    if (game.fen() !== record.finalFen) fail(label, 'Replayed PGN final FEN does not match recorded final FEN');
    if (game.history().length !== record.plies) fail(label, 'Replayed PGN ply count does not match record');
    if (record.reason === 'checkmate' && !game.isCheckmate()) fail(label, 'Checkmate termination is not checkmate in PGN');
    if (record.reason === 'stalemate' && !game.isStalemate()) fail(label, 'Stalemate termination is not stalemate in PGN');
    if (record.reason === 'draw' && !(game.isDraw() || game.isThreefoldRepetition() || game.isInsufficientMaterial())) fail(label, 'Draw termination is not a recognized draw in PGN');
    if (record.reason === 'checkmate') {
      const expected = game.turn() === 'w' ? '0-1' : '1-0';
      if (record.result !== expected) fail(label, 'Checkmate winner disagrees with final board');
    }
  } catch (error) { fail(label, 'PGN replay error: ' + (error instanceof Error ? error.message : String(error))); }
  white.plies += record.plies || 0; black.plies += record.plies || 0;
  if (errors.length === errorsBeforeGame) pass(label, 'PGN replay, final FEN, result/termination and clock record verified');
}
assertCheck(pairs.size === expectedGames / 2, 'pair-count', 'Every unordered bot pair appears');
for (const [pairKey, games] of pairs) {
  const [a, b] = pairKey.split('|');
  const orientations = new Set(games.map((game) => game.white.id + '|' + game.black.id));
  if (games.length !== 2 || orientations.size !== 2 || !orientations.has(a + '|' + b) || !orientations.has(b + '|' + a)) fail('pair-' + pairKey, 'Expected exactly two games with colors reversed');
}
for (const bot of manifest) {
  const c = counts.get(bot.id);
  if (c.games !== manifest.length - 1 || c.white !== Math.floor((manifest.length - 1) / 2) || c.black !== Math.ceil((manifest.length - 1) / 2)) {
    fail('bot-' + bot.id, 'Unexpected game/color counts: ' + JSON.stringify(c));
  }
  if (bot.sourceFile) {
    if (!(bot.sourceGameCount > 0) || !bot.styleMetrics || !Array.isArray(bot.exampleGames) || bot.exampleGames.length < 2) fail('profile-' + bot.id, 'Historical provenance, style metrics or source examples missing');
    if (!Array.isArray(bot.openingsAsWhite) || bot.openingsAsWhite.length < 1 || !Array.isArray(bot.openingsAsBlack) || bot.openingsAsBlack.length < 1) fail('profile-' + bot.id, 'Historical repertoire is incomplete');
    if (!bot.phraseArchive || !['general','opening','threat','tactics','endgame'].every((key) => Array.isArray(bot.phraseArchive[key]) && bot.phraseArchive[key].length >= 2)) fail('profile-' + bot.id, 'Historical phrase archive is incomplete');
  }
}
const standings = [...counts.entries()].map(([id, c]) => ({
  id, name: byId.get(id).name, elo: byId.get(id).elo, ratingBasis: byId.get(id).ratingBasis || 'existing bot rating parameter', games: c.games, white: c.white, black: c.black,
  wins: c.wins, draws: c.draws, losses: c.losses, score: Number(c.points.toFixed(1)),
  scorePercent: Number((100 * c.points / Math.max(1, c.games)).toFixed(1)),
  timeForfeits: c.timeForfeits, averagePlies: Number((c.plies / Math.max(1, c.games)).toFixed(1)),
})).sort((a, b) => b.score - a.score || b.elo - a.elo);
const report = {
  status: errors.length ? 'failed' : 'passed',
  checkedAt: new Date().toISOString(),
  botCount: manifest.length,
  expectedGames,
  records: records.length,
  checks,
  errors,
  standings,
  limitations: [
    'Tournament pass measures complete, legal simulations and recorded clock behavior; it does not prove grandmaster playing strength.',
    'Style similarity is estimated from PGN-derived patterns and a bounded style bonus; it is not a formal engine evaluation of every move.',
    'Wins/losses are reported, not used as the pass criterion.'
  ],
};
summary.supervisorAudit = { status: report.status, checksPassed: checks.length, errors: errors.length, checkedAt: report.checkedAt };
await writeFile(resolve(dirname(summaryPath), 'audit.json'), JSON.stringify(report, null, 2) + '\n');
const markdown = [
  '# Legends tournament supervisor audit', '',
  '- Status: **' + report.status + '**',
  '- Bots: ' + report.botCount,
  '- Games: ' + report.records + ' / ' + report.expectedGames,
  '- Checks passed: ' + report.checks.length,
  '- Errors: ' + report.errors.length, '',
  '## Per-bot results', '',
  '| Bot | Internal rating | Basis | Games | W | D | L | Score | Time forfeits | Avg. plies |',
  '|---|---:|---:|---:|---:|---:|---:|---:|---:|',
  ...standings.map((b) => '| ' + b.name + ' | ' + b.elo + ' | ' + b.ratingBasis + ' | ' + b.games + ' | ' + b.wins + ' | ' + b.draws + ' | ' + b.losses + ' | ' + b.score + ' (' + b.scorePercent + '%) | ' + b.timeForfeits + ' | ' + b.averagePlies + ' |'),
  '', '## Errors', '', ...(errors.length ? errors.map((e) => '- ' + e.name + ': ' + e.detail) : ['None.']), '',
  '## Interpretation', '', ...report.limitations.map((line) => '- ' + line), ''
];
await writeFile(resolve(dirname(summaryPath), 'audit.md'), markdown.join('\n'));
await writeFile(summaryPath, JSON.stringify(summary, null, 2) + '\n');
assert.equal(errors.length, 0, errors.slice(0, 40).map((e) => e.name + ': ' + e.detail).join('\n'));
console.log('PASS: supervisor verified ' + records.length + ' games, all color-reversed pairings, PGN replay, clock records and per-bot coverage.');

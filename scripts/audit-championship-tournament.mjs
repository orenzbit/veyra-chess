import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Chess } from '../public/vendor/veyra-rules/chess-compat.js';

const arg = (name, fallback = '') => process.argv.find((value) => value.startsWith('--' + name + '='))?.slice(name.length + 3) ?? fallback;
const inputPath = resolve(arg('input', 'artifacts/championship-tournament/games.jsonl'));
const summaryPath = resolve(arg('summary', 'artifacts/championship-tournament/summary.json'));
const manifest = JSON.parse(await readFile(arg('manifest', 'public/data/bots/index.json'), 'utf8'));
const summary = JSON.parse(await readFile(summaryPath, 'utf8'));
const lines = (await readFile(inputPath, 'utf8')).split(/\r?\n/).filter(Boolean);
const records = lines.map((line) => JSON.parse(line));
const ids = new Set();
for (const bot of manifest) {
  assert.ok(bot?.id && !ids.has(bot.id), 'Manifest contains a missing or duplicate bot id');
  ids.add(bot.id);
}
const expectedGames = manifest.length * (manifest.length - 1);
const errors = [];
const checks = [];
const add = (condition, name, detail) => {
  (condition ? checks : errors).push({ name, detail });
};
add(summary.botCount === manifest.length, 'manifest-count', 'Summary and manifest contain the same bot count');
add(summary.expectedGames === expectedGames, 'schedule-size', 'Full double round-robin expected ' + expectedGames + ' games');
add(records.length === summary.completedGames, 'record-count', 'Every completed record appears in JSONL');
add(records.every((record) => record.status === 'completed'), 'record-status', 'No failed/incomplete records are counted as completed');
const byId = new Map(manifest.map((bot) => [bot.id, bot]));
const pairings = new Map();
const gameIds = new Set();
const orientedScheduleIds = new Set();
for (let i = 0; i < manifest.length; i += 1) for (let j = i + 1; j < manifest.length; j += 1) {
  orientedScheduleIds.add(manifest[i].id + '__vs__' + manifest[j].id);
  orientedScheduleIds.add(manifest[j].id + '__vs__' + manifest[i].id);
}
const gamesPerBot = new Map(manifest.map((bot) => [bot.id, { games: 0, white: 0, black: 0, wins: 0, draws: 0, losses: 0, points: 0 }]));
for (const [index, record] of records.entries()) {
  const label = 'game-' + (record.gameId || index + 1);
  const before = errors.length;
  if (gameIds.has(record.gameId)) errors.push({ name: label, detail: 'Duplicate game ID' });
  gameIds.add(record.gameId);
  if (!orientedScheduleIds.has(record.gameId)) errors.push({ name: label, detail: 'Game ID is not part of the manifest schedule' });
  const whiteId = record.white?.id;
  const blackId = record.black?.id;
  if (!byId.has(whiteId) || !byId.has(blackId) || whiteId === blackId) {
    errors.push({ name: label, detail: 'Unknown or identical players' });
    continue;
  }
  if (record.gameId !== whiteId + '__vs__' + blackId) errors.push({ name: label, detail: 'Stable game ID does not match oriented pairing' });
  if (!['1-0', '0-1', '1/2-1/2'].includes(record.result)) errors.push({ name: label, detail: 'Invalid result token: ' + record.result });
  if (!record.pgn || !record.finalFen || !Number.isInteger(record.plies)) errors.push({ name: label, detail: 'Missing PGN, final FEN, or ply count' });
  if (record.reason === 'time-forfeit') {
    const last = record.moveTimes?.at(-1);
    const expected = last?.side === 'white' ? '0-1' : last?.side === 'black' ? '1-0' : null;
    if (!expected || expected !== record.result) errors.push({ name: label, detail: 'Time-forfeit result does not match timed-out side' });
  } else if (!['checkmate', 'stalemate', 'draw'].includes(record.reason)) errors.push({ name: label, detail: 'Unknown termination reason' });
  try {
    const replay = new Chess();
    replay.loadPgn(record.pgn, { sloppy: true });
    if (replay.fen() !== record.finalFen) errors.push({ name: label, detail: 'PGN final FEN mismatch' });
    if (replay.history().length !== record.plies) errors.push({ name: label, detail: 'PGN ply count mismatch' });
    if (record.reason === 'checkmate' && !replay.isCheckmate()) errors.push({ name: label, detail: 'Recorded checkmate is not checkmate on replay' });
    if (record.reason === 'stalemate' && !replay.isStalemate()) errors.push({ name: label, detail: 'Recorded stalemate is not stalemate on replay' });
    if (record.reason === 'draw' && !(replay.isDraw() || replay.isThreefoldRepetition() || replay.isInsufficientMaterial())) errors.push({ name: label, detail: 'Recorded draw is not a recognized draw on replay' });
    if (record.reason === 'checkmate') {
      const expected = replay.turn() === 'w' ? '0-1' : '1-0';
      if (record.result !== expected) errors.push({ name: label, detail: 'Checkmate winner does not match replayed board' });
    }
  } catch (error) {
    errors.push({ name: label, detail: 'PGN replay failed: ' + (error instanceof Error ? error.message : String(error)) });
  }
  const white = gamesPerBot.get(whiteId);
  const black = gamesPerBot.get(blackId);
  white.games += 1; white.white += 1;
  black.games += 1; black.black += 1;
  if (record.result === '1-0') { white.wins += 1; black.losses += 1; white.points += 1; }
  else if (record.result === '0-1') { black.wins += 1; white.losses += 1; black.points += 1; }
  else if (record.result === '1/2-1/2') { white.draws += 1; black.draws += 1; white.points += 0.5; black.points += 0.5; }
  const pair = [whiteId, blackId].sort().join('|');
  if (!pairings.has(pair)) pairings.set(pair, []);
  pairings.get(pair).push(record);
  if (errors.length === before) checks.push({ name: label, detail: 'PGN replay, final FEN, result and termination verified' });
}
const isFull = summary.scheduledGames === expectedGames;
if (isFull) {
  add(records.length === expectedGames, 'full-completion', 'Full tournament has all ' + expectedGames + ' games');
  add(pairings.size === expectedGames / 2, 'unique-pairs', 'Every unordered pair appears');
  for (const [pair, games] of pairings) {
    const orientations = new Set(games.map((game) => game.white.id + '|' + game.black.id));
    if (games.length !== 2 || orientations.size !== 2) errors.push({ name: 'pair-' + pair, detail: 'Each pair must play exactly twice with colors reversed' });
  }
  for (const bot of manifest) {
    const counts = gamesPerBot.get(bot.id);
    if (counts.games !== manifest.length - 1 || counts.white + counts.black !== manifest.length - 1) errors.push({ name: 'bot-' + bot.id, detail: 'Unexpected full-tournament game/color counts' });
  }
} else {
  add(records.length <= summary.scheduledGames, 'partial-run-size', 'Partial run does not exceed requested game count');
}
const standings = [...gamesPerBot.entries()].map(([id, stats]) => ({
  id, name: byId.get(id).name, profileElo: byId.get(id).elo ?? null,
  ratingLabel: 'profile parameter; not a tournament Elo',
  games: stats.games, white: stats.white, black: stats.black, wins: stats.wins, draws: stats.draws, losses: stats.losses,
  points: Number(stats.points.toFixed(1)),
})).sort((a, b) => b.points - a.points || b.wins - a.wins || a.id.localeCompare(b.id));
const report = {
  schemaVersion: 1, status: errors.length ? 'failed' : 'passed', checkedAt: new Date().toISOString(),
  botCount: manifest.length, expectedGames, scheduledGames: summary.scheduledGames, records: records.length,
  checksPassed: checks.length, errors, standings,
  limitations: [
    'Profile Elo values are not recalculated tournament ratings.',
    'This audit verifies legal PGN replay and recorded results; it does not certify playing strength.',
    'Chess DNA descriptive metrics are not engine-derived ACPL or move accuracy.',
  ],
};
const outDir = dirname(summaryPath);
await writeFile(resolve(outDir, 'audit.json'), JSON.stringify(report, null, 2) + '\n');
const md = [
  '# Championship tournament audit', '',
  '- Status: **' + report.status + '**',
  '- Bots: ' + report.botCount,
  '- Games: ' + report.records + ' / ' + report.scheduledGames + ' scheduled; ' + report.expectedGames + ' for full round-robin',
  '- Checks passed: ' + report.checksPassed,
  '- Errors: ' + report.errors.length, '',
  '| Bot | Games | W | D | L | Points | Profile Elo (not tournament Elo) |',
  '|---|---:|---:|---:|---:|---:|---:|',
  ...standings.map((row) => '| ' + row.name + ' (' + row.id + ') | ' + row.games + ' | ' + row.wins + ' | ' + row.draws + ' | ' + row.losses + ' | ' + row.points + ' | ' + (row.profileElo ?? 'n/a') + ' |'),
  '', '## Errors', '', ...(errors.length ? errors.map((error) => '- ' + error.name + ': ' + error.detail) : ['None.']), '',
  '## Interpretation', '', ...report.limitations.map((item) => '- ' + item), '',
];
await writeFile(resolve(outDir, 'audit.md'), md.join('\n'));
assert.equal(errors.length, 0, errors.slice(0, 40).map((error) => error.name + ': ' + error.detail).join('\n'));
console.log('PASS: audited ' + records.length + ' championship games; report: ' + resolve(outDir, 'audit.md'));

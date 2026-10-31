import assert from 'node:assert/strict';
import { readdir, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const arg = (name, fallback = '') => process.argv.find((value) => value.startsWith('--' + name + '='))?.slice(name.length + 3) || fallback;
const shardsDir = resolve(arg('shards-dir', 'artifacts/tournament-shards'));
const outDir = resolve(arg('out', 'artifacts/legends-tournament-premerge'));
const expectedShards = Number(arg('expected-shards', '120'));
const timeControlSeconds = Number(arg('time-control-seconds', '600'));
const maxPlies = Number(arg('max-plies', '300'));
const searchDepthCap = Number(arg('search-depth-cap', '3'));
const seed = Number(arg('seed', '20261024'));
const manifest = JSON.parse(await readFile('public/data/bots/index.json', 'utf8'));
assert.equal(manifest.length, 61, 'Expected all 61 manifest bots in the tournament');
assert.ok(Number.isInteger(expectedShards) && expectedShards > 0, 'expected-shards must be a positive integer');
const expectedGames = manifest.length * (manifest.length - 1);
const entries = await readdir(shardsDir, { withFileTypes: true });
const shardDirs = entries.filter((entry) => entry.isDirectory() && entry.name.startsWith('tournament-shard-'))
  .map((entry) => ({ name: entry.name, path: resolve(shardsDir, entry.name), index: Number(entry.name.slice('tournament-shard-'.length)) }))
  .sort((a, b) => a.index - b.index);
assert.equal(shardDirs.length, expectedShards, 'Not all tournament shard artifacts were downloaded');
const shardSummaries = [];
const records = [];
for (const shard of shardDirs) {
  assert.ok(Number.isInteger(shard.index) && shard.index >= 0 && shard.index < expectedShards, 'Invalid shard directory: ' + shard.name);
  const shardSummary = JSON.parse(await readFile(resolve(shard.path, 'summary.json'), 'utf8'));
  assert.equal(shardSummary.status, 'passed', shard.name + ' did not pass');
  assert.equal(shardSummary.shardIndex, shard.index, shard.name + ' index mismatch');
  assert.equal(shardSummary.shardCount, expectedShards, shard.name + ' shard count mismatch');
  assert.equal(shardSummary.failedGames, 0, shard.name + ' contains failed games');
  assert.equal(shardSummary.adjudicatedGames, 0, shard.name + ' contains ply-cap interruptions');
  const shardRecords = (await readFile(resolve(shard.path, 'games.jsonl'), 'utf8')).split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  assert.equal(shardRecords.length, shardSummary.scheduledGames, shard.name + ' record count differs from scheduled games');
  assert.equal(shardSummary.completedGames, shardSummary.scheduledGames, shard.name + ' did not complete every assigned game');
  for (const record of shardRecords) {
    assert.equal(record.status, 'completed', shard.name + ' contains a non-completed game');
    assert.ok(record.result && record.result !== '*', shard.name + ' contains a missing result');
    assert.ok(record.reason !== 'ply-cap', shard.name + ' contains a ply-cap interruption');
    const separatePgn = await readFile(resolve(shard.path, record.pgnFile), 'utf8');
    assert.equal(separatePgn.trim(), String(record.pgn).trim(), shard.name + ' has a mismatched separate PGN');
    records.push({ ...record, sourceShard: shard.index });
  }
  shardSummaries.push(shardSummary);
}
assert.deepEqual(shardDirs.map((shard) => shard.index), Array.from({ length: expectedShards }, (_, i) => i), 'Shard indexes are incomplete');

const order = new Map(manifest.map((bot, index) => [bot.id, index]));
const byId = new Map(manifest.map((bot) => [bot.id, bot]));
for (const record of records) {
  assert.ok(byId.has(record.white?.id) && byId.has(record.black?.id), 'Tournament record references an unknown bot');
  assert.notEqual(record.white.id, record.black.id, 'Self-play is not allowed');
}
const pairMap = new Map();
for (const record of records) {
  const pairKey = [record.white.id, record.black.id].sort().join('|');
  if (!pairMap.has(pairKey)) pairMap.set(pairKey, []);
  pairMap.get(pairKey).push(record);
}
assert.equal(pairMap.size, expectedGames / 2, 'The combined tournament is missing or duplicating unordered pairs');
for (const [pairKey, games] of pairMap) {
  const [a, b] = pairKey.split('|');
  const orientations = new Set(games.map((game) => game.white.id + '|' + game.black.id));
  assert.equal(games.length, 2, 'Pair ' + pairKey + ' must have exactly two games');
  assert.ok(orientations.has(a + '|' + b) && orientations.has(b + '|' + a), 'Pair ' + pairKey + ' must have both color orientations');
}
records.sort((a, b) => {
  const aw = order.get(a.white.id), ab = order.get(a.black.id);
  const bw = order.get(b.white.id), bb = order.get(b.black.id);
  return Math.min(aw, ab) - Math.min(bw, bb) || Math.max(aw, ab) - Math.max(bw, bb) || aw - bw;
});

await mkdir(resolve(outDir, 'pgn'), { recursive: true });
const finalRecords = [];
const botStats = Object.fromEntries(manifest.map((bot) => [bot.id, {
  name: bot.name, games: 0, completed: 0, failures: 0, capped: 0, wins: 0, draws: 0, losses: 0, points: 0,
}]));
const naturalResults = { white: 0, black: 0, draw: 0 };
const failures = [];
for (const [index, sourceRecord] of records.entries()) {
  const gameIndex = index + 1;
  const id = String(gameIndex).padStart(4, '0');
  let pgn = String(sourceRecord.pgn);
  assert.match(pgn, /^\[Round "[^"]*"\]/m, 'Game ' + gameIndex + ' PGN is missing a Round header');
  pgn = pgn.replace(/^\[Round "[^"]*"\]/m, '[Round "' + gameIndex + '"]');
  const pgnFile = 'pgn/game-' + id + '-' + sourceRecord.white.id + '-vs-' + sourceRecord.black.id + '.pgn';
  const record = { ...sourceRecord, gameIndex, pgnFile, pgn };
  await writeFile(resolve(outDir, pgnFile), pgn + (pgn.endsWith('\n') ? '' : '\n'));
  finalRecords.push(record);
  const white = botStats[record.white.id], black = botStats[record.black.id];
  white.games += 1; black.games += 1;
  if (record.status === 'completed') { white.completed += 1; black.completed += 1; }
  else { white.failures += 1; black.failures += 1; failures.push('Game ' + gameIndex + ': ' + record.error); }
  if (record.reason === 'ply-cap') { white.capped += 1; black.capped += 1; }
  if (record.result === '1-0') { white.wins += 1; black.losses += 1; white.points += 1; naturalResults.white += 1; }
  else if (record.result === '0-1') { black.wins += 1; white.losses += 1; black.points += 1; naturalResults.black += 1; }
  else if (record.result === '1/2-1/2') { white.draws += 1; black.draws += 1; white.points += 0.5; black.points += 0.5; naturalResults.draw += 1; }
  else failures.push('Game ' + gameIndex + ': invalid result ' + record.result);
}
const startedAt = shardSummaries.map((summary) => summary.startedAt).filter(Boolean).sort()[0] || new Date().toISOString();
const failedGames = finalRecords.filter((record) => record.status !== 'completed' || record.error || !record.result).length;
const adjudicatedGames = finalRecords.filter((record) => record.reason === 'ply-cap').length;
const completedGames = finalRecords.filter((record) => record.status === 'completed' && record.result).length;
const summary = {
  status: finalRecords.length === expectedGames && completedGames === expectedGames && failedGames === 0 && adjudicatedGames === 0 ? 'passed' : 'failed',
  startedAt,
  finishedAt: new Date().toISOString(),
  seed,
  botCount: manifest.length,
  focusBotId: null,
  opponentBotId: null,
  gamesPerPair: 2,
  focusColor: 'white',
  shardIndex: null,
  shardCount: expectedShards,
  searchDepthCap,
  quiescenceDepthCap: 0,
  talIncluded: manifest.some((bot) => bot.id === 'tal'),
  expectedGames,
  scheduledGames: expectedGames,
  maxPlies,
  timeControlSeconds,
  completedGames,
  failedGames,
  adjudicatedGames,
  naturalResults,
  bots: botStats,
  failures,
};
await writeFile(resolve(outDir, 'games.jsonl'), finalRecords.map((record) => JSON.stringify(record)).join('\n') + '\n');
await writeFile(resolve(outDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
const summaryMarkdown = [
  '# Veyra Chess 61-bot double round-robin tournament', '',
  '- Status: **' + summary.status + '**',
  '- Bots: ' + summary.botCount,
  '- Games: ' + summary.completedGames + '/' + summary.expectedGames,
  '- Failed games: ' + summary.failedGames,
  '- Ply-cap interruptions: ' + summary.adjudicatedGames,
  '- Shards completed: ' + shardSummaries.length + '/' + expectedShards,
  '- Time control: ' + timeControlSeconds + ' seconds per side, no increment',
  '- Search depth cap: ' + searchDepthCap + ', quiescence cap: 0',
  '- Started: ' + summary.startedAt,
  '- Finished: ' + summary.finishedAt, '',
  '| Bot | Games | W | D | L | Points |',
  '|---|---:|---:|---:|---:|---:|',
  ...Object.entries(botStats).map(([id, bot]) => '| ' + bot.name + ' (' + id + ') | ' + bot.games + ' | ' + bot.wins + ' | ' + bot.draws + ' | ' + bot.losses + ' | ' + bot.points.toFixed(1) + ' |'),
  '', '## Failures', '', ...(failures.length ? failures.map((failure) => '- ' + failure) : ['None.']), '',
];
await writeFile(resolve(outDir, 'summary.md'), summaryMarkdown.join('\n') + '\n');
assert.equal(summary.status, 'passed', 'Combined tournament is incomplete or contains failed/capped games');
assert.equal(finalRecords.length, expectedGames, 'Combined tournament record count mismatch');
console.log('PASS: aggregated ' + finalRecords.length + ' completed games from ' + shardSummaries.length + ' shards across all ' + manifest.length + ' bots.');

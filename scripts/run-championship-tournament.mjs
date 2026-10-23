import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { Chess } from '../public/vendor/veyra-rules/chess-compat.js';
import { chooseBotMove } from '../dist/src/bot-engine.js';

const arg = (name, fallback = '') => process.argv.find((value) => value.startsWith('--' + name + '='))?.slice(name.length + 3) ?? fallback;
const hasFlag = (name) => process.argv.includes('--' + name);
const manifestPath = arg('manifest', 'public/data/bots/index.json');
const outputDir = resolve(arg('out', 'artifacts/championship-tournament'));
const maxPlies = Number(arg('max-plies', '300'));
const maxGames = Number(arg('max-games', 'Infinity'));
const baseSeed = Number(arg('seed', '20261023'));
const timeControlSeconds = Number(arg('time-control-seconds', '600'));
const resume = hasFlag('resume');
const overwrite = hasFlag('overwrite');

assert.ok(Number.isInteger(maxPlies) && maxPlies >= 2, '--max-plies must be an integer >= 2');
assert.ok((maxGames === Infinity) || (Number.isInteger(maxGames) && maxGames >= 1), '--max-games must be a positive integer');
assert.ok(Number.isFinite(baseSeed), '--seed must be finite');
assert.ok(Number.isFinite(timeControlSeconds) && timeControlSeconds > 0, '--time-control-seconds must be positive');

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
assert.ok(Array.isArray(manifest) && manifest.length >= 2, 'Manifest must contain at least two bots');
const ids = new Set();
for (const bot of manifest) {
  assert.ok(bot && typeof bot.id === 'string' && bot.id.trim(), 'Every bot must have a non-empty id');
  assert.ok(!ids.has(bot.id), 'Duplicate bot id: ' + bot.id);
  assert.ok(typeof bot.name === 'string' && bot.name.trim(), 'Bot ' + bot.id + ' must have a name');
  ids.add(bot.id);
}
const manifestHash = createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
const schedule = [];
for (let i = 0; i < manifest.length; i += 1) {
  for (let j = i + 1; j < manifest.length; j += 1) {
    schedule.push({ white: manifest[i], black: manifest[j] });
    schedule.push({ white: manifest[j], black: manifest[i] });
  }
}
const expectedGames = manifest.length * (manifest.length - 1);
const scheduledGames = Math.min(expectedGames, maxGames);
const gamesPath = resolve(outputDir, 'games.jsonl');
const summaryPath = resolve(outputDir, 'summary.json');
const reportPath = resolve(outputDir, 'summary.md');
await mkdir(outputDir, { recursive: true });

let completedById = new Map();
if (resume) {
  try {
    const previous = JSON.parse(await readFile(summaryPath, 'utf8'));
    assert.equal(previous.manifestHash, manifestHash, 'Cannot resume: bot manifest changed');
    assert.equal(previous.baseSeed, baseSeed, 'Cannot resume: base seed changed');
    assert.equal(previous.maxPlies, maxPlies, 'Cannot resume: max plies changed');
    assert.equal(previous.timeControlSeconds, timeControlSeconds, 'Cannot resume: time control changed');
    assert.equal(previous.scheduledGames, scheduledGames, 'Cannot resume: requested game count changed');
    const lines = (await readFile(gamesPath, 'utf8')).split(/\r?\n/).filter(Boolean);
    const validLines = [];
    for (const line of lines) {
      const record = JSON.parse(line);
      if (record.status !== 'completed' || !record.result || !record.pgn || !record.finalFen) continue;
      assert.ok(schedule.some((item) => item.white.id === record.white?.id && item.black.id === record.black?.id), 'Checkpoint contains an unknown pairing');
      assert.equal(record.gameId, record.white.id + '__vs__' + record.black.id, 'Checkpoint game ID does not match pairing');
      assert.ok(!completedById.has(record.gameId), 'Duplicate game in checkpoint: ' + record.gameId);
      completedById.set(record.gameId, record);
      validLines.push(JSON.stringify(record));
    }
    await writeFile(gamesPath, validLines.length ? validLines.join('\n') + '\n' : '');
  } catch (error) {
    if (error?.code === 'ENOENT') throw new Error('Cannot resume: no existing summary.json / games.jsonl checkpoint');
    throw error;
  }
} else {
  try {
    const existing = await readFile(gamesPath, 'utf8');
    if (existing.trim() && !overwrite) throw new Error('Output already contains games. Use --resume or a new --out directory; --overwrite discards the checkpoint.');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  if (overwrite) await writeFile(gamesPath, '');
  completedById = new Map();
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
function stableSeed(whiteId, blackId) {
  const digest = createHash('sha256').update(String(baseSeed) + '|' + whiteId + '|vs|' + blackId).digest();
  return digest.readUInt32BE(0);
}
function gameStatus(game) {
  if (game.isCheckmate()) return { result: game.turn() === 'w' ? '0-1' : '1-0', reason: 'checkmate' };
  if (game.isStalemate()) return { result: '1/2-1/2', reason: 'stalemate' };
  if (game.isDraw() || game.isThreefoldRepetition() || game.isInsufficientMaterial()) return { result: '1/2-1/2', reason: 'draw' };
  return null;
}
async function atomicJson(path, value) {
  const temp = path + '.tmp';
  await writeFile(temp, JSON.stringify(value, null, 2) + '\n');
  await rename(temp, path);
}
const summary = {
  schemaVersion: 1,
  status: 'running',
  startedAt: new Date().toISOString(),
  baseSeed,
  manifestPath,
  manifestHash,
  botCount: manifest.length,
  expectedGames,
  scheduledGames,
  maxPlies,
  timeControlSeconds,
  resumeEnabled: resume,
  completedGames: completedById.size,
  failedGames: 0,
  rejectedCheckpointRecords: 0,
  naturalResults: { white: 0, black: 0, draw: 0 },
  bots: Object.fromEntries(manifest.map((bot) => [bot.id, { name: bot.name, games: 0, completed: 0, failures: 0 }])),
};
for (const record of completedById.values()) {
  if (summary.bots[record.white.id]) { summary.bots[record.white.id].games += 1; summary.bots[record.white.id].completed += 1; }
  if (summary.bots[record.black.id]) { summary.bots[record.black.id].games += 1; summary.bots[record.black.id].completed += 1; }
  if (record.result === '1-0') summary.naturalResults.white += 1;
  else if (record.result === '0-1') summary.naturalResults.black += 1;
  else if (record.result === '1/2-1/2') summary.naturalResults.draw += 1;
}
async function persist(status) {
  summary.status = status;
  summary.updatedAt = new Date().toISOString();
  summary.completedGames = completedById.size;
  await atomicJson(summaryPath, summary);
  const lines = [
    '# Veyra Chess Championship',
    '',
    '- Status: **' + summary.status + '**',
    '- Bots: ' + summary.botCount,
    '- Manifest SHA-256: ' + summary.manifestHash,
    '- Games: ' + summary.completedGames + ' / ' + summary.scheduledGames + ' scheduled (' + summary.expectedGames + ' in a full double round-robin)',
    '- Seed: ' + summary.baseSeed,
    '- Time budget: ' + summary.timeControlSeconds + ' seconds per side',
    '- Maximum plies: ' + summary.maxPlies,
    '- Results: White wins ' + summary.naturalResults.white + ', Black wins ' + summary.naturalResults.black + ', draws ' + summary.naturalResults.draw,
    '',
    '| Bot ID | Bot | Games | Completed | Failures |',
    '|---|---|---:|---:|---:|',
    ...Object.entries(summary.bots).map(([id, bot]) => '| ' + id + ' | ' + bot.name + ' | ' + bot.games + ' | ' + bot.completed + ' | ' + bot.failures + ' |'),
    '',
    'Per-game PGN and metadata are stored in games.jsonl. Resume only with the same manifest, seed, limits, and time control.',
  ];
  await writeFile(reportPath, lines.join('\n') + '\n');
}
await persist('running');

const originalRandom = Math.random;
try {
  for (const item of schedule) {
    if (completedById.size >= scheduledGames) break;
    const { white, black } = item;
    const gameId = white.id + '__vs__' + black.id;
    if (completedById.has(gameId)) continue;
    const gameSeed = stableSeed(white.id, black.id);
    const game = new Chess();
    const clocks = { white: timeControlSeconds, black: timeControlSeconds };
    const moveTimes = [];
    let result = null;
    let reason = null;
    let failure = null;
    try {
      Math.random = seededRandom(gameSeed);
      while (!(result = gameStatus(game))) {
        if (game.history().length >= maxPlies) throw new Error('Safety cap reached before a natural result');
        const side = game.turn() === 'w' ? 'white' : 'black';
        const bot = side === 'white' ? white : black;
        const started = performance.now();
        const candidate = chooseBotMove(game, bot, Chess);
        const elapsed = (performance.now() - started) / 1000;
        clocks[side] -= elapsed;
        moveTimes.push({ side, botId: bot.id, seconds: Number(elapsed.toFixed(3)), remainingSeconds: Number(Math.max(0, clocks[side]).toFixed(3)) });
        if (clocks[side] <= 0) {
          result = { result: side === 'white' ? '0-1' : '1-0', reason: 'time-forfeit' };
          break;
        }
        if (!candidate) throw new Error(bot.id + ' returned no legal move');
        const applied = game.move({ from: candidate.from, to: candidate.to, promotion: candidate.promotion || undefined });
        if (!applied) throw new Error(bot.id + ' returned illegal move ' + candidate.from + candidate.to);
      }
      if (!reason) reason = result.reason;
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
      summary.failedGames += 1;
      summary.bots[white.id].failures += 1;
      summary.bots[black.id].failures += 1;
    } finally {
      Math.random = originalRandom;
    }
    if (failure) {
      const failed = { gameId, seed: gameSeed, status: 'failed', white: { id: white.id, name: white.name }, black: { id: black.id, name: black.name }, error: failure, playedAt: new Date().toISOString() };
      await appendFile(gamesPath, JSON.stringify(failed) + '\n');
      await persist('failed');
      throw new Error('Game failed (' + gameId + '): ' + failure);
    }
    const playedAt = new Date().toISOString();
    game.header('Event', 'Veyra Chess Championship');
    game.header('Site', 'Veyra Chess');
    game.header('Date', playedAt.slice(0, 10).replace(/-/g, '.'));
    game.header('Round', String(schedule.indexOf(item) + 1));
    game.header('White', white.name);
    game.header('Black', black.name);
    game.header('Result', result.result);
    const record = {
      schemaVersion: 1, gameId, seed: gameSeed, playedAt,
      white: { id: white.id, name: white.name, elo: white.elo ?? null },
      black: { id: black.id, name: black.name, elo: black.elo ?? null },
      result: result.result, reason: result.reason, timeControlSeconds,
      remainingClocks: { white: Number(Math.max(0, clocks.white).toFixed(3)), black: Number(Math.max(0, clocks.black).toFixed(3)) },
      moveTimes, plies: game.history().length, finalFen: game.fen(), pgn: game.pgn(), status: 'completed',
    };
    await appendFile(gamesPath, JSON.stringify(record) + '\n');
    completedById.set(gameId, record);
    summary.bots[white.id].games += 1; summary.bots[white.id].completed += 1;
    summary.bots[black.id].games += 1; summary.bots[black.id].completed += 1;
    if (result.result === '1-0') summary.naturalResults.white += 1;
    else if (result.result === '0-1') summary.naturalResults.black += 1;
    else summary.naturalResults.draw += 1;
    await persist('running');
    console.log('[' + completedById.size + '/' + scheduledGames + '] ' + white.id + ' (W) vs ' + black.id + ' (B): ' + result.result + ' (' + result.reason + ')');
  }
  const status = completedById.size === scheduledGames ? 'completed' : 'incomplete';
  await persist(status);
  assert.equal(completedById.size, scheduledGames, 'Not all requested games completed');
  console.log('Tournament checkpoint ' + status + ': ' + completedById.size + '/' + scheduledGames + '. Audit with npm run tournament:audit.');
} catch (error) {
  await persist('failed');
  throw error;
} finally {
  Math.random = originalRandom;
}

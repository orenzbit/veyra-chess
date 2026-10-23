import assert from 'node:assert/strict';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Chess } from '../public/vendor/veyra-rules/chess-compat.js';
import { chooseBotMove } from '../dist/src/bot-engine.js';

const manifestPath = 'public/data/bots/index.json';
const outputDir = resolve(process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) || 'artifacts/legends-tournament');
const maxPlies = Number(process.argv.find((arg) => arg.startsWith('--max-plies='))?.slice(12) || 300);
const maxGamesArg = process.argv.find((arg) => arg.startsWith('--max-games='));
const maxGames = maxGamesArg ? Number(maxGamesArg.slice(12)) : Infinity;
const seedArg = Number(process.argv.find((arg) => arg.startsWith('--seed='))?.slice(7) || 20261022);
const timeControlSeconds = Number(process.argv.find((arg) => arg.startsWith('--time-control-seconds='))?.slice(23) || 600);
const focusId = process.argv.find((arg) => arg.startsWith('--focus='))?.slice(8) || '';
const opponentId = process.argv.find((arg) => arg.startsWith('--opponent='))?.slice(11) || '';
const gamesPerPairArg = process.argv.find((arg) => arg.startsWith('--games-per-pair='));
const gamesPerPair = gamesPerPairArg ? Number(gamesPerPairArg.slice(17)) : 2;
const focusColor = process.argv.find((arg) => arg.startsWith('--focus-color='))?.slice(14) || 'white';
const searchDepthCapArg = process.argv.find((arg) => arg.startsWith('--search-depth-cap='));
const searchDepthCap = searchDepthCapArg ? Number(searchDepthCapArg.slice(19)) : null;

assert.ok(Number.isInteger(maxPlies) && maxPlies >= 2, '--max-plies must be an integer >= 2');
assert.ok((maxGames === Infinity) || (Number.isInteger(maxGames) && maxGames >= 1), '--max-games must be a positive integer');
assert.ok(Number.isFinite(timeControlSeconds) && timeControlSeconds > 0, '--time-control-seconds must be positive');
assert.ok(Number.isInteger(gamesPerPair) && gamesPerPair >= 1 && gamesPerPair <= 2, '--games-per-pair must be 1 or 2');
assert.ok(['white', 'black'].includes(focusColor), '--focus-color must be white or black');
assert.ok(searchDepthCap === null || (Number.isInteger(searchDepthCap) && searchDepthCap >= 1 && searchDepthCap <= 5), '--search-depth-cap must be an integer from 1 to 5');
assert.ok(!opponentId || focusId, '--opponent requires --focus');

await mkdir(outputDir, { recursive: true });
await mkdir(resolve(outputDir, 'pgn'), { recursive: true });
const allManifest = JSON.parse(await readFile(manifestPath, 'utf8'));
assert.ok(Array.isArray(allManifest) && allManifest.length > 1, 'Expected at least two bot definitions');
const tournamentBotIds = String(process.env.LEGENDS_TOURNAMENT_BOT_IDS || '').split(',').map((value) => value.trim()).filter(Boolean);
for (const id of tournamentBotIds) assert.ok(allManifest.some((bot) => bot.id === id), 'Requested tournament bot is missing: ' + id);
const manifest = tournamentBotIds.length ? allManifest.filter((bot) => tournamentBotIds.includes(bot.id)) : allManifest;
if (tournamentBotIds.length) assert.ok(manifest.every((bot) => bot.sourceFile), 'LEGENDS_TOURNAMENT_BOT_IDS must contain only PGN-backed historical bots');
assert.ok(manifest.length > 1, 'Selected tournament requires at least two bots');
const tal = manifest.find((bot) => bot.id === 'tal');
assert.ok(tal, 'Tal must be included in the tournament manifest');
const ids = new Set();
for (const bot of manifest) {
  assert.ok(bot.id && !ids.has(bot.id), `Missing or duplicate bot id: ${bot.id}`);
  ids.add(bot.id);
}

const focusedBot = focusId ? manifest.find((bot) => bot.id === focusId) : null;
const opponentBot = opponentId ? manifest.find((bot) => bot.id === opponentId) : null;
assert.ok(!focusId || focusedBot, `Unknown focus bot id: ${focusId}`);
assert.ok(!opponentId || opponentBot, `Unknown opponent bot id: ${opponentId}`);
assert.ok(!opponentId || opponentId !== focusId, 'Focused bot and opponent must differ');
const expectedGames = focusId && opponentId ? gamesPerPair : focusId ? 2 * (manifest.length - 1) : manifest.length * (manifest.length - 1);
const scheduledGames = Math.min(expectedGames, maxGames);
const gamesPath = resolve(outputDir, 'games.jsonl');
const summaryPath = resolve(outputDir, 'summary.json');
const reportPath = resolve(outputDir, 'summary.md');
await writeFile(gamesPath, '');
const summary = {
  status: 'running',
  startedAt: new Date().toISOString(),
  seed: seedArg,
  botCount: manifest.length,
  focusBotId: focusId || null,
  opponentBotId: opponentId || null,
  gamesPerPair,
  focusColor,
  searchDepthCap,
  quiescenceDepthCap: searchDepthCap === null ? null : 0,
  talIncluded: true,
  expectedGames,
  scheduledGames,
  maxPlies,
  timeControlSeconds,
  completedGames: 0,
  failedGames: 0,
  adjudicatedGames: 0,
  naturalResults: { white: 0, black: 0, draw: 0 },
  bots: Object.fromEntries(manifest.map((bot) => [bot.id, { name: bot.name, games: 0, completed: 0, failures: 0, capped: 0 }])),
  failures: [],
};
await writeFile(summaryPath, JSON.stringify(summary, null, 2));

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gameStatus(game) {
  if (game.isCheckmate()) return { result: game.turn() === 'w' ? '0-1' : '1-0', reason: 'checkmate' };
  if (game.isStalemate()) return { result: '1/2-1/2', reason: 'stalemate' };
  if (game.isDraw() || game.isThreefoldRepetition() || game.isInsufficientMaterial()) {
    return { result: '1/2-1/2', reason: 'draw' };
  }
  return null;
}

function stableSeed(base, whiteId, blackId, gameIndex) {
  let hash = base >>> 0;
  for (const ch of `${whiteId}|vs|${blackId}|${gameIndex}`) {
    hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619) >>> 0;
  }
  return hash >>> 0;
}

async function persistSummary(status) {
  summary.status = status;
  summary.finishedAt = new Date().toISOString();
  await writeFile(summaryPath, JSON.stringify(summary, null, 2));
  const lines = [
    '# Legends bot tournament',
    '',
    `- Status: **${summary.status}**`,
    `- Bots in manifest: ${summary.botCount}`,
    `- Focus bot: ${summary.focusBotId || 'none (full round-robin)'}`,
    `- Focus opponent: ${summary.opponentBotId || 'all bots'}`,
    `- Games per pair: ${summary.gamesPerPair}`,
    `- Search depth cap: ${summary.searchDepthCap ?? 'profile default'}`,
    `- Quiescence depth cap: ${summary.quiescenceDepthCap ?? 'profile default'}`,
    `- Games scheduled: ${summary.scheduledGames} / ${summary.expectedGames}`,
    `- Completed: ${summary.completedGames}`,
    `- Failed: ${summary.failedGames}`,
    `- Time control: ${summary.timeControlSeconds} seconds per side, no increment`,
    `- Games capped at ${summary.maxPlies} plies: ${summary.adjudicatedGames}`,
    `- Natural results: white wins ${summary.naturalResults.white}, black wins ${summary.naturalResults.black}, draws ${summary.naturalResults.draw}`,
    `- Tal included: ${summary.talIncluded}`,
    '',
    '## Per-bot completion',
    '',
    '| Bot ID | Bot | Games | Completed | Failures | Capped |',
    '|---|---|---:|---:|---:|---:|',
    ...Object.entries(summary.bots).map(([id, bot]) => `| ${id} | ${bot.name} | ${bot.games} | ${bot.completed} | ${bot.failures} | ${bot.capped} |`),
    '',
    '## Failures',
    '',
    ...(summary.failures.length ? summary.failures.map((failure) => `- ${failure}`) : ['None recorded.']),
    '',
    'Full per-game PGNs and metadata: `games.jsonl`.',
  ];
  await writeFile(reportPath, lines.join('\n') + '\n');
}

let gameIndex = 0;
const originalRandom = Math.random;
try {
  for (let i = 0; i < manifest.length; i += 1) {
    for (let j = i + 1; j < manifest.length; j += 1) {
      if (focusId && manifest[i].id !== focusId && manifest[j].id !== focusId) continue;
      if (opponentId && !(
        (manifest[i].id === focusId && manifest[j].id === opponentId) ||
        (manifest[j].id === focusId && manifest[i].id === opponentId)
      )) continue;
      const pair = opponentId
        ? (gamesPerPair === 1
          ? [focusColor === 'white'
            ? { white: focusedBot, black: opponentBot }
            : { white: opponentBot, black: focusedBot }]
          : [
            { white: focusedBot, black: opponentBot },
            { white: opponentBot, black: focusedBot },
          ].slice(0, gamesPerPair))
        : [
          { white: manifest[i], black: manifest[j] },
          { white: manifest[j], black: manifest[i] },
        ];
      for (const colors of pair) {
        if (gameIndex >= maxGames) break;
        gameIndex += 1;
        const { white, black } = colors;
        const randomSeed = stableSeed(seedArg, white.id, black.id, gameIndex);
        Math.random = seededRandom(randomSeed);
        const game = new Chess();
        let result = null;
        let reason = null;
        const clocks = { [white.id]: timeControlSeconds, [black.id]: timeControlSeconds };
        const moveTimes = [];
        let error = null;
        const playedAt = new Date().toISOString();
        const pgnFile = 'pgn/game-' + String(gameIndex).padStart(4, '0') + '-' + white.id + '-vs-' + black.id + '.pgn';
        game.header('Event', 'Veyra Legends Tournament');
        game.header('Site', 'Veyra Chess CI');
        game.header('Date', playedAt.slice(0, 10).replace(/-/g, '.'));
        game.header('Round', String(gameIndex));
        game.header('White', white.name);
        game.header('Black', black.name);
        game.header('WhiteId', white.id);
        game.header('BlackId', black.id);
        game.header('TimeControl', String(timeControlSeconds));
        game.header('Seed', String(randomSeed));
        game.header('Result', '*');
        await writeFile(resolve(outputDir, pgnFile), game.pgn() + '\n');
        console.log(`[${gameIndex}/${scheduledGames}] Starting ${white.id} (W) vs ${black.id} (B); depth cap=${searchDepthCap ?? 'profile default'}; quiescence cap=${searchDepthCap === null ? 'profile default' : 0}`);
        try {
          while (!(result = gameStatus(game))) {
            if (game.history().length >= maxPlies) {
              reason = 'ply-cap';
              throw new Error(`Game reached ${maxPlies}-ply safety cap without a natural result`);
            }
            const mover = game.turn() === 'w' ? white : black;
            const startedMoveAt = performance.now();
            const searchBot = searchDepthCap === null ? mover : { ...mover, searchDepthCap, quiescenceDepthCap: 0 };
            const candidate = chooseBotMove(game, searchBot, Chess);
            const elapsedSeconds = (performance.now() - startedMoveAt) / 1000;
            clocks[mover.id] -= elapsedSeconds;
            moveTimes.push({ botId: mover.id, seconds: Number(elapsedSeconds.toFixed(3)), remainingSeconds: Number(Math.max(0, clocks[mover.id]).toFixed(3)) });
            if (clocks[mover.id] <= 0) {
              result = { result: game.turn() === 'w' ? '0-1' : '1-0', reason: 'time-forfeit' };
              reason = 'time-forfeit';
              break;
            }
            if (!candidate) throw new Error(`${mover.id} returned no move`);
            const applied = game.move({
              from: candidate.from,
              to: candidate.to,
              promotion: candidate.promotion || undefined,
            });
            if (!applied) throw new Error(`${mover.id} returned illegal move ${candidate.from}${candidate.to}`);
            if (game.history().length % 10 === 0) {
              const partialPgn = game.pgn();
              await writeFile(resolve(outputDir, pgnFile), partialPgn + (partialPgn.endsWith('\n') ? '' : '\n'));
              console.log(`[${gameIndex}] ${white.id} vs ${black.id}: ${game.history().length} plies completed; partial PGN checkpoint saved`);
            }
          }
          if (!reason) reason = result.reason;
        } catch (caught) {
          error = caught instanceof Error ? caught.message : String(caught);
          summary.failedGames += 1;
          summary.bots[white.id].failures += 1;
          summary.bots[black.id].failures += 1;
          summary.failures.push(`Game ${gameIndex} (${white.id} as White vs ${black.id} as Black): ${error}`);
        } finally {
          Math.random = originalRandom;
        }

        summary.bots[white.id].games += 1;
        summary.bots[black.id].games += 1;
        if (!error && result) {
          summary.completedGames += 1;
          summary.bots[white.id].completed += 1;
          summary.bots[black.id].completed += 1;
          if (result.result === '1-0') summary.naturalResults.white += 1;
          else if (result.result === '0-1') summary.naturalResults.black += 1;
          else summary.naturalResults.draw += 1;
        }
        if (reason === 'ply-cap') {
          summary.adjudicatedGames += 1;
          summary.bots[white.id].capped += 1;
          summary.bots[black.id].capped += 1;
        }

        const resultToken = result?.result || '*';
        try { game.header('Result', resultToken); } catch {}
        const pgn = game.pgn();
        await writeFile(resolve(outputDir, pgnFile), pgn + (pgn.endsWith('\n') ? '' : '\n'));
        const record = {
          gameIndex,
          playedAt,
          white: { id: white.id, name: white.name, elo: white.elo },
          black: { id: black.id, name: black.name, elo: black.elo },
          result: result?.result || null,
          reason,
          timeControlSeconds,
          remainingClocks: { white: Number(Math.max(0, clocks[white.id]).toFixed(3)), black: Number(Math.max(0, clocks[black.id]).toFixed(3)) },
          moveTimes,
          plies: game.history().length,
          finalFen: game.fen(),
          pgn,
          pgnFile,
          status: error ? 'failed' : 'completed',
          error,
          seed: randomSeed,
        };
        await appendFile(gamesPath, JSON.stringify(record) + '\n');
        await persistSummary('running');
        console.log(`[${gameIndex}/${scheduledGames}] ${white.id} (W) vs ${black.id} (B): ${record.result || 'FAILED'} ${reason || ''}`);
        if (error) {
          await persistSummary('failed');
          throw new Error(record.error);
        }
      }
    }
    if (gameIndex >= maxGames) break;
  }

  const allGamesScheduled = gameIndex === expectedGames;
  const allCompleted = summary.completedGames === gameIndex && summary.failedGames === 0 && summary.adjudicatedGames === 0;
  summary.status = allGamesScheduled && allCompleted ? 'passed' : 'failed';
  await persistSummary(summary.status);
  assert.equal(summary.failedGames, 0, 'Tournament contains failed games; see summary.md');
  assert.equal(summary.adjudicatedGames, 0, 'Tournament contains games stopped by the ply cap; see summary.md');
  if (maxGames === Infinity) assert.equal(summary.completedGames, expectedGames, 'Not all pairings completed');
  else assert.equal(summary.completedGames, maxGames, 'Smoke run did not complete all requested games');
  console.log(`Tournament ${summary.status}: ${summary.completedGames}/${gameIndex} games completed. Report: ${reportPath}`);
} catch (error) {
  await persistSummary('failed');
  throw error;
} finally {
  Math.random = originalRandom;
}

import assert from 'node:assert/strict';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Chess } from '../public/vendor/veyra-rules/chess-compat.js';
import { chooseBotMove } from '../dist/src/bot-engine.js';

const manifestPath = 'public/data/bots/index.json';
const outputDir = resolve(process.argv.find((arg) => arg.startsWith('--out='))?.slice(6) || 'artifacts/legends-tournament');
const maxPlies = Number(process.argv.find((arg) => arg.startsWith('--max-plies='))?.slice(12) || 300);
const maxGamesArg = process.argv.find((arg) => arg.startsWith('--max-games='));
const maxGames = maxGamesArg ? Number(maxGamesArg.slice(12)) : Infinity;
const seedArg = Number(process.argv.find((arg) => arg.startsWith('--seed='))?.slice(7) || 20261022);

assert.ok(Number.isInteger(maxPlies) && maxPlies >= 2, '--max-plies must be an integer >= 2');
assert.ok((maxGames === Infinity) || (Number.isInteger(maxGames) && maxGames >= 1), '--max-games must be a positive integer');

await mkdir(outputDir, { recursive: true });
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
assert.ok(Array.isArray(manifest) && manifest.length > 1, 'Expected at least two bot definitions');
const tal = manifest.find((bot) => bot.id === 'tal');
assert.ok(tal, 'Tal must be included in the tournament manifest');
const ids = new Set();
for (const bot of manifest) {
  assert.ok(bot.id && !ids.has(bot.id), `Missing or duplicate bot id: ${bot.id}`);
  ids.add(bot.id);
}

const expectedGames = manifest.length * (manifest.length - 1);
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
  talIncluded: true,
  expectedGames,
  scheduledGames,
  maxPlies,
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
    `- Bots: ${summary.botCount}`,
    `- Games scheduled: ${summary.scheduledGames} / ${summary.expectedGames}`,
    `- Completed: ${summary.completedGames}`,
    `- Failed: ${summary.failedGames}`,
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
      const pair = [
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
        let error = null;
        try {
          while (!(result = gameStatus(game))) {
            if (game.history().length >= maxPlies) {
              reason = 'ply-cap';
              throw new Error(`Game reached ${maxPlies}-ply safety cap without a natural result`);
            }
            const mover = game.turn() === 'w' ? white : black;
            const candidate = chooseBotMove(game, mover, Chess);
            if (!candidate) throw new Error(`${mover.id} returned no move`);
            const applied = game.move({
              from: candidate.from,
              to: candidate.to,
              promotion: candidate.promotion || undefined,
            });
            if (!applied) throw new Error(`${mover.id} returned illegal move ${candidate.from}${candidate.to}`);
          }
          reason = result.reason;
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

        const record = {
          gameIndex,
          white: { id: white.id, name: white.name, elo: white.elo },
          black: { id: black.id, name: black.name, elo: black.elo },
          result: result?.result || null,
          reason,
          plies: game.history().length,
          pgn: game.pgn(),
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

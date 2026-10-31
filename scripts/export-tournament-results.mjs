#!/usr/bin/env node
// Builds the static bot-vs-bot results file the Legends page reads (public/data/tournament/results.json):
//   { generatedAt, games, bots:[{id,wins,draws,losses,points}], pairs:[{a,b,aWins,draws,bWins}] }
// Input is a tournament output folder (or a file) written by scripts/run-legends-tournament.mjs /
// scripts/aggregate-tournament-shards.mjs:
//   games.jsonl  one record per game: { white:{id}, black:{id}, result:'1-0'|'0-1'|'1/2-1/2', status:'completed', ... }
//   summary.json { finishedAt, completedGames, bots:{ [id]:{ wins, draws, losses, points } } }  (no per-pair data)
// Usage: node scripts/export-tournament-results.mjs <folder|games.jsonl|summary.json> [--out <file>]
// From games.jsonl you get standings and head-to-head pairs; from summary.json only standings (pairs: []).
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const DEFAULT_OUT = 'public/data/tournament/results.json';
const RESULTS = new Set(['1-0', '0-1', '1/2-1/2']);
const byId = (x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0);

function finish({ generatedAt, games, bots, pairs, demo }) {
  const list = [...bots.values()].map((bot) => ({ ...bot, points: bot.wins + bot.draws / 2 }))
    .sort((x, y) => y.points - x.points || y.wins - x.wins || x.losses - y.losses || byId(x, y));
  const pairList = [...pairs.values()].sort((x, y) => (x.a < y.a ? -1 : x.a > y.a ? 1 : x.b < y.b ? -1 : x.b > y.b ? 1 : 0));
  const output = { generatedAt: generatedAt || new Date().toISOString(), games, bots: list, pairs: pairList };
  if (demo) output.demo = true;
  return output;
}

/** records: parsed games.jsonl lines. Unfinished/invalid games are skipped and counted in `skipped`. */
export function buildResultsFromGames(records, { generatedAt, demo = false } = {}) {
  const bots = new Map();
  const pairs = new Map();
  const bot = (id) => { if (!bots.has(id)) bots.set(id, { id, wins: 0, draws: 0, losses: 0, points: 0 }); return bots.get(id); };
  let games = 0;
  let skipped = 0;
  for (const record of records) {
    const white = record?.white?.id, black = record?.black?.id;
    if (record?.status !== 'completed' || !RESULTS.has(record.result) || typeof white !== 'string' || typeof black !== 'string' || !white || !black || white === black) { skipped += 1; continue; }
    games += 1;
    const [a, b] = white < black ? [white, black] : [black, white];
    const key = a + '|' + b;
    if (!pairs.has(key)) pairs.set(key, { a, b, aWins: 0, draws: 0, bWins: 0 });
    const pair = pairs.get(key);
    const w = bot(white), k = bot(black);
    if (record.result === '1/2-1/2') { w.draws += 1; k.draws += 1; pair.draws += 1; }
    else {
      const winner = record.result === '1-0' ? white : black;
      (winner === white ? w : k).wins += 1; (winner === white ? k : w).losses += 1;
      if (winner === a) pair.aWins += 1; else pair.bWins += 1;
    }
  }
  const output = finish({ generatedAt, games, bots, pairs, demo });
  Object.defineProperty(output, 'skipped', { value: skipped, enumerable: false });
  return output;
}

/** summary: parsed summary.json; `bots` is an object keyed by id. There is no per-pair data in a summary. */
export function buildResultsFromSummary(summary, { generatedAt, demo = false } = {}) {
  if (!summary || typeof summary.bots !== 'object' || Array.isArray(summary.bots)) throw new Error('summary.json has no bots object');
  const bots = new Map();
  for (const [id, stats] of Object.entries(summary.bots)) {
    if (!stats || !(stats.games > 0)) continue;
    if (!['wins', 'draws', 'losses'].every((field) => Number.isInteger(stats[field]) && stats[field] >= 0)) {
      throw new Error('This summary.json has no wins/draws/losses (run-legends-tournament.mjs writes only game counts; only aggregate-tournament-shards.mjs adds results). Export from games.jsonl instead.');
    }
    bots.set(id, { id, wins: stats.wins, draws: stats.draws, losses: stats.losses, points: 0 });
  }
  return finish({ generatedAt: generatedAt || summary.finishedAt, games: Number(summary.completedGames) || 0, bots, pairs: new Map(), demo });
}

export function parseJsonl(text) {
  return text.split(/\r?\n/).filter((line) => line.trim()).map((line, index) => {
    try { return JSON.parse(line); } catch { throw new Error('games.jsonl line ' + (index + 1) + ' is not valid JSON'); }
  });
}

/** Totals must balance: every win is someone's loss, draws are shared, pairs add up to the same games. */
export function assertConsistent(results) {
  const sum = (field) => results.bots.reduce((total, bot) => total + bot[field], 0);
  if (sum('wins') !== sum('losses')) throw new Error('Inconsistent results: wins and losses differ');
  if (sum('draws') % 2 !== 0) throw new Error('Inconsistent results: odd number of draw entries');
  if (sum('wins') + sum('draws') / 2 !== results.games) throw new Error('Inconsistent results: game count does not match bot totals');
  if (results.pairs.length) {
    const pairGames = results.pairs.reduce((total, pair) => total + pair.aWins + pair.draws + pair.bWins, 0);
    if (pairGames !== results.games) throw new Error('Inconsistent results: pair totals do not match the game count');
  }
}

async function readSource(input) {
  const info = await stat(input);
  if (info.isDirectory()) {
    const gamesFile = join(input, 'games.jsonl');
    const summaryFile = join(input, 'summary.json');
    const summary = await readFile(summaryFile, 'utf8').then(JSON.parse, () => null);
    const games = await readFile(gamesFile, 'utf8').then(parseJsonl, () => null);
    return { games, summary };
  }
  if (input.endsWith('.jsonl')) return { games: parseJsonl(await readFile(input, 'utf8')), summary: null };
  return { games: null, summary: JSON.parse(await readFile(input, 'utf8')) };
}

export async function exportTournamentResults(input, outFile = DEFAULT_OUT) {
  const { games, summary } = await readSource(resolve(input));
  let results;
  if (games) {
    results = buildResultsFromGames(games, { generatedAt: summary?.finishedAt });
    if (results.skipped) console.warn('Skipped ' + results.skipped + ' game(s) that were not completed with a valid result.');
    if (summary?.bots && summary.completedGames === results.games) {
      for (const bot of results.bots) {
        const expected = summary.bots[bot.id];
        const hasResults = expected && ['wins', 'draws', 'losses'].every((field) => Number.isInteger(expected[field]));
        if (hasResults && (expected.wins !== bot.wins || expected.draws !== bot.draws || expected.losses !== bot.losses)) throw new Error('games.jsonl disagrees with summary.json for bot ' + bot.id);
      }
    }
  } else if (summary) results = buildResultsFromSummary(summary);
  else throw new Error('No games.jsonl or summary.json found in ' + input);
  if (!results.games || !results.bots.length) throw new Error('No completed games to export; refusing to write an empty results file.');
  assertConsistent(results);
  await mkdir(dirname(resolve(outFile)), { recursive: true });
  await writeFile(resolve(outFile), JSON.stringify(results, null, 2) + '\n');
  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf('--out');
  const out = outIndex >= 0 ? args[outIndex + 1] : DEFAULT_OUT;
  const input = args.find((arg, index) => !arg.startsWith('--') && (outIndex < 0 || index !== outIndex + 1));
  if (!input || (outIndex >= 0 && !out)) { console.error('Usage: node scripts/export-tournament-results.mjs <folder|games.jsonl|summary.json> [--out <file>]'); process.exit(2); }
  try {
    const results = await exportTournamentResults(input, out);
    console.log('Wrote ' + out + ': ' + results.games + ' games, ' + results.bots.length + ' bots, ' + results.pairs.length + ' pairs.');
  } catch (error) { console.error(String(error?.message || error)); process.exit(1); }
}

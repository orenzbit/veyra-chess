import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const arg = (name, fallback = '') => process.argv.find((value) => value.startsWith('--' + name + '='))?.slice(name.length + 3) ?? fallback;
const outputDir = resolve(arg('out', 'artifacts/championship-tournament'));
const endpoint = String(process.env.CHAMPIONSHIP_ARCHIVE_URL || '').trim();
const token = String(process.env.CHAMPIONSHIP_ARCHIVE_TOKEN || '').trim();
assert.ok(endpoint.startsWith('https://'), 'Set CHAMPIONSHIP_ARCHIVE_URL to the HTTPS Netlify championship-archive function URL');
assert.ok(token.length >= 24, 'Set CHAMPIONSHIP_ARCHIVE_TOKEN to a long random secret');

const summary = JSON.parse(await readFile(resolve(outputDir, 'summary.json'), 'utf8'));
const lines = (await readFile(resolve(outputDir, 'games.jsonl'), 'utf8')).split(/\r?\n/).filter(Boolean);
const games = lines.map((line) => JSON.parse(line)).filter((record) => record.status === 'completed');
assert.ok(summary.runId && summary.manifestHash, 'Summary must include runId and manifestHash');
assert.equal(games.length, summary.completedGames, 'Only fully completed game records can be archived');

async function post(payload) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text }; }
  if (!response.ok || data.ok !== true) throw new Error('Archive API failed (' + response.status + '): ' + JSON.stringify(data));
  return data;
}
const run = {
  manifestHash: summary.manifestHash,
  botCount: summary.botCount,
  expectedGames: summary.expectedGames,
  scheduledGames: summary.scheduledGames,
  completedGames: summary.completedGames,
  status: summary.status,
  config: {
    baseSeed: summary.baseSeed,
    maxPlies: summary.maxPlies,
    timeControlSeconds: summary.timeControlSeconds,
    manifestPath: summary.manifestPath,
    manifestHash: summary.manifestHash,
    scheduledGames: summary.scheduledGames,
    fullRoundRobin: summary.scheduledGames === summary.expectedGames,
  },
  summary,
};
await post({ action: 'save-run', runId: summary.runId, run });
let storedGames = 0;
let batch = [];
let bytes = 0;
const MAX_BATCH_BYTES = 3 * 1024 * 1024;
async function flush() {
  if (!batch.length) return;
  const result = await post({ action: 'save-games', runId: summary.runId, games: batch });
  storedGames += result.stored;
  console.log('Archived ' + storedGames + '/' + games.length + ' games');
  batch = [];
  bytes = 0;
}
for (const game of games) {
  const size = Buffer.byteLength(JSON.stringify(game), 'utf8');
  if (size > MAX_BATCH_BYTES) throw new Error('Single game record exceeds archive batch limit: ' + game.gameId);
  if (batch.length >= 50 || (batch.length && bytes + size > MAX_BATCH_BYTES)) await flush();
  batch.push(game);
  bytes += size;
}
await flush();
await post({ action: 'save-run', runId: summary.runId, run: { ...run, completedGames: storedGames } });

let dnaStored = 0;
try {
  const report = JSON.parse(await readFile(resolve(outputDir, 'dna-report.json'), 'utf8'));
  assert.equal(report.manifestHash, summary.manifestHash, 'DNA report manifest hash differs from the run');
  const result = await post({ action: 'save-dna', runId: summary.runId, report });
  dnaStored = result.stored;
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
  console.warn('No dna-report.json found; run archive was saved without the DNA report.');
}
console.log('Archive complete: run=' + summary.runId + ', games=' + storedGames + ', DNA bot reports=' + dnaStored);

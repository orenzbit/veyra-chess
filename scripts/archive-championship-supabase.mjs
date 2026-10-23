import assert from 'node:assert/strict';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const arg = (name, fallback = '') => process.argv.find((value) => value.startsWith('--' + name + '='))?.slice(name.length + 3) ?? fallback;
const outputDir = resolve(arg('out', 'artifacts/championship-tournament'));
const endpoint = String(process.env.CHAMPIONSHIP_ARCHIVE_URL || '').trim();
const token = String(process.env.CHAMPIONSHIP_ARCHIVE_TOKEN || '').trim();
assert.ok(endpoint.startsWith('https://'), 'Set CHAMPIONSHIP_ARCHIVE_URL to the HTTPS Netlify championship-archive function URL');
assert.ok(token.length >= 24, 'Set CHAMPIONSHIP_ARCHIVE_TOKEN to a long random secret');

const summary = JSON.parse(await readFile(resolve(outputDir, 'summary.json'), 'utf8'));
assert.ok(summary.runId && summary.manifestHash, 'Summary must include runId and manifestHash');
const gamesPath = resolve(outputDir, 'games.jsonl');
const analysisPath = resolve(outputDir, 'move-analysis.jsonl');
const analysisSummaryPath = resolve(outputDir, 'analysis-summary.json');
const MAX_BATCH_BYTES = 3 * 1024 * 1024;

async function* readJsonl(path) {
  const input = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  for await (const line of input) if (line.trim()) yield JSON.parse(line);
}
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
let gameBatch = [];
let gameBatchBytes = 0;
async function flushGames() {
  if (!gameBatch.length) return;
  const result = await post({ action: 'save-games', runId: summary.runId, games: gameBatch });
  storedGames += result.stored;
  console.log('Archived ' + storedGames + '/' + summary.completedGames + ' games');
  gameBatch = [];
  gameBatchBytes = 0;
}
for await (const game of readJsonl(gamesPath)) {
  if (game.status !== 'completed') continue;
  const size = Buffer.byteLength(JSON.stringify(game), 'utf8');
  if (size > MAX_BATCH_BYTES) throw new Error('Single game record exceeds archive batch limit: ' + game.gameId);
  if (gameBatch.length >= 50 || (gameBatch.length && gameBatchBytes + size > MAX_BATCH_BYTES)) await flushGames();
  gameBatch.push(game);
  gameBatchBytes += size;
}
await flushGames();
assert.equal(storedGames, summary.completedGames, 'Archived game count does not match the run summary');
await post({ action: 'save-run', runId: summary.runId, run: { ...run, completedGames: storedGames } });

let storedAnalyses = 0;
let analysisFingerprint = null;
let analysisSummary = null;
try {
  analysisSummary = JSON.parse(await readFile(analysisSummaryPath, 'utf8'));
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}
if (!analysisSummary) {
  try {
    await access(analysisPath);
    throw new Error('move-analysis.jsonl exists but analysis-summary.json is missing');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}
if (analysisSummary) {
  const inputAnalysisPath = analysisPath;
  try { await access(inputAnalysisPath); } catch (error) {
    if (error?.code === 'ENOENT') throw new Error('analysis-summary.json exists but move-analysis.jsonl is missing');
    throw error;
  }
  assert.ok(analysisSummary.engineFingerprint && /^[a-f0-9]{64}$/.test(analysisSummary.engineFingerprint), 'Analysis summary is missing engine fingerprint');
  analysisFingerprint = analysisSummary.engineFingerprint;
  let analysisBatch = [];
  let analysisBatchBytes = 0;
  async function flushAnalyses() {
    if (!analysisBatch.length) return;
    const result = await post({ action: 'save-analyses', runId: summary.runId, analyses: analysisBatch });
    storedAnalyses += result.stored;
    console.log('Archived ' + storedAnalyses + '/' + analysisSummary.completedPositions + ' move analyses');
    analysisBatch = [];
    analysisBatchBytes = 0;
  }
  for await (const analysis of readJsonl(inputAnalysisPath)) {
    assert.equal(analysis.engineFingerprint, analysisFingerprint, 'Move-analysis file mixes engine fingerprints');
    const size = Buffer.byteLength(JSON.stringify(analysis), 'utf8');
    if (size > MAX_BATCH_BYTES) throw new Error('Single move analysis exceeds archive batch limit: ' + analysis.analysisId);
    if (analysisBatch.length >= 500 || (analysisBatch.length && analysisBatchBytes + size > MAX_BATCH_BYTES)) await flushAnalyses();
    analysisBatch.push(analysis);
    analysisBatchBytes += size;
  }
  await flushAnalyses();
  assert.equal(storedAnalyses, analysisSummary.completedPositions, 'Archived move-analysis count does not match analysis summary');
}

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
if (analysisSummary) {
  await post({
    action: 'save-run',
    runId: summary.runId,
    run: {
      ...run,
      completedGames: storedGames,
      analysisPositions: storedAnalyses,
      analysisFingerprint,
      analysisSummary,
    },
  });
}
console.log('Archive complete: run=' + summary.runId + ', games=' + storedGames + ', move analyses=' + storedAnalyses + ', DNA bot reports=' + dnaStored);

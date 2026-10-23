import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';

const arg = (name, fallback = '') => process.argv.find((value) => value.startsWith('--' + name + '='))?.slice(name.length + 3) ?? fallback;
const outputDir = resolve(arg('out', 'artifacts/championship-tournament'));
const repository = String(process.env.GITHUB_REPOSITORY || arg('repository', '')).trim();
const token = String(process.env.CHAMPIONSHIP_GITHUB_TOKEN || process.env.GITHUB_TOKEN || '').trim();
const apiBase = String(process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, '');
const branch = String(process.env.CHAMPIONSHIP_GITHUB_ARCHIVE_BRANCH || 'championship-archive').trim();
assert.ok(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository), 'Set GITHUB_REPOSITORY or pass --repository=owner/repo');
assert.ok(token.length >= 20, 'Set CHAMPIONSHIP_GITHUB_TOKEN with repository contents write access');
assert.ok(/^[A-Za-z0-9._/-]{1,100}$/.test(branch), 'Invalid archive branch name');

const summary = JSON.parse(await readFile(resolve(outputDir, 'summary.json'), 'utf8'));
const dnaReport = JSON.parse(await readFile(resolve(outputDir, 'dna-report.json'), 'utf8'));
const gamesPath = resolve(outputDir, 'games.jsonl');
const analysisPath = resolve(outputDir, 'move-analysis.jsonl');
const analysisSummaryPath = resolve(outputDir, 'analysis-summary.json');
assert.ok(summary.runId && /^[a-zA-Z0-9._:-]{1,128}$/.test(summary.runId), 'Summary must include a safe runId');
assert.ok(/^[a-f0-9]{64}$/.test(summary.manifestHash), 'Summary must include a valid manifest hash');
assert.equal(dnaReport.manifestHash, summary.manifestHash, 'DNA report manifest hash differs from run');

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}
async function* readJsonl(path) {
  const input = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  for await (const line of input) if (line.trim()) yield JSON.parse(line);
}
async function api(path, options = {}) {
  const response = await fetch(apiBase + path, {
    ...options,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: 'Bearer ' + token,
      'x-github-api-version': '2022-11-28',
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { message: text }; }
  if (!response.ok) {
    const error = new Error('GitHub archive API returned ' + response.status + ' for ' + path + ': ' + (body.message || 'request failed'));
    error.status = response.status;
    throw error;
  }
  return body;
}
async function getBranchHead(refName) {
  const ref = await api('/repos/' + repository + '/git/ref/heads/' + encodeURIComponent(refName));
  const commit = await api('/repos/' + repository + '/git/commits/' + ref.object.sha);
  return { commitSha: ref.object.sha, treeSha: commit.tree.sha };
}
let head;
try {
  head = await getBranchHead(branch);
} catch (error) {
  if (error.status !== 404) throw error;
  const baseBranch = arg('base', 'main');
  const baseRef = await api('/repos/' + repository + '/git/ref/heads/' + encodeURIComponent(baseBranch));
  await api('/repos/' + repository + '/git/refs', {
    method: 'POST',
    body: JSON.stringify({ ref: 'refs/heads/' + branch, sha: baseRef.object.sha }),
  });
  const baseCommit = await api('/repos/' + repository + '/git/commits/' + baseRef.object.sha);
  head = { commitSha: baseRef.object.sha, treeSha: baseCommit.tree.sha };
}

const root = 'runs/' + summary.runId + '/';
const treeEntries = [];
const indexFiles = [];
async function addBlob(path, content, metadata = {}) {
  const blob = await api('/repos/' + repository + '/git/blobs', {
    method: 'POST',
    body: JSON.stringify({ content, encoding: 'utf-8' }),
  });
  treeEntries.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
  indexFiles.push({ path, sha256: sha256(content), ...metadata });
}
const summaryText = JSON.stringify(summary, null, 2) + '\n';
const dnaText = JSON.stringify(dnaReport, null, 2) + '\n';
await addBlob(root + 'summary.json', summaryText, { kind: 'summary' });
await addBlob(root + 'dna-report.json', dnaText, { kind: 'dna-report' });

let analysisSummary = null;
try {
  analysisSummary = JSON.parse(await readFile(analysisSummaryPath, 'utf8'));
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}
let analysisFileExists = false;
try { await access(analysisPath); analysisFileExists = true; } catch (error) { if (error?.code !== 'ENOENT') throw error; }
assert.equal(Boolean(analysisSummary), analysisFileExists, 'Move-analysis JSONL and analysis summary must either both exist or both be absent');
if (analysisSummary) {
  assert.ok(typeof analysisSummary.engineFingerprint === 'string' && /^[a-f0-9]{64}$/.test(analysisSummary.engineFingerprint), 'Analysis summary has an invalid engine fingerprint');
  const analysisSummaryText = JSON.stringify(analysisSummary, null, 2) + '\n';
  await addBlob(root + 'analysis-summary.json', analysisSummaryText, { kind: 'analysis-summary' });
}

const MAX_CHUNK_BYTES = 2 * 1024 * 1024;
let gameCount = 0;
let gameChunkCount = 0;
let gameLines = [];
let gameBytes = 0;
async function flushGameChunk() {
  if (!gameLines.length) return;
  gameChunkCount += 1;
  const content = gameLines.join('\n') + '\n';
  await addBlob(root + 'games/games-' + String(gameChunkCount).padStart(4, '0') + '.jsonl', content, { kind: 'games', games: gameLines.length });
  gameLines = [];
  gameBytes = 0;
}
for await (const game of readJsonl(gamesPath)) {
  if (game.status !== 'completed') continue;
  const line = JSON.stringify(game);
  const bytes = Buffer.byteLength(line, 'utf8') + 1;
  if (bytes > MAX_CHUNK_BYTES) throw new Error('Single game exceeds GitHub archive chunk limit: ' + game.gameId);
  if (gameLines.length >= 50 || (gameLines.length && gameBytes + bytes > MAX_CHUNK_BYTES)) await flushGameChunk();
  gameLines.push(line);
  gameBytes += bytes;
  gameCount += 1;
}
await flushGameChunk();
assert.equal(gameCount, summary.completedGames, 'Completed game count does not match summary');

let analysisCount = 0;
let analysisChunkCount = 0;
let analysisLines = [];
let analysisBytes = 0;
if (analysisSummary) {
  async function flushAnalysisChunk() {
    if (!analysisLines.length) return;
    analysisChunkCount += 1;
    const content = analysisLines.join('\n') + '\n';
    await addBlob(root + 'analysis/analysis-' + String(analysisChunkCount).padStart(4, '0') + '.jsonl', content, { kind: 'analysis', analyses: analysisLines.length });
    analysisLines = [];
    analysisBytes = 0;
  }
  for await (const analysis of readJsonl(analysisPath)) {
    assert.equal(analysis.engineFingerprint, analysisSummary.engineFingerprint, 'Move-analysis file mixes engine fingerprints');
    const line = JSON.stringify(analysis);
    const bytes = Buffer.byteLength(line, 'utf8') + 1;
    if (bytes > MAX_CHUNK_BYTES) throw new Error('Single analysis exceeds GitHub archive chunk limit: ' + analysis.analysisId);
    if (analysisLines.length >= 2000 || (analysisLines.length && analysisBytes + bytes > MAX_CHUNK_BYTES)) await flushAnalysisChunk();
    analysisLines.push(line);
    analysisBytes += bytes;
    analysisCount += 1;
  }
  await flushAnalysisChunk();
  assert.equal(analysisCount, analysisSummary.completedPositions, 'Move-analysis count does not match analysis summary');
}

const index = {
  schemaVersion: 1,
  runId: summary.runId,
  manifestHash: summary.manifestHash,
  botCount: summary.botCount,
  expectedGames: summary.expectedGames,
  scheduledGames: summary.scheduledGames,
  completedGames: gameCount,
  analysisPositions: analysisCount,
  analysisFingerprint: analysisSummary?.engineFingerprint || null,
  archivedAt: new Date().toISOString(),
  files: indexFiles,
};
const indexText = JSON.stringify(index, null, 2) + '\n';
const indexBlob = await api('/repos/' + repository + '/git/blobs', {
  method: 'POST',
  body: JSON.stringify({ content: indexText, encoding: 'utf-8' }),
});
treeEntries.push({ path: root + 'index.json', mode: '100644', type: 'blob', sha: indexBlob.sha });

const createdTree = await api('/repos/' + repository + '/git/trees', {
  method: 'POST',
  body: JSON.stringify({ base_tree: head.treeSha, tree: treeEntries }),
});
const commit = await api('/repos/' + repository + '/git/commits', {
  method: 'POST',
  body: JSON.stringify({
    message: 'Archive Veyra Chess championship run ' + summary.runId,
    tree: createdTree.sha,
    parents: [head.commitSha],
  }),
});
await api('/repos/' + repository + '/git/refs/heads/' + encodeURIComponent(branch), {
  method: 'PATCH',
  body: JSON.stringify({ sha: commit.sha, force: false }),
});
console.log('Archived run ' + summary.runId + ' to ' + repository + ' branch ' + branch + ': ' + gameCount + ' games in ' + gameChunkCount + ' PGN chunks and ' + analysisCount + ' move analyses in ' + analysisChunkCount + ' chunks.');
console.log('Archive index: ' + root + 'index.json');

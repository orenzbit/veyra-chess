import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { once } from 'node:events';
import { resolve } from 'node:path';

const arg = (name, fallback = '') => process.argv.find((value) => value.startsWith('--' + name + '='))?.slice(name.length + 3) ?? fallback;
const runId = arg('run-id');
const outputDir = resolve(arg('out', 'artifacts/restored-championship-github'));
const repository = String(process.env.GITHUB_REPOSITORY || arg('repository', '')).trim();
const token = String(process.env.CHAMPIONSHIP_GITHUB_TOKEN || process.env.GITHUB_TOKEN || '').trim();
const apiBase = String(process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, '');
const branch = String(process.env.CHAMPIONSHIP_GITHUB_ARCHIVE_BRANCH || 'championship-archive').trim();
assert.ok(runId && /^[a-zA-Z0-9._:-]{1,128}$/.test(runId), 'Pass a valid --run-id');
assert.ok(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository), 'Set GITHUB_REPOSITORY or pass --repository=owner/repo');
assert.ok(token.length >= 20, 'Set CHAMPIONSHIP_GITHUB_TOKEN with repository contents read access');

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}
async function api(path) {
  const response = await fetch(apiBase + path, {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: 'Bearer ' + token,
      'x-github-api-version': '2022-11-28',
    },
  });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { message: text }; }
  if (!response.ok) throw new Error('GitHub restore API returned ' + response.status + ' for ' + path + ': ' + (body.message || 'request failed'));
  return body;
}
const ref = await api('/repos/' + repository + '/git/ref/heads/' + encodeURIComponent(branch));
const commit = await api('/repos/' + repository + '/git/commits/' + ref.object.sha);
const tree = await api('/repos/' + repository + '/git/trees/' + commit.tree.sha + '?recursive=1');
assert.ok(!tree.truncated, 'Archive branch tree is truncated; restore cannot be trusted');
const root = 'runs/' + runId + '/';
const indexEntry = tree.tree.find((entry) => entry.path === root + 'index.json' && entry.type === 'blob');
assert.ok(indexEntry, 'Archive index not found for run ' + runId);
async function readBlob(entry) {
  const blob = await api('/repos/' + repository + '/git/blobs/' + entry.sha);
  assert.equal(blob.encoding, 'base64', 'Unexpected Git blob encoding');
  return Buffer.from(blob.content, 'base64').toString('utf8');
}
const indexText = await readBlob(indexEntry);
const index = JSON.parse(indexText);
assert.equal(index.runId, runId, 'Archive index run ID mismatch');
const byPath = new Map(tree.tree.filter((entry) => entry.type === 'blob').map((entry) => [entry.path, entry]));
async function readIndexedFile(path, expectedHash) {
  const entry = byPath.get(path);
  assert.ok(entry, 'Archive file missing: ' + path);
  const content = await readBlob(entry);
  assert.equal(sha256(content), expectedHash, 'Archive file checksum mismatch: ' + path);
  return content;
}
const summaryFile = index.files.find((file) => file.path === root + 'summary.json');
const dnaFile = index.files.find((file) => file.path === root + 'dna-report.json');
assert.ok(summaryFile && dnaFile, 'Archive index is missing summary or DNA report');
const summaryText = await readIndexedFile(summaryFile.path, summaryFile.sha256);
const dnaText = await readIndexedFile(dnaFile.path, dnaFile.sha256);
const chunkFiles = index.files.filter((file) => file.path.startsWith(root + 'games/'));
const gameLines = [];
for (const file of chunkFiles) {
  const content = await readIndexedFile(file.path, file.sha256);
  const lines = content.split(/\r?\n/).filter(Boolean);
  assert.equal(lines.length, file.games, 'Game count mismatch in chunk ' + file.path);
  gameLines.push(...lines);
}
assert.equal(gameLines.length, index.completedGames, 'Archive index game count mismatch');
const analysisSummaryFile = index.files.find((file) => file.path === root + 'analysis-summary.json');
const analysisFiles = index.files.filter((file) => file.path.startsWith(root + 'analysis/'));
let analysisCount = 0;
let analysisSummaryText = null;
if (analysisSummaryFile) {
  analysisSummaryText = await readIndexedFile(analysisSummaryFile.path, analysisSummaryFile.sha256);
  const analysisSummary = JSON.parse(analysisSummaryText);
  assert.equal(analysisSummary.completedPositions, index.analysisPositions, 'Archive analysis summary count mismatch');
  assert.equal(analysisSummary.engineFingerprint, index.analysisFingerprint, 'Archive analysis engine fingerprint mismatch');
  await mkdir(outputDir, { recursive: true });
  const analysisPath = resolve(outputDir, 'move-analysis.jsonl');
  const tempPath = analysisPath + '.tmp';
  const stream = createWriteStream(tempPath, { encoding: 'utf8' });
  try {
    for (const file of analysisFiles) {
      const content = await readIndexedFile(file.path, file.sha256);
      const lines = content.split(/\r?\n/).filter(Boolean);
      assert.equal(lines.length, file.analyses, 'Analysis count mismatch in chunk ' + file.path);
      for (const line of lines) {
        const record = JSON.parse(line);
        assert.equal(record.engineFingerprint, index.analysisFingerprint, 'Engine fingerprint mismatch in chunk ' + file.path);
        analysisCount += 1;
      }
      if (!stream.write(content)) await once(stream, 'drain');
    }
    const finished = once(stream, 'finish');
    stream.end();
    await finished;
    assert.equal(analysisCount, index.analysisPositions, 'Archive index analysis count mismatch');
    await rename(tempPath, analysisPath);
  } catch (error) {
    stream.destroy();
    throw error;
  }
}

const summary = JSON.parse(summaryText);
const dnaReport = JSON.parse(dnaText);
assert.equal(summary.runId, runId, 'Restored summary run ID mismatch');
assert.equal(summary.completedGames, gameLines.length, 'Restored summary game count mismatch');
assert.equal(dnaReport.manifestHash, summary.manifestHash, 'Restored DNA manifest hash mismatch');
await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, 'summary.json'), summaryText);
await writeFile(resolve(outputDir, 'dna-report.json'), dnaText);
if (analysisSummaryText) await writeFile(resolve(outputDir, 'analysis-summary.json'), analysisSummaryText);
await writeFile(resolve(outputDir, 'games.jsonl'), gameLines.join('\n') + (gameLines.length ? '\n' : ''));
console.log('Restored and checksum-verified ' + gameLines.length + ' games' + (analysisCount ? ' and ' + analysisCount + ' move analyses' : '') + ' plus summary and DNA report from GitHub archive branch ' + branch + ' to ' + outputDir);

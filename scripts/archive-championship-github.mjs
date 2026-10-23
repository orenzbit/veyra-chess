import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
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
const rawGames = (await readFile(resolve(outputDir, 'games.jsonl'), 'utf8')).split(/\r?\n/).filter(Boolean);
const games = rawGames.map((line) => JSON.parse(line)).filter((record) => record.status === 'completed');
assert.ok(summary.runId && /^[a-zA-Z0-9._:-]{1,128}$/.test(summary.runId), 'Summary must include a safe runId');
assert.ok(/^[a-f0-9]{64}$/.test(summary.manifestHash), 'Summary must include a valid manifest hash');
assert.equal(games.length, summary.completedGames, 'Completed game count does not match summary');
const dnaReport = JSON.parse(await readFile(resolve(outputDir, 'dna-report.json'), 'utf8'));
assert.equal(dnaReport.manifestHash, summary.manifestHash, 'DNA report manifest hash differs from run');

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
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

const files = [];
const root = 'runs/' + summary.runId + '/';
const summaryText = JSON.stringify(summary, null, 2) + '\n';
const dnaText = JSON.stringify(dnaReport, null, 2) + '\n';
files.push({ path: root + 'summary.json', content: summaryText });
files.push({ path: root + 'dna-report.json', content: dnaText });
const chunks = [];
let chunkLines = [];
let chunkBytes = 0;
const maxChunkBytes = 2 * 1024 * 1024;
function flushChunk() {
  if (!chunkLines.length) return;
  const index = chunks.length + 1;
  const content = chunkLines.join('\n') + '\n';
  const path = root + 'games/games-' + String(index).padStart(4, '0') + '.jsonl';
  chunks.push({ path, content, games: chunkLines.length, sha256: sha256(content) });
  files.push({ path, content });
  chunkLines = [];
  chunkBytes = 0;
}
for (const game of games) {
  const line = JSON.stringify(game);
  const bytes = Buffer.byteLength(line, 'utf8') + 1;
  if (bytes > maxChunkBytes) throw new Error('Single game exceeds GitHub archive chunk limit: ' + game.gameId);
  if (chunkLines.length >= 50 || (chunkLines.length && chunkBytes + bytes > maxChunkBytes)) flushChunk();
  chunkLines.push(line);
  chunkBytes += bytes;
}
flushChunk();
const index = {
  schemaVersion: 1,
  runId: summary.runId,
  manifestHash: summary.manifestHash,
  botCount: summary.botCount,
  expectedGames: summary.expectedGames,
  scheduledGames: summary.scheduledGames,
  completedGames: games.length,
  archivedAt: new Date().toISOString(),
  files: [
    { path: root + 'summary.json', sha256: sha256(summaryText) },
    { path: root + 'dna-report.json', sha256: sha256(dnaText) },
    ...chunks.map(({ path, sha256: checksum, games: gameCount }) => ({ path, sha256: checksum, games: gameCount })),
  ],
};
files.push({ path: root + 'index.json', content: JSON.stringify(index, null, 2) + '\n' });

const tree = [];
for (const file of files) {
  const blob = await api('/repos/' + repository + '/git/blobs', {
    method: 'POST',
    body: JSON.stringify({ content: file.content, encoding: 'utf-8' }),
  });
  tree.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
}
const createdTree = await api('/repos/' + repository + '/git/trees', {
  method: 'POST',
  body: JSON.stringify({ base_tree: head.treeSha, tree }),
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
console.log('Archived run ' + summary.runId + ' to ' + repository + ' branch ' + branch + ': ' + games.length + ' games in ' + chunks.length + ' PGN chunks.');
console.log('Archive index: ' + root + 'index.json');

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import { resolve } from 'node:path';

const arg = (name, fallback = '') => process.argv.find((value) => value.startsWith('--' + name + '='))?.slice(name.length + 3) ?? fallback;
const runId = arg('run-id');
const outputDir = resolve(arg('out', 'artifacts/restored-championship'));
const endpoint = String(process.env.CHAMPIONSHIP_ARCHIVE_URL || '').trim();
const token = String(process.env.CHAMPIONSHIP_ARCHIVE_TOKEN || '').trim();
assert.ok(runId, 'Pass --run-id=<archived-run-id>');
assert.ok(endpoint.startsWith('https://'), 'Set CHAMPIONSHIP_ARCHIVE_URL to the HTTPS archive endpoint');
assert.ok(token.length >= 24, 'Set CHAMPIONSHIP_ARCHIVE_TOKEN to the archive secret');
await mkdir(outputDir, { recursive: true });

function stableStringify(value) {
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + stableStringify(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
function digest(value) {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
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
async function writeStreamLine(stream, value) {
  if (!stream.write(value)) await once(stream, 'drain');
}
async function finishStream(stream) {
  const finished = once(stream, 'finish');
  stream.end();
  await finished;
}

const loaded = await post({ action: 'load-run', runId });
const run = loaded.run;
assert.equal(run.run_id, runId, 'Archive returned a different run ID');
const gamesPath = resolve(outputDir, 'games.jsonl');
const gamesTempPath = gamesPath + '.tmp';
const gameStream = createWriteStream(gamesTempPath, { encoding: 'utf8' });
let gamesCount = 0;
let offset = 0;
try {
  while (true) {
    const page = await post({ action: 'load-games', runId, offset, limit: 50 });
    assert.ok(Array.isArray(page.games), 'Archive returned an invalid games page');
    for (const entry of page.games) {
      assert.ok(entry && entry.record && typeof entry.sha256 === 'string', 'Archive returned a game without its checksum');
      assert.equal(digest(entry.record), entry.sha256, 'Archived game checksum mismatch: ' + entry.record.gameId);
      await writeStreamLine(gameStream, JSON.stringify(entry.record) + '\n');
      gamesCount += 1;
    }
    if (!page.hasMore) break;
    assert.ok(page.nextOffset > offset, 'Archive pagination did not advance');
    offset = page.nextOffset;
  }
  await finishStream(gameStream);
  assert.equal(gamesCount, run.completed_games, 'Archived game count differs from run metadata');
  await rename(gamesTempPath, gamesPath);
} catch (error) {
  gameStream.destroy();
  throw error;
}
const summary = run.summary && typeof run.summary === 'object' ? run.summary : {
  runId, manifestHash: run.manifest_sha256, botCount: run.bot_count,
  expectedGames: run.expected_games, scheduledGames: run.scheduled_games,
  completedGames: run.completed_games, status: run.status,
};
await writeFile(resolve(outputDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');

let analysisCount = 0;
if (Number(run.analysis_positions || 0) > 0) {
  assert.ok(run.analysis_summary && typeof run.analysis_summary === 'object', 'Archived move analyses are missing their analysis summary');
  const analysisPath = resolve(outputDir, 'move-analysis.jsonl');
  const analysisTempPath = analysisPath + '.tmp';
  const analysisStream = createWriteStream(analysisTempPath, { encoding: 'utf8' });
  let analysisOffset = 0;
  try {
    while (true) {
      const page = await post({ action: 'load-analyses', runId, offset: analysisOffset, limit: 500 });
      assert.ok(Array.isArray(page.analyses), 'Archive returned an invalid analysis page');
      for (const entry of page.analyses) {
        assert.ok(entry && entry.record && typeof entry.sha256 === 'string', 'Archive returned an analysis without its checksum');
        assert.equal(digest(entry.record), entry.sha256, 'Archived move-analysis checksum mismatch: ' + entry.record.analysisId);
        assert.equal(entry.record.engineFingerprint, run.analysis_fingerprint, 'Archived move-analysis engine fingerprint mismatch');
        await writeStreamLine(analysisStream, JSON.stringify(entry.record) + '\n');
        analysisCount += 1;
      }
      if (!page.hasMore) break;
      assert.ok(page.nextOffset > analysisOffset, 'Analysis pagination did not advance');
      analysisOffset = page.nextOffset;
    }
    await finishStream(analysisStream);
    assert.equal(analysisCount, run.analysis_positions, 'Archived analysis count differs from run metadata');
    await rename(analysisTempPath, analysisPath);
  } catch (error) {
    analysisStream.destroy();
    throw error;
  }
  if (run.analysis_summary) await writeFile(resolve(outputDir, 'analysis-summary.json'), JSON.stringify(run.analysis_summary, null, 2) + '\n');
}

let dnaReport = run.dna_report || null;
if (dnaReport && run.dna_report_sha256) {
  assert.equal(digest(dnaReport), run.dna_report_sha256, 'Archived full DNA report checksum mismatch');
}
if (!dnaReport) {
  const dna = await post({ action: 'load-dna', runId });
  if (Array.isArray(dna.reports) && dna.reports.length) {
    for (const entry of dna.reports) assert.equal(digest(entry.report), entry.report_sha256, 'Archived DNA bot checksum mismatch: ' + entry.bot_id);
    dnaReport = { schemaVersion: 1, manifestHash: run.manifest_sha256, bots: dna.reports.map((entry) => entry.report) };
  }
}
if (dnaReport) await writeFile(resolve(outputDir, 'dna-report.json'), JSON.stringify(dnaReport, null, 2) + '\n');
console.log('Restored run ' + runId + ': ' + gamesCount + ' games' + (analysisCount ? ' and ' + analysisCount + ' move analyses' : '') + (dnaReport ? ' and DNA report' : '') + ' to ' + outputDir);

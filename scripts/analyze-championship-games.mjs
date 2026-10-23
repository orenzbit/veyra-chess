import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import vm from 'node:vm';

const arg = (name, fallback = '') => process.argv.find((value) => value.startsWith('--' + name + '='))?.slice(name.length + 3) ?? fallback;
const hasFlag = (name) => process.argv.includes('--' + name);
const inputPath = resolve(arg('input', 'artifacts/championship-tournament/games.jsonl'));
const outputPath = resolve(arg('out', 'artifacts/championship-tournament/move-analysis.jsonl'));
const summaryPath = resolve(arg('summary', resolve(dirname(outputPath), 'analysis-summary.json')));
const maxPositions = Number(arg('max-positions', 'Infinity'));
const resume = hasFlag('resume');
const overwrite = hasFlag('overwrite');
assert.ok(maxPositions === Infinity || (Number.isInteger(maxPositions) && maxPositions >= 1), '--max-positions must be a positive integer');

const inputText = await readFile(inputPath, 'utf8');
const inputHash = createHash('sha256').update(inputText).digest('hex');
const records = inputText.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)).filter((record) => record.status === 'completed' && record.pgn);
assert.ok(records.length > 0, 'No completed PGN records available for engine analysis');
const [workerSource, engineSource, wasmBytes, chessSource] = await Promise.all([
  readFile('public/engine-worker.js', 'utf8'),
  readFile('public/vendor/wasm-engine.js', 'utf8'),
  readFile('public/vendor/chessy-ai-fast.wasm'),
  readFile('public/vendor/veyra-rules/chess-compat.js', 'utf8'),
]);
const sha = (value) => createHash('sha256').update(value).digest('hex');
const engineInfo = {
  workerSha256: sha(workerSource),
  engineGlueSha256: sha(engineSource),
  wasmSha256: sha(wasmBytes),
  rulesSha256: sha(chessSource),
};
const engineFingerprint = sha(JSON.stringify(engineInfo));
const chessModule = await import('data:text/javascript;base64,' + Buffer.from(chessSource).toString('base64'));
const Chess = chessModule.Chess;

const positions = [];
for (const record of records) {
  assert.ok(record.gameId && record.white?.id && record.black?.id, 'Game is missing stable IDs');
  const source = new Chess();
  source.loadPgn(record.pgn, { sloppy: true });
  const history = source.history({ verbose: true });
  const replay = new Chess();
  for (const [index, move] of history.entries()) {
    const side = replay.turn() === 'w' ? 'white' : 'black';
    const bot = side === 'white' ? record.white : record.black;
    const beforeFen = replay.fen();
    const mover = { from: move.from, to: move.to, promotion: move.promotion ? String(move.promotion).toLowerCase() : '' };
    const applied = replay.move({ from: move.from, to: move.to, promotion: move.promotion || undefined });
    assert.ok(applied, 'Illegal PGN move ' + (index + 1) + ' in game ' + record.gameId);
    const afterFen = replay.fen();
    const positionFingerprint = sha([record.gameId, index + 1, beforeFen, afterFen, bot.id, engineFingerprint].join('|'));
    positions.push({
      analysisId: record.gameId + '__ply-' + String(index + 1).padStart(4, '0'),
      gameId: record.gameId, ply: index + 1, botId: bot.id, side, san: move.san,
      beforeFen, afterFen, mover, positionFingerprint,
    });
  }
  if (record.finalFen) assert.equal(replay.fen(), record.finalFen, 'PGN final FEN mismatch in game ' + record.gameId);
}
const scheduledPositions = Math.min(positions.length, maxPositions);
const selectedPositions = positions.slice(0, scheduledPositions);
await mkdir(dirname(outputPath), { recursive: true });
let completed = new Map();
let rejectedCheckpointRecords = 0;
let originalStartedAt = null;
if (resume) {
  const previous = JSON.parse(await readFile(summaryPath, 'utf8'));
  assert.equal(previous.inputHash, inputHash, 'Cannot resume: tournament PGN archive changed');
  assert.equal(previous.engineFingerprint, engineFingerprint, 'Cannot resume: engine files changed');
  assert.equal(previous.scheduledPositions, scheduledPositions, 'Cannot resume: requested analysis position count changed');
  originalStartedAt = previous.startedAt;
  const lines = (await readFile(outputPath, 'utf8')).split(/\r?\n/).filter(Boolean);
  const validLines = [];
  const byPosition = new Map(selectedPositions.map((position) => [position.analysisId, position]));
  for (const line of lines) {
    let result;
    try { result = JSON.parse(line); } catch { rejectedCheckpointRecords += 1; continue; }
    const expected = byPosition.get(result.analysisId);
    if (!expected || result.schemaVersion !== 1 || result.engineFingerprint !== engineFingerprint ||
        result.positionFingerprint !== expected.positionFingerprint || !result.bestUci ||
        !Number.isFinite(result.elapsedMs) || result.elapsedMs < 0) {
      rejectedCheckpointRecords += 1;
      continue;
    }
    assert.ok(!completed.has(result.analysisId), 'Duplicate analysis checkpoint: ' + result.analysisId);
    completed.set(result.analysisId, result);
    validLines.push(JSON.stringify(result));
  }
  await writeFile(outputPath, validLines.length ? validLines.join('\n') + '\n' : '');
} else {
  try {
    const existing = await readFile(outputPath, 'utf8');
    if (existing.trim() && !overwrite) throw new Error('Analysis output already exists. Use --resume or a new --out path; --overwrite discards the checkpoint.');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  if (overwrite) await writeFile(outputPath, '');
}
assert.ok(completed.size <= scheduledPositions, 'Checkpoint has more analyses than this run is configured to process');

const messages = [];
let readyResolve;
const ready = new Promise((resolveReady) => { readyResolve = resolveReady; });
const wasmArrayBuffer = wasmBytes.buffer.slice(wasmBytes.byteOffset, wasmBytes.byteOffset + wasmBytes.byteLength);
const context = vm.createContext({
  console, WebAssembly, TextEncoder, DataView, Uint8Array, ArrayBuffer, BigInt,
  Math, Promise, Error, String, Number, Object, JSON, setTimeout, clearTimeout, performance,
  fetch: async () => ({ arrayBuffer: async () => wasmArrayBuffer }),
  postMessage: (message) => {
    messages.push(message);
    if (message === 'ready') readyResolve();
  },
});
context.self = context;
context.importScripts = () => vm.runInContext(engineSource, context, { filename: 'wasm-engine.js' });
vm.runInContext(workerSource, context, { filename: 'engine-worker.js' });
await Promise.race([
  ready,
  new Promise((_, reject) => setTimeout(() => reject(new Error('WASM engine worker did not become ready within 15 seconds')), 15000)),
]);

let requestId = 0;
async function analyze(position) {
  const id = 'championship-analysis-' + (++requestId);
  const previousLength = messages.length;
  await context.onmessage({ data: { id, fen: position.beforeFen, afterFen: position.afterFen, mover: position.mover } });
  const response = messages.slice(previousLength).find((message) => message && message.id === id);
  assert.ok(response, 'Engine worker did not answer ' + position.analysisId);
  assert.equal(response.error, undefined, 'Engine worker failed at ' + position.analysisId + ': ' + response.error);
  assert.ok(response.result, 'Engine worker returned no result at ' + position.analysisId);
  return response.result;
}
async function atomicJson(path, value) {
  const temp = path + '.tmp';
  await writeFile(temp, JSON.stringify(value, null, 2) + '\n');
  await rename(temp, path);
}
const summary = {
  schemaVersion: 1,
  status: 'running',
  startedAt: originalStartedAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  inputPath, inputHash, gameCount: records.length,
  engine: engineInfo, engineFingerprint,
  analysisSchemaVersion: 1,
  expectedPositions: positions.length,
  scheduledPositions,
  completedPositions: completed.size,
  rejectedCheckpointRecords,
};
async function persist(status) {
  summary.status = status;
  summary.updatedAt = new Date().toISOString();
  summary.completedPositions = completed.size;
  await atomicJson(summaryPath, summary);
}
await persist('running');
try {
  for (const position of selectedPositions) {
    if (completed.has(position.analysisId)) continue;
    const startedAt = performance.now();
    const result = await analyze(position);
    const elapsedMs = performance.now() - startedAt;
    const record = {
      schemaVersion: 1,
      analysisSchemaVersion: 1,
      engineFingerprint,
      analysisId: position.analysisId,
      positionFingerprint: position.positionFingerprint,
      gameId: position.gameId,
      ply: position.ply,
      botId: position.botId,
      side: position.side,
      san: position.san,
      beforeFen: position.beforeFen,
      afterFen: position.afterFen,
      elapsedMs: Number(elapsedMs.toFixed(3)),
      bestUci: result.bestUci ?? null,
      classification: result.classification ?? null,
      depth: result.depth ?? null,
      whiteChanceBefore: result.whiteChanceBefore ?? null,
      whiteChanceAfter: result.whiteChanceAfter ?? null,
      whiteChanceBest: result.whiteChanceBest ?? null,
      drop: result.drop ?? null,
    };
    assert.ok(record.bestUci, 'Engine returned no best move for ' + position.analysisId);
    await appendFile(outputPath, JSON.stringify(record) + '\n');
    completed.set(record.analysisId, record);
    await persist('running');
    console.log('[' + completed.size + '/' + scheduledPositions + '] ' + position.gameId + ' ply ' + position.ply + ': ' + record.classification + ', depth ' + record.depth + ', ' + record.elapsedMs + ' ms');
  }
  assert.equal(completed.size, scheduledPositions, 'Analysis did not finish all scheduled positions');
  await persist('completed');
  console.log('Engine analysis complete: ' + completed.size + '/' + scheduledPositions + ' positions. Summary: ' + summaryPath);
} catch (error) {
  await persist('failed');
  throw error;
}

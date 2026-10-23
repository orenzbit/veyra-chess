import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';
import { Chess } from '../public/vendor/veyra-rules/chess-compat.js';

const arg = (name, fallback = '') => process.argv.find((value) => value.startsWith('--' + name + '='))?.slice(name.length + 3) ?? fallback;
const inputPath = resolve(arg('input', 'artifacts/championship-smoke/games.jsonl'));
const outputPath = resolve(arg('out', 'artifacts/championship-smoke/analysis-benchmark.json'));
const maxPlies = Number(arg('max-plies', 'Infinity'));
assert.ok(maxPlies === Infinity || (Number.isInteger(maxPlies) && maxPlies >= 1), '--max-plies must be a positive integer');

const records = (await readFile(inputPath, 'utf8')).split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
const record = records.find((item) => item.status === 'completed' && item.pgn);
assert.ok(record, 'No completed game PGN available for analysis benchmark');
const [workerSource, engineSource, wasmBytes, chessSource] = await Promise.all([
  readFile('public/engine-worker.js', 'utf8'),
  readFile('public/vendor/wasm-engine.js', 'utf8'),
  readFile('public/vendor/chessy-ai-fast.wasm'),
  readFile('public/vendor/veyra-rules/chess-compat.js', 'utf8'),
]);
const chessModule = await import('data:text/javascript;base64,' + Buffer.from(chessSource).toString('base64'));
const ChessCtor = chessModule.Chess;
const messages = [];
let readyResolve;
const ready = new Promise((resolveReady) => { readyResolve = resolveReady; });
const context = vm.createContext({
  console, WebAssembly, TextEncoder, DataView, Uint8Array, ArrayBuffer, BigInt,
  Math, Promise, Error, String, Number, Object, JSON, setTimeout, clearTimeout, performance,
  fetch: async () => ({
    arrayBuffer: async () => wasmBytes.buffer.slice(wasmBytes.byteOffset, wasmBytes.byteOffset + wasmBytes.byteLength),
  }),
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
  new Promise((_, reject) => setTimeout(() => reject(new Error('WASM worker did not become ready within 15 seconds')), 15000)),
]);

let requestId = 0;
async function analyze(beforeFen, afterFen, mover) {
  const id = 'championship-benchmark-' + (++requestId);
  const previousLength = messages.length;
  await context.onmessage({ data: { id, fen: beforeFen, afterFen, mover } });
  const response = messages.slice(previousLength).find((message) => message && message.id === id);
  assert.ok(response, 'Engine worker did not answer analysis ' + id);
  assert.equal(response.error, undefined, 'Engine worker analysis failed: ' + response.error);
  assert.ok(response.result, 'Engine worker returned no result');
  return response.result;
}

const pgnGame = new ChessCtor();
pgnGame.loadPgn(record.pgn, { sloppy: true });
const history = pgnGame.history({ verbose: true });
const replay = new ChessCtor();
const analyses = [];
const gameStartedAt = performance.now();
for (const [index, move] of history.entries()) {
  if (index >= maxPlies) break;
  const beforeFen = replay.fen();
  const mover = {
    from: move.from,
    to: move.to,
    promotion: move.promotion ? String(move.promotion).toLowerCase() : '',
  };
  const applied = replay.move({ from: move.from, to: move.to, promotion: move.promotion || undefined });
  assert.ok(applied, 'Could not replay move ' + (index + 1) + ' in benchmark PGN');
  const afterFen = replay.fen();
  const startedAt = performance.now();
  const result = await analyze(beforeFen, afterFen, mover);
  const elapsedMs = performance.now() - startedAt;
  analyses.push({
    ply: index + 1,
    side: index % 2 === 0 ? 'white' : 'black',
    san: move.san,
    beforeFen,
    afterFen,
    mover,
    elapsedMs: Number(elapsedMs.toFixed(3)),
    bestUci: result.bestUci ?? null,
    classification: result.classification ?? null,
    depth: result.depth ?? null,
    whiteChanceBefore: result.whiteChanceBefore ?? null,
    whiteChanceAfter: result.whiteChanceAfter ?? null,
    whiteChanceBest: result.whiteChanceBest ?? null,
    drop: result.drop ?? null,
  });
}
const elapsedMs = performance.now() - gameStartedAt;
const sorted = analyses.map((item) => item.elapsedMs).sort((a, b) => a - b);
const percentile = (p) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)] : null;
const report = {
  schemaVersion: 1,
  measuredAt: new Date().toISOString(),
  gameId: record.gameId,
  white: record.white,
  black: record.black,
  result: record.result,
  pgnPlies: history.length,
  analyzedPlies: analyses.length,
  completeGameAnalysis: analyses.length === history.length,
  totalElapsedMs: Number(elapsedMs.toFixed(3)),
  averageMsPerPly: analyses.length ? Number((elapsedMs / analyses.length).toFixed(3)) : null,
  p50MsPerPly: percentile(0.5),
  p95MsPerPly: percentile(0.95),
  maxMsPerPly: sorted.length ? sorted[sorted.length - 1] : null,
  engine: 'Veyra existing WASM engine worker',
  analyses,
};
await mkdir(resolve(outputPath, '..'), { recursive: true });
await writeFile(outputPath, JSON.stringify(report, null, 2) + '\n');
console.log('Analysis benchmark: ' + record.gameId + ', analyzed ' + analyses.length + '/' + history.length + ' plies in ' + report.totalElapsedMs + ' ms; average ' + report.averageMsPerPly + ' ms/ply.');
console.log('Benchmark report: ' + outputPath);

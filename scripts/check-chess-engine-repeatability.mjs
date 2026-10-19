import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const [workerSource, engineSource, wasmBytes, chessSource] = await Promise.all([
  readFile('public/engine-worker.js', 'utf8'),
  readFile('public/vendor/wasm-engine.js', 'utf8'),
  readFile('public/vendor/chessy-ai-fast.wasm'),
  readFile('public/vendor/veyra-rules/chess-compat.js', 'utf8'),
]);

const chessModule = await import('data:text/javascript;base64,' + Buffer.from(chessSource).toString('base64'));
const Chess = chessModule.Chess;
const messages = [];
let readyResolve;
const ready = new Promise(resolve => { readyResolve = resolve; });
const context = vm.createContext({
  console,
  WebAssembly,
  TextEncoder,
  DataView,
  Uint8Array,
  ArrayBuffer,
  BigInt,
  Math,
  Promise,
  Error,
  String,
  Number,
  Object,
  JSON,
  setTimeout,
  clearTimeout,
  performance,
  fetch: async () => ({
    arrayBuffer: async () => wasmBytes.buffer.slice(wasmBytes.byteOffset, wasmBytes.byteOffset + wasmBytes.byteLength),
  }),
  postMessage: message => {
    messages.push(message);
    if (message === 'ready') readyResolve();
  },
});
context.self = context;
context.importScripts = () => vm.runInContext(engineSource, context, { filename: 'wasm-engine.js' });
vm.runInContext(workerSource, context, { filename: 'engine-worker.js' });
await Promise.race([
  ready,
  new Promise((_, reject) => setTimeout(() => reject(new Error('real WASM worker did not become ready within 15 seconds')), 15000)),
]);

let requestId = 0;
async function analyze(fen, afterFen, mover) {
  const id = 'test-' + (++requestId);
  const previousLength = messages.length;
  await context.onmessage({ data: { id, fen, afterFen, mover } });
  const resultMessage = messages.slice(previousLength).find(message => message && message.id === id);
  assert.ok(resultMessage, 'worker must answer request ' + id);
  assert.equal(resultMessage.error, undefined, 'worker analysis should not error: ' + resultMessage.error);
  assert.ok(resultMessage.result, 'worker must return an analysis result');
  return resultMessage.result;
}

function uci(move) {
  if (!move) return null;
  return 'abcdefgh'[move.from % 8] + (8 - Math.floor(move.from / 8)) +
    'abcdefgh'[move.to % 8] + (move.promotion ? move.promotion.toLowerCase() : '');
}

function gamePosition(sans, label, targetPly) {
  const replay = new Chess();
  let before = null;
  let played = null;
  let after = null;
  for (let index = 0; index <= targetPly; index++) {
    const san = sans[index];
    before = replay.fen();
    played = replay.move(san);
    assert.ok(played, label + ': fixture move ' + (index + 1) + ' (' + san + ') must be legal');
    after = replay.fen();
  }
  return {
    label,
    before,
    after,
    mover: { from: played.from, to: played.to, promotion: played.promotion ? played.promotion.toLowerCase() : '' },
  };
}

const opening = ['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','Be7','Re1','b5','Bb3','d6'];
const middle = ['d4','Nf6','c4','e6','Nc3','Bb4','e3','O-O','Bd3','d5','Nf3','c5','O-O','Nc6','a3','Bxc3','bxc3','dxc4','Bxc4','Qc7'];
const endgame = ['e4','e5','Nf3','Nc6','Bb5','a6','Bxc6','dxc6','Nxe5','Qd4','Nf3','Qxe4+','Qe2','Qxe2+','Kxe2'];
const samePosition = gamePosition(opening, 'repeatability', 8);
const signature = result => JSON.stringify({
  bestUci: result.bestUci,
  afterBestUci: result.afterBestUci,
  whiteChanceBefore: result.whiteChanceBefore,
  whiteChanceAfter: result.whiteChanceAfter,
  whiteChanceBest: result.whiteChanceBest,
  drop: result.drop,
  classification: result.classification,
  depth: result.depth,
});
async function verifySevenIdenticalRuns(fixture) {
  const repeated = [];
  for (let run = 1; run <= 7; run++) {
    repeated.push(await analyze(fixture.before, fixture.after, fixture.mover));
  }
  const expected = signature(repeated[0]);
  for (let index = 1; index < repeated.length; index++) {
    assert.equal(signature(repeated[index]), expected, fixture.label + ': repeat run ' + (index + 1) + ' must exactly match run 1');
  }
  assert.ok(repeated[0].bestUci, fixture.label + ': engine should return a best move');
  console.log('PASS: ' + fixture.label + ' — 7/7 real-WASM analyses identical (' + repeated[0].bestUci + ', ' + repeated[0].classification + ', depth ' + repeated[0].depth + ').');
  return repeated[0];
}
const sameResult = await verifySevenIdenticalRuns(samePosition);
console.log('REPEATABILITY_RESULT=' + JSON.stringify({ runs: 7, identical: true, bestUci: sameResult.bestUci, classification: sameResult.classification, depth: sameResult.depth }));

const fixtures = [
  gamePosition(opening, 'opening game', 10),
  gamePosition(middle, 'middlegame game', 12),
  gamePosition(endgame, 'endgame game', 14),
];
for (const fixture of fixtures) {
  const result = await verifySevenIdenticalRuns(fixture);
  const legalBoard = new Chess(fixture.before);
  assert.equal(legalBoard.fen(), fixture.before, fixture.label + ': before FEN must load');
  const legalMoves = legalBoard.moves({ verbose: true }).map(move => move.from + move.to + (move.promotion ? move.promotion.toLowerCase() : ''));
  assert.ok(legalMoves.includes(result.bestUci), fixture.label + ': engine best move ' + result.bestUci + ' must be legal in the current position');
  const afterBoard = new Chess(fixture.before);
  assert.equal(afterBoard.fen(), fixture.before, fixture.label + ': board must load before played move');
  assert.ok(afterBoard.move({ from: fixture.mover.from, to: fixture.mover.to, promotion: fixture.mover.promotion || undefined }), fixture.label + ': played move must be legal');
  assert.equal(afterBoard.fen(), fixture.after, fixture.label + ': after-FEN must match the legal move result');
  assert.ok(Number.isFinite(result.whiteChanceBefore) && result.whiteChanceBefore >= 0 && result.whiteChanceBefore <= 100, fixture.label + ': before score must be in [0,100]');
  assert.ok(Number.isFinite(result.whiteChanceAfter) && result.whiteChanceAfter >= 0 && result.whiteChanceAfter <= 100, fixture.label + ': after score must be in [0,100]');
  assert.ok(['best', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder'].includes(result.classification), fixture.label + ': classification must be recognized');
  console.log('PASS: ' + fixture.label + ' — legal played move, legal engine best move and valid scores.');
}
console.log('PASS: 7 identical runs on each of 4 positions (28 total analyses), including 3 separate game positions.');

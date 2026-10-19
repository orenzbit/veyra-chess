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

function gamePosition(pgn, label, targetPly) {
  const parsed = new Chess();
  const loadResult = parsed.loadPgn(pgn, { sloppy: true });
  const history = parsed.history({ verbose: true });
  assert.ok(loadResult || history.length > 0, label + ': PGN should load');
  assert.ok(history.length > targetPly, label + ': fixture must contain the target ply');
  const replay = new Chess();
  let before = null;
  let played = null;
  let after = null;
  for (let index = 0; index <= targetPly; index++) {
    const move = history[index];
    before = replay.fen();
    played = replay.move({ from: move.from, to: move.to, promotion: move.promotion || undefined });
    assert.ok(played, label + ': fixture move ' + (index + 1) + ' must be legal');
    after = replay.fen();
  }
  const from = played.from;
  const to = played.to;
  const promotion = played.promotion ? played.promotion.toLowerCase() : '';
  const mover = { from, to, promotion };
  return { label, before, after, mover, playedUci: from + to + promotion };
}

const opening = '[Event "Repeatability fixture"]\n[White "A"]\n[Black "B"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 *';
const middle = '[Event "Middlegame fixture"]\n[White "A"]\n[Black "B"]\n\n1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 4. e3 O-O 5. Bd3 d5 6. Nf3 c5 7. O-O Nc6 8. a3 Bxc3 9. bxc3 dxc4 10. Bxc4 Qc7 *';
const endgame = '[Event "Endgame fixture"]\n[White "A"]\n[Black "B"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Bxc6 dxc6 5. Nxe5 Qd4 6. Nf3 Qxe4+ 7. Qe2 Qxe2+ 8. Kxe2 *';

const samePosition = gamePosition(opening, 'repeatability', 8);
const repeated = [];
for (let run = 1; run <= 7; run++) {
  repeated.push(await analyze(samePosition.before, samePosition.after, samePosition.mover));
}
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
const expected = signature(repeated[0]);
for (let index = 1; index < repeated.length; index++) {
  assert.equal(signature(repeated[index]), expected, 'repeat run ' + (index + 1) + ' must exactly match run 1');
}
assert.ok(repeated[0].bestUci, 'same-position run should return a best move');
console.log('PASS: 7/7 real-WASM worker analyses of the same legal position returned identical move, scores, depth and classification.');
console.log('REPEATABILITY_RESULT=' + JSON.stringify({ runs: 7, identical: true, bestUci: repeated[0].bestUci, classification: repeated[0].classification, depth: repeated[0].depth }));

const fixtures = [
  gamePosition(opening, 'opening game', 10),
  gamePosition(middle, 'middlegame game', 12),
  gamePosition(endgame, 'endgame game', 6),
];
for (const fixture of fixtures) {
  const result = await analyze(fixture.before, fixture.after, fixture.mover);
  assert.ok(result.bestUci, fixture.label + ': engine must return a best move');
  assert.ok(Number.isFinite(result.whiteChanceBefore) && result.whiteChanceBefore >= 0 && result.whiteChanceBefore <= 100, fixture.label + ': before score must be in [0,100]');
  assert.ok(Number.isFinite(result.whiteChanceAfter) && result.whiteChanceAfter >= 0 && result.whiteChanceAfter <= 100, fixture.label + ': after score must be in [0,100]');
  assert.ok(['best', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder'].includes(result.classification), fixture.label + ': classification must be recognized');
  const legalBoard = new Chess();
  assert.ok(legalBoard.load(fixture.before), fixture.label + ': before FEN must load');
  const legalMoves = legalBoard.moves({ verbose: true }).map(move => move.from + move.to + (move.promotion ? move.promotion.toLowerCase() : ''));
  assert.ok(legalMoves.includes(result.bestUci), fixture.label + ': engine best move ' + result.bestUci + ' must be legal in the current position');
  const afterBoard = new Chess();
  assert.ok(afterBoard.load(fixture.before), fixture.label + ': board must load before played move');
  assert.ok(afterBoard.move({ from: fixture.mover.from, to: fixture.mover.to, promotion: fixture.mover.promotion || undefined }), fixture.label + ': played move must be legal');
  assert.equal(afterBoard.fen(), fixture.after, fixture.label + ': after-FEN must match the legal move result');
  console.log('PASS: ' + fixture.label + ' — legal played move, legal engine best move, valid scores and classification (' + result.bestUci + ').');
}
console.log('PASS: 7 identical repeats plus 3 separate game positions passed against the real WASM engine worker.');

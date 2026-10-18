// Parity check: the Node engine wrapper must give the same move and score as the browser build
// of the engine (public/vendor/wasm-engine.js evaluated as a plain script with a global).
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { loadEngine, moveToUci, wasmCandidates } = await import(pathToFileURL(join(root, 'netlify/functions/lib/engine-node.mjs')).href);
const { STAGE1 } = await import(pathToFileURL(join(root, 'netlify/functions/lib/puzzle-config.mjs')).href);

assert.equal(moveToUci({ from: 52, to: 36 }), 'e2e4');
assert.equal(moveToUci({ from: 12, to: 4, promotion: 'Q' }), 'e7e8q');
assert.equal(moveToUci(null), null);
assert.equal(moveToUci({ from: 99, to: 1 }), null);
assert.ok(wasmCandidates({ LAMBDA_TASK_ROOT: '/var/task' }, '/x', '/y/a/b').some((p) => p.startsWith('/var/task')));

const wasmBytes = await readFile(join(root, 'public/vendor/chessy-ai-fast.wasm'));
const sandbox = { WebAssembly, console, TextEncoder, TextDecoder };
sandbox.globalThis = sandbox; sandbox.self = sandbox;
vm.createContext(sandbox);
vm.runInContext(await readFile(join(root, 'public/vendor/wasm-engine.js'), 'utf8'), sandbox);
const browserEngine = await sandbox.WasmEngine.load(wasmBytes.buffer.slice(wasmBytes.byteOffset, wasmBytes.byteOffset + wasmBytes.byteLength));

const seed = JSON.parse(await readFile(join(root, 'data/puzzle-seed.json'), 'utf8'));
const fens = (seed.puzzles || []).map((p) => p.fen).slice(0, 20);
assert.equal(fens.length, 20, 'need 20 seed positions');
const node = await loadEngine();
let totalMs = 0;
for (const fen of fens) {
  const started = Date.now();
  const a = node.search(fen, STAGE1);
  totalMs += Date.now() - started;
  const raw = browserEngine.search(fen, { maxDepth: STAGE1.maxDepth, nodeLimit: STAGE1.nodeLimit, timeMs: 0, quiesce: true });
  assert.equal(a.uci, moveToUci(raw.move), `move differs for ${fen}`);
  assert.equal(a.score, raw.score, `score differs for ${fen}`);
}
console.log(`PASS: Node engine matches the browser engine on 20 positions (avg ${(totalMs / 20).toFixed(0)} ms/search at STAGE1).`);

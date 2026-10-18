// Node wrapper around the project's WebAssembly chess engine (same file the browser uses).
// Scores are centipawns from WHITE's point of view; squares are indexed 0..63 with a8 = 0.
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import WasmEngine from './wasm-engine.gen.mjs';

const WASM_RELATIVE = 'public/vendor/chessy-ai-fast.wasm';

export function wasmCandidates(env = process.env, cwd = process.cwd(), here = dirname(fileURLToPath(import.meta.url))) {
  const list = [];
  if (env.PUZZLE_ENGINE_WASM) list.push(env.PUZZLE_ENGINE_WASM);
  list.push(join(cwd, WASM_RELATIVE));
  if (env.LAMBDA_TASK_ROOT) list.push(join(env.LAMBDA_TASK_ROOT, WASM_RELATIVE));
  list.push(join(here, '..', '..', '..', WASM_RELATIVE));
  return [...new Set(list)];
}

export async function findWasm(candidates = wasmCandidates()) {
  for (const path of candidates) if (existsSync(path)) return path;
  throw new Error('engine wasm not found; tried: ' + candidates.join(', '));
}

const square = (i) => 'abcdefgh'[i % 8] + (8 - Math.floor(i / 8));

/** Converts the engine's move object into UCI text ("e2e4", "e7e8q"), or null. */
export function moveToUci(move) {
  if (!move || !Number.isInteger(move.from) || !Number.isInteger(move.to)) return null;
  if (move.from < 0 || move.from > 63 || move.to < 0 || move.to > 63) return null;
  const promo = move.promotion ? String(move.promotion).toLowerCase().slice(0, 1) : '';
  return square(move.from) + square(move.to) + promo;
}

let shared = null;

/** Loads the engine once per process and returns { search, uci, wasmPath }. */
export async function loadEngine(options = {}) {
  if (shared && !options.fresh) return shared;
  const path = await findWasm(options.candidates);
  const bytes = await readFile(path);
  const engine = await WasmEngine.load(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  const api = {
    wasmPath: path,
    searches: 0,
    searchMs: 0,
    /** search(fen, {maxDepth,nodeLimit}) -> {uci, score, depth, move, raw} */
    search(fen, budget) {
      const started = Date.now();
      const raw = engine.search(fen, { maxDepth: budget.maxDepth, nodeLimit: budget.nodeLimit, timeMs: 0, quiesce: true });
      api.searches += 1;
      api.searchMs += Date.now() - started;
      return { uci: moveToUci(raw.move), score: raw.score, depth: raw.depth, move: raw.move, raw };
    },
  };
  if (!options.fresh) shared = api;
  return api;
}

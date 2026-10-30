import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { Chess } from "../rules-src/chess-compat.mjs";
import { DEMO_GAME_PGN } from "../src/game-archive.ts";
import { classifyReviewMove, computeReviewSummary } from "../src/review-metrics.ts";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (path) => readFile(resolve(root, path), "utf8");
const [workerSource, loaderSource, openingsText, wasmBytes] = await Promise.all([
  read("public/engine-worker.js"),
  read("public/vendor/wasm-engine.js"),
  read("public/data/openings.json"),
  readFile(resolve(root, "public/vendor/chessy-ai-fast.wasm"))
]);
const openingRows = JSON.parse(openingsText);
const openingSet = new Set(openingRows.map(row => String(row?.m || "").trim()).filter(Boolean));
const openingBookPrefix = (history, index) => {
  const sequence = history.slice(0, index + 1).map(move => move.san).join(" ");
  for (const line of openingSet) if (line === sequence || line.startsWith(sequence + " ")) return true;
  return false;
};

function createWorkerHarness() {
  let context;
  const messages = [];
  let readyResolve;
  let readyReject;
  const ready = new Promise((resolveReady, rejectReady) => {
    readyResolve = resolveReady;
    readyReject = rejectReady;
  });
  const sandbox = {
    console,
    WebAssembly,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    ArrayBuffer,
    DataView,
    BigInt,
    performance,
    setTimeout,
    clearTimeout,
    fetch: async (url) => {
      if (url !== "/vendor/chessy-ai-fast.wasm") throw new Error("Unexpected engine fetch: " + url);
      return {
        arrayBuffer: async () => wasmBytes.buffer.slice(wasmBytes.byteOffset, wasmBytes.byteOffset + wasmBytes.byteLength)
      };
    },
    postMessage: (message) => {
      if (message === "ready") readyResolve();
      else if (message?.type === "boot-error") readyReject(new Error(message.error || "Engine boot failed"));
      else messages.push(message);
    },
    importScripts: (...urls) => {
      for (const url of urls) {
        if (url !== "/vendor/wasm-engine.js") throw new Error("Unexpected importScripts URL: " + url);
        vm.runInContext(loaderSource, context, { filename: "public/vendor/wasm-engine.js" });
      }
    }
  };
  sandbox.self = sandbox;
  context = vm.createContext(sandbox);
  vm.runInContext(workerSource, context, { filename: "public/engine-worker.js" });

  return ready.then(() => async (request) => {
    messages.length = 0;
    await context.self.onmessage({ data: request });
    const response = messages.find(message => message && message.id === request.id);
    if (!response) throw new Error("Engine worker returned no response for " + request.id);
    if (response.error) throw new Error("Engine worker error for " + request.id + ": " + response.error);
    return response.result;
  });
}

function buildReviewResult(raw, move, index, legalMoveCount, movingPiece, isBookMove) {
  const playedUci = move.from + move.to + (move.promotion || "");
  const classification = classifyReviewMove({
    drop: raw.drop,
    bestUci: raw.bestUci,
    playedUci,
    legalMoveCount,
    isBookMove,
    movingPieceType: movingPiece?.type,
    capturedPieceType: move.captured
  });
  return {
    ...raw,
    playedUci,
    classification,
    whiteChanceBefore: raw.whiteChanceBest,
    whiteChanceAfter: raw.whiteChanceAfter,
    index
  };
}

async function analyzeSameGame(sendEngine, runNumber) {
  const parsed = new Chess();
  parsed.loadPgn(DEMO_GAME_PGN);
  const history = parsed.history({ verbose: true });
  assert.equal(history.length, 7, "Opponent Gamma demo should contain 7 plies");
  assert.equal(parsed.isCheckmate(), true, "Opponent Gamma demo must end in checkmate");
  assert.equal(history.at(-1).san, "Qxf7#", "Demo's final move must remain Qxf7#");

  const replay = new Chess();
  const rows = [];
  for (let index = 0; index < history.length; index++) {
    const move = history[index];
    const before = replay.fen();
    const position = new Chess();
    position.load(before);
    const legalMoveCount = position.moves().length;
    const movingPiece = position.get(move.from);
    const after = new Chess();
    after.load(before);
    after.move({ from: move.from, to: move.to, promotion: move.promotion || undefined });
    const id = "determinism-" + runNumber + "-" + index;
    const raw = await sendEngine({
      id,
      fen: before,
      afterFen: after.fen(),
      mover: { from: move.from, to: move.to, promotion: move.promotion || null }
    });
    rows.push(buildReviewResult(raw, move, index, legalMoveCount, movingPiece, openingBookPrefix(history, index), after.isCheckmate()));
    replay.move({ from: move.from, to: move.to, promotion: move.promotion || undefined });
  }
  return { moves: rows, summary: computeReviewSummary(rows) };
}

function firstDifference(expected, actual) {
  if (JSON.stringify(expected.summary) !== JSON.stringify(actual.summary)) {
    return "summary: expected " + JSON.stringify(expected.summary) + " but got " + JSON.stringify(actual.summary);
  }
  for (let index = 0; index < Math.max(expected.moves.length, actual.moves.length); index++) {
    const left = expected.moves[index];
    const right = actual.moves[index];
    if (JSON.stringify(left) !== JSON.stringify(right)) {
      const keys = new Set([...Object.keys(left || {}), ...Object.keys(right || {})]);
      for (const key of keys) {
        if (JSON.stringify(left?.[key]) !== JSON.stringify(right?.[key])) {
          return "ply " + (index + 1) + ", field " + key + ": expected " + JSON.stringify(left?.[key]) + " but got " + JSON.stringify(right?.[key]);
        }
      }
      return "ply " + (index + 1) + " differs";
    }
  }
  return null;
}

const sendEngine = await createWorkerHarness();
const runs = [];
for (let run = 1; run <= 5; run++) {
  const result = await analyzeSameGame(sendEngine, run);
  runs.push(result);
  if (run > 1) {
    const difference = firstDifference(runs[0], result);
    assert.equal(difference, null, "Non-deterministic review result on run " + run + ": " + difference);
  }
  console.log("PASS: review engine run " + run + "/5 — " + result.moves.length + " plies; White accuracy " +
    result.summary.whiteAcc.toFixed(1) + "% / rating " + result.summary.whiteRating +
    "; Black accuracy " + result.summary.blackAcc.toFixed(1) + "% / rating " + result.summary.blackRating);
}

const metricRuns = [];
for (let run = 1; run <= 5; run++) {
  metricRuns.push(computeReviewSummary(runs[0].moves));
}
for (let run = 1; run < metricRuns.length; run++) {
  assert.deepEqual(metricRuns[run], metricRuns[0], "Accuracy/rating calculation changed on metrics run " + (run + 1));
}
for (let run = 1; run < runs.length; run++) {
  assert.deepEqual(runs[run].summary, runs[0].summary, "Game summary differs after review run " + (run + 1));
}

console.log("PASS: accuracy/rating calculations 5/5 identical on the same analyzed game.");
console.log("PASS: all five full review runs are identical, including move evaluations, classifications, accuracy and game ratings.");
console.log("BASELINE: " + JSON.stringify(runs[0].summary));

// Scores the game-review pipeline against reference reviews in scripts/fixtures/review-benchmark/games.json.
//
// Usage: node scripts/review-benchmark.mjs [--root <checkout>] [--fixtures <games.json>] [--out <result.json>]
//
// --root selects the code under test (engine worker, WASM engine, opening book, rules, review-metrics.ts),
// so CI can score a base checkout and a PR checkout with the same harness and fixtures.
//
// The per-move loop is analyzeGameMoves() from src/review-metrics.ts, the same function the Review
// screen and Chess DNA call, so the benchmark measures the code the app runs. Older checkouts
// without that export are scored with legacyAnalyzeGameMoves() below.
import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

export const SEVERITY_BUCKETS = ["ok", "inaccuracy", "mistake", "blunder", "miss"];
export const APP_PLY_TIMEOUT_MS = 9000;

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const args = { root: scriptRoot, fixtures: resolve(scriptRoot, "scripts/fixtures/review-benchmark/games.json"), out: null };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!["--root", "--fixtures", "--out"].includes(key) || !value) throw new Error("Unknown or incomplete argument: " + key);
    args[key.slice(2)] = resolve(value);
    i++;
  }
  return args;
}

export function severityBucket(classification) {
  return SEVERITY_BUCKETS.includes(classification) ? classification : "ok";
}

async function createEngine(root) {
  const read = path => readFile(resolve(root, path), "utf8");
  const [workerSource, loaderSource, wasmBytes] = await Promise.all([
    read("public/engine-worker.js"),
    read("public/vendor/wasm-engine.js"),
    readFile(resolve(root, "public/vendor/chessy-ai-fast.wasm"))
  ]);
  let context;
  let readyResolve;
  let readyReject;
  const messages = [];
  const ready = new Promise((ok, fail) => { readyResolve = ok; readyReject = fail; });
  const sandbox = {
    console, WebAssembly, TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, DataView, BigInt, performance, setTimeout, clearTimeout,
    fetch: async url => {
      if (url !== "/vendor/chessy-ai-fast.wasm") throw new Error("Unexpected engine fetch: " + url);
      return { arrayBuffer: async () => wasmBytes.buffer.slice(wasmBytes.byteOffset, wasmBytes.byteOffset + wasmBytes.byteLength) };
    },
    postMessage: message => {
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
  await ready;
  return async request => {
    messages.length = 0;
    await context.self.onmessage({ data: request });
    const response = messages.find(message => message?.id === request.id);
    if (!response) throw new Error("Engine worker returned no response for " + request.id);
    if (response.error) throw new Error("Engine worker error for " + request.id + ": " + response.error);
    return response.result;
  };
}

const round1 = n => Math.round(n * 10) / 10;

// Fallback for base checkouts that predate analyzeGameMoves() in src/review-metrics.ts.
// It mirrors the per-move loop src/main.ts had before that function was extracted.
async function legacyAnalyzeGameMoves(history, { Chess, analyzePosition, openingLines, onMoveAnalyzed }, classifyReviewMove) {
  const bookPrefix = i => {
    const sequence = history.slice(0, i + 1).map(move => move.san).join(" ");
    for (const line of openingLines) if (line === sequence || line.startsWith(sequence + " ")) return true;
    return false;
  };
  const results = [];
  const replay = new Chess();
  for (let i = 0; i < history.length; i++) {
    const mover = history[i];
    const before = replay.fen();
    const temp = new Chess();
    temp.load(before);
    const playedUci = mover.from + mover.to + (mover.promotion || "");
    const afterState = new Chess();
    afterState.load(before);
    if (!afterState.move({ from: mover.from, to: mover.to, promotion: mover.promotion || undefined })) throw new Error("Illegal move at ply " + (i + 1));
    const r = await analyzePosition(before, afterState.fen(), mover);
    const moverColor = before.split(" ")[1] === "w" ? "w" : "b";
    const isMateMove = Boolean(r.isMateMove || afterState.isCheckmate());
    const classification = classifyReviewMove({
      drop: isMateMove ? 0 : r.drop,
      bestUci: r.bestUci,
      playedUci,
      legalMoveCount: temp.moves().length,
      isBookMove: bookPrefix(i),
      movingPieceType: temp.get(mover.from)?.type,
      capturedPieceType: mover.captured,
      moverChanceBefore: moverColor === "w" ? r.whiteChanceBest : 100 - r.whiteChanceBest,
      moverChanceAfter: moverColor === "w" ? r.whiteChanceAfter : 100 - r.whiteChanceAfter,
      isMateMove
    });
    results.push({ ...r, playedUci, classification, whiteChanceBefore: r.whiteChanceBest, whiteChanceAfter: r.whiteChanceAfter, index: i });
    replay.move({ from: mover.from, to: mover.to, promotion: mover.promotion || undefined });
    onMoveAnalyzed(i, history.length);
  }
  return results;
}

async function scoreGame(game, { Chess, metrics, openingSet, engine }) {
  const parsed = new Chess();
  parsed.loadPgn(game.pgn);
  const history = parsed.history({ verbose: true });
  if (history.length !== game.plies.length) {
    throw new Error(game.id + ": PGN has " + history.length + " plies but the fixture lists " + game.plies.length);
  }
  history.forEach((move, i) => {
    if (move.san !== game.plies[i].san) throw new Error(game.id + ": ply " + (i + 1) + " is " + move.san + " in the PGN but " + game.plies[i].san + " in the fixture");
    if (!SEVERITY_BUCKETS.includes(game.plies[i].ref)) throw new Error(game.id + ": ply " + (i + 1) + " has unknown reference bucket " + game.plies[i].ref);
  });

  let requestId = 0;
  const analyzePosition = (fen, afterFen, mover) =>
    engine({ id: game.id + "-" + (requestId++), fen, afterFen, mover: { from: mover.from, to: mover.to, promotion: mover.promotion || null } });
  const plyMs = [];
  let lastMark = performance.now();
  const onMoveAnalyzed = () => {
    const now = performance.now();
    plyMs.push(Math.round(now - lastMark));
    lastMark = now;
  };
  const options = { Chess, analyzePosition, openingLines: openingSet, onMoveAnalyzed };
  const results = typeof metrics.analyzeGameMoves === "function"
    ? await metrics.analyzeGameMoves(history, options)
    : await legacyAnalyzeGameMoves(history, options, metrics.classifyReviewMove);

  const plies = results.map((r, i) => ({
    ply: (Math.floor(i / 2) + 1) + (i % 2 ? "..." : ".") + " " + history[i].san,
    ref: game.plies[i].ref,
    classification: r.classification,
    bucket: severityBucket(r.classification),
    dropPct: round1((r.drop ?? 0) * 100),
    bestUci: r.bestUci,
    depth: r.depth,
    ms: plyMs[i] ?? 0
  }));
  const summary = metrics.computeReviewSummary(results);
  const ref = game.reference;
  return {
    id: game.id,
    plies,
    agreement: plies.filter(p => p.bucket === p.ref).length,
    total: plies.length,
    accuracy: { white: summary.whiteAcc, black: summary.blackAcc },
    rating: { white: summary.whiteRating, black: summary.blackRating },
    reference: ref,
    accuracyError: { white: round1(Math.abs(summary.whiteAcc - ref.whiteAccuracy)), black: round1(Math.abs(summary.blackAcc - ref.blackAccuracy)) },
    ratingError: { white: Math.abs(summary.whiteRating - ref.whiteRating), black: Math.abs(summary.blackRating - ref.blackRating) },
    counts: summary.counts
  };
}

export async function runBenchmark({ root, fixtures }) {
  const { Chess } = await import(pathToFileURL(resolve(root, "rules-src/chess-compat.mjs")).href);
  const metrics = await import(pathToFileURL(resolve(root, "src/review-metrics.ts")).href);
  const openingRows = JSON.parse(await readFile(resolve(root, "public/data/openings.json"), "utf8"));
  const openingSet = new Set(openingRows.map(row => String(row?.m || "").trim()).filter(Boolean));
  const engine = await createEngine(root);
  const { games } = JSON.parse(await readFile(fixtures, "utf8"));

  const scored = [];
  for (const game of games) scored.push(await scoreGame(game, { Chess, metrics, openingSet, engine }));

  const allPlies = scored.flatMap(game => game.plies);
  const sideErrors = scored.flatMap(game => [game.accuracyError.white, game.accuracyError.black]);
  const ratingErrors = scored.flatMap(game => [game.ratingError.white, game.ratingError.black]);
  const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  return {
    games: scored,
    totals: {
      games: scored.length,
      plies: allPlies.length,
      agreement: scored.reduce((sum, game) => sum + game.agreement, 0),
      accuracyMae: round1(mean(sideErrors)),
      ratingMae: Math.round(mean(ratingErrors)),
      maxPlyMs: Math.max(0, ...allPlies.map(p => p.ms)),
      totalMs: allPlies.reduce((sum, p) => sum + p.ms, 0)
    }
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  const result = await runBenchmark(args);
  if (args.out) await writeFile(args.out, JSON.stringify(result, null, 2) + "\n");
  const t = result.totals;
  for (const game of result.games) {
    console.log(game.id + ": agreement " + game.agreement + "/" + game.total +
      "; accuracy W " + game.accuracy.white + "% (ref " + game.reference.whiteAccuracy + ") / B " + game.accuracy.black + "% (ref " + game.reference.blackAccuracy + ")" +
      "; rating W " + game.rating.white + " (ref " + game.reference.whiteRating + ") / B " + game.rating.black + " (ref " + game.reference.blackRating + ")");
  }
  console.log("TOTAL: agreement " + t.agreement + "/" + t.plies + "; accuracy MAE " + t.accuracyMae + "; rating MAE " + t.ratingMae +
    "; slowest move " + t.maxPlyMs + " ms (app limit " + APP_PLY_TIMEOUT_MS + " ms); total " + t.totalMs + " ms");
}

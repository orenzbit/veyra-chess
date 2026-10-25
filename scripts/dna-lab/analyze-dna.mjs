// Engine DNA analysis of one shard of the selected games, using the app's own review pipeline
// (analyzeGameMoves + the Chessy worker, the same code as the Review screen and Chess DNA).
//
//   node scripts/dna-lab/analyze-dna.mjs --selection=artifacts/dna-lab/selection.json \
//        --shard=0 --shards=20 --out=artifacts/dna-lab/shards [--limit=N]
//
// Writes one JSON line per game with the player's own moves only: review classification, lost win
// chance, phase, capture/check/pawn/king flags, castling and material-sacrifice signals.
import { mkdir, readFile, appendFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, loadChess } from "./roster.mjs";
import { createEngine } from "../review-benchmark.mjs";

const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const [key, ...value] = arg.replace(/^--/, "").split("=");
  return [key, value.join("=") || "true"];
}));
const selection = JSON.parse(await readFile(resolve(args.selection), "utf8"));
const shard = Number(args.shard || 0);
const shards = Number(args.shards || 1);
const limit = args.limit ? Number(args.limit) : Infinity;
const outDir = resolve(args.out || "artifacts/dna-lab/shards");

const Chess = await loadChess();
const metrics = await import(pathToFileURL(resolve(ROOT, "src/review-metrics.ts")).href);
const openingRows = JSON.parse(await readFile(resolve(ROOT, "public/data/openings.json"), "utf8"));
const openingLines = new Set(openingRows.map(row => String(row?.m || "").trim()).filter(Boolean));
const engine = await createEngine(ROOT);

const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
function materialBalance(board, colour) {
  let score = 0;
  for (const row of board) for (const piece of row) if (piece) score += (piece.color === colour ? 1 : -1) * VALUE[piece.type];
  return score;
}
function nonPawnPieces(board) {
  let count = 0;
  for (const row of board) for (const piece of row) if (piece && piece.type !== "p" && piece.type !== "k") count++;
  return count;
}
/** opening: first 20 plies; endgame: at most 6 queens/rooks/minor pieces left on the board; middlegame otherwise. */
function phaseOf(ply, board) {
  if (ply < 20) return "opening";
  return nonPawnPieces(board) <= 6 ? "endgame" : "middlegame";
}

const games = selection.games.filter((_, index) => index % shards === shard).slice(0, limit);
await mkdir(outDir, { recursive: true });
const outFile = join(outDir, "shard-" + shard + ".jsonl");
await writeFile(outFile, "");
const started = Date.now();
let requestId = 0;
for (const [gameIndex, game] of games.entries()) {
  const parsed = new Chess();
  parsed.loadPgn(game.pgn, { sloppy: true });
  const history = parsed.history({ verbose: true });
  const gameStarted = Date.now();
  const results = await metrics.analyzeGameMoves(history, {
    Chess,
    analyzePosition: (fen, afterFen, mover, cachedBefore) => engine({ id: "dna-" + (requestId++), fen, afterFen, mover: { from: mover.from, to: mover.to, promotion: mover.promotion || null }, cachedBefore }),
    openingLines
  });
  const summary = metrics.computeReviewSummary(results);

  // Replay once more to read boards for phase and material signals.
  const boards = [];
  const replay = new Chess();
  boards.push(replay.board());
  for (const move of history) {
    replay.move({ from: move.from, to: move.to, promotion: move.promotion || undefined });
    boards.push(replay.board());
  }
  const moves = [];
  let castled = null;
  for (let i = 0; i < history.length; i++) {
    const move = history[i];
    if (move.color !== game.color) continue;
    const before = materialBalance(boards[i], game.color);
    const afterReply = i + 2 < boards.length ? materialBalance(boards[i + 2], game.color) : null;
    const afterNext = i + 3 < boards.length ? materialBalance(boards[i + 3], game.color) : null;
    const sacrifice = afterReply !== null && afterNext !== null && afterReply <= before - 2 && afterNext <= before - 2;
    const r = results[i];
    if (!castled && /^O-O/.test(move.san)) castled = { ply: i + 1, side: move.san.startsWith("O-O-O") ? "queenside" : "kingside" };
    moves.push({
      ply: i + 1,
      phase: phaseOf(i, boards[i]),
      cls: r.classification,
      drop: Math.round((r.drop ?? 0) * 1000) / 1000,
      best: r.bestUci === move.from + move.to + (move.promotion || ""),
      piece: move.piece,
      capture: Boolean(move.captured),
      check: /[+#]/.test(move.san),
      sacrifice,
      soundSacrifice: sacrifice && (r.drop ?? 1) <= 0.05
    });
  }
  const row = {
    chunkIndex: game.chunkIndex,
    color: game.color,
    year: game.year,
    opponentElo: game.opponentElo,
    result: game.result,
    plies: history.length,
    accuracy: game.color === "w" ? summary.whiteAcc : summary.blackAcc,
    castled,
    moves,
    ms: Date.now() - gameStarted
  };
  await appendFile(outFile, JSON.stringify(row) + "\n");
  console.log("shard " + shard + ": game " + (gameIndex + 1) + "/" + games.length + " (" + history.length + " plies, " + row.ms + " ms, accuracy " + row.accuracy + ")");
}
console.log("shard " + shard + " done: " + games.length + " games in " + Math.round((Date.now() - started) / 1000) + " s");

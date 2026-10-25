// Conformance planning for one bot: picks test positions from the player's holdout games and runs
// the cheap checks (openings O1–O3, user-visible name scan N1). The expensive bot-move checks run in
// conformance-shard.mjs on the positions written here.
//
//   node scripts/dna-lab/conformance-plan.mjs --bot=1 --dna=docs/bots/01-.../DNA.md --count=150 \
//        --out=artifacts/dna-lab/conformance/plan.json
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, identifyGames, loadChess, loadProfile, loadSource } from "./roster.mjs";
import { RESULTS, isClassical } from "./filters.mjs";

const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const [key, ...value] = arg.replace(/^--/, "").split("=");
  return [key, value.join("=") || "true"];
}));
const botNumber = Number(args.bot);
const count = Number(args.count || 150);
const out = resolve(args.out || "artifacts/dna-lab/conformance/plan.json");
const dnaText = await readFile(resolve(args.dna), "utf8");
const dna = JSON.parse(dnaText.split("<!-- dna-data:start -->")[1].split("<!-- dna-data:end -->")[0].replace(/```json|```/g, ""));

const Chess = await loadChess();
const { chooseBotMove, preferredOpeningMove } = await import(pathToFileURL(resolve(ROOT, "src/bot-engine.ts")).href);
const bot = await loadProfile(botNumber);
const { hasRealName } = await loadSource(botNumber);
const { games } = await identifyGames(botNumber);

// ---- N1: real-name scan over user-visible fields -------------------------------------------------
const INTERNAL = new Set(["id", "slug", "sourceFile", "sourceNote", "sourceSha256", "ratingSourceUrl", "holdoutPositions", "exampleGames", "styleProfile", "openingsAsWhite", "openingsAsBlack", "gambits", "styleMetrics", "styleAssessment"]);
const nameHits = [];
function scan(value, path) {
  if (typeof value === "string") { if (hasRealName(value)) nameHits.push(path); return; }
  if (Array.isArray(value)) { value.forEach((item, index) => scan(item, path + "[" + index + "]")); return; }
  if (value && typeof value === "object") for (const [key, item] of Object.entries(value)) if (!(key === "id" && path.includes("phraseArchive"))) scan(item, path + "." + key);
}
for (const [key, value] of Object.entries(bot)) if (!INTERNAL.has(key)) scan(value, key);

// ---- Openings O1–O3 ------------------------------------------------------------------------------
const tvd = (a, b) => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return Math.round([...keys].reduce((sum, key) => sum + Math.abs((a[key] || 0) - (b[key] || 0)), 0) / 2 * 1000) / 1000;
};
const toShares = rows => {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return Object.fromEntries(rows.map(row => [row.move, total ? row.count / total : 0]));
};
function botDistribution(fen, runs = 200) {
  const counts = {};
  const position = () => (fen ? new Chess(fen) : new Chess());
  const fromBook = Boolean(preferredOpeningMove(position(), bot, Chess));
  const n = fromBook ? runs : 1;
  for (let i = 0; i < n; i++) {
    const move = chooseBotMove(position(), bot, Chess);
    counts[move.san] = (counts[move.san] || 0) + 1;
  }
  return { fromBook, runs: n, shares: Object.fromEntries(Object.entries(counts).map(([san, c]) => [san, c / n])) };
}
const openings = dna.openings.training;
const whitePlayer = toShares(openings.white.firstMoves);
const whiteBot = botDistribution(null);
const o1 = { player: whitePlayer, bot: whiteBot.shares, fromBook: whiteBot.fromBook, tvd: tvd(whitePlayer, whiteBot.shares) };
const o2 = [];
for (const [first, replies] of Object.entries(openings.black.replies).slice(0, 4)) {
  const board = new Chess();
  board.move(first, { sloppy: true });
  const player = toShares(replies);
  const result = botDistribution(board.fen());
  o2.push({ first, player, bot: result.shares, fromBook: result.fromBook, tvd: tvd(player, result.shares) });
}
const o3 = dna.openings.repertoireCoverageHoldout;

// ---- Test positions --------------------------------------------------------------------------------
const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const nonPawnPieces = board => board.flat().filter(piece => piece && piece.type !== "p" && piece.type !== "k").length;
const phaseOf = (ply, board) => (ply < 20 ? "opening" : nonPawnPieces(board) <= 6 ? "endgame" : "middlegame");
const holdout = games.filter(game => game.holdout && isClassical(game.headers) && game.plies >= 20 && RESULTS.has(game.headers.Result)).sort((a, b) => a.chunkIndex - b.chunkIndex);
const candidates = { opening: [], middlegame: [], endgame: [] };
for (const game of holdout) {
  const replay = new Chess();
  const byPhase = { opening: [], middlegame: [], endgame: [] };
  const parsed = new Chess();
  parsed.loadPgn(game.pgn, { sloppy: true });
  const history = parsed.history({ verbose: true });
  for (let i = 0; i < history.length; i++) {
    const move = history[i];
    if (i >= 10 && move.color === game.color) {
      byPhase[phaseOf(i, replay.board())].push({
        chunkIndex: game.chunkIndex, ply: i + 1, color: game.color, fen: replay.fen(),
        player: { uci: move.from + move.to + (move.promotion || ""), san: move.san, capture: Boolean(move.captured), check: /[+#]/.test(move.san), pawn: move.piece === "p" }
      });
    }
    replay.move({ from: move.from, to: move.to, promotion: move.promotion || undefined });
  }
  for (const phase of Object.keys(byPhase)) {
    const list = byPhase[phase];
    if (list.length) candidates[phase].push({ ...list[Math.floor(list.length / 2)], phase });
  }
}
const quota = { opening: Math.round(count * 0.2), middlegame: Math.round(count * 0.47) };
quota.endgame = count - quota.opening - quota.middlegame;
const spread = (list, n) => (list.length <= n ? list : Array.from({ length: n }, (_, i) => list[Math.floor((i * list.length) / n)]));
let positions = [...spread(candidates.opening, quota.opening), ...spread(candidates.endgame, quota.endgame)];
const used = new Set(positions.map(p => p.chunkIndex + ":" + p.ply));
positions.push(...spread(candidates.middlegame.filter(p => !used.has(p.chunkIndex + ":" + p.ply)), count - positions.length));
positions = positions.map((position, index) => ({ index, ...position }));

const plan = {
  bot: botNumber,
  alias: dna.alias,
  createdAt: new Date().toISOString(),
  holdoutGames: holdout.length,
  positions,
  phaseCounts: Object.fromEntries(["opening", "middlegame", "endgame"].map(phase => [phase, positions.filter(p => p.phase === phase).length])),
  n1: { fieldsWithRealName: nameHits },
  openings: { o1, o2, o3 }
};
await mkdir(dirname(out), { recursive: true });
await writeFile(out, JSON.stringify(plan) + "\n");
console.log("#" + botNumber + ": " + positions.length + " test positions from " + holdout.length + " classical test games " + JSON.stringify(plan.phaseCounts) +
  "; N1 hits " + nameHits.length + "; O1 tvd " + o1.tvd + "; O2 tvd " + o2.map(row => row.first + "=" + row.tvd).join(" "));

// Merges DNA shards into the player DNA report (DNA.md): readable tables plus an embedded data block
// (between the dna-data markers) that the conformance checks read.
//
//   node scripts/dna-lab/build-dna-report.mjs --selection=artifacts/dna-lab/selection.json \
//        --shards=artifacts/dna-lab/shards --out=docs/bots/01-lightning-strategist/DNA.md
//
// Only roster numbers and aliases are printed; no player names, events or PGN headers.
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const [key, ...value] = arg.replace(/^--/, "").split("=");
  return [key, value.join("=") || "true"];
}));
const selection = JSON.parse(await readFile(resolve(args.selection), "utf8"));
const shardDir = resolve(args.shards);
const out = resolve(args.out);

const rows = [];
for (const file of (await readdir(shardDir)).filter(name => /^shard-\d+\.jsonl$/.test(name)).sort()) {
  for (const line of (await readFile(join(shardDir, file), "utf8")).split("\n")) if (line.trim()) rows.push(JSON.parse(line));
}
const expected = new Set(selection.games.map(game => game.chunkIndex));
const seen = new Set(rows.map(row => row.chunkIndex));
const missing = [...expected].filter(index => !seen.has(index));
if (rows.length !== seen.size) throw new Error("Duplicate games across shards");

const round = (value, digits = 1) => (value === null || Number.isNaN(value) ? null : Math.round(value * 10 ** digits) / 10 ** digits);
const pct = (part, whole) => (whole ? round((100 * part) / whole) : null);
const per100 = (part, whole) => (whole ? round((100 * part) / whole) : null);
const mean = values => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
const median = values => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const CLASSES = ["brilliant", "great", "best", "excellent", "good", "book", "forced", "inaccuracy", "mistake", "miss", "blunder"];
const moves = rows.flatMap(row => row.moves);
const outcome = row => (row.result === "1/2-1/2" ? "draw" : (row.result === "1-0") === (row.color === "w") ? "win" : "loss");

function moveStats(list) {
  const counts = Object.fromEntries(CLASSES.map(name => [name, 0]));
  for (const move of list) counts[move.cls] = (counts[move.cls] || 0) + 1;
  const judged = list.filter(move => move.cls !== "book" && move.cls !== "forced");
  return {
    moves: list.length,
    averageLostWinChancePercent: round(100 * (mean(judged.map(move => move.drop)) ?? 0), 2),
    bestMovePercent: pct(list.filter(move => move.best).length, list.length),
    per100: Object.fromEntries(CLASSES.map(name => [name, per100(counts[name], list.length)])),
    errorsPer100: per100(list.filter(move => ["inaccuracy", "mistake", "miss", "blunder"].includes(move.cls)).length, list.length)
  };
}

const pieceUse = Object.fromEntries(["p", "n", "b", "r", "q", "k"].map(piece => [piece, pct(moves.filter(move => move.piece === piece).length, moves.length)]));
const endgameMoves = moves.filter(move => move.phase === "endgame");
const castledRows = rows.filter(row => row.castled);
const dna = {
  schema: 1,
  bot: selection.bot,
  alias: selection.alias,
  createdAt: new Date().toISOString(),
  engine: "Veyra review engine (Chessy WASM, analyzeGameMoves; same code as Review and Chess DNA)",
  sample: {
    requested: selection.requested,
    analysed: rows.length,
    missing: missing.length,
    white: rows.filter(row => row.color === "w").length,
    black: rows.filter(row => row.color === "b").length,
    playerMoves: moves.length,
    yearRange: selection.yearRange,
    opponentElo: selection.opponentElo,
    criteria: selection.criteria,
    counts: selection.counts
  },
  results: {
    winPercent: pct(rows.filter(row => outcome(row) === "win").length, rows.length),
    drawPercent: pct(rows.filter(row => outcome(row) === "draw").length, rows.length),
    lossPercent: pct(rows.filter(row => outcome(row) === "loss").length, rows.length),
    averagePlies: round(mean(rows.map(row => row.plies)))
  },
  accuracy: {
    mean: round(mean(rows.map(row => row.accuracy))),
    median: round(median(rows.map(row => row.accuracy))),
    asWhite: round(mean(rows.filter(row => row.color === "w").map(row => row.accuracy))),
    asBlack: round(mean(rows.filter(row => row.color === "b").map(row => row.accuracy)))
  },
  moves: moveStats(moves),
  phases: Object.fromEntries(["opening", "middlegame", "endgame"].map(phase => [phase, moveStats(moves.filter(move => move.phase === phase))])),
  style: {
    capturesPer100Moves: per100(moves.filter(move => move.capture).length, moves.length),
    checksPer100Moves: per100(moves.filter(move => move.check).length, moves.length),
    pawnMovesPer100Moves: per100(moves.filter(move => move.piece === "p").length, moves.length),
    pieceUsePercent: pieceUse,
    endgameKingMovesPer100EndgameMoves: per100(endgameMoves.filter(move => move.piece === "k").length, endgameMoves.length),
    castledPercent: pct(castledRows.length, rows.length),
    averageCastlingMove: round(mean(castledRows.map(row => Math.ceil(row.castled.ply / 2)))),
    kingsideCastlingPercent: pct(castledRows.filter(row => row.castled.side === "kingside").length, castledRows.length),
    sacrificesPer100Games: per100(moves.filter(move => move.sacrifice).length, rows.length),
    soundSacrificesPer100Games: per100(moves.filter(move => move.soundSacrifice).length, rows.length),
    soundSacrificeSharePercent: pct(moves.filter(move => move.soundSacrifice).length, moves.filter(move => move.sacrifice).length)
  },
  openings: selection.openings
};

const table = (headers, body) => ["| " + headers.join(" | ") + " |", "|" + headers.map(() => "---").join("|") + "|", ...body.map(cells => "| " + cells.join(" | ") + " |")].join("\n");
const fmt = value => (value === null || value === undefined ? "n/a" : String(value));
const phaseRow = (name, stats) => [name, stats.moves, fmt(stats.bestMovePercent) + "%", fmt(stats.averageLostWinChancePercent) + "%", fmt(stats.per100.inaccuracy), fmt(stats.per100.mistake), fmt(stats.per100.miss), fmt(stats.per100.blunder)];
const op = dna.openings.training;
const md = [
  "# #" + dna.bot + " " + dna.alias + " — player DNA",
  "",
  "Generated " + dna.createdAt.slice(0, 10) + " by `scripts/dna-lab` from the bot's source games. The bot is an independent bot inspired by measured play patterns; it is not the historical player.",
  "",
  "## Sample",
  "",
  "- **Analysed with the engine:** " + dna.sample.analysed + " games (" + dna.sample.white + " as White, " + dna.sample.black + " as Black), " + dna.sample.playerMoves + " of the player's own moves." + (dna.sample.missing ? " **" + dna.sample.missing + " selected games are missing from the shards.**" : ""),
  "- **Chosen from:** " + dna.sample.counts.qualifying + " qualifying classical training games (out of " + dna.sample.counts.training + " training games and " + dna.sample.counts.identified + " identified games in total; the " + dna.sample.counts.holdout + " test games are kept apart).",
  "- **Years:** " + (dna.sample.yearRange || ["n/a"]).join("–") + ". **Opponent rating:** " + (dna.sample.opponentElo ? "average " + dna.sample.opponentElo.average + " (" + dna.sample.opponentElo.min + "–" + dna.sample.opponentElo.max + ", recorded in " + dna.sample.opponentElo.gamesWithElo + " games)" : "not recorded in the source"),
  "- **Selection rules:** " + dna.sample.criteria.join("; ") + ".",
  "- **Engine:** " + dna.engine + ".",
  "",
  "## Results and accuracy in the sample",
  "",
  table(["Wins", "Draws", "Losses", "Average length", "Accuracy (mean)", "Median", "As White", "As Black"], [[
    fmt(dna.results.winPercent) + "%", fmt(dna.results.drawPercent) + "%", fmt(dna.results.lossPercent) + "%", fmt(dna.results.averagePlies) + " plies",
    fmt(dna.accuracy.mean), fmt(dna.accuracy.median), fmt(dna.accuracy.asWhite), fmt(dna.accuracy.asBlack)
  ]]),
  "",
  "Accuracy and labels use Veyra's own review scale (Chessy engine, about 6 plies deep), so they are comparable between bots and with the app's Review screen, not with other sites.",
  "",
  "## Move quality by game phase",
  "",
  "Opening = the first 20 plies; endgame = at most 6 queens, rooks and minor pieces left; middlegame otherwise. Error columns are per 100 of the player's moves in that phase.",
  "",
  table(["Phase", "Moves", "Engine's best move", "Average lost win chance", "Inaccuracies", "Mistakes", "Misses", "Blunders"], [
    phaseRow("All", dna.moves), ...["opening", "middlegame", "endgame"].map(phase => phaseRow(phase, dna.phases[phase]))
  ]),
  "",
  "## Playing style",
  "",
  table(["Signal", "Value"], [
    ["Captures per 100 moves", fmt(dna.style.capturesPer100Moves)],
    ["Checks per 100 moves", fmt(dna.style.checksPer100Moves)],
    ["Pawn moves per 100 moves", fmt(dna.style.pawnMovesPer100Moves)],
    ["Moves by piece (P / N / B / R / Q / K)", ["p", "n", "b", "r", "q", "k"].map(piece => fmt(dna.style.pieceUsePercent[piece]) + "%").join(" / ")],
    ["King moves per 100 endgame moves", fmt(dna.style.endgameKingMovesPer100EndgameMoves)],
    ["Games where the player castled", fmt(dna.style.castledPercent) + "%"],
    ["Average castling move", fmt(dna.style.averageCastlingMove)],
    ["Kingside share of castling", fmt(dna.style.kingsideCastlingPercent) + "%"],
    ["Material sacrifices per 100 games", fmt(dna.style.sacrificesPer100Games)],
    ["Sound sacrifices per 100 games (lost win chance ≤ 5%)", fmt(dna.style.soundSacrificesPer100Games)],
    ["Share of sacrifices that were sound", fmt(dna.style.soundSacrificeSharePercent) + "%"]
  ]),
  "",
  "A sacrifice here means the player's material balance is at least 2 pawns lower both after the opponent's reply and after the player's next move. It is a measurable signal, not a judgement of intent.",
  "",
  "## Openings (all " + (op.white.games + op.black.games) + " training games, no engine needed)",
  "",
  "**As White — first move:** " + op.white.firstMoves.map(row => "1." + row.move + " " + pct(row.count, op.white.games) + "%").join(", ") + ".",
  "",
  "**As Black — replies:**",
  "",
  table(["White's first move", "Player's replies"], Object.entries(op.black.replies).map(([first, replies]) => {
    const total = replies.reduce((a, b) => a + b.count, 0);
    return ["1." + first, replies.map(row => "1..." + row.move + " (" + row.count + ")").join(", ") + " — " + total + " games shown"];
  })),
  "",
  "**Most frequent first 8 plies:**",
  "",
  table(["Colour", "Line", "Games"], [
    ...op.white.topLines.slice(0, 6).map(row => ["White", row.line, row.count]),
    ...op.black.topLines.slice(0, 6).map(row => ["Black", row.line, row.count])
  ]),
  "",
  "**How much of the player's play the bot's current repertoire covers** (first 6 plies match a repertoire line):",
  "",
  table(["Games", "As White", "As Black"], [
    ["Training", fmt(dna.openings.repertoireCoverageTraining.white.percent) + "% of " + dna.openings.repertoireCoverageTraining.white.games, fmt(dna.openings.repertoireCoverageTraining.black.percent) + "% of " + dna.openings.repertoireCoverageTraining.black.games],
    ["Test (holdout)", fmt(dna.openings.repertoireCoverageHoldout.white.percent) + "% of " + dna.openings.repertoireCoverageHoldout.white.games, fmt(dna.openings.repertoireCoverageHoldout.black.percent) + "% of " + dna.openings.repertoireCoverageHoldout.black.games]
  ]),
  "",
  "## Limits",
  "",
  "- The engine searches about 6 plies deep; deep combinations can be misjudged in both directions.",
  "- The sample favours classical games against the strongest recorded opposition, so it describes the player's serious play, not blitz or simultaneous exhibitions.",
  "- Style signals describe frequency, not intent. They are compared with the bot's own play in the conformance checks (REPORT.md).",
  "",
  "<!-- dna-data:start -->",
  "```json",
  JSON.stringify(dna, null, 2),
  "```",
  "<!-- dna-data:end -->",
  ""
].join("\n");
await mkdir(dirname(out), { recursive: true });
await writeFile(out, md);
console.log("DNA report: " + rows.length + " games, " + moves.length + " player moves, accuracy " + dna.accuracy.mean + (missing.length ? "; MISSING " + missing.length : "") + " -> " + out);
if (missing.length) process.exitCode = 1;

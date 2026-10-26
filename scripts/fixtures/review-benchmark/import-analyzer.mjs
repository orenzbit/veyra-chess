// One-off import: turns games_review_system_improvement/100_GAMES_COMPARISON.json (Oren's 100-game
// comparison, labelled by the external Chess_analyzer tool with Stockfish) into a label-only reference
// set for scripts/review-benchmark.mjs.
//
//   node scripts/fixtures/review-benchmark/import-analyzer.mjs
//
// Only moves and labels are kept (no player names or event headers). Chess960 and other games that do not
// start from the standard position are skipped, because the Review screen only analyzes standard chess.
// Every 4th game is marked for the quick CI subset; all games run locally with `npm run bench:review`.
import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const { Chess } = await import(pathToFileURL(resolve(root, "rules-src/chess-compat.mjs")).href);
const source = JSON.parse(await readFile(resolve(root, "games_review_system_improvement/100_GAMES_COMPARISON.json"), "utf8"));
const SEVERITY = new Set(["inaccuracy", "mistake", "blunder", "miss"]);

const isStandard = game => (!game.headers.Variant || game.headers.Variant === "Standard") && !game.headers.FEN && !game.headers.SetUp;
const skipped = source.filter(game => !isStandard(game)).map(game => game.game_id);

const games = source.filter(isStandard).map(game => {
  const sans = game.moves.map(move => move.san);
  const pgn = sans.map((san, index) => (index % 2 === 0 ? (index / 2 + 1) + ". " : "") + san).join(" ") + " " + (game.headers.Result || "*");
  const check = new Chess();
  check.loadPgn(pgn);
  if (check.history().length !== sans.length) throw new Error("Game " + game.game_id + ": PGN replays " + check.history().length + " of " + sans.length + " plies");
  return {
    id: "analyzer-" + String(game.game_id).padStart(3, "0"),
    ci: game.game_id % 4 === 1,
    pgn,
    plies: game.moves.map(move => {
      const label = String(move.chess_analyzer.classification).toLowerCase();
      return { san: move.san, ref: SEVERITY.has(label) ? label : "ok", refLabel: label };
    })
  };
});

const fixture = {
  set: "analyzer-100",
  description: "Label-only reference set: the standard-chess games of Oren's 100-game comparison (Chess960 games skipped), labelled move by move by the external Chess_analyzer tool (Stockfish). Imported from games_review_system_improvement/100_GAMES_COMPARISON.json. This reference is another engine's opinion, not ground truth; it has no accuracy or rating values.",
  referenceLacks: ["book", "forced"],
  games
};
await writeFile(resolve(root, "scripts/fixtures/review-benchmark/analyzer-100.json"), JSON.stringify(fixture, null, 1) + "\n");
console.log("analyzer-100: " + games.length + " games, " + games.reduce((sum, game) => sum + game.plies.length, 0) + " plies, " + games.filter(game => game.ci).length + " in the CI subset; skipped non-standard games " + (skipped.join(", ") || "none"));

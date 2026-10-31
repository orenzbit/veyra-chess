import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Chess } from "../rules-src/chess-compat.mjs";
import { positionAfterPly } from "../src/replay.ts";
import { analyzeGameMoves, isBookPrefix } from "../src/review-metrics.ts";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (path) => readFile(resolve(root, path), "utf8");
const [mainSource, boxSource, css] = await Promise.all([read("src/main.ts"), read("src/fen-box.ts"), read("public/styles.css")]);

// main.ts: one FenBox in the review side panel, fed by the same source as the board.
assert.match(mainSource, /import\s*\{\s*FenBox\s*\}\s*from\s*'\.\/fen-box\.js'/, "main.ts imports FenBox");
assert.equal((mainSource.match(/h\(FenBox,/g) || []).length, 1, "main.ts renders FenBox exactly once");
const reviewStart = mainSource.indexOf("h('aside',{className:'coach-card'}");
const reviewEnd = mainSource.indexOf("className:'classification-note'", reviewStart);
assert.ok(reviewStart > 0 && reviewEnd > reviewStart, "review coach panel found");
const reviewPanel = mainSource.slice(reviewStart, reviewEnd);
assert.ok(reviewPanel.includes("h(FenBox,{fen:(selected>=0&&history.length?positionAfterPly(history,selected):game).fen()})"), "FenBox is in the review coach panel and uses the board's position source");
assert.ok(reviewPanel.indexOf("eval-panel") < reviewPanel.indexOf("h(FenBox"), "FenBox sits under the eval bar");
assert.ok(mainSource.includes("const view=selected>=0&&history.length ? positionAfterPly(history,selected) : game;"), "board still uses the same position source as the FEN");

// fen-box.ts: Hebrew + English strings and the clipboard fallback.
for (const text of ["FEN", "העתק", "Copy", "הועתק ✓", "Copied ✓"]) assert.ok(boxSource.includes(text), `fen-box.ts has "${text}"`);
assert.match(boxSource, /getLang\(\)\s*===\s*'en'/, "fen-box.ts is language aware");
assert.ok(boxSource.includes("navigator.clipboard.writeText"), "uses the async clipboard API");
assert.ok(boxSource.includes("document.execCommand('copy')") && boxSource.includes(".select()"), "falls back to select()+execCommand('copy')");
assert.ok(boxSource.includes("readOnly: true") && boxSource.includes("dir: 'ltr'"), "input is read-only and LTR");
assert.match(boxSource, /failed:\s*'[^']*'/, "has an inline error text");
assert.ok(boxSource.includes("1500"), "copied state lasts about 1.5s");

// styles.css: base rules plus a max-width:520px block covering the review layout.
for (const selector of [".fen-box{", ".fen-box-input{", ".fen-box-copy", ".fen-box-label{"]) assert.ok(css.includes(selector), `styles.css has ${selector}`);
const fenInput = css.match(/\.fen-box-input\{[^}]*\}/)[0];
for (const rule of ["width:100%", "min-width:0", "font-family:ui-monospace", "direction:ltr"]) assert.ok(fenInput.includes(rule), `.fen-box-input has ${rule}`);
const mobileStart = css.indexOf("@media(max-width:520px){", css.indexOf(".fen-box{"));
assert.ok(mobileStart > css.indexOf(".fen-box{"), "a max-width:520px block follows the .fen-box rules");
const mobile = css.slice(mobileStart, css.indexOf("\n}", mobileStart));
for (const selector of [".board-and-coach", ".coach-card", ".eval-panel", ".fen-box"]) assert.ok(mobile.includes(selector), `max-width:520px block covers ${selector}`);

// Every position FenBox can show must be a valid FEN reachable from a real game.
const game = new Chess();
const pgn = "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7";
game.loadPgn(pgn);
const moves = game.history({ verbose: true });
assert.equal(moves.length, 10, "sample game has 10 plies");
const replay = new Chess();
for (const [index, move] of moves.entries()) {
  replay.move({ from: move.from, to: move.to, promotion: move.promotion || undefined });
  const fen = replay.fen();
  assert.equal(fen.split(" ").length, 6, `ply ${index + 1} FEN has six fields`);
  assert.equal(new Chess(fen).fen(), fen, `ply ${index + 1} FEN round-trips`);
}
assert.equal(new Chess().fen(), "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", "start position FEN");

// Replay must start from the game's real first position (SetUp/FEN games, review-board moves).
assert.match(mainSource, /import\s*\{\s*positionAfterPly as replayPositionAfterPly\s*\}\s*from\s*'\.\/replay\.js'/, "main.ts imports the replay helper");
assert.ok(mainSource.includes("function positionAfterPly(history,index){ return replayPositionAfterPly(Chess,history,index); }"), "main.ts positionAfterPly uses the replay helper");
const expectFens = (chessFromStart, label, expected) => {
  const history = chessFromStart.history({ verbose: true });
  assert.equal(history.length, expected.length, `${label}: ply count`);
  history.forEach((_, ply) => assert.equal(positionAfterPly(Chess, history, ply).fen(), expected[ply], `${label}: FEN after ply ${ply + 1}`));
};

const setUpFen = "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1";
const setUpGame = new Chess();
setUpGame.loadPgn(`[SetUp "1"]\n[FEN "${setUpFen}"]\n\n1. e4 Kd7 2. Kd2 *`, { sloppy: true });
const setUpExpected = [];
const setUpReference = new Chess(setUpFen);
for (const san of ["e4", "Kd7", "Kd2"]) {
  setUpReference.move(san);
  setUpExpected.push(setUpReference.fen());
}
assert.equal(setUpExpected[0], "4k3/8/8/8/4P3/8/8/4K3 b - - 0 1", "expected FEN after 1. e4 from the SetUp position");
expectFens(setUpGame, "SetUp/FEN game", setUpExpected);

const midFen = "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3";
const boardCopy = new Chess(midFen);
boardCopy.move("a6");
const boardExpected = [boardCopy.fen()];
expectFens(boardCopy, "history built from a FEN copy", boardExpected);
boardCopy.move("Ba4");
expectFens(boardCopy, "two plies from a FEN copy", [boardExpected[0], boardCopy.fen()]);

// Standard games and out-of-range plies keep working.
const standard = new Chess();
standard.loadPgn("1. e4 e5 2. Nf3 *", { sloppy: true });
const standardHistory = standard.history({ verbose: true });
assert.equal(positionAfterPly(Chess, standardHistory, 2).fen(), standard.fen(), "standard game replays from the standard start");
assert.equal(positionAfterPly(Chess, standardHistory, 99).fen(), standard.fen(), "ply beyond the end clamps to the final position");

// The review analysis must seed from the same start position as the board.
const seen = [];
const stubEngine = async (before, afterFen) => {
  seen.push([before, afterFen]);
  return { whiteChanceBest: 50, whiteChanceAfter: 50, drop: 0, bestUci: null, afterScore: 0, afterBestUci: null, afterDepth: 1, moverSecondBestChance: null };
};
const setUpHistory = setUpGame.history({ verbose: true });
const fakeBook = new Set(["e4 Kd7 Kd2"]);
assert.equal(isBookPrefix(setUpHistory, 0, fakeBook), false, "no book moves for a game that starts from a custom position");
const setUpResults = await analyzeGameMoves(setUpHistory, { Chess, analyzePosition: stubEngine, openingLines: fakeBook });
assert.equal(setUpResults.length, 3, "analysis covers every ply of the SetUp game");
assert.deepEqual(seen.map(([before]) => before), [setUpFen, ...setUpExpected.slice(0, 2)], "analysis 'before' FENs follow the SetUp start");
assert.deepEqual(seen.map(([, after]) => after), setUpExpected, "analysis 'after' FENs match the board's FENs");
assert.ok(setUpResults.every(result => result.classification !== "book"), "SetUp game moves are never labelled book");

seen.length = 0;
const copyHistory = boardCopy.history({ verbose: true });
await analyzeGameMoves(copyHistory, { Chess, analyzePosition: stubEngine, openingLines: new Set(["a6 Ba4"]) });
assert.deepEqual(seen.map(([before]) => before), [midFen, boardExpected[0]], "analysis of a FEN-copy history starts from the copy's FEN");

seen.length = 0;
const bookHistory = standard.history({ verbose: true });
assert.equal(isBookPrefix(bookHistory, 2, new Set(["e4 e5 Nf3 Nc6"])), true, "standard-start games still use the opening book");
const standardResults = await analyzeGameMoves(bookHistory, { Chess, analyzePosition: stubEngine, openingLines: new Set(["e4 e5 Nf3 Nc6"]) });
assert.equal(seen[0][0], "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", "standard game analysis starts from the standard position");
assert.ok(standardResults.every(result => result.classification === "book"), "standard-start book moves are unchanged");

// FenBox must not touch state after unmount.
assert.ok(boxSource.includes("mountedRef") && boxSource.includes("if (!mountedRef.current) return;"), "fen-box.ts guards async copy against unmount");

// The mobile card padding is scoped to the review grid.
assert.ok(mobile.includes(".board-and-coach>.coach-card{padding:16px}"), "mobile coach-card padding is scoped to the review page");
assert.ok(!/(^|[\s,{}])\.coach-card\{padding:16px\}/m.test(mobile), "no unscoped .coach-card padding in the mobile block");

console.log("fen-box checks passed");

// Blindfold game endings: resign / draw offer / abort, the review PGN, and the two-column move table.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Chess } from "../public/vendor/veyra-rules/chess-compat.js";
import { blindfoldReviewPgn, botAcceptsDraw, manualGameEnd, materialBalance, moveRows, naturalGameEnd } from "../dist/src/blindfold-game-end.js";

const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
assert.equal(materialBalance(start, "w"), 0);
assert.equal(materialBalance(start, "b"), 0);
const blackUpQueen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR w KQkq - 0 1";
assert.equal(materialBalance(blackUpQueen, "b"), 9);
assert.equal(botAcceptsDraw(start, "b"), true, "equal material: the bot accepts");
assert.equal(botAcceptsDraw(blackUpQueen, "b"), false, "bot a queen up: the bot declines");
assert.equal(botAcceptsDraw(blackUpQueen, "w"), true, "bot a queen down: the bot accepts");
const blackUpPawn = "rnbqkbnr/pppppppp/8/8/8/8/1PPPPPPP/RNBQKBNR w KQkq - 0 1";
assert.equal(botAcceptsDraw(blackUpPawn, "b"), true, "one pawn up still counts as roughly equal");
const blackUpTwoPawns = "rnbqkbnr/pppppppp/8/8/8/8/2PPPPPP/RNBQKBNR w KQkq - 0 1";
assert.equal(botAcceptsDraw(blackUpTwoPawns, "b"), false, "two pawns up: the bot declines");
console.log("PASS draw offer: the bot accepts unless it is more than one pawn of material ahead.");

assert.deepEqual(manualGameEnd("resign", "w").pgnResult, "0-1");
assert.deepEqual(manualGameEnd("resign", "b").pgnResult, "1-0");
assert.equal(manualGameEnd("draw", "w").pgnResult, "1/2-1/2");
assert.equal(manualGameEnd("abort", "b").pgnResult, "*");
const mate = new Chess();
for (const san of ["f3", "e5", "g4", "Qh4#"]) mate.move(san);
assert.deepEqual(naturalGameEnd(mate) && naturalGameEnd(mate).pgnResult, "0-1");
assert.equal(naturalGameEnd(new Chess()), null);
console.log("PASS endings: resign, agreed draw, abort and checkmate map to the right PGN result.");

assert.deepEqual(moveRows([]), []);
assert.deepEqual(moveRows(["e4", "e5", "Nf3"]), [{ number: 1, white: "e4", black: "e5" }, { number: 2, white: "Nf3", black: null }]);
console.log("PASS move table: one row per move number, White and Black columns, newest row last.");

const sans = ["e4", "e5", "Nf3", "Nc6"];
const pgn = blindfoldReviewPgn(Chess, sans, { playerColor: "w", botName: 'Test "Bot"', end: manualGameEnd("resign", "w") });
assert.match(pgn, /\[Result "0-1"\]/);
assert.match(pgn, /\[Termination "White resigned"\]/);
assert.match(pgn, /\[White "You"\]/);
assert.match(pgn, /\[Black "Test 'Bot'"\]/);
assert.match(pgn, /Nc6 0-1\s*$/);
const reloaded = new Chess();
reloaded.loadPgn(pgn, { sloppy: true });
assert.deepEqual(reloaded.history(), sans, "the review PGN reloads with every played move");
console.log("PASS review PGN: played moves, players, result and termination reload in the regular review.");

const page = readFileSync(new URL("../src/blindfold-page.ts", import.meta.url), "utf8");
assert.ok(page.includes("role: 'alertdialog'"), "ending the game asks for confirmation first");
assert.ok(page.includes("onClick: () => setConfirming('resign')") && page.includes("onClick: () => setConfirming('draw')") && page.includes("onClick: () => setConfirming('abort')"), "resign, draw and abort go through the confirmation");
assert.ok(page.includes("onClick: () => confirmAction(confirming)"), "only the confirmation's Yes ends the game");
assert.ok(page.includes("if (manualEnd) {"), "after a player ending the bot does not move");
assert.ok(page.includes("manualEnd?.kind !== 'abort'"), "an aborted game offers no review");
assert.ok(page.includes("onReview(reviewPgn())"), "review receives the PGN with the result");
assert.ok(page.includes("className: 'blindfold-moves-table'"), "moves are shown as a table below the board");
assert.ok(!page.includes("new Chess(fen)") && !page.includes("new Chess(current.fen())"), "moves are never applied to a FEN-only copy (it would forget the earlier moves)");
assert.equal((page.match(/copyWithHistory\((current|gameRef\.current)\)/g) || []).length, 2, "player and bot moves keep the full history");
console.log("PASS blindfold page: confirmation before resign/draw/abort, review after the game, move table.");

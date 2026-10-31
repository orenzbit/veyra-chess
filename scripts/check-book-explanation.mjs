import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Chess } from "../rules-src/chess-compat.mjs";
import { analyzeGameMoves, isBookPrefix } from "../src/review-metrics.ts";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const openingRows = JSON.parse(await readFile(resolve(root, "public/data/openings.json"), "utf8"));
const openingLines = new Set(openingRows.map(row => String(row?.m || "").trim()).filter(Boolean));

const BOOK_HE = "מהלך תיאוריה מוכר מספר הפתיחות.";
const BOOK_EN = "A known opening-theory move.";
const STUB_TEXT = "stub engine text";

// 1. e4 e5 2. Nf3 Nc6 are opening-book moves; 3. h3 is not, so it is judged by the engine (a stub "mistake").
const parsed = new Chess();
parsed.loadPgn("1. e4 e5 2. Nf3 Nc6 3. h3");
const history = parsed.history({ verbose: true });
assert.deepEqual(history.map(move => move.san), ["e4", "e5", "Nf3", "Nc6", "h3"], "Demo line must be 1. e4 e5 2. Nf3 Nc6 3. h3");
const expectedBook = [true, true, true, true, false];
assert.deepEqual(history.map((_, index) => isBookPrefix(history, index, openingLines)), expectedBook, "Opening book must mark exactly plies 1-4 as book");
const expectedClassifications = ["book", "book", "book", "book", "mistake"];

// Stub engine: plies 1-4 are the engine's best move (drop 0); ply 5 loses 12% chance and the best move is d4.
const analyzePosition = async (fen, afterFen, mover) => {
  const isStub = mover.from === "h2" && mover.to === "h3";
  return {
    bestUci: isStub ? "d2d4" : mover.from + mover.to + (mover.promotion || ""),
    whiteChanceBest: 50,
    whiteChanceAfter: 50,
    afterScore: 0,
    afterBestUci: null,
    afterDepth: 1,
    depth: 1,
    drop: isStub ? 0.12 : 0,
    explanation: STUB_TEXT,
    isMateMove: false,
    moverSecondBestChance: null
  };
};

async function review() {
  return analyzeGameMoves(history, { Chess, analyzePosition, openingLines });
}

// Default (no document, as in Node) is Hebrew.
const hebrew = await review();
assert.deepEqual(hebrew.map(move => move.classification), expectedClassifications, "Move classifications must not change");
hebrew.forEach((move, index) => {
  if (expectedBook[index]) assert.equal(move.explanation, BOOK_HE, "Book ply " + (index + 1) + " must get the Hebrew book text");
  else assert.equal(move.explanation, STUB_TEXT, "Non-book ply " + (index + 1) + " must keep the engine text");
  assert.equal(move.index, index, "Result order must follow the game");
});
console.log("PASS: Hebrew review: plies 1-4 are 'book' with the book text; ply 5 keeps the engine text.");

// The page language comes from document.documentElement.lang (set by setLang / bootstrap.js).
globalThis.document = { documentElement: { lang: "en" } };
let english;
try {
  english = await review();
} finally {
  delete globalThis.document;
}
assert.deepEqual(english.map(move => move.classification), expectedClassifications, "Move classifications must not change in English");
english.forEach((move, index) => {
  assert.equal(move.explanation, expectedBook[index] ? BOOK_EN : STUB_TEXT, "English review ply " + (index + 1) + " has the wrong explanation");
});
console.log("PASS: English review: book plies get the English book text; ply 5 keeps the engine text.");

// Other fields of non-book moves are untouched by the explanation change.
const nonBook = english[4];
assert.equal(nonBook.playedUci, "h2h3");
assert.equal(nonBook.bestUci, "d2d4");
assert.equal(nonBook.drop, 0.12);
console.log("PASS: book explanation check complete.");

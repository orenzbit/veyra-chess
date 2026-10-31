// The bot game must keep the full move history: Move to review depends on the PGN having every move.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { Chess } from "../public/vendor/veyra-rules/chess-compat.js";
import { copyGameWithHistory } from "../dist/src/game-copy.js";

const main = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
const start = main.indexOf("function BotGame(");
assert.ok(start >= 0, "BotGame exists");
const end = main.indexOf("\nfunction ", start + 10);
const botGame = main.slice(start, end > start ? end : undefined);
assert.ok(!botGame.includes("new Chess(currentGame.fen())"), "the player move must not copy the game from its FEN");
assert.ok(!/new Chess\(fen\)/.test(botGame), "the bot move must not copy the game from a FEN");
assert.equal((botGame.match(/copyGameWithHistory\(Chess,/g) || []).length, 2, "player move and bot move both copy with history");
assert.ok(main.includes("import { copyGameWithHistory } from './game-copy.js';"), "main imports the shared helper");

// Plays `plies` moves exactly like BotGame: every move is applied to a history-preserving copy.
function playLikeBotGame(initial, plies) {
  let game = initial;
  for (let i = 0; i < plies; i++) {
    const legal = game.moves({ verbose: true });
    if (!legal.length) break;
    const pick = legal[(i * 7 + 3) % legal.length];
    const copy = copyGameWithHistory(Chess, game);
    assert.ok(copy.move({ from: pick.from, to: pick.to, promotion: pick.promotion || undefined }));
    game = copy;
  }
  return game;
}

const customFen = "r3k2r/pppq1ppp/2n2n2/3pp3/3PP3/2N2N2/PPPQ1PPP/R3K2R w KQkq - 4 8";
for (const [label, initial] of [["standard start", new Chess()], ["custom FEN", new Chess(customFen)]]) {
  const game = playLikeBotGame(initial, 20);
  const sans = game.history();
  assert.equal(sans.length, 20, `${label}: all 20 plies are in the history`);
  const pgn = game.pgn();
  for (const san of sans) assert.ok(pgn.includes(san), `${label}: PGN contains ${san}`);
  const loaded = new Chess();
  loaded.loadPgn(pgn, { sloppy: true });
  assert.equal(loaded.history().length, 20, `${label}: reloaded history length`);
  assert.equal(loaded.fen(), game.fen(), `${label}: same final FEN after reload`);
}
assert.ok(new Chess(customFen).pgn().length > 0);
assert.equal(playLikeBotGame(new Chess(customFen), 1).pgn().includes(`[FEN "${customFen}"]`), true, "custom start keeps its FEN header");

// Promotion survives the copy.
const promo = new Chess("8/P6k/8/8/8/8/8/K7 w - - 0 1");
promo.move({ from: "a7", to: "a8", promotion: "q" });
assert.equal(copyGameWithHistory(Chess, promo).fen(), promo.fen());
assert.equal(copyGameWithHistory(Chess, promo).history()[0], "a8=Q");
assert.equal(copyGameWithHistory(Chess, new Chess()).history().length, 0);
assert.equal(copyGameWithHistory(Chess, new Chess(customFen)).fen(), customFen, "a copy of a custom-start game with no moves keeps its position");

// A repetition draw needs the history, which a FEN-only copy loses.
let rep = new Chess();
for (const san of ["Nf3", "Nf6", "Ng1", "Ng8", "Nf3", "Nf6", "Ng1", "Ng8"]) {
  rep = copyGameWithHistory(Chess, rep);
  rep.move(san);
}
assert.equal(rep.isThreefoldRepetition(), true, "threefold repetition is still detected through copies");

// Performance: BotGame copies the game once per move, so time one copy of a long game.
let long = new Chess();
for (let i = 0; i < 170; i++) {
  const legal = long.moves({ verbose: true });
  if (!legal.length || long.isDraw()) break;
  const pick = legal[(i * 5 + 1) % legal.length];
  long.move({ from: pick.from, to: pick.to, promotion: pick.promotion || undefined });
}
const longPlies = long.history().length;
assert.ok(longPlies >= 150, `benchmark game has 150+ plies (got ${longPlies})`);
copyGameWithHistory(Chess, long);
const runs = 5;
const t0 = performance.now();
let copied;
for (let i = 0; i < runs; i++) copied = copyGameWithHistory(Chess, long);
const perCopy = (performance.now() - t0) / runs;
assert.equal(copied.fen(), long.fen());
assert.equal(copied.history().length, longPlies);
console.log(`copy of a ${longPlies}-ply game: ${perCopy.toFixed(1)} ms`);
assert.ok(perCopy < 150, "copying a 150+ ply game stays far below the bot's thinking delay");

console.log("Bot game history check passed.");

import assert from "node:assert/strict";
import { blindfoldDisplayFen } from "../dist/src/blindfold-visibility.js";

const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const fields = (fen) => fen.split(/\s+/);
const pieces = (fen) => fields(fen)[0].replace(/[1-8/]/g, "");

const l1 = blindfoldDisplayFen(start, 1);
assert.equal(pieces(l1).length, 28, "level 1 hides four rooks");
assert.match(fields(l1)[0], /^1nbqkbn1\//);
assert.deepEqual(fields(l1).slice(1), fields(start).slice(1), "FEN state fields remain unchanged");

const l2 = blindfoldDisplayFen(start, 2);
assert.equal(pieces(l2).length, 24, "level 2 hides rooks and knights");
assert.match(fields(l2)[0], /^2bqkb2\//);

const l3 = blindfoldDisplayFen(start, 3);
assert.equal(pieces(l3).length, 16, "level 3 keeps pawns visible");
assert.equal(fields(l3)[0], "8/pppppppp/8/8/8/8/PPPPPPPP/8");

const l4 = blindfoldDisplayFen(start, 4);
assert.equal(pieces(l4).length, 0, "level 4 hides all pieces");
assert.equal(fields(l4)[0], "8/8/8/8/8/8/8/8");

const midgame = "r3k2r/ppp2ppp/2n1bn2/3qp3/3PP3/2N1BN2/PPP2PPP/R2Q1RK1 b kq - 3 12";
for (const level of [1, 2, 3, 4]) {
  const shown = blindfoldDisplayFen(midgame, level);
  assert.deepEqual(fields(shown).slice(1), fields(midgame).slice(1), `level ${level} preserves turn, castling, en-passant, halfmove and move counters`);
  assert.equal(fields(shown)[0].split("/").length, 8);
}
assert.throws(() => blindfoldDisplayFen(start, 0), /level/i);
assert.throws(() => blindfoldDisplayFen("not-a-fen", 1), /FEN/i);
console.log("PASS blindfold visibility: 14 assertions across four concealment levels and FEN-state invariants");

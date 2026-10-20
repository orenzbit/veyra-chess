// Engine API equivalence contract for the Veyra rules layer (rules-src/chess-compat.mjs).
//
// Scope: every Chess method the product actually calls, plus the edge cases that replace
// chess.js behaviour the app relied on before the MIT migration. Sources scanned:
//   src/main.ts, src/game-archive.ts, src/puzzle-page.ts, src/chess-clock.ts
// Any method listed in PRODUCT_API must exist and behave; failure here means Review, Coach,
// Archive or Puzzles can break at runtime even when the build is green.
import assert from 'node:assert/strict';
import { Chess, DEFAULT_POSITION, validateFen } from '../rules-src/chess-compat.mjs';

const test = (name, fn) => { fn(); console.log('PASS:', name); };

// 1. Surface used by the product.
const PRODUCT_API = [
  'load', 'reset', 'clear', 'fen', 'turn', 'get', 'board', 'moves', 'move', 'undo',
  'history', 'header', 'getHeaders', 'pgn', 'loadPgn',
  'isCheck', 'inCheck', 'isCheckmate', 'isStalemate', 'isDraw', 'isGameOver',
  'isInsufficientMaterial', 'isThreefoldRepetition', 'isDrawByFiftyMoves',
];

test('every Chess method used by the product exists', () => {
  for (const name of PRODUCT_API) {
    assert.equal(typeof Chess.prototype[name], 'function', `Chess.prototype.${name} missing`);
  }
  assert.equal(typeof validateFen, 'function');
  assert.equal(typeof DEFAULT_POSITION, 'string');
});

test('verbose move records expose the fields the product reads', () => {
  const g = new Chess();
  const m = g.moves({ verbose: true }).find((x) => x.san === 'e4');
  for (const field of ['color', 'from', 'to', 'piece', 'flags', 'san', 'lan']) {
    assert.ok(m[field] !== undefined && m[field] !== null, `move.${field} missing`);
  }
  assert.equal(m.from, 'e2');
  assert.equal(m.to, 'e4');
  assert.equal(m.color, 'w');
  assert.equal(m.piece, 'p');
  assert.equal(m.lan, 'e2e4');
  assert.equal(m.isBigPawn(), true);
  assert.equal(m.isCapture(), false);
  assert.equal(typeof m.before, 'string');
  assert.equal(typeof m.after, 'string');
});

test('moves() filters by square and piece like chess.js', () => {
  const g = new Chess();
  assert.deepEqual(g.moves({ square: 'e2' }), ['e3', 'e4']);
  assert.deepEqual(g.moves({ piece: 'n' }), ['Na3', 'Nc3', 'Nf3', 'Nh3']);
  assert.deepEqual(g.moves({ square: 'e4' }), []);
});

test('SAN generation covers captures, promotion, check, mate and disambiguation', () => {
  const cap = new Chess('rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2');
  assert(cap.moves().includes('exd5'));

  const promo = new Chess('6k1/P7/8/8/8/8/7K/8 w - - 0 1');
  assert(promo.moves().includes('a8=Q+'), 'promotion check suffix');

  const dis = new Chess('4k3/8/8/8/8/5N2/8/1N2K3 w - - 0 1');
  assert(dis.moves().includes('Nbd2'), 'file disambiguation for two knights');
  assert(dis.moves().includes('Nfd2'));

  const mate = new Chess();
  for (const san of ['f3', 'e5', 'g4', 'Qh4#']) mate.move(san);
  assert(mate.history().at(-1).endsWith('#'));
  assert.equal(mate.isCheckmate(), true);
  assert.equal(mate.isGameOver(), true);
});

test('sloppy move input returns null instead of throwing (chess.js contract)', () => {
  const g = new Chess();
  const illegal = g.move('e5', { sloppy: true });
  assert.equal(illegal, null);
  assert.deepEqual(g.history(), []);
  assert.equal(g.move('e4', { sloppy: true }).san, 'e4');
  // illegal coordinate moves are tolerated the same way
  const h = new Chess();
  assert.equal(h.move({ from: 'e2', to: 'e5' }, { sloppy: true }), null);
});

test('illegal moves without sloppy throw a descriptive Error', () => {
  const g = new Chess();
  assert.throws(() => g.move('e5'), (error) => error instanceof Error && /Invalid move/.test(error.message));
});

test('loadPgn handles headers, comments, NAGs, nested variations, clock comments and results', () => {
  const g = new Chess();
  g.loadPgn([
    '[Event "Rated Blitz game"]',
    '[Site "https://lichess.org/abcd1234"]',
    '[Date "2026.10.18"]',
    '[White "TestUser"]',
    '[Black "Opponent"]',
    '[Result "1-0"]',
    '[TimeControl "180+2"]',
    '',
    '1. e4 {[%clk 0:03:00]} e5 $1 2. Nf3 (2. Nc3 Nc6) Nc6 3. Bb5 1-0',
  ].join('\n'));
  assert.deepEqual(g.history(), ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']);
  assert.equal(g.getHeaders().White, 'TestUser');
  assert.equal(g.getHeaders().Result, '1-0');
  assert.equal(g.fen(), 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3');
});

test('loadPgn honours SetUp/FEN games and keeps the starting position', () => {
  const g = new Chess();
  g.loadPgn('[SetUp "1"]\n[FEN "6k1/P7/8/8/8/8/7K/8 w - - 0 1"]\n\n1. a8=Q+');
  assert.deepEqual(g.history(), ['a8=Q+']);
  assert.equal(g.get('a8').type, 'q');
  const exported = g.pgn();
  assert.match(exported, /\[SetUp "1"\]/);
  assert.match(exported, /\[FEN "6k1\/P7/);
  assert.match(exported, /1\. a8=Q\+/);
});

test('loadPgn of an empty or header-only PGN keeps a legal starting position', () => {
  const empty = new Chess();
  empty.loadPgn('');
  assert.equal(empty.fen(), DEFAULT_POSITION);
  const headerOnly = new Chess();
  headerOnly.loadPgn('[Event "X"]\n[White "A"]\n\n1-0');
  assert.deepEqual(headerOnly.history(), []);
  assert.equal(headerOnly.getHeaders().Result, '1-0');
});

test('loadPgn rejects unusable move text instead of silently returning a wrong position', () => {
  const g = new Chess();
  assert.throws(() => g.loadPgn('1. e4 zz9'), /Invalid move/);
  // sloppy mode (archive imports) skips the unreadable token and keeps the readable plies.
  const sloppy = new Chess();
  sloppy.loadPgn('1. e4 zz9 e5 2. Nf3', { sloppy: true });
  assert.deepEqual(sloppy.history(), ['e4', 'e5', 'Nf3']);
});

test('PGN export/import round-trips SAN, headers and castling text', () => {
  const g = new Chess();
  g.header('Event', 'Contract test', 'White', 'A', 'Black', 'B', 'Result', '1-0');
  for (const san of ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6']) g.move(san);
  const loaded = new Chess();
  loaded.loadPgn(g.pgn());
  assert.deepEqual(loaded.history(), g.history());
  assert.equal(loaded.fen(), g.fen());
  assert.equal(loaded.getHeaders().Event, 'Contract test');
});

test('castling via SAN, coordinate input and 0-0 spelling all work', () => {
  const fen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
  const a = new Chess(fen); a.move('O-O');
  assert.equal(a.get('g1').type, 'k');
  const b = new Chess(fen); b.move('0-0');
  assert.equal(b.get('g1').type, 'k');
  const c = new Chess(fen); c.move({ from: 'e1', to: 'g1' });
  assert.equal(c.get('f1').type, 'r');
  assert.equal(c.get('e1'), undefined);
});

test('en passant capture and flag survive round-trip', () => {
  const g = new Chess('rnbqkbnr/1pp1pppp/p7/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3');
  const m = g.moves({ verbose: true }).find((x) => x.from === 'e5' && x.to === 'd6');
  assert.equal(m.isEnPassant(), true);
  assert.equal(m.captured, 'p');
  g.move(m);
  assert.equal(g.get('d5'), undefined);
  assert.equal(g.fen().split(' ')[3], '-');
});

test('castling rights are removed when a rook moves and restored by undo', () => {
  const g = new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  const before = g.fen();
  g.move({ from: 'h1', to: 'h2' });
  assert.equal(g.fen().split(' ')[2], 'Qkq');
  g.undo();
  assert.equal(g.fen(), before);
});

test('undo restores position, history, castling rights and repetition counters', () => {
  const g = new Chess();
  const cycle = ['Nf3', 'Nf6', 'Ng1', 'Ng8'];
  for (const san of [...cycle, ...cycle]) g.move(san);
  assert.equal(g.isThreefoldRepetition(), true);
  for (let i = 0; i < cycle.length * 2; i++) g.undo();
  assert.equal(g.isThreefoldRepetition(), false);
  assert.deepEqual(g.history(), []);
  assert.equal(g.fen(), DEFAULT_POSITION);
  assert.equal(g.undo(), null);
});

test('draw and game-over detection matches chess.js semantics', () => {
  const bare = new Chess('7k/8/8/8/8/8/8/K7 w - - 0 1');
  assert.equal(bare.isInsufficientMaterial(), true);
  const bishop = new Chess('7k/8/8/8/8/8/8/KB6 w - - 0 1');
  assert.equal(bishop.isInsufficientMaterial(), true);
  const oppositeBishops = new Chess('5b1k/8/8/8/8/8/8/KB6 w - - 0 1');
  assert.equal(oppositeBishops.isInsufficientMaterial(), false);
  const fifty = new Chess('7k/8/8/8/8/8/8/K5R1 w - - 100 1');
  assert.equal(fifty.isDrawByFiftyMoves(), true);
  assert.equal(fifty.isDraw(), true);
  const checkmate = new Chess('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1');
  assert.equal(checkmate.isCheckmate(), true);
  assert.equal(checkmate.isDraw(), false);
  const stalemate = new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
  assert.equal(stalemate.isStalemate(), true);
  assert.equal(stalemate.isCheckmate(), false);
  assert.equal(stalemate.isGameOver(), true);
});

test('check detection and get() work for every board square', () => {
  const g = new Chess();
  assert.equal(g.isCheck(), false);
  assert.equal(g.inCheck(), false);
  assert.equal(g.get('e2').type, 'p');
  assert.equal(g.get('E2').color, 'w');
  assert.equal(g.get('e4'), undefined);
  const board = g.board();
  assert.equal(board.length, 8);
  assert.equal(board[0][0].square, 'a8');
  assert.equal(board[7][0].square, 'a1');
  for (const row of board) for (const square of row) if (square) assert.ok(square.type && square.color);
  const checked = new Chess('4k3/8/8/8/8/8/4R3/4K3 b - - 0 1');
  assert.equal(checked.isCheck(), true);
  assert.equal(checked.inCheck(), true);
});

test('strict FEN validation rejects malformed positions with reasons', () => {
  const invalid = [
    'not-a-fen',
    '7k/8/8/8/8/8/8/K7 x - - 0 1',
    '7k/8/8/8/8/8/8/K7 w Z - 0 1',
    '7k/8/8/8/8/8/8/K7 w - e4 0 1',
    '7k/8/8/8/8/8/8/K7 w - e3 0 1',
    'P6k/8/8/8/8/8/8/K7 w - - 0 1',
    '7k/8/8/8/8/8/8/8 w - - 0 1',
    '7k/8/8/8/8/8/8/K7 w - - 0',
  ];
  for (const fen of invalid) {
    const result = validateFen(fen);
    assert.equal(result.ok, false, fen);
    assert.ok(result.error, `missing error reason for ${fen}`);
    assert.throws(() => new Chess(fen), /Invalid FEN/);
  }
  assert.equal(validateFen(DEFAULT_POSITION).ok, true);
});

test('clear() and reset() leave a usable board', () => {
  const g = new Chess();
  g.clear();
  assert.equal(g.fen(), '8/8/8/8/8/8/8/8 w - - 0 1');
  assert.deepEqual(g.moves(), []);
  assert.equal(g.undo(), null);
  g.reset();
  assert.equal(g.fen(), DEFAULT_POSITION);
  assert.equal(g.moves().length, 20);
});

test('custom API as a coordinate refactor: fenBefore/positionAfterPly round-trip', () => {
  // Mirrors src/main.ts helpers that rebuild positions from history entries.
  const g = new Chess();
  for (const san of ['e4', 'e5', 'Nf3', 'Nc6']) g.move(san);
  const history = g.history({ verbose: true });
  const replay = new Chess();
  for (const move of history) replay.move({ from: move.from, to: move.to, promotion: move.promotion || undefined });
  assert.equal(replay.fen(), g.fen());
  assert.equal(replay.turn(), g.turn());
});

console.log('PASS: engine API contract suite completed.');

import assert from 'node:assert/strict';
import { Chess, DEFAULT_POSITION, validateFen } from '../rules-src/chess-compat.mjs';

const test = (name, fn) => { fn(); console.log('PASS:', name); };

test('initial position has 20 legal moves', () => {
  const g = new Chess();
  assert.equal(g.moves().length, 20);
  assert.equal(g.fen(), DEFAULT_POSITION);
  assert.equal(validateFen(g.fen()).ok, true);
});

test('opening moves, SAN, turn, and FEN remain coherent', () => {
  const g = new Chess();
  assert.equal(g.move('e4').san, 'e4');
  assert.equal(g.move('e5').san, 'e5');
  assert.equal(g.move('Nf3').san, 'Nf3');
  assert.equal(g.turn(), 'b');
  assert.equal(g.fen(), 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2');
  assert.equal(g.history().join(' '), 'e4 e5 Nf3');
});

test('starting-position perft depths 1-3 match known legal-move counts', () => {
  const perft = (g, depth) => {
    if (depth === 0) return 1;
    let total = 0;
    for (const m of g.moves({ verbose: true })) {
      g.move({ from: m.from, to: m.to, promotion: m.promotion });
      total += perft(g, depth - 1);
      g.undo();
    }
    return total;
  };
  const g = new Chess();
  assert.equal(perft(g, 1), 20);
  assert.equal(perft(g, 2), 400);
  assert.equal(perft(g, 3), 8902);
});

test('castling moves both king and rook', () => {
  const g = new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  assert(g.moves().includes('O-O'));
  assert(g.moves().includes('O-O-O'));
  g.move('O-O');
  assert.equal(g.get('g1')?.type, 'k');
  assert.equal(g.get('f1')?.type, 'r');
  assert.equal(g.get('e1'), undefined);
});

test('en passant is legal and removes the captured pawn', () => {
  const g = new Chess('rnbqkbnr/1pp1pppp/p7/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3');
  const m = g.moves({ verbose: true }).find((x) => x.from === 'e5' && x.to === 'd6');
  assert(m);
  assert(m.isEnPassant());
  g.move({ from: 'e5', to: 'd6' });
  assert.equal(g.get('d5'), undefined);
  assert.equal(g.get('d6')?.type, 'p');
});

test('all promotion choices work and implicit promotion defaults to queen', () => {
  const fen = '8/P6k/8/8/8/8/7K/8 w - - 0 1';
  const g = new Chess(fen);
  assert.deepEqual(g.moves({ verbose: true }).filter((m) => m.from === 'a7').map((m) => m.promotion).sort(), ['b', 'n', 'q', 'r']);
  g.move({ from: 'a7', to: 'a8' });
  assert.equal(g.get('a8')?.type, 'q');
  const n = new Chess(fen);
  n.move({ from: 'a7', to: 'a8', promotion: 'n' });
  assert.equal(n.get('a8')?.type, 'n');
});

test('checkmate and stalemate are distinguished', () => {
  const mate = new Chess();
  for (const san of ['f3', 'e5', 'g4', 'Qh4#']) mate.move(san);
  assert.equal(mate.isCheckmate(), true);
  assert.equal(mate.isGameOver(), true);
  const stale = new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
  assert.equal(stale.isStalemate(), true);
  assert.equal(stale.isCheckmate(), false);
  assert.equal(stale.isDraw(), true);
});

test('threefold repetition is counted and undone correctly', () => {
  const g = new Chess();
  const cycle = ['Nf3', 'Nf6', 'Ng1', 'Ng8'];
  for (const san of [...cycle, ...cycle]) g.move(san);
  assert.equal(g.isThreefoldRepetition(), true);
  g.undo();
  assert.equal(g.isThreefoldRepetition(), false);
});

test('insufficient material and fifty-move draw are detected', () => {
  const bareKings = new Chess('7k/8/8/8/8/8/8/K7 w - - 0 1');
  assert.equal(bareKings.isInsufficientMaterial(), true);
  assert.equal(bareKings.isDraw(), true);
  const fifty = new Chess('7k/8/8/8/8/8/8/K5R1 w - - 100 1');
  assert.equal(fifty.isDrawByFiftyMoves(), true);
  assert.equal(fifty.isDraw(), true);
});

test('PGN export/import round-trips move history and headers', () => {
  const g = new Chess();
  g.header('Event', 'Veyra rules test', 'White', 'Player One', 'Black', 'Player Two', 'Result', '1-0');
  for (const san of ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']) g.move(san);
  const pgn = g.pgn();
  const loaded = new Chess();
  loaded.loadPgn(pgn);
  assert.deepEqual(loaded.history(), g.history());
  assert.equal(loaded.fen(), g.fen());
  assert.equal(loaded.getHeaders().Event, 'Veyra rules test');
  assert.equal(loaded.getHeaders().Result, '1-0');
});

test('undo restores the exact prior position and move history', () => {
  const g = new Chess();
  g.move('e4');
  const before = g.fen();
  g.move('e5');
  g.undo();
  assert.equal(g.fen(), before);
  assert.deepEqual(g.history(), ['e4']);
});

test('clear returns an empty usable board without throwing', () => {
  const g = new Chess();
  assert.equal(g.clear(), g);
  assert.equal(g.fen(), '8/8/8/8/8/8/8/8 w - - 0 1');
  assert.equal(g.moves().length, 0);
  assert.equal(g.board().flat().every((sq) => sq === null), true);
  assert.equal(g.isInsufficientMaterial(), true);
});

test('invalid FEN and illegal moves are rejected', () => {
  assert.equal(validateFen('not-a-fen').ok, false);
  assert.throws(() => new Chess('not-a-fen'));
  const g = new Chess();
  assert.throws(() => g.move('e5'));
  assert.throws(() => g.move({ from: 'e2', to: 'e5' }));
});

test('strict FEN validation rejects malformed fields and impossible pawn placement', () => {
  const invalid = [
    '7k/8/8/8/8/8/8/K7 x - - 0 1',
    '7k/8/8/8/8/8/8/K7 w Z - 0 1',
    '7k/8/8/8/8/8/8/K7 w - e4 0 1',
    'P6k/8/8/8/8/8/8/K7 w - - 0 1',
    '7k/8/8/8/8/8/8/8 w - - 0 1',
  ];
  for (const fen of invalid) assert.equal(validateFen(fen).ok, false, fen);
});

test('moving a rook removes castling rights and undo restores them', () => {
  const g = new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  const before = g.fen();
  g.move({ from: 'h1', to: 'h2' });
  assert.equal(g.fen().split(' ')[2], 'Qkq');
  g.undo();
  assert.equal(g.fen(), before);
});

test('FEN round-trip preserves en-passant and move counters', () => {
  const fen = 'rnbqkbnr/1pp1pppp/p7/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 7 4';
  const g = new Chess(fen);
  const loaded = new Chess(g.fen());
  assert.equal(loaded.fen(), g.fen());
  assert.equal(loaded.moves({ verbose: true }).some((m) => m.from === 'e5' && m.to === 'd6' && m.isEnPassant()), true);
});

console.log('PASS: Veyra rules layer suite completed.');

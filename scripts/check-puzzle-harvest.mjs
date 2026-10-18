// Tests for netlify/functions/lib/puzzle-harvest.mjs with the real engine and recorded games.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const lib = (n) => import(pathToFileURL(join(root, 'netlify/functions/lib', n)).href);
const H = await lib('puzzle-harvest.mjs');
const { loadEngine } = await lib('engine-node.mjs');
const { extractClocks, parseHeaders } = await lib('puzzle-sources.mjs');
const { Chess } = await import(pathToFileURL(join(root, 'rules-src/chess-compat.mjs')).href);
const engine = await loadEngine();
const fx = (n) => readFile(join(root, 'scripts/fixtures/puzzles', n), 'utf8');
const expected = JSON.parse(await fx('expected.json'));

// ---- pure helpers
assert.equal(Math.round(H.cpToWin(0)), 50);
assert.ok(H.cpToWin(900000) > 99.9 && H.cpToWin(-900000) < 0.1);
assert.equal(H.cpToWin(Infinity), 100);
assert.equal(H.phaseOf('4k3/pppp4/8/8/8/8/PPPP4/4K3 w - - 0 30', 30), 'endgame');
assert.equal(H.phaseOf('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 3), 'opening');
assert.equal(H.phaseOf('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 20), 'middlegame');
assert.equal(H.positionKey('a b c d 5 6'), 'a b c d');
assert.equal(H.seedRating(0.1), 600);

// ---- special moves go through the Chess-based code without throwing (old tactics.ts threw on these)
const CASTLE = 'r3k2r/pppq1ppp/2n1bn2/3p4/3P4/2N1BN2/PPPQ1PPP/R3K2R w KQkq - 0 10';
const EP = 'rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3';
const PROMO = '8/P6k/8/8/8/8/8/K7 w - - 0 1';
for (const [fen, uci] of [[CASTLE, 'e1g1'], [EP, 'e5f6'], [PROMO, 'a7a8q']]) {
  const motif = H.classifyMotifV2({ fenBefore: fen, bestUci: uci, playedUci: H.legalUci(fen).find((m) => m !== uci), bestScoreMover: 100, replyUci: null, replyScoreMover: 0, clockSec: NaN, moveNumber: 20 });
  assert.ok(['general', 'endgame', 'hanging_piece', 'king_safety', 'missed_mate', 'opening', 'time_pressure'].includes(motif), motif);
  const acc = H.screenAccepted(fen, uci, engine);
  assert.ok(acc.accepted.includes(uci), `solution ${uci} must be accepted`);
}
assert.ok(H.legalUci(CASTLE).includes('e1g1') && H.legalUci(CASTLE).includes('e1c1'));
assert.ok(H.legalUci(EP).includes('e5f6'));
assert.ok(H.legalUci(PROMO).includes('a7a8q') && H.legalUci(PROMO).includes('a7a8n'));

// ---- accepted rules
const MATE1 = '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1';
const mate = H.screenAccepted(MATE1, 'a1a8', engine);
assert.deepEqual(mate.accepted, ['a1a8'], 'only the mating move is accepted in a mate puzzle');
assert.equal(mate.ambiguous, false);
const quiet = H.screenAccepted('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'e2e4', engine);
assert.equal(quiet.ambiguous, true, 'quiet opening position must be dropped as ambiguous');
const hang = H.screenAccepted('4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1', 'd1d5', engine);
assert.ok(hang.accepted.includes('d1d5') && !hang.accepted.includes('d1d2'), 'a move that loses the queen is never accepted');

// ---- motif classifier on constructed cases
assert.equal(H.classifyMotifV2({ fenBefore: MATE1, bestUci: 'a1a8', playedUci: 'a1a2', bestScoreMover: 999999, replyUci: null, replyScoreMover: 0, clockSec: NaN, moveNumber: 20 }), 'missed_mate');
// fool's mate: the reply to g2g4 is mate => king_safety
assert.equal(H.classifyMotifV2({ fenBefore: 'rnbqkbnr/pppp1ppp/8/4p3/8/5P2/PPPPP1PP/RNBQKBNR w KQkq - 0 2', bestUci: 'e2e4', playedUci: 'g2g4', bestScoreMover: 0, replyUci: 'd8h4', replyScoreMover: 0, clockSec: NaN, moveNumber: 2 }), 'king_safety');
// score based mate threat without the board reply
assert.equal(H.classifyMotifV2({ fenBefore: '4k3/8/8/8/8/8/3q4/R3K3 w - - 0 40', bestUci: 'e1d2', playedUci: 'e1f1', bestScoreMover: 0, replyUci: null, replyScoreMover: -999999, clockSec: NaN, moveNumber: 40 }), 'king_safety');
// piece hung: white plays Qd1-d5?? hanging the queen to a pawn recapture
assert.equal(H.classifyMotifV2({ fenBefore: '4k3/8/2p5/8/8/8/8/3QK3 w - - 0 40', bestUci: 'd1d2', playedUci: 'd1d5', bestScoreMover: 0, replyUci: 'c6d5', replyScoreMover: -900, clockSec: NaN, moveNumber: 40 }), 'hanging_piece');
assert.equal(H.classifyMotifV2({ fenBefore: '4k3/8/8/8/8/8/3q4/R3K3 w - - 0 40', bestUci: 'e1d2', playedUci: 'e1f1', bestScoreMover: 0, replyUci: null, replyScoreMover: 0, clockSec: 6, moveNumber: 40 }), 'time_pressure');
assert.equal(H.classifyMotifV2({ fenBefore: '4k3/8/8/8/8/8/3q4/R3K3 w - - 0 40', bestUci: 'e1d2', playedUci: 'e1f1', bestScoreMover: 0, replyUci: null, replyScoreMover: 0, clockSec: 100, moveNumber: 40 }), 'endgame');

// ---- whole-game scans
function invariants(game, result) {
  const seen = new Set();
  for (const p of result.puzzles) {
    const chess = new Chess(p.fen);
    assert.equal(chess.turn(), game.userColor, 'puzzle must be from the user side: ' + p.fen);
    const legal = chess.moves({ verbose: true }).map((m) => m.lan);
    assert.ok(legal.includes(p.solution[0]), 'solution must be legal');
    assert.ok(legal.includes(p.played), 'played move must be legal');
    assert.notEqual(p.solution[0], p.played);
    assert.ok(p.accepted.includes(p.solution[0]) && p.accepted.every((m) => legal.includes(m)));
    assert.ok(p.severity >= 0.1 && p.severity <= 1);
    assert.ok(!seen.has(H.positionKey(p.fen)), 'duplicate position');
    seen.add(H.positionKey(p.fen));
    assert.match(p.puzzleId, /^[0-9a-f]{16}$/);
    assert.ok(['mistake', 'blunder'].includes(p.class));
    assert.equal(p.source.userColor, game.userColor);
  }
  assert.ok(result.puzzles.length <= 5);
}
const mk = async (name, extra = {}) => {
  const pgn = await fx(name + '.pgn');
  const headers = parseHeaders(pgn);
  return { key: 'test:' + name, provider: 'chesscom', url: '', pgn, headers, date: '2026-10-01', opponent: 'Rival', timeClass: 'blitz', userColor: expected[name]?.userColor, variant: 'Standard', clocks: extractClocks(pgn), ...extra };
};
const summary = [];
for (const name of ['blunder_white', 'blunder_black', 'blunder_time', 'clean']) {
  const game = await mk(name);
  const started = Date.now();
  const result = H.scanGame(game, engine);
  summary.push(`${name}: ${result.puzzles.length} puzzles, ${result.log.searches} searches, ${((Date.now() - started) / 1000).toFixed(1)}s`);
  invariants(game, result);
  assert.equal(result.log.skipReason, null);
  const inj = expected[name].injected;
  if (inj) {
    const hit = result.puzzles.find((p) => p.played === inj.uci && p.fen === inj.fen);
    assert.ok(hit, `${name}: the injected blunder ${inj.uci} must become a puzzle (got ${result.puzzles.map((p) => p.played).join(',') || 'none'})`);
    assert.equal(hit.class, 'blunder');
    assert.notEqual(hit.solution[0], inj.uci);
    if (name === 'blunder_time') assert.ok(['hanging_piece', 'time_pressure'].includes(hit.motif), 'hung piece or time pressure, got ' + hit.motif);
  }
}
// ---- skips
assert.equal(H.scanGame(await mk('clean', { variant: 'Chess960' }), engine).log.skipReason, 'variant');
assert.equal(H.scanGame(await mk('clean', { userColor: null }), engine).log.skipReason, 'color_unresolved');
assert.equal(H.scanGame(await mk('clean', { pgn: '1. e4 e5 2. Nf3 *' }), engine).log.skipReason, 'too_short');
assert.equal(H.scanGame(await mk('clean', { pgn: '1. e4 e5 2. Qh9 *' }), engine).log.skipReason, 'bad_pgn');
assert.equal(H.scanGame(await mk('clean', { headers: { SetUp: '1', FEN: 'x' } }), engine).log.skipReason, 'custom_start');
// time budget stop
const stopped = H.scanGame(await mk('blunder_white'), engine, { shouldStop: () => true });
assert.equal(stopped.log.stopped, true);
assert.equal(stopped.puzzles.length, 0);

console.log('PASS: puzzle harvest (special moves, accepted rules, motifs, 4 recorded games, skips, budget stop).');
console.log('  ' + summary.join('\n  '));

// Learn path practice judging on Veyra's existing content: every opening practice move is legal in its position and is
// judged by quizMoveMatches (the trainer's own matcher); a different legal move is rejected. Endgame practice starts from the
// ENDGAMES positions with the right side to move, and endgameResult reads goals and failures correctly.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Chess } from '../rules-src/chess-compat.mjs';
import { quizMoveMatches } from '../src/opening-quiz.ts';
import { buildCourses, endgameResult, DEFEND_MOVES } from '../src/learning-path.ts';
import { ENDGAMES } from '../src/endgames.ts';

const repertoire = JSON.parse(readFileSync('public/data/repertoire.json', 'utf8'));
let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log(`ok - ${name}`); } catch (error) { console.error(`FAIL - ${name}\n  ${error.message}`); process.exitCode = 1; }
}
const plan = repertoire.slice(0, 40).map(op => ({ kind: 'opening', openingId: op.id, lineIds: op.lines.slice(0, 2).map(l => l.id) }));
const courses = buildCourses(Chess, repertoire, plan);
const practice = courses.openings.filter(n => n.kind === 'practice');

test('opening practice moves come from the repertoire line, unchanged', () => {
  assert.ok(practice.length >= 40);
  for (const n of practice) {
    const [, openingId, lineId] = n.id.split(':');
    const line = repertoire.find(o => o.id === openingId).lines.find(l => l.id === lineId);
    assert.deepEqual(n.sans, line.moves.slice(0, n.sans.length).map(m => m[0]), n.id);
    assert.equal(n.side, repertoire.find(o => o.id === openingId).color === 'b' ? 'b' : 'w');
  }
});
test('every expected move is legal in its position and accepted by quizMoveMatches; another legal move is not', () => {
  let checked = 0;
  for (const n of practice) {
    const game = new Chess();
    n.sans.forEach((san, ply) => {
      const fen = game.fen();
      const legal = game.moves();
      assert.ok(legal.some(m => quizMoveMatches(Chess, fen, m, san)), `${n.id} ply ${ply}: ${san} is legal`);
      if ((ply % 2 === 0) === (n.side === 'w')) {
        assert.equal(quizMoveMatches(Chess, fen, san, san), true);
        const other = legal.find(m => !quizMoveMatches(Chess, fen, m, san));
        if (other) assert.equal(quizMoveMatches(Chess, fen, other, san), false, `${n.id}: ${other} is not ${san}`);
        checked += 1;
      }
      game.move(san);
    });
  }
  assert.ok(checked > 200, 'checked ' + checked + ' user moves');
});
test('endgame practice starts from each ENDGAMES position, legal, with the trained side to move', () => {
  const nodes = courses.endgames.filter(n => n.kind === 'practice');
  assert.equal(nodes.length, ENDGAMES.length);
  for (const n of nodes) {
    const g = new Chess(n.endgame.fen);
    assert.equal(g.turn(), n.endgame.side === 'white' ? 'w' : 'b', n.id);
    assert.ok(g.moves().length > 0 && !g.isGameOver(), n.id + ' is playable');
    assert.equal(endgameResult(Chess, n.endgame, n.endgame.fen, 0), null, n.id + ' start is neither won nor lost');
  }
});
const eg = id => ENDGAMES.find(e => e.id === id);
test('mate goal: checkmate by the user succeeds, stalemate or a lost piece fails', () => {
  assert.equal(endgameResult(Chess, eg('kq-k'), '4k3/4Q3/4K3/8/8/8/8/8 b - - 0 1', 5), 'success');
  assert.equal(endgameResult(Chess, eg('kq-k'), 'k7/2Q5/1K6/8/8/8/8/8 b - - 0 1', 5), 'fail', 'stalemate');
  assert.equal(endgameResult(Chess, eg('kq-k'), '8/8/8/4k3/8/8/8/4K3 w - - 0 2', 5), 'fail', 'queen lost');
  assert.equal(endgameResult(Chess, eg('kr-k'), '8/8/8/4k3/8/8/8/R3K3 w - - 0 1', 3), null);
});
test('promote / win goals: a promotion succeeds', () => {
  assert.equal(endgameResult(Chess, eg('kp-k-win'), '4Q3/8/8/8/8/2k5/8/4K3 b - - 0 9', 6), 'success');
  assert.equal(endgameResult(Chess, eg('lucena'), '1K1Q4/8/2k5/8/8/8/r7/2R5 b - - 0 5', 4), 'success');
  assert.equal(endgameResult(Chess, eg('kp-k-win'), '4k3/8/4K3/8/8/8/8/8 w - - 0 3', 2), 'fail', 'pawn lost');
});
test('draw goal (defend): surviving the moves succeeds, being mated or losing the rook fails', () => {
  const philidor = eg('philidor');
  assert.equal(endgameResult(Chess, philidor, '4k3/R7/1r6/4PK2/8/8/8/8 b - - 0 1', DEFEND_MOVES - 1), null);
  assert.equal(endgameResult(Chess, philidor, '4k3/R7/1r6/4PK2/8/8/8/8 b - - 0 1', DEFEND_MOVES), 'success');
  assert.equal(endgameResult(Chess, philidor, '4k3/R7/8/4PK2/8/8/8/8 b - - 0 1', 3), 'fail', 'rook lost');
  assert.equal(endgameResult(Chess, philidor, '4k3/R7/1r6/5K2/8/8/8/8 b - - 0 1', 3), 'success', 'pawn won');
});
test('endgame practice drops late bot answers and timers after reset or leaving the page', () => {
  const page = readFileSync('src/learn-page.ts', 'utf8');
  assert.match(page, /useEffect\(\(\) => \(\) => \{ live\.current\.dead = true; live\.current\.gen \+= 1; \}, \[\]\)/, 'unmount invalidates pending work');
  assert.match(page, /gen !== live\.current\.gen/, 'a reply from an older try is ignored');
  assert.match(page, /live\.current\.over = true; live\.current\.gen \+= 1;/, 'input closes while a failed try resets');
  assert.doesNotMatch(page.slice(page.indexOf('function EndgamePracticeView')), /[^.]setTimeout\(onDone/, 'completion goes through the guarded timer');
});
console.log(`learn practice: ${passed} passed`);

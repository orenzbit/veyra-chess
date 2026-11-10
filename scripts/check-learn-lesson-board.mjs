// Opening lessons (play-findings: English lesson text scrambled inside the RTL page; the first sentence names 5 moves
// while the board shows only 1.e4). Checks buildCourses on the real repertoire and the lesson markup.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Chess } from '../rules-src/chess-compat.mjs';
import { buildCourses, namedPlies } from '../src/learning-path.ts';
const repertoire = JSON.parse(readFileSync('public/data/repertoire.json', 'utf8'));
const plan = repertoire.map(op => ({ kind: 'opening', openingId: op.id, lineIds: op.lines.slice(0, 1).map(l => l.id) }));
const lessons = buildCourses(Chess, repertoire, plan).openings.filter(n => n.kind === 'lesson');
let failed = 0;
function test(name, fn) { try { fn(); console.log(`PASS: ${name}`); } catch (e) { failed += 1; console.error(`FAIL: ${name}\n  ${String(e.message).slice(0, 300)}`); } }
test('the Italian lesson board shows 1.e4 e5 2.Nf3 Nc6 with the 3.Bc4 arrow, as its sentence says', () => {
  const it = lessons.find(n => n.id.startsWith('o:italian:'));
  const s = it.screens[0];
  assert.match(s.text.en, /^1\.e4 e5 2\.Nf3 Nc6 3\.Bc4/);
  const g = new Chess(); for (const san of ['e4', 'e5', 'Nf3', 'Nc6']) g.move(san);
  assert.equal(s.fen, g.fen()); assert.deepEqual(s.arrows, [['f1', 'c4']]);
});
test('every opening lesson whose first sentence names moves of its line shows them all on the board', () => {
  let named = 0;
  for (const n of lessons) {
    const s = n.screens[0]; const m = /^\s*1\./.test(s.text.en);
    if (!m) continue;
    const op = repertoire.find(o => o.id === n.id.split(':')[1]); const line = op.lines.find(l => l.id === n.id.split(':')[2]);
    const k = namedPlies(s.text.en, line.moves.map(x => x[0]).slice(0, 12));
    if (!k) continue;
    named += 1;
    const g = new Chess(); line.moves.slice(0, k - 1).forEach(x => g.move(x[0]));
    assert.equal(s.fen, g.fen(), n.id);
    const mv = new Chess(s.fen).move(line.moves[k - 1][0]); assert.deepEqual(s.arrows, [[mv.from, mv.to]], n.id);
  }
  assert.ok(named >= 40, 'lessons with named moves: ' + named);
});
test('namedPlies stops at the dash and refuses a sentence that leaves the line', () => {
  assert.equal(namedPlies('1.e4 e5 2.Nf3 Nc6 3.Bc4 — target f7.', ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5']), 5);
  assert.equal(namedPlies('1.d4 d5 2.e4!? — sacrifice a pawn.', ['d4', 'd5', 'e4', 'dxe4']), 3);
  assert.equal(namedPlies('1.e4 c6 … 6.Nxf7!? — sacrifice', ['e4', 'c6', 'd4']), 2);
  assert.equal(namedPlies('1.e4 e6 — solid.', ['e4', 'c5']), 0);
  assert.equal(namedPlies('The oldest opening.', ['e4']), 0);
});
test('lesson text and course titles keep their own direction inside the Hebrew page', () => {
  const page = readFileSync('src/learn-page.ts', 'utf8');
  assert.match(page, /h\('p', \{ className: 'learn-sentence', dir: 'auto' \}, en \? screen\.text\.en : screen\.text\.he\)/);
  assert.match(page, /h\('small', null, h\('bdi', null, n\.title\)\)/);
  assert.match(page, /h\('b', null, h\('bdi', null, nextUp\.title\)\)/);
});
if (failed) { console.error(`${failed} lesson check(s) failed.`); process.exit(1); }
console.log('Opening lesson checks passed.');

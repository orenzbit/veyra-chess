// Check of the opening trainer's board input and learn mode.
// Verifies: the divergence helper on the real repertoire (departure ply and moves, validated by replaying with the rules engine);
// a drag-style move (from/to -> SAN) is judged by quizMoveMatches on every real line; static guarantees that board input routes
// through quizMoveMatches and that learn mode never touches prog.done or the opening streak; a missing explanations file is handled.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { Chess } from '../rules-src/chess-compat.mjs';
import { quizMoveMatches } from '../src/opening-quiz.ts';
import { divergenceFromMain, findDivergence, isMainLine, mainLineOf, moveLabel, sansOf, upcomingMoves } from '../src/opening-divergence.ts';
import { explanationFor, explanationKey, loadOpeningExplanations, sanitizeExplanations } from '../src/opening-explanations.ts';

const openings = JSON.parse(readFileSync('public/data/repertoire.json', 'utf8'));
let passed = 0;
async function test(name, fn) {
  try { await fn(); passed += 1; console.log(`ok - ${name}`); }
  catch (error) { console.error(`FAIL - ${name}\n  ${error.message}`); process.exitCode = 1; }
}

await test('findDivergence: identical, differing, prefix and extension', () => {
  assert.equal(findDivergence(['e4', 'e5'], ['e4', 'e5']), null);
  assert.equal(findDivergence(['e4', 'e5', 'Bc4+'], ['e4', 'e5', 'Bc4']), null, 'check marks are ignored');
  assert.deepEqual(findDivergence(['e4', 'e5', 'Nf3', 'Nc6'], ['e4', 'e5', 'Nf3', 'd6']), { ply: 3, moveNumber: 2, color: 'b', mainMove: 'Nc6', lineMove: 'd6' });
  assert.deepEqual(findDivergence(['e4', 'c5'], ['d4', 'd5']), { ply: 0, moveNumber: 1, color: 'w', mainMove: 'e4', lineMove: 'd4' });
  assert.deepEqual(findDivergence(['e4', 'e5', 'Nf3'], ['e4', 'e5']), { ply: 2, moveNumber: 2, color: 'w', mainMove: 'Nf3', lineMove: null });
  assert.deepEqual(findDivergence(['e4'], ['e4', 'e5']), { ply: 1, moveNumber: 1, color: 'b', mainMove: null, lineMove: 'e5' });
});

await test('moveLabel and upcomingMoves', () => {
  assert.equal(moveLabel(0, 'e4'), '1. e4');
  assert.equal(moveLabel(1, 'e5'), '1…e5');
  assert.equal(moveLabel(8, 'Ng5'), '5. Ng5');
  assert.equal(moveLabel(9, 'h6'), '5…h6');
  const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'];
  assert.deepEqual(upcomingMoves(sans, 0).map((m) => m.label), ['1. e4', '1…e5', '2. Nf3']);
  assert.deepEqual(upcomingMoves(sans, 3).map((m) => m.label), ['2…Nc6', '3. Bb5']);
  assert.deepEqual(upcomingMoves(sans, 5), []);
});

await test('main line is the first starred line, else the first line', () => {
  assert.equal(mainLineOf({ id: 'x', lines: [{ id: 'a', moves: [] }, { id: 'b', star: true, moves: [] }, { id: 'c', star: true, moves: [] }] }).id, 'b');
  assert.equal(mainLineOf({ id: 'x', lines: [{ id: 'a', moves: [] }, { id: 'b', moves: [] }] }).id, 'a');
  assert.equal(mainLineOf({ id: 'x', lines: [] }), null);
});

await test('real repertoire: departure ply and moves are correct for every non-main line', () => {
  let checked = 0;
  for (const op of openings) {
    const main = mainLineOf(op);
    assert.ok(main, `${op.id}: no main line`);
    assert.equal(divergenceFromMain(op, main), null, `${op.id}: main line must have no divergence`);
    const mainSans = sansOf(main);
    for (const line of op.lines) {
      if (isMainLine(op, line)) continue;
      const lineSans = sansOf(line);
      const d = divergenceFromMain(op, line);
      const tag = `${op.id}/${line.id}`;
      if (!d) { assert.deepEqual(lineSans.map((s) => s.replace(/[+#]/g, '')), mainSans.map((s) => s.replace(/[+#]/g, '')), `${tag}: no divergence but moves differ`); continue; }
      const strip = (s) => s.replace(/[+#]/g, '');
      for (let i = 0; i < d.ply; i++) assert.equal(strip(mainSans[i]), strip(lineSans[i]), `${tag}: ply ${i} should be shared`);
      assert.equal(d.moveNumber, Math.floor(d.ply / 2) + 1, tag);
      assert.equal(d.color, d.ply % 2 === 0 ? 'w' : 'b', tag);
      assert.equal(d.mainMove, d.ply < mainSans.length ? mainSans[d.ply] : null, `${tag}: main move`);
      assert.equal(d.lineMove, d.ply < lineSans.length ? lineSans[d.ply] : null, `${tag}: line move`);
      assert.ok(d.mainMove !== null || d.lineMove !== null, tag);
      if (d.mainMove !== null && d.lineMove !== null) assert.notEqual(strip(d.mainMove), strip(d.lineMove), `${tag}: moves must differ`);
      // both departure moves must be legal in the shared position
      const game = new Chess();
      for (let i = 0; i < d.ply; i++) assert.ok(game.move(lineSans[i]), `${tag}: illegal shared move ${lineSans[i]}`);
      for (const san of [d.mainMove, d.lineMove]) if (san !== null) assert.ok(new Chess(game.fen()).move(san), `${tag}: ${san} is not legal at ply ${d.ply}`);
      checked += 1;
    }
  }
  assert.ok(checked > 100, `expected many non-main lines, got ${checked}`);
  console.log(`  checked ${checked} non-main lines in ${openings.length} openings`);
});

await test('real repertoire: a known departure (alien-ke8 vs alien-main)', () => {
  const op = openings.find((o) => o.id === 'alien');
  const line = op.lines.find((l) => l.id === 'alien-ke8');
  const d = divergenceFromMain(op, line);
  const main = mainLineOf(op);
  assert.ok(d, 'alien-ke8 must depart from the main line');
  assert.equal(d.lineMove, sansOf(line)[d.ply]);
  assert.equal(d.mainMove, sansOf(main)[d.ply]);
  assert.equal(d.moveNumber, Math.floor(d.ply / 2) + 1);
});

await test('a board move (from/to -> SAN) is judged by quizMoveMatches on real line positions (main + one other line per opening, first 16 plies)', () => {
  let plies = 0;
  const seen = new Set(); // lines share long prefixes; each (position, move) is judged once
  for (const op of openings) {
    for (const line of [mainLineOf(op), ...op.lines.filter((l) => !isMainLine(op, l)).slice(0, 1)]) { // a sample: the full replay is in check-openings
      const game = new Chess();
      for (const san of sansOf(line).slice(0, 16)) {
        const fen = game.fen();
        const key = fen + '|' + san;
        if (!seen.has(key)) {
          seen.add(key);
          const legal = game.moves({ verbose: true });
          const hit = legal.filter((m) => m.san.replace(/[+#]/g, '') === san.replace(/[+#]/g, ''));
          assert.equal(hit.length, 1, `${op.id}/${line.id}: ${san} not uniquely legal`);
          const dragged = new Chess(fen).move({ from: hit[0].from, to: hit[0].to, promotion: hit[0].promotion });
          assert.ok(quizMoveMatches(Chess, fen, dragged.san, san), `${op.id}/${line.id}: dragged ${dragged.san} should match ${san}`);
          const other = legal.find((m) => m !== hit[0] && m.san.replace(/[+#]/g, '') !== san.replace(/[+#]/g, ''));
          if (other) assert.ok(!quizMoveMatches(Chess, fen, new Chess(fen).move({ from: other.from, to: other.to, promotion: other.promotion }).san, san), `${op.id}/${line.id}: ${other.san} must not match ${san}`);
          plies += 1;
        }
        game.move(san);
      }
    }
  }
  console.log(`  judged ${plies} distinct positions`);
});

const boardInput = readFileSync('src/opening-board-input.ts', 'utf8');
const mainSource = readFileSync('src/main.ts', 'utf8');
const learnSource = readFileSync('src/opening-learn.ts', 'utf8');
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/.*$/gm, '');

await test('board input routes through quizMoveMatches and only the trained side can move', () => {
  const code = strip(boardInput);
  assert.match(code, /import \{[^}]*quizMoveMatches[^}]*\} from '\.\/opening-quiz\.js'/);
  assert.match(code, /quizMoveMatches\(Chess, fen, san, expected\)/, 'the board move must be judged with quizMoveMatches');
  assert.match(code, /hooks\.onVerdict\(correct, san\)/);
  assert.match(code, /if \(!state\.active\) return false/, 'input is refused unless it is the trained side\'s turn in a running quiz');
  assert.match(code, /enableMoveInput\(/);
  assert.match(code, /showPromotionDialog\(/, 'promotions use the board promotion dialog');
  assert.match(code, /pieceSelected/);
  assert.ok(!/\bprog\b|persist|markLearned|streak/i.test(code), 'board input module must not touch progress or the streak');
  assert.match(mainSource, /import \{ enableQuizBoardInput, openingBoardExtensions \} from '\.\/opening-board-input\.js'/);
  assert.match(mainSource, /enableQuizBoardInput\(boardObj\.current,/);
  assert.match(mainSource, /extensions:openingBoardExtensions\(\)/);
  assert.match(mainSource, /active:quiz&&!!line&&ply<moves\.length&&\(ply%2===0\)===userIsWhite/, 'active only in the quiz, on the trained side\'s turn');
  // the typed field and the board share one verdict handler, so mistakes, hints and completion behave the same
  assert.match(mainSource, /function applyVerdict\(ok\)\{/);
  assert.match(mainSource, /applyVerdict\(quizMoveMatches\(Chess,fenAt\(ply\),input,moves\[ply\]\)\)/);
  assert.match(mainSource, /verdict:applyVerdict/);
  assert.match(mainSource, /placeholder:en\?'Your move \(e\.g\. Nf3\)'/, 'the text field stays');
});

await test('learn mode never marks a line learned and never posts to the streak', () => {
  const code = strip(learnSource);
  assert.ok(!/\bprog\b|\bdone\b|persist|markLearned|createOpeningStreakClient|openingStreak|\.record\(|localStorage|\/api\//.test(code), 'opening-learn.ts must not touch progress, storage, APIs or the streak');
  assert.ok(!/from '\.\/opening-streak|from '\.\/opening-core/.test(code));
  const mount = /h\(OpeningLearn,\{([^}]*)\}\)/.exec(mainSource);
  assert.ok(mount, 'OpeningLearn is mounted from main.ts');
  assert.equal(mount[1], 'op,line,ply,setPly,en', 'OpeningLearn only receives display props, not progress or the streak client');
  const toggle = /className:'open-learn-toggle'[^\n]*/.exec(mainSource)[0];
  assert.ok(!/markLearned|persist|record\(/.test(toggle), 'the learn toggle must not mark progress');
  assert.match(mainSource, /learn&&!quiz&&h\(OpeningLearn/, 'learn panel and quiz are exclusive');
  // markLearned stays reachable only from finishQuiz (quiz completion)
  const calls = mainSource.match(/markLearned\(\)/g) || [];
  assert.equal(calls.length, 2, 'markLearned is defined once and called once (finishQuiz)');
  assert.match(mainSource, /function finishQuiz\(\)\{\s*if\(mist<=2&&!cheated\)\{markLearned\(\)/);
});

await test('learn mode has Hebrew and English strings for its controls', () => {
  for (const text of ['Learn this line', 'למד את הקו', 'Next ▶', 'הבא ▶', '◀ Previous', '◀ הקודם', 'Coming next', 'הצעדים הבאים', 'Difference from the main line', 'ההבדל מהקו הראשי']) {
    assert.ok(learnSource.includes(text), `missing "${text}" in opening-learn.ts`);
  }
  assert.ok(mainSource.includes("'Learn this line'") && mainSource.includes("'למד את הקו'"));
});

await test('a missing or broken explanations file is handled', async () => {
  const bad = [
    () => Promise.resolve({ ok: false, status: 404, json: () => Promise.reject(new Error('no body')) }),
    () => Promise.reject(new TypeError('network down')),
    () => Promise.resolve({ ok: true, json: () => Promise.reject(new SyntaxError('<!doctype html>')) }),
    () => Promise.resolve({ ok: true, json: () => Promise.resolve([1, 2]) }),
    () => Promise.resolve({ ok: true, json: () => Promise.resolve(null) }),
  ];
  for (const fetchFn of bad) assert.deepEqual(await loadOpeningExplanations(fetchFn), {});
  assert.equal(explanationFor({}, 'alien', 'alien-ke8', 'en'), null);
  assert.equal(explanationFor(undefined, 'alien', 'alien-ke8', 'he'), null);
  const good = await loadOpeningExplanations(() => Promise.resolve({ ok: true, json: () => Promise.resolve({
    'alien/alien-ke8': { he: ' שלום ', en: 'hello' }, 'alien/only-he': { he: 'x' }, 'alien/empty': { he: '', en: ' ' }, 'alien/bad': 'text', 'alien/num': { he: 3, en: 4 },
  }) }));
  assert.deepEqual(Object.keys(good).sort(), ['alien/alien-ke8', 'alien/only-he']);
  assert.equal(explanationFor(good, 'alien', 'alien-ke8', 'he'), 'שלום');
  assert.equal(explanationFor(good, 'alien', 'alien-ke8', 'en'), 'hello');
  assert.equal(explanationFor(good, 'alien', 'only-he', 'en'), null, 'no cross-language fallback');
  assert.equal(explanationFor(good, 'alien', 'missing', 'en'), null);
  assert.equal(explanationKey('a', 'b'), 'a/b');
  assert.deepEqual(sanitizeExplanations('nope'), {});
  // the component asks for the file through the tolerant loader and shows the computed divergence either way
  const code = strip(learnSource);
  assert.match(code, /loadOpeningExplanations\(/);
  assert.match(code, /diff && h\('div', \{ className: 'open-learn-diff'/, 'the computed difference box does not depend on the file');
  assert.match(code, /why \? h\('p'/, 'the explanation is optional');
});

await test('the optional explanations file, when present, is well-formed', () => {
  const file = 'public/data/opening-explanations.json';
  if (!existsSync(file)) { console.log('  (no explanations file yet: optional)'); return; }
  const map = JSON.parse(readFileSync(file, 'utf8'));
  assert.ok(map && typeof map === 'object' && !Array.isArray(map), 'must be an object');
  const known = new Set(openings.flatMap((o) => o.lines.map((l) => explanationKey(o.id, l.id))));
  for (const [key, value] of Object.entries(map)) {
    if (!known.has(key)) console.warn(`  warning: explanation key ${key} matches no opening/line`);
    assert.ok(value && typeof value === 'object', `${key}: entry must be an object`);
    assert.ok(typeof value.he === 'string' && value.he.trim(), `${key}: he text required`);
    assert.ok(typeof value.en === 'string' && value.en.trim(), `${key}: en text required`);
  }
});

console.log(process.exitCode ? 'check-opening-learn: FAILED' : `check-opening-learn: ${passed} tests passed`);

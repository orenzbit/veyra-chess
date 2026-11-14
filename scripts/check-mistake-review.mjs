// Spaced review of the player's own mistakes: npm run check:mistake-review (also run from check:learn-path).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Chess } from '../rules-src/chess-compat.mjs';
import { mistakesFromGame, addMistakes, dueMistakes, answerMistake, normalizeMistakeReview, mergeMistakeReview, addDays, REVIEW_DAYS, LEARNED, MAX_ITEMS, PER_GAME } from '../src/mistake-review.ts';
import { mergeAccountState, normalizeAccountState } from '../src/account-sync.ts';
import { sanitizeAppState, mergeAppStateData } from '../netlify/functions/sync.mjs';
import { createHandler } from '../netlify/functions/learning-path.mjs';

let passed = 0;
async function test(name, fn) {
  try { await fn(); passed += 1; console.log(`ok - ${name}`); } catch (error) { console.error(`FAIL - ${name}\n  ${error.message}`); process.exitCode = 1; }
}
// A short game: 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4 4.Nxe5 Qg5 5.Nxf7 Qxg2 ... White's 4.Nxe5 is "the blunder" here (index 6).
const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nd4', 'Nxe5', 'Qg5', 'Nxf7', 'Qxg2'];
const g = new Chess(); const history = sans.map(s => g.move(s));
const row = (index, classification, bestUci, drop = 10) => ({ index, classification, bestUci, drop, whiteChanceBefore: 50, whiteChanceAfter: 40 });
const moves = sans.map((_, i) => row(i, 'good', null));
moves[6] = row(6, 'blunder', 'f3d4', 30);       // White (player): Nxd4 was better than Nxe5
moves[8] = row(8, 'mistake', 'e5f7', 5);        // best == played (Nxf7 = e5f7): not an item
moves[7] = row(7, 'blunder', 'd8g5', 40);       // Black's move: not the player's, skipped
moves[4] = row(4, 'miss', 'f1b5', 20);          // White, a different legal move: an item
moves[2] = row(2, 'mistake', 'a1a8', 1);        // illegal best move: skipped
const today = '2026-11-10';

await test('a game gives the player\'s own blunder/miss/mistake positions with the engine move as the answer', () => {
  const items = mistakesFromGame(Chess, history, moves, 'white', 'abcdef0123456789ffff', today);
  // the id is the game key's last 16 letters/digits (game urls differ at the end) and the ply index
  assert.deepEqual(items.map(i => [i.id, i.kind, i.best, i.played]), [['ef0123456789ffff:6', 'blunder', 'f3d4', 'f3e5'], ['ef0123456789ffff:4', 'miss', 'f1b5', 'f1c4']]);
  const fenBefore = new Chess(); sans.slice(0, 6).forEach(s => fenBefore.move(s));
  assert.equal(items[0].fen, fenBefore.fen(), 'the board before the mistake');
  assert.equal(items[0].due, '2026-11-11', 'due 1 day later'); assert.equal(items[0].step, 0);
  assert.deepEqual(mistakesFromGame(Chess, history, moves, 'black', 'x1', today), [], 'as Black: only Black moves count, and ply 7 has best == played');
  assert.deepEqual(mistakesFromGame(Chess, history, moves, '', 'x1', today), []);
});
await test(`at most ${PER_GAME} per game, worst first`, () => {
  const many = sans.map((_, i) => i % 2 === 0 ? row(i, i === 8 ? 'blunder' : 'mistake', null, i) : row(i, 'good', null));
  // give each White move a legal alternative
  const alt = ['d2d4', 'b1c3', 'd2d3', 'f3d4', 'e5d3'];
  [0, 2, 4, 6, 8].forEach((ply, k) => { many[ply].bestUci = alt[k]; });
  const items = mistakesFromGame(Chess, history, many, 'white', 'g1', today);
  assert.equal(items.length, PER_GAME);
  assert.equal(items[0].kind, 'blunder');
  assert.deepEqual(items.slice(1).map(i => i.id), ['g1:6', 'g1:4'], 'then the bigger drop');
});
await test(`schedule: due after ${REVIEW_DAYS.join(', ')} days, then learned; a miss or a hint goes back to 1 day`, () => {
  let s = addMistakes({ items: [] }, mistakesFromGame(Chess, history, moves, 'white', 'game1', today));
  const id = s.items.find(i => i.kind === 'blunder').id;
  assert.equal(dueMistakes(s, today).length, 0, 'nothing due the day it was added');
  assert.deepEqual(dueMistakes(s, '2026-11-11').map(i => i.id).sort(), s.items.map(i => i.id).sort());
  s = answerMistake(s, id, true, '2026-11-11'); let it = s.items.find(i => i.id === id);
  assert.deepEqual([it.step, it.due], [1, '2026-11-14']);
  s = answerMistake(s, id, true, '2026-11-14'); it = s.items.find(i => i.id === id);
  assert.deepEqual([it.step, it.due], [2, '2026-11-21']);
  s = answerMistake(s, id, false, '2026-11-21'); it = s.items.find(i => i.id === id);
  assert.deepEqual([it.step, it.due], [0, '2026-11-22'], 'wrong: back to tomorrow');
  for (const day of ['2026-11-22', '2026-11-25', '2026-12-02']) s = answerMistake(s, id, true, day);
  it = s.items.find(i => i.id === id);
  assert.equal(it.step, LEARNED); assert.ok(!dueMistakes(s, '2027-01-01').some(i => i.id === id), 'learned items are never due');
  assert.equal(addDays('2026-12-30', 3), '2027-01-02');
  // the page treats a hint or a wrong try as "not solved"
  const page = readFileSync('src/learn-page.ts', 'utf8');
  assert.match(page, /const hint = \(\) => \{ if \(solved\.current\) return; clean\.current = false;/);
  assert.match(page, /onMistakes\(answerMistake\(mistakes, item\.id, solved, today\)\)/);
});
await test('dedupe and cap: same id or same position+answer is not added twice; at most 200, open items kept first', () => {
  const items = mistakesFromGame(Chess, history, moves, 'white', 'game1', today);
  let s = addMistakes({ items: [] }, items);
  assert.equal(addMistakes(s, items), s);
  assert.equal(addMistakes(s, items.map(i => ({ ...i, id: 'other:' + i.id.split(':')[1] }))).items.length, s.items.length, 'same fen + best from another source');
  const base = items[0];
  const lots = Array.from({ length: MAX_ITEMS + 20 }, (_, n) => ({ ...base, id: 'g' + n + ':1', best: base.best, fen: base.fen.replace(/ \d+$/, ' ' + (n + 1)), added: addDays('2026-01-01', n), step: n < 30 ? LEARNED : 0 }));
  const capped = normalizeMistakeReview({ items: lots });
  assert.equal(capped.items.length, MAX_ITEMS);
  assert.equal(capped.items.filter(i => i.step === LEARNED).length, 10, 'learned ones are dropped first, oldest first');
  assert.deepEqual(normalizeMistakeReview({ items: [{ ...base, fen: 'nope' }, { ...base, best: 'z9' }, { ...base, kind: 'inaccuracy' }, { ...base, step: 9 }] }).items, []);
});
await test('stored with the account: server sanitize + merge keep it; a new device after logout/login gets it back', () => {
  const items = mistakesFromGame(Chess, history, moves, 'white', 'game1', today);
  let local = addMistakes({ items: [] }, items);
  local = answerMistake(local, items[0].id, true, '2026-11-11', new Date('2026-11-11T10:00:00Z'));
  const appState = { version: 1, archiveReviews: {}, usernames: { chesscom: 'x', lichess: '' }, mistakeReview: local };
  const stored = sanitizeAppState(appState);
  assert.deepEqual(stored.mistakeReview, normalizeMistakeReview(local), 'server sanitize == client normalize');
  assert.equal(sanitizeAppState({ ...appState, mistakeReview: { items: [{ id: 'x', fen: 'bad' }] } }).mistakeReview.items.length, 0);
  // the server row is merged with a later PUT that has no queue (another tab): the queue stays
  const merged = mergeAppStateData(stored, { version: 1, archiveReviews: {}, usernames: { chesscom: 'x', lichess: '' } });
  assert.deepEqual(merged.mistakeReview, stored.mistakeReview);
  // two devices answered the same item: the later answer wins
  const other = answerMistake(normalizeMistakeReview(local), items[0].id, false, '2026-11-12', new Date('2026-11-12T09:00:00Z'));
  const both = mergeAppStateData(stored, { ...appState, mistakeReview: other });
  assert.equal(both.mistakeReview.items.find(i => i.id === items[0].id).step, 0);
  assert.equal(mergeMistakeReview(local, other).items.find(i => i.id === items[0].id).step, 0);
  // logout clears the session; on login the client merges an empty local state with the server's row
  const back = mergeAccountState({ version: 1, archiveReviews: {} }, merged);
  assert.deepEqual(normalizeMistakeReview(back.mistakeReview), merged.mistakeReview);
  assert.equal(normalizeAccountState({ version: 1, archiveReviews: {} }).mistakeReview, undefined, 'no queue = no field');
  const main = readFileSync('src/main.ts', 'utf8');
  assert.match(main, /const mergedMistakes=normalizeMistakeReview\(merged\.mistakeReview\);setMistakeReview\(mergedMistakes\);/);
  assert.match(main, /learningPath:learnProgress,\.\.\.\(mistakeReview\.items\.length\?\{mistakeReview\}:\{\}\)\};/, 'pushed with the app state');
});
await test('flag MISTAKE_REVIEW_ENABLED: off by default; collection and the card only with it on', async () => {
  const get = async env => JSON.parse((await createHandler({ env })({ httpMethod: 'GET', headers: {} })).body);
  assert.equal((await get({ LEARNING_PATH_ENABLED: 'true' })).mistakeReview, false);
  assert.equal((await get({ LEARNING_PATH_ENABLED: 'true', MISTAKE_REVIEW_ENABLED: '1' })).mistakeReview, false);
  assert.equal((await get({ LEARNING_PATH_ENABLED: 'true', MISTAKE_REVIEW_ENABLED: 'true' })).mistakeReview, true);
  const main = readFileSync('src/main.ts', 'utf8');
  assert.match(main, /const \[mistakeReviewEnabled,setMistakeReviewEnabled\]=useState\(false\);/);
  assert.match(main, /setMistakeReviewEnabled\(r\.ok&&r\.data\?\.mistakeReview===true\)/);
  assert.match(main, /mistakes:mistakeReviewEnabled\?mistakeReview:undefined,/);
  assert.equal((main.match(/mistakesFromGame\(/g) || []).length, 2, 'DNA scan + game review');
  assert.match(main, /if\(mistakeReviewEnabled\)try\{scanMistakes\.push/);
  assert.match(main, /if\(mistakeReviewEnabled&&activeArchiveGame\?\.id/);
  assert.match(readFileSync('scripts/local-preview.mjs', 'utf8'), /mistakeReview: process\.env\.MISTAKE_REVIEW_ENABLED === 'true'/);
  const page = readFileSync('src/learn-page.ts', 'utf8');
  assert.match(page, /mistakes && onMistakes && h\('div', \{ className: 'learn-next learn-mistakes'/);
  for (const he of ['חזרה על הטעויות שלך', 'מצא מהלך טוב יותר', 'התחל חזרה', 'סיימת את החזרה של היום']) assert.ok(page.includes(he), he);
});
console.log(`mistake review: ${passed} passed`);

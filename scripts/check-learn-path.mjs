// Learn path: course building from Veyra's own content, sequential unlocking, personalisation (plan steps first),
// and that progress rides the account's app state (server sanitize/merge and client merge keep it, union-merged).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Chess } from '../rules-src/chess-compat.mjs';
import { buildCourses, nodeStates, nextPlannedNode, DEFAULT_OPENINGS } from '../src/learning-path.ts';
import { ENDGAMES } from '../src/endgames.ts';
import { mergeAccountState } from '../src/account-sync.ts';
import { sanitizeAppState, mergeAppStateData } from '../netlify/functions/sync.mjs';

const repertoire = JSON.parse(readFileSync('public/data/repertoire.json', 'utf8'));
let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log(`ok - ${name}`); } catch (error) { console.error(`FAIL - ${name}\n  ${error.message}`); process.exitCode = 1; }
}
const courses = buildCourses(Chess, repertoire);

test('openings course: 3-6 repertoire openings, lesson then practice for each', () => {
  assert.ok(DEFAULT_OPENINGS.length >= 3 && DEFAULT_OPENINGS.length <= 6);
  assert.equal(courses.openings.length, DEFAULT_OPENINGS.length * 2);
  courses.openings.forEach((n, i) => assert.equal(n.kind, i % 2 === 0 ? 'lesson' : 'practice', n.id));
  for (const id of DEFAULT_OPENINGS) assert.ok(repertoire.some(o => o.id === id), id + ' is in the repertoire');
});
test('endgames course: every ENDGAMES entry, lesson then practice', () => {
  assert.deepEqual(courses.endgames.map(n => n.id), ENDGAMES.flatMap(e => [`e:${e.id}:l`, `e:${e.id}:p`]));
});
test('lessons have 2-4 screens of one sentence each, on a legal board', () => {
  for (const n of [...courses.openings, ...courses.endgames].filter(n => n.kind === 'lesson')) {
    assert.ok(n.screens.length >= 2 && n.screens.length <= 4, n.id + ' screens ' + n.screens.length);
    for (const s of n.screens) {
      new Chess(s.fen);
      for (const lang of ['en', 'he']) assert.ok(s.text[lang] && s.text[lang].length < 260, n.id + ' sentence ' + lang);
      for (const [from, to] of s.arrows) assert.ok(new Chess(s.fen).moves({ verbose: true }).some(m => m.from === from && m.to === to), `${n.id} arrow ${from}${to} is a legal move`);
    }
  }
});
test('node ids are unique', () => {
  const ids = [...courses.openings, ...courses.endgames].map(n => n.id);
  assert.equal(new Set(ids).size, ids.length);
});
test('unlocking: only the first node is open; finishing a node opens the next', () => {
  const nodes = courses.endgames;
  assert.deepEqual(nodeStates(nodes, []).slice(0, 3), ['available', 'locked', 'locked']);
  assert.deepEqual(nodeStates(nodes, [nodes[0].id]).slice(0, 3), ['done', 'available', 'locked']);
  assert.deepEqual(nodeStates(nodes, [nodes[0].id, nodes[1].id]).slice(0, 4), ['done', 'done', 'available', 'locked']);
});
test('personalisation: plan steps come first, in plan order, marked planned; unknown ids skipped', () => {
  const plan = [
    { kind: 'endgame', endgameId: 'lucena' },
    { kind: 'opening', openingId: 'ruylopez', lineIds: ['closed-main', 'no-such-line'] },
    { kind: 'opening', openingId: 'nope', lineIds: [] },
    { kind: 'endgame', endgameId: 'kr-k' },
    { kind: 'opening', openingId: 'french', lineIds: [] },
  ];
  const c = buildCourses(Chess, repertoire, plan);
  assert.deepEqual(c.endgames.slice(0, 4).map(n => n.id), ['e:lucena:l', 'e:lucena:p', 'e:kr-k:l', 'e:kr-k:p']);
  assert.equal(c.endgames.length, ENDGAMES.length * 2, 'nothing dropped, nothing duplicated');
  assert.equal(c.openings[0].id, 'o:ruylopez:closed-main:l');
  assert.equal(c.openings[2].id.split(':')[1], 'french', 'a plan opening without lineIds uses its core line');
  assert.equal(c.openings.filter(n => n.id.startsWith('o:french:')).length, 2, 'french not repeated from the defaults');
  assert.ok(c.openings.slice(0, 4).every(n => n.planned) && !c.openings[4].planned);
  assert.equal(nextPlannedNode(c.openings, []).id, 'o:ruylopez:closed-main:l');
  assert.equal(nextPlannedNode(c.openings, ['o:ruylopez:closed-main:l']).id, 'o:ruylopez:closed-main:p');
  assert.equal(nextPlannedNode(courses.openings, []), null, 'no plan: no "What to do next" node');
  const egOnly = buildCourses(Chess, repertoire, [{ kind: 'endgame', endgameId: 'philidor' }]);
  assert.equal(nextPlannedNode(egOnly.endgames, []).id, 'e:philidor:l', 'an endgame plan step is open on its own course');
});
test('personalisation: unknown or empty plan leaves the default order', () => {
  assert.deepEqual(buildCourses(Chess, repertoire, [{ kind: 'endgame', endgameId: 'x' }]).endgames.map(n => n.id), courses.endgames.map(n => n.id));
  assert.deepEqual(buildCourses(Chess, repertoire, undefined).openings.map(n => n.id), courses.openings.map(n => n.id));
});
test('storage: server app state keeps learningPath (validated) and merges it as a union', () => {
  const clean = sanitizeAppState({ archiveReviews: {}, learningPath: { done: ['e:kq-k:l', 'bad id!', 5], days: ['2026-11-10', 'x', '2026-02-30'] } });
  assert.deepEqual(clean.learningPath, { done: ['e:kq-k:l'], days: ['2026-11-10'] });
  const merged = mergeAppStateData({ archiveReviews: {}, learningPath: { done: ['a'], days: ['2026-11-09'] } }, { archiveReviews: {}, learningPath: { done: ['b'], days: ['2026-11-10'] } });
  assert.deepEqual(merged.learningPath, { done: ['a', 'b'], days: ['2026-11-09', '2026-11-10'] });
  const keep = mergeAppStateData({ archiveReviews: {}, learningPath: { done: ['a'], days: [] } }, { archiveReviews: {} });
  assert.deepEqual(keep.learningPath, { done: ['a'], days: [] }, 'a client that sends no learningPath does not erase it');
  assert.equal('learningPath' in sanitizeAppState({ archiveReviews: {} }), false, 'absent stays absent');
  assert.deepEqual(sanitizeAppState({ learningPath: { done: [], days: ['2026-99-99', '2026-11-10'] } }).learningPath.days, ['2026-11-10'], 'impossible date dropped, no throw');
  const long = Array.from({ length: 1200 }, (_, i) => new Date(Date.UTC(2023, 0, 1 + i)).toISOString().slice(0, 10));
  assert.equal(sanitizeAppState({ learningPath: { done: [], days: long } }).learningPath.days.length, 1200, 'long streak history kept');
});
test('storage: client account merge keeps both devices\' progress', () => {
  const m = mergeAccountState({ archiveReviews: {}, learningPath: { done: ['a'], days: ['2026-11-09'] } }, { archiveReviews: {}, learningPath: { done: ['b'], days: [] } });
  assert.deepEqual(m.learningPath, { done: ['a', 'b'], days: ['2026-11-09'] });
});
test('storage: main.ts sends learningPath with the account app state and restores it after sign-in', () => {
  const main = readFileSync('src/main.ts', 'utf8');
  assert.match(main, /adaptiveOptIn,learningPath:learnProgress\}/, 'the debounced app-state save carries learningPath');
  assert.match(main, /learningPath:readLearnProgress\(\)\}/, 'local progress is merged on sign-in when this device belongs to the user');
  assert.match(main, /normalizeLearnProgress\(merged\.learningPath\)/, 'merged progress is restored from the account');
});
console.log(`learn path: ${passed} passed`);

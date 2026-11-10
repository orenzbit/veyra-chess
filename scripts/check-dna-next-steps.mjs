// "What to do next" from the DNA plan: npm run check:dna-next-steps (also run from check:learn-path).
// The Learn page's card shows the first 2-3 unfinished steps of buildDnaPlan, each a button that opens the right
// place: an opening or endgame step opens its Learn node (lesson first, then practice), many blunders add puzzles.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Chess } from '../rules-src/chess-compat.mjs';
import { buildCourses, nodeStates } from '../src/learning-path.ts';
import { ENDGAMES } from '../src/endgames.ts';
import { buildDnaPlan } from '../src/dna-plan.ts';
import { dnaNextSteps, planProgress, MAX_NEXT_STEPS, PUZZLES_AT_PER_100 } from '../src/dna-next-steps.ts';
import { createHandler } from '../netlify/functions/learning-path.mjs';

const repertoire = JSON.parse(readFileSync('public/data/repertoire.json', 'utf8'));
let passed = 0;
async function test(name, fn) {
  try { await fn(); passed += 1; console.log(`ok - ${name}`); } catch (error) { console.error(`FAIL - ${name}\n  ${error.message}`); process.exitCode = 1; }
}
const game = (opening, playerColor, result, accuracy, userMoves = 30) => ({ opening, playerColor, result, accuracy, userMoves });
const report = (games, counts = { blunder: 30, miss: 12 }) => ({ timeControls: { blitz: { userMoves: 1000, classificationCounts: counts, games } } });
const italian = [
  game('Italian Game Two Knights Defense', 'white', '0-1', 60), game('Italian Game Two Knights Defense', 'white', '0-1', 58),
  game('Italian Game Giuoco Piano', 'white', '0-1', 70), game('Italian Game', 'white', '0-1', 65), game('Italian Game', 'white', '1-0', 80),
];
const scandi = [game('Scandinavian Defense', 'white', '1-0', 85), game('Scandinavian Defense', 'white', '0-1', 72)];
const plan = buildDnaPlan({ report: report([...italian, ...scandi]), openings: repertoire, endgames: ENDGAMES });
const courses = buildCourses(Chess, repertoire, plan.steps);
const allIds = new Set([...courses.openings, ...courses.endgames].map(n => n.id));

await test('a scan with many blunders: 3 steps = top plan step, puzzles, next plan step; each opens a real node', () => {
  assert.equal(plan.personalised, true);
  const steps = dnaNextSteps(plan, courses, []);
  assert.equal(steps.length, MAX_NEXT_STEPS);
  assert.deepEqual(steps.map(s => s.target), ['node', 'puzzles', 'node']);
  const first = plan.steps[0];
  assert.equal(first.kind, 'opening'); assert.equal(first.openingId, 'italian');
  assert.equal(steps[0].nodeId, `o:italian:${first.lineIds[0]}:l`); assert.equal(steps[0].action, 'lesson'); assert.equal(steps[0].course, 'openings');
  assert.deepEqual(steps[0].reason, first.reason, 'the plan\'s own reason is shown');
  for (const s of steps.filter(s => s.target === 'node')) assert.ok(allIds.has(s.nodeId), s.nodeId);
  assert.match(steps[1].reason.he, /פאזלים/); assert.match(steps[1].reason.en, /4\.2 blunders or missed wins per 100/);
  // the step opens the first node of its course: available, not locked
  assert.equal(nodeStates(courses.openings, [])[courses.openings.findIndex(n => n.id === steps[0].nodeId)], 'available');
});
await test('an endgame step opens the endgame lesson', () => {
  const steps = dnaNextSteps(plan, courses, [], 10);
  const eg = steps.find(s => s.target === 'node' && s.course === 'endgames');
  const want = plan.steps.find(s => s.kind === 'endgame');
  assert.ok(eg && want); assert.equal(eg.nodeId, `e:${want.endgameId}:l`); assert.equal(eg.action, 'lesson');
});
await test('progress: a done lesson moves the button to its practice; a done practice skips the step', () => {
  const first = plan.steps[0]; const line = first.lineIds[0];
  let steps = dnaNextSteps(plan, courses, [`o:italian:${line}:l`]);
  assert.equal(steps[0].nodeId, `o:italian:${line}:p`); assert.equal(steps[0].action, 'practice');
  // both lines of the step done -> the next plan step comes first
  const done = first.lineIds.flatMap(l => [`o:italian:${l}:l`, `o:italian:${l}:p`]);
  steps = dnaNextSteps(plan, courses, done);
  assert.ok(steps.every(s => s.target === 'puzzles' || !s.nodeId.startsWith('o:italian:')), JSON.stringify(steps.map(s => s.nodeId)));
  assert.deepEqual(planProgress(done), { openingLines: first.lineIds.map(l => `italian:${l}`), endgames: [] });
  assert.deepEqual(planProgress(['e:kq-k:l', 'e:kq-k:p', 'o:qg:x:l']), { openingLines: [], endgames: ['kq-k'] });
});
await test('few blunders: no puzzles step; never more than 3', () => {
  const calm = buildDnaPlan({ report: report([...italian, ...scandi], { blunder: 5, miss: 2 }), openings: repertoire, endgames: ENDGAMES });
  assert.ok(0.7 < PUZZLES_AT_PER_100);
  const steps = dnaNextSteps(calm, buildCourses(Chess, repertoire, calm.steps), []);
  assert.equal(steps.length, 3); assert.ok(steps.every(s => s.target === 'node'));
});
await test('no report, an unpersonalised plan (under 5 games) or no courses: no steps', () => {
  assert.deepEqual(dnaNextSteps(null, courses, []), []);
  const few = buildDnaPlan({ report: report(italian.slice(0, 3)), openings: repertoire, endgames: ENDGAMES });
  assert.equal(few.personalised, false);
  assert.deepEqual(dnaNextSteps(few, courses, []), []);
  assert.deepEqual(dnaNextSteps(plan, null, []), []);
});
await test('flag DNA_PLAN_ENABLED: off by default, on only when "true"', async () => {
  const get = async env => JSON.parse((await createHandler({ env })({ httpMethod: 'GET', headers: {} })).body);
  assert.equal((await get({ LEARNING_PATH_ENABLED: 'true' })).dnaPlan, false);
  assert.equal((await get({ LEARNING_PATH_ENABLED: 'true', DNA_PLAN_ENABLED: 'yes' })).dnaPlan, false);
  assert.equal((await get({ LEARNING_PATH_ENABLED: 'true', DNA_PLAN_ENABLED: 'true' })).dnaPlan, true);
  const preview = readFileSync('scripts/local-preview.mjs', 'utf8');
  assert.match(preview, /dnaPlan: process\.env\.DNA_PLAN_ENABLED === 'true'/);
});
await test('client: the report reaches the Learn page only with the flag; the card renders the steps as buttons', () => {
  const main = readFileSync('src/main.ts', 'utf8');
  assert.match(main, /const \[dnaPlanEnabled,setDnaPlanEnabled\]=useState\(false\);/);
  assert.match(main, /setDnaPlanEnabled\(r\.ok&&r\.data\?\.dnaPlan===true\)/);
  assert.match(main, /h\(LearnPage,\{[^}]*dnaReport:dnaPlanEnabled\?dnaReport:null,onPuzzles:\(\)=>setPage\('puzzles'\),onDna:dnaPlanEnabled\?openDnaPage:undefined/);
  assert.match(main, /if\(page!=='learn'\|\|!dnaPlanEnabled\|\|!authUser\?\.id\|\|dnaReport\)return;/, 'the latest report loads only for a signed-in user with the flag on');
  const page = readFileSync('src/learn-page.ts', 'utf8');
  assert.match(page, /const nextSteps: NextStep\[\] = dnaNextSteps\(dnaPlan, courses, progress\.done\);/);
  assert.match(page, /'data-learn-next-steps': nextSteps\.length/);
  assert.match(page, /onClick: \(\) => openStep\(s\)/);
  for (const he of ['לפי סריקת ה-DNA שלך', 'לפאזלים', 'התחל שיעור', 'התחל תרגול', 'לסריקת DNA']) assert.ok(page.includes(he), he);
});
console.log(`dna next steps: ${passed} passed`);

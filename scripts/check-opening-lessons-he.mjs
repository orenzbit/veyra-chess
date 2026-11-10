// Hebrew opening lessons on the Learn path: npm run check:opening-lessons-he (also run from check:learn-path).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Chess } from '../rules-src/chess-compat.mjs';
import { buildCourses } from '../src/learning-path.ts';
import { OPENING_LESSONS_HE } from '../src/opening-lessons-he.ts';

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log(`ok - ${name}`); } catch (error) { console.error(`FAIL - ${name}\n  ${error.message}`); process.exitCode = 1; }
}
const rep = JSON.parse(readFileSync('public/data/repertoire.json', 'utf8'));
const lessons = plan => buildCourses(Chess, rep, plan).openings.filter(n => n.kind === 'lesson');
const hebrew = /[\u0590-\u05FF]/;
// every screen any opening lesson can show: each line of each opening, as a DNA plan step would pick it
const screens = [];
for (const op of rep) for (const line of op.lines) {
  let nodes; try { nodes = lessons([{ kind: 'opening', openingId: op.id, lineIds: [line.id] }]); } catch { continue; }
  if (nodes[0]) screens.push(...nodes[0].screens.map(s => ({ op: op.id, line: line.id, text: s.text })));
}

test('the default course (5 openings) reads in Hebrew on every screen; English stays as it was', () => {
  const nodes = lessons([]);
  assert.equal(nodes.length, 5);
  for (const n of nodes) for (const s of n.screens) {
    assert.match(s.text.he, hebrew, `${n.id}: "${s.text.en}" has no Hebrew`);
    assert.doesNotMatch(s.text.en, hebrew, `${n.id}: English text changed`);
  }
  const italian = nodes.find(n => n.id.startsWith('o:italian:'));
  assert.equal(italian.screens[0].text.he, '\u20661.e4 e5 2.Nf3 Nc6 3.Bc4\u2069 — הפתיחה העתיקה ביותר: מכוונים אל \u2066f7\u2069, ואז בוחרים בין משחק רגוע לקרב פרוע.',
    'move runs are left-to-right isolates, so the move number stays in front in an RTL sentence');
  assert.equal(nodes.find(n => n.id.startsWith('o:italian:')).screens[1].text.he, '\u20664.c3\u2069 — מכינים \u2066d4\u2069 ובנייה איטית.');
});
test(`every lesson screen of all ${rep.length} openings and every line a DNA plan can pick has Hebrew (${screens.length} screens)`, () => {
  const missing = screens.filter(s => !hebrew.test(s.text.he) || s.text.he === s.text.en);
  assert.deepEqual(missing.slice(0, 5).map(s => `${s.op}/${s.line}: ${s.text.en}`), []);
});
test('the Hebrew keeps every move and square of the English (SAN tokens are not translated away)', () => {
  const tokens = t => (t.match(/\b(?:\d+\.(?:\.\.)?|…)?(?:O-O(?:-O)?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?)/g) || []).map(x => x.replace(/^\d+\.+|^…/, '')).sort();
  const bad = Object.entries(OPENING_LESSONS_HE).filter(([en, he]) => tokens(en).join(' ') !== tokens(he).join(' '));
  assert.deepEqual(bad.slice(0, 5), []);
  assert.ok(Object.values(OPENING_LESSONS_HE).every(he => !/[\u200e\u200f]/.test(he)), 'no hidden direction marks');
});
test('no stale entries: every Hebrew key is a sentence some lesson shows', () => {
  const shown = new Set(screens.map(s => s.text.en));
  assert.deepEqual(Object.keys(OPENING_LESSONS_HE).filter(k => !shown.has(k)), []);
});
console.log(`opening lessons he: ${passed} passed`);

// Learn path practice flow (play-findings: practice has no result screen; fast correct moves counted as mistakes).
// Source checks on src/learn-page.ts; scripts/check-learn-practice-browser.mjs plays the same flow in Chromium.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync('src/learn-page.ts', 'utf8');
const view = (name) => { const i = src.indexOf(`function ${name}(`); assert.ok(i >= 0, name); return src.slice(i, src.indexOf('\nfunction ', i + 10)); };
let failed = 0;
function test(name, fn) { try { fn(); console.log(`PASS: ${name}`); } catch (e) { failed += 1; console.error(`FAIL: ${name}\n  ${e.message}`); } }

const opening = view('OpeningPracticeView');
const endgame = view('EndgamePracticeView');
test('a finished practice shows a result card with the counts and a continue button', () => {
  const card = view('ResultCard');
  assert.match(card, /data-learn-result/);
  assert.match(card, /מהלכים נכונים/); assert.match(card, /טעויות/); assert.match(card, /רמזים/);
  assert.match(card, /onClick: onDone/);
});
test('opening practice renders the result card when the line is done', () => assert.match(opening, /finished && h\(ResultCard/));
test('endgame practice renders the result card when the goal is reached', () => assert.match(endgame, /won && h\(ResultCard/));
test('practice no longer closes itself a moment after the last move', () => {
  assert.doesNotMatch(opening, /setTimeout\(onDone/);
  assert.doesNotMatch(endgame, /later\(onDone/);
});
test('a move played while the opponent reply is pending is judged after that reply, not refused', () => {
  assert.match(opening, /const current = \(\) => \{ const n = state\.current\.ply; return n < node\.sans\.length && !mine\(n\) \? n \+ 1 : n; \}/);
  assert.match(opening, /getState: \(\) => \{ const n = current\(\);/);
  assert.match(opening, /setPly\(current\(\) \+ 1\)/);
  assert.match(opening, /resetBoard: \(\) => board\.setPosition\(fenAt\(current\(\)\), true\)/);
});
test('a wrong move during the pending reply still shows that reply', () => assert.match(opening, /else \{ setPly\(current\(\)\);/));

if (failed) { console.error(`${failed} learn practice flow check(s) failed.`); process.exit(1); }
console.log('Learn practice flow checks passed.');

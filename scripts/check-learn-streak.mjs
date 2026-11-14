// Unit tests of the Learn path's forgiving daily streak (src/learn-progress.ts).
// Rule: daily goal = 1 node on the local date; every 7 goal days earn a rest day (max 2 held);
// a missed day uses a rest day; a miss with none held resets to 0; today is never a miss.
import assert from 'node:assert/strict';
import { learnStreak, recordNodeDone, normalizeLearnProgress, mergeLearnProgress, localDateKey, DAILY_GOAL, REST_DAY_EVERY, MAX_REST_DAYS } from '../src/learn-progress.ts';

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log(`ok - ${name}`); } catch (error) { console.error(`FAIL - ${name}\n  ${error.message}`); process.exitCode = 1; }
}
const run = (from, n) => { const out = []; const d = new Date(from + 'T00:00:00Z'); for (let i = 0; i < n; i++) { out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); } return out; };

test('constants: goal 1 node, a rest day every 7 days, at most 2 held', () => {
  assert.equal(DAILY_GOAL, 1); assert.equal(REST_DAY_EVERY, 7); assert.equal(MAX_REST_DAYS, 2);
});
test('no activity: streak 0', () => {
  assert.deepEqual(learnStreak([], '2026-11-10'), { streak: 0, best: 0, restDays: 0, todayDone: false, coveredDays: [] });
});
test('consecutive days count, today included', () => {
  const s = learnStreak(run('2026-11-08', 3), '2026-11-10');
  assert.equal(s.streak, 3); assert.equal(s.todayDone, true);
});
test('today not done yet is not a miss', () => {
  const s = learnStreak(run('2026-11-07', 3), '2026-11-10');
  assert.equal(s.streak, 3); assert.equal(s.todayDone, false);
});
test('a miss with no rest day resets the streak', () => {
  const s = learnStreak(['2026-11-06', '2026-11-07', '2026-11-09'], '2026-11-10');
  assert.equal(s.streak, 1); assert.equal(s.best, 2);
});
test('7 days earn a rest day that covers one missed day automatically', () => {
  const days = [...run('2026-11-01', 7), '2026-11-09'];
  const s = learnStreak(days, '2026-11-09');
  assert.equal(s.streak, 8, 'the miss on 11-08 is covered and the streak keeps growing');
  assert.equal(s.restDays, 0, 'the rest day was used');
  assert.deepEqual(s.coveredDays, ['2026-11-08']);
});
test('rest day held after 7 days, not yet used', () => {
  assert.equal(learnStreak(run('2026-11-01', 7), '2026-11-08').restDays, 1);
});
test('two misses in a row with one rest day: reset', () => {
  const s = learnStreak([...run('2026-11-01', 7), '2026-11-10'], '2026-11-10');
  assert.equal(s.streak, 1);
});
test('two misses in a row with two rest days: both covered', () => {
  const s = learnStreak([...run('2026-11-01', 14), '2026-11-17'], '2026-11-17');
  assert.equal(s.streak, 15); assert.deepEqual(s.coveredDays, ['2026-11-15', '2026-11-16']); assert.equal(s.restDays, 0);
});
test('rest days are capped at 2', () => {
  assert.equal(learnStreak(run('2026-10-01', 28), '2026-10-28').restDays, 2);
});
test('future dates and junk are ignored', () => {
  const s = learnStreak(['2026-11-10', '2026-11-11', 'x', '2026-02-30'], '2026-11-10');
  assert.equal(s.streak, 1);
});
test('impossible dates are dropped without throwing (corrupt localStorage or account data)', () => {
  assert.deepEqual(normalizeLearnProgress({ done: [], days: ['2026-99-99', '2026-13-01', '2026-02-30', '2026-11-10'] }).days, ['2026-11-10']);
  assert.equal(learnStreak(['2026-99-99', '2026-11-10'], '2026-11-10').streak, 1);
});
test('a 500-day streak survives normalization (no truncation of long streaks)', () => {
  const days = run('2025-06-28', 500);
  assert.equal(learnStreak(normalizeLearnProgress({ days }).days, days[499]).streak, 500);
});
test('local date key uses the device calendar date', () => {
  assert.equal(localDateKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});
test('recordNodeDone adds the node and today once', () => {
  const p0 = normalizeLearnProgress({});
  const p1 = recordNodeDone(p0, 'e:kq-k:l', '2026-11-10');
  assert.deepEqual(p1, { done: ['e:kq-k:l'], days: ['2026-11-10'] });
  assert.equal(recordNodeDone(p1, 'e:kq-k:l', '2026-11-10'), p1, 'no change returns the same object');
});
test('merge is a union of both devices (nothing finished is lost)', () => {
  const m = mergeLearnProgress({ done: ['a', 'b'], days: ['2026-11-09'] }, { done: ['b', 'c'], days: ['2026-11-10', '2026-11-09'] });
  assert.deepEqual(m, { done: ['a', 'b', 'c'], days: ['2026-11-09', '2026-11-10'] });
});
console.log(`learn streak: ${passed} passed`);

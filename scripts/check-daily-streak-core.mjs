import assert from 'node:assert/strict';
import {
  STREAK_MILESTONES, addDateDays, buildCalendar, calculateStreak, isDateKey,
  isValidTimeZone, localDateAt, nextLocalDate, summarizeDailyStreak,
} from '../netlify/functions/lib/daily-streak-core.mjs';

// Date and timezone validation (1-6)
assert.equal(isValidTimeZone('UTC'), true);
assert.equal(isValidTimeZone('Asia/Jerusalem'), true);
assert.equal(isValidTimeZone('Mars/Olympus'), false);
assert.equal(isValidTimeZone(''), false);
assert.equal(isDateKey('2024-02-29'), true);
assert.equal(isDateKey('2023-02-29'), false);

// Date arithmetic and local-midnight/DST behavior (7-13)
assert.equal(addDateDays('2024-02-28', 1), '2024-02-29');
assert.equal(addDateDays('2024-02-29', 1), '2024-03-01');
assert.equal(addDateDays('2024-12-31', 1), '2025-01-01');
assert.equal(addDateDays('2025-01-01', -1), '2024-12-31');
assert.equal(localDateAt('2026-10-22T20:30:00Z', 'Asia/Jerusalem'), '2026-10-22');
assert.equal(localDateAt('2026-10-22T22:30:00Z', 'Asia/Jerusalem'), '2026-10-23');
assert.equal(nextLocalDate('2026-10-22T12:00:00Z', 'UTC'), '2026-10-23');

// Current streak semantics and deduplication (14-23)
let s = calculateStreak(['2026-10-19', '2026-10-20', '2026-10-21'], '2026-10-22');
assert.equal(s.currentStreak, 3, 'today is open; yesterday anchors the streak');
assert.equal(s.canMaintainToday, true);
assert.equal(s.todayQualified, false);
s = calculateStreak(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22'], '2026-10-22');
assert.equal(s.currentStreak, 4);
assert.equal(s.canMaintainToday, false);
assert.equal(s.todayQualified, true);
s = calculateStreak(['2026-10-19', '2026-10-20'], '2026-10-22');
assert.equal(s.currentStreak, 0, 'a closed missed day breaks the active streak');
s = calculateStreak([], '2026-10-22');
assert.equal(s.currentStreak, 0);
assert.equal(s.bestStreak, 0);
s = calculateStreak(['2026-10-20', '2026-10-20', '2026-10-21'], '2026-10-21');
assert.equal(s.currentStreak, 2, 'duplicate activity dates count as one day');
s = calculateStreak(['2026-10-19', '2026-10-21', '2026-10-22'], '2026-10-22');
assert.equal(s.currentStreak, 2, 'gaps break a streak');
assert.equal(s.bestStreak, 2);
s = calculateStreak(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05'], '2026-10-05');
assert.equal(s.bestStreak, 3);
assert.equal(s.milestones.length, 6);
assert.deepEqual(STREAK_MILESTONES, [7, 14, 30, 50, 100, 365]);

// Calendar and summary contract (24-31)
const cal = buildCalendar(['2026-10-21'], '2026-10-22', 42);
assert.equal(cal.length, 42);
assert.equal(cal.at(-1).date, '2026-10-22');
assert.equal(cal.at(-1).status, 'today-open');
assert.equal(cal.at(-2).status, 'qualified');
assert.equal(cal[0].date, '2026-09-11');
const summary = summarizeDailyStreak([
  { local_date: '2026-10-21' },
  { local_date: '2026-10-21' },
], { timezone_id: 'UTC' }, Date.parse('2026-10-22T12:00:00Z'));
assert.equal(summary.currentStreak, 1);
assert.equal(summary.calendar.at(-2).activityCount, 2);
assert.equal(summary.timezoneId, 'UTC');
assert.equal(summary.today, '2026-10-22');
assert.equal(summary.calendar.at(-1).qualified, false);
assert.throws(() => addDateDays('bad', 1));
assert.throws(() => localDateAt('not-a-date', 'UTC'));
assert.throws(() => calculateStreak([], '2026-02-30'));

console.log('Daily streak core: 31 assertions passed.');

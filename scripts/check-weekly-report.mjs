// Weekly report card: npm run check:weekly-report (also run from check).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { weeklyReport, localToday, LONG_GAME_MOVES } from '../src/weekly-report.ts';
import { createHandler } from '../netlify/functions/features.mjs';

let passed = 0;
async function test(name, fn) {
  try { await fn(); passed += 1; console.log(`ok - ${name}`); } catch (error) { console.error(`FAIL - ${name}\n  ${error.message}`); process.exitCode = 1; }
}
const today = '2026-11-10'; // week = 11-04..11-10, previous = 10-28..11-03
const arch = (date, timeClass, userRating, playedAt = date + 'T12:00:00Z') => ({ date, playedAt, timeClass, userRating, result: 'win' });
const archiveGames = [
  arch('2026-11-01', 'blitz', 1400), arch('2026-11-05', 'blitz', 1412, '2026-11-05T09:00:00Z'), arch('2026-11-05', 'blitz', 1420, '2026-11-05T20:00:00Z'),
  arch('2026-11-09', 'rapid', 1500), arch('2026-11-10', 'rapid', 1490), arch('2026-10-01', 'bullet', 1100), arch('2026-11-08', 'blitz', null),
];
const dna = (date, opening, result, accuracy, userMoves = 30) => ({ date, opening, result, accuracy, userMoves });
const report = { timeControls: {
  blitz: { games: [dna('2026-11-05', 'Italian Game', 'win', 82), dna('2026-11-06', 'Italian Game', 'win', 80, 45), dna('2026-11-07', 'Sicilian Defense', 'loss', 61, 50),
    dna('2026-10-30', 'Italian Game', 'loss', 70), dna('2026-10-31', 'Italian Game', 'draw', 72, 41), dna('2026-11-02', 'Sicilian Defense', 'win', 75, 44), dna('2026-11-08', 'פתיחה לא זוהתה', 'win', 90)] },
  rapid: { games: [dna('2026-10-01', 'French Defense', 'win', 99)] },
} };

await test('rating: per time class, before the week (last earlier game) to the last game of the week', () => {
  const r = weeklyReport({ archiveGames, report, today });
  assert.equal(r.start, '2026-11-04'); assert.equal(r.end, '2026-11-10');
  assert.deepEqual(r.ratings, [
    { timeClass: 'blitz', before: 1400, after: 1420, change: 20, games: 2 },
    { timeClass: 'rapid', before: 1500, after: 1490, change: -10, games: 2 },
  ], 'blitz up 20 from 1400; rapid has no earlier game, so it starts at its first game of the week; bullet was not played; an unrated game is skipped');
});
await test('openings: this week against last week, score and accuracy; unknown openings are left out', () => {
  const r = weeklyReport({ archiveGames, report, today });
  assert.equal(r.games, 4); assert.equal(r.prevGames, 3);
  assert.deepEqual(r.openings.map(o => [o.name, o.games, o.score, o.accuracy, o.prevGames, o.prevScore, o.prevAccuracy, o.trend]), [
    ['Italian Game', 2, 100, 81, 2, 25, 71, 'better'],
    ['Sicilian Defense', 1, 0, 61, 1, 100, 75, 'worse'],
  ]);
});
await test(`endgames: games with ${LONG_GAME_MOVES}+ of the user's moves, this week against last`, () => {
  const e = weeklyReport({ archiveGames, report, today }).endgames;
  assert.deepEqual([e.games, e.score, e.accuracy, e.prevGames, e.prevScore, e.prevAccuracy, e.trend], [2, 50, 70.5, 2, 75, 73.5, 'worse']);
});
await test('trend rules: mixed signals are "same"; a first week is "new"; nothing loaded is an empty card, no throw', () => {
  const mixed = { timeControls: { blitz: { games: [dna('2026-11-05', 'X', 'win', 60), dna('2026-11-01', 'X', 'loss', 70)] } } };
  assert.equal(weeklyReport({ report: mixed, today }).openings[0].trend, 'same', 'score up, accuracy down');
  const first = { timeControls: { blitz: { games: [dna('2026-11-05', 'X', 'win', 60)] } } };
  assert.equal(weeklyReport({ report: first, today }).openings[0].trend, 'new');
  const empty = weeklyReport({ today });
  assert.deepEqual([empty.ratings, empty.openings, empty.endgames.games, empty.endgames.trend], [[], [], 0, 'new']);
  assert.match(localToday(new Date(2026, 0, 5, 23, 30)), /^2026-01-05$/);
});
await test('flag WEEKLY_REPORT_ENABLED: off by default; the card renders only with it on, above the weekly progress', async () => {
  const get = async env => JSON.parse((await createHandler({ env })({ httpMethod: 'GET', headers: {} })).body);
  assert.equal((await get({})).weeklyReport, false);
  assert.equal((await get({ WEEKLY_REPORT_ENABLED: 'true' })).weeklyReport, true);
  assert.equal((await get({ WEEKLY_REPORT_ENABLED: 'true' })).decisiveMoments, false, 'flags are independent');
  const main = readFileSync('src/main.ts', 'utf8');
  assert.match(main, /const \[weeklyEnabled,setWeeklyEnabled\]=useState\(false\);/);
  assert.match(main, /setWeeklyEnabled\(r\.ok&&r\.data\?\.weeklyReport===true\)/);
  assert.match(main, /weeklyEnabled&&h\(WeeklyReportCard,\{report:weeklyReport\(\{archiveGames,report:dnaReport,today:localToday\(\)\}\),archiveLoaded:archiveGames\.length>0,lang:getLang\(\)\}\),\n\s+h\(WeeklyProgressSection,\{report:dnaReport\}\)/);
  assert.match(readFileSync('scripts/local-preview.mjs', 'utf8'), /weeklyReport: process\.env\.WEEKLY_REPORT_ENABLED === 'true'/);
  const card = readFileSync('src/weekly-report-card.ts', 'utf8');
  for (const he of ['הדוח השבועי שלך', 'עלית ', 'ירדת ', 'נקודה אחת', 'משחק אחד', 'השתפר ↑', 'ירד ↓', 'פתיחות', 'סיומים', 'שבוע קודם: ']) assert.ok(card.includes(he), he);
});
console.log(`weekly report: ${passed} passed`);

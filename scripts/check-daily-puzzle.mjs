// Puzzle of the day: determinism, spread, order independence, empty list, and the calendar-date
// rule shared with the daily streak. Run after `tsc -p tsconfig.json` (dist/src/puzzle/daily.js).
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { dateKey, dailyPuzzleId, dailyZone, msUntilNextCheck, fnv1a } = await import(pathToFileURL(join(root, 'dist', 'src', 'puzzle', 'daily.js')).href);
const { localDateFor, isValidDateKey, addDateDays } = await import(pathToFileURL(join(root, 'netlify', 'functions', 'lib', 'daily-streak.mjs')).href);
const doc = JSON.parse(await readFile(join(root, 'data', 'puzzle-seed.json'), 'utf8'));
const puzzles = doc.puzzles;
const ids = new Set(puzzles.map(p => p.id));
assert.equal(ids.size, puzzles.length, 'seed ids are unique');

// Same date -> same id (3 calls), and the id is a real seed puzzle.
const first = dailyPuzzleId('2026-10-31', puzzles);
for (let i = 0; i < 3; i++) assert.equal(dailyPuzzleId('2026-10-31', puzzles), first, 'same date gives the same id');
assert.ok(ids.has(first), 'the daily id belongs to the seed');

// 60 consecutive days spread over at least 10 distinct puzzles, every one valid.
const seen = new Set();
let day = '2026-10-01';
for (let i = 0; i < 60; i++) {
  assert.ok(isValidDateKey(day), 'date key ' + day);
  const id = dailyPuzzleId(day, puzzles);
  assert.ok(ids.has(id), 'valid id for ' + day);
  seen.add(id);
  day = addDateDays(day, 1);
}
assert.ok(seen.size >= 10, 'expected at least 10 distinct puzzles in 60 days, got ' + seen.size);

// Order of the input never matters.
const reversed = puzzles.slice().reverse();
const rotated = puzzles.slice(7).concat(puzzles.slice(0, 7));
const shuffledList = puzzles.slice().sort((a, b) => fnv1a(a.id + 'x') - fnv1a(b.id + 'x'));
day = '2026-10-01';
for (let i = 0; i < 60; i++) {
  const want = dailyPuzzleId(day, puzzles);
  for (const list of [reversed, rotated, shuffledList, puzzles.map(p => p.id)]) assert.equal(dailyPuzzleId(day, list), want, 'order independent on ' + day);
  day = addDateDays(day, 1);
}

// Empty list -> null.
assert.equal(dailyPuzzleId('2026-10-31', []), null, 'empty list gives null');

// FNV-1a reference vectors (32-bit).
assert.equal(fnv1a(''), 0x811c9dc5);
assert.equal(fnv1a('a'), 0xe40c292c);
assert.equal(fnv1a('foobar'), 0xbf9cf968);

// The date rule is the streak's rule (user's time zone via Intl en-CA parts), not UTC.
const instants = [
  '2026-10-31T21:59:59.999Z', '2026-10-31T22:00:00.000Z', '2026-10-31T23:59:59.999Z',
  '2026-11-01T00:00:00.000Z', '2026-03-29T22:30:00.000Z', '2026-12-31T23:30:00.000Z', '2026-01-01T00:30:00.000Z',
];
const zones = ['UTC', 'Asia/Jerusalem', 'America/Los_Angeles', 'Pacific/Kiritimati', 'Pacific/Pago_Pago', 'Europe/London', 'Not/AZone'];
for (const iso of instants) {
  for (const zone of zones) {
    const expected = localDateFor(iso, zone === 'Not/AZone' ? 'UTC' : zone);
    assert.equal(dateKey(new Date(iso), zone), expected, `dateKey matches the streak rule for ${iso} in ${zone}`);
  }
}
// Example near midnight: Jerusalem is UTC+2 on 31 Oct 2026 (after DST ends on 25 Oct), so 22:30Z is already Nov 1.
assert.equal(dateKey(new Date('2026-10-31T22:30:00Z'), 'Asia/Jerusalem'), '2026-11-01');
assert.equal(dateKey(new Date('2026-10-31T22:30:00Z'), 'UTC'), '2026-10-31');
assert.equal(dateKey(new Date('2026-10-31T22:30:00Z'), 'America/Los_Angeles'), '2026-10-31');
assert.equal(localDateFor('2026-10-31T22:30:00Z', 'Asia/Jerusalem'), '2026-11-01');
assert.throws(() => dateKey(new Date('nope'), 'UTC'), /invalid_instant/);
assert.ok(isValidDateKey(dateKey(new Date(), 'Asia/Jerusalem')));

// Zone choice: the account's stored zone (what the server uses to date activity) wins once loaded;
// otherwise the browser's zone; junk falls back safely.
assert.equal(dailyZone('UTC', 'Asia/Jerusalem'), 'UTC');
assert.equal(dailyZone('America/Los_Angeles', 'Asia/Jerusalem'), 'America/Los_Angeles');
for (const none of [null, undefined, '', 'Not/AZone', 42]) assert.equal(dailyZone(none, 'Asia/Jerusalem'), 'Asia/Jerusalem');
assert.equal(dailyZone(null, 'Not/AZone'), 'UTC');
// Local preview account is UTC: near midnight in Jerusalem the banner date must follow UTC, as the streak does.
const nearMidnight = new Date('2026-10-31T22:30:00Z');
assert.equal(dateKey(nearMidnight, dailyZone('UTC', 'Asia/Jerusalem')), localDateFor(nearMidnight, 'UTC'));
assert.equal(dateKey(nearMidnight, dailyZone(null, 'Asia/Jerusalem')), '2026-11-01');
assert.notEqual(dateKey(nearMidnight, 'UTC'), dateKey(nearMidnight, 'Asia/Jerusalem'));

// Midnight timer: fires just after the zone's next midnight (never more than an hour away, never negative),
// and the date key has changed by then.
assert.equal(msUntilNextCheck(new Date('2026-10-31T23:59:30Z'), 'UTC'), 30500);
assert.equal(msUntilNextCheck(new Date('2026-10-31T23:59:30Z'), 'Asia/Jerusalem'), 3600000);
assert.equal(msUntilNextCheck(new Date('2026-10-31T21:59:59.500Z'), 'Asia/Jerusalem'), 1000);
for (const zone of zones) {
  for (const iso of instants) {
    const at = new Date(iso);
    const wait = msUntilNextCheck(at, zone);
    assert.ok(wait > 0 && wait <= 3600000, `timer in range for ${iso} ${zone}`);
    if (wait < 3600000) assert.notEqual(dateKey(new Date(at.getTime() + wait), zone), dateKey(at, zone), `date changes when the timer fires for ${iso} ${zone}`);
  }
}
assert.throws(() => msUntilNextCheck(new Date('nope'), 'UTC'), /invalid_instant/);

// Wiring in the puzzles page: the streak tab starts on the daily puzzle with both labels and the solved state.
const page = await readFile(join(root, 'src', 'puzzle-page.ts'), 'utf8');
for (const token of [
  'dailyPuzzleId(date, list)', 'dateKey(new Date(), zone)', 'dailyFor(list, zoneRef.current)', 'showRecord(next.rec)', 'daily-puzzle-banner',
  'dailyZone(', 'visibleDailyState?.timezoneId', 'msUntilNextCheck(', 'visibilitychange', "addEventListener('focus'", "removeEventListener('focus'",
  "removeEventListener('visibilitychange'", 'clearTimeout(timer)',
  'פאזל היום', 'Puzzle of the day', 'נפתר היום', 'Solved today', 'recordDailyActivity(cur.id, uci)', 'judge(cur, uci)',
]) assert.ok(page.includes(token), 'puzzle-page.ts is missing: ' + token);
const styles = await readFile(join(root, 'public', 'styles.css'), 'utf8');
assert.ok(styles.includes('.daily-puzzle-banner'), 'banner CSS present');

console.log('PASS: daily puzzle is deterministic, spread (' + seen.size + ' distinct ids in 60 days), order-independent, null for an empty list, and uses the streak calendar-date rule.');

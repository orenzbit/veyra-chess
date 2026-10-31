import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

async function load(entry) {
  const result = await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent' });
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const filter = await load('src/stats-filter.ts');
const dna = await load('src/chess-dna.ts');
const stats = await load('src/dna-statistics.ts');

// Fixture: every analyzed game has 10 own (white) moves at even plies.
const analyzed = (id, timeClass, accuracy, own) => ({
  fingerprint: id,
  date: '2026-03-01',
  playerColor: 'white',
  result: '1-0',
  opening: 'Fixture opening',
  timeClass,
  timeControlLabel: '',
  analysis: {
    summary: { whiteAcc: accuracy, blackAcc: 50 },
    moves: Array.from({ length: 20 }, (_, index) => ({ index, classification: index % 2 === 0 ? own[index / 2] : 'best' })),
  },
});
const moves = (blunders, mistakes) => Array.from({ length: 10 }, (_, i) => i < blunders ? 'blunder' : i < blunders + mistakes ? 'mistake' : 'best');
const fixtureGames = [
  analyzed('bullet-1', 'bullet', 60, moves(3, 0)),
  analyzed('bullet-2', 'bullet', 70, moves(3, 0)),
  analyzed('blitz-1', 'blitz', 80, moves(0, 1)),
  analyzed('blitz-2', 'blitz', 90, moves(0, 1)),
  analyzed('rapid-1', 'rapid', 95, moves(0, 0)),
  analyzed('unknown-1', 'classical', 10, moves(10, 0)),
  analyzed('unknown-2', undefined, 10, moves(10, 0)),
];
const report = dna.buildDnaReport(fixtureGames, '2026-03-02T00:00:00.000Z');
assert.equal(report.timeControls.bullet.count, 2);
assert.equal(report.timeControls.bullet.averageAccuracy, 65);
assert.equal(report.timeControls.blitz.averageAccuracy, 85);
assert.equal(report.timeControls.rapid.averageAccuracy, 95);

const reportSnapshot = JSON.stringify(report);

// Game-level helper: default excludes bullet; unknown / missing time class counts as non-bullet.
const defaultGames = filter.filterGamesByTimeClass(fixtureGames);
assert.deepEqual(defaultGames.map(g => g.fingerprint), ['blitz-1', 'blitz-2', 'rapid-1', 'unknown-1', 'unknown-2']);
assert.deepEqual(filter.filterGamesByTimeClass(fixtureGames, false).map(g => g.fingerprint), defaultGames.map(g => g.fingerprint));
assert.equal(filter.filterGamesByTimeClass(fixtureGames, true).length, fixtureGames.length);
assert.equal(filter.filterGamesByTimeClass([{ timeClass: ' BULLET ' }, { timeClass: 'Blitz' }, {}], false).length, 2);

// Headline without bullet (default): (85*2 + 95*1) / 3 = 88.3 over 3 games, 30 moves.
const excluded = filter.buildHeadlineStatistics(report);
assert.equal(excluded.includeBullet, false, 'bullet is excluded by default');
assert.equal(excluded.totalGames, 3);
assert.equal(excluded.totalUserMoves, 30);
assert.equal(excluded.averageAccuracy, 88.3);
assert.equal(excluded.classificationCounts.blunder, 0);
assert.equal(excluded.issueRatesPer100Moves.blunder, 0);
assert.equal(excluded.issueRatesPer100Moves.mistake, 6.7);
assert.equal(excluded.bulletExcluded, true);
assert.equal(excluded.bulletGames, 2);
assert.equal(excluded.onlyBulletHidden, false);
assert.deepEqual(filter.buildHeadlineStatistics(report, false), excluded);

// Headline with bullet: (65*2 + 85*2 + 95) / 5 = 79 over 5 games, 50 moves.
const included = filter.buildHeadlineStatistics(report, true);
assert.equal(included.totalGames, 5);
assert.equal(included.totalUserMoves, 50);
assert.equal(included.averageAccuracy, 79);
assert.equal(included.issueRatesPer100Moves.blunder, 12);
assert.equal(included.issueRatesPer100Moves.mistake, 4);
assert.equal(included.bulletExcluded, false);

// The bullet bucket and every per-bucket number are identical either way and to the legacy overview.
const legacy = stats.buildDnaStatisticsOverview(report);
assert.deepEqual(excluded.perTimeControl, legacy.perTimeControl);
assert.deepEqual(included.perTimeControl, legacy.perTimeControl);
assert.equal(excluded.perTimeControl.bullet.games, 2);
assert.equal(excluded.perTimeControl.bullet.averageAccuracy, 65);
assert.equal(excluded.perTimeControl.bullet.issueRatesPer100Moves.blunder, 30);
assert.equal(legacy.totalGames, 5, 'the legacy overview is unchanged');
assert.equal(legacy.averageAccuracy, 79);
assert.equal(JSON.stringify(report), reportSnapshot, 'the saved report is not mutated');

// Empty states.
const onlyBullet = dna.buildDnaReport(fixtureGames.slice(0, 2), '2026-03-02T00:00:00.000Z');
const bulletOnlyOff = filter.buildHeadlineStatistics(onlyBullet);
assert.equal(bulletOnlyOff.onlyBulletHidden, true, 'only bullet + toggle off explains and offers the toggle');
assert.equal(bulletOnlyOff.hasData, false);
assert.equal(bulletOnlyOff.totalGames, 0);
assert.equal(bulletOnlyOff.averageAccuracy, null);
assert.equal(bulletOnlyOff.hasAnyData, true);
assert.equal(bulletOnlyOff.perTimeControl.bullet.games, 2, 'bullet is still shown separately');
const bulletOnlyOn = filter.buildHeadlineStatistics(onlyBullet, true);
assert.equal(bulletOnlyOn.onlyBulletHidden, false);
assert.equal(bulletOnlyOn.totalGames, 2);
assert.equal(bulletOnlyOn.averageAccuracy, 65);
for (const none of [null, undefined, dna.buildDnaReport([], 'x')]) {
  for (const flag of [false, true]) {
    const empty = filter.buildHeadlineStatistics(none, flag);
    assert.equal(empty.hasAnyData, false);
    assert.equal(empty.onlyBulletHidden, false);
    assert.equal(empty.bulletExcluded, false);
    assert.equal(empty.totalGames, 0);
    assert.equal(empty.averageAccuracy, null);
  }
}

// Persistence: off by default, round-trips, and never throws when storage is blocked.
const memory = new Map();
const storage = { getItem: key => memory.has(key) ? memory.get(key) : null, setItem: (key, value) => { memory.set(key, String(value)); } };
assert.equal(filter.loadIncludeBullet(storage), false);
filter.saveIncludeBullet(true, storage);
assert.equal(memory.get(filter.INCLUDE_BULLET_STORAGE_KEY), '1');
assert.equal(filter.loadIncludeBullet(storage), true);
filter.saveIncludeBullet(false, storage);
assert.equal(filter.loadIncludeBullet(storage), false);
memory.set(filter.INCLUDE_BULLET_STORAGE_KEY, 'garbage');
assert.equal(filter.loadIncludeBullet(storage), false);
const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
assert.equal(filter.loadIncludeBullet(blocked), false);
assert.doesNotThrow(() => filter.saveIncludeBullet(true, blocked));
assert.equal(filter.loadIncludeBullet(), false, 'no localStorage at all falls back to excluded');
assert.doesNotThrow(() => filter.saveIncludeBullet(true));
console.log('PASS: bullet is excluded from headline averages by default, included on request, bullet bucket unchanged, empty states and persistence are safe.');

// Wiring and bilingual copy.
const main = await readFile('src/main.ts', 'utf8');
const toggle = await readFile('src/stats-bullet-toggle.ts', 'utf8');
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
assert.ok(main.includes('buildHeadlineStatistics(dnaReport,includeBullet)'));
assert.ok(main.includes('buildDnaStatisticsOverview(dnaReport)'), 'per-bucket overview call is kept');
assert.ok(main.includes('h(BulletToggle,{includeBullet,onChange:setIncludeBullet})'));
assert.ok(main.includes('h(BulletOnlyEmptyState'));
assert.ok(main.includes("key==='bullet'&&headline.bulletExcluded&&h(BulletExcludedNote)"));
for (const copy of ['כלול בולט', 'Include bullet', 'בולט — לא נכלל בממוצעים', 'Bullet — not included in averages']) {
  assert.ok(toggle.includes(copy), 'missing copy: ' + copy);
}
assert.ok(toggle.includes("getLang() === 'en'"));
assert.ok(pkg.scripts['check:chess-dna'].includes('node scripts/check-bullet-separation.mjs'));
console.log('PASS: statistics page wiring and Hebrew/English copy.');

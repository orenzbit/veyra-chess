import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile('src/chess-dna.ts', 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const url = 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
const { normalizeDnaTimeClass, normalizePgnForDnaFingerprint, selectLatestDnaGames } = await import(url);

assert.equal(normalizeDnaTimeClass(' BULLET '), 'bullet');
assert.equal(normalizeDnaTimeClass('blitz'), 'blitz');
assert.equal(normalizeDnaTimeClass('rapid'), 'rapid');
assert.equal(normalizeDnaTimeClass('classical'), null);
assert.equal(normalizeDnaTimeClass('daily'), null);
assert.equal(normalizeDnaTimeClass(''), null);

assert.equal(
  normalizePgnForDnaFingerprint('\uFEFF[Event "X"]\r\n\r\n  1. e4 e5  '),
  '[Event "X"]\n1. e4 e5',
);

const game = (id, timeClass, date, pgn, source = 'chesscom') => ({ id, source, date, pgn, timeClass });
const input = [
  game('b-old', 'bullet', '2026-01-01', '[Event "old"]\n1. e4 e5'),
  game('b-new', 'bullet', '2026-02-01', '[Event "new"]\n1. d4 d5'),
  game('b-duplicate', 'bullet', '2026-03-01', '  [Event "new"]\r\n1. d4 d5  ', 'lichess'),
  game('blitz-1', 'blitz', '2026-03-02', '[Event "blitz"]\n1. c4 e5'),
  game('rapid-1', 'rapid', '2026-03-03', '[Event "rapid"]\n1. Nf3 d5'),
  game('classical-1', 'classical', '2026-03-04', '[Event "classical"]\n1. e4 c5'),
  game('daily-1', 'daily', '2026-03-05', '[Event "daily"]\n1. d4 Nf6'),
  game('unknown-1', 'unknown', '2026-03-06', '[Event "unknown"]\n1. e4 c6'),
  game('demo-opponent-gamma', 'blitz', '2026-03-07', '[Event "demo"]\n1. e4 e5', 'demo'),
  game('bad-date', 'rapid', '2026-02-31', '[Event "bad"]\n1. e4 e5'),
  game('missing-pgn', 'rapid', '2026-03-08', '  '),
  { ...game('unknown-player-color', 'rapid', '2026-03-09', '[Event "color?"]\n1. e4 e5'), playerColorKnown: false },
];

const selection = selectLatestDnaGames(input, 25);
assert.deepEqual(selection.selected.bullet.map(g => g.id), ['b-duplicate', 'b-old']);
assert.deepEqual(selection.selected.blitz.map(g => g.id), ['blitz-1']);
assert.deepEqual(selection.selected.rapid.map(g => g.id), ['rapid-1']);
assert.equal(selection.counts.fetched, input.length);
assert.equal(selection.counts.excludedDemo, 1);
assert.equal(selection.counts.excludedUnknownTimeClass, 3);
assert.equal(selection.counts.duplicates, 1);
assert.equal(selection.counts.excludedInvalid, 3);
assert.equal(selection.counts.eligible, 4);

const many = Array.from({ length: 40 }, (_, i) =>
  game('rapid-' + i, 'rapid', '2026-01-' + String((i % 28) + 1).padStart(2, '0'), '[Event "' + i + '"]\n1. e4 e5'));
const capped = selectLatestDnaGames(many, 25);
assert.equal(capped.selected.rapid.length, 25);
assert.equal(selectLatestDnaGames(many, 0).selected.rapid.length, 0);
console.log('PASS: explicit time-class policy, normalized PGN identity, demo exclusion, dedupe, invalid/unknown handling, latest-first order and per-class cap.');
const moduleSource = await readFile('src/chess-dna.ts', 'utf8');
const transpiled = ts.transpileModule(moduleSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(transpiled).toString('base64');
const { buildDnaReport } = await import(moduleUrl);
const report = buildDnaReport([
  { id: 'g1', source: 'chesscom', date: '2026-03-01', pgn: 'pgn1', timeClass: 'blitz', timeControlLabel: '3+2', fingerprint: 'a'.repeat(64), playerColor: 'white', opening: 'Italian Game', result: 'win', analysis: { moves: [
    { index: 0, classification: 'best', clockSeconds: 170 }, { index: 1, classification: 'blunder', clockSeconds: 16 }, { index: 2, classification: 'mistake', clockSeconds: 20 }, { index: 3, classification: 'good', clockSeconds: 10 },
  ], summary: { whiteAcc: 90, blackAcc: 75 } } },
  { id: 'g2', source: 'lichess', date: '2026-03-02', pgn: 'pgn2', timeClass: 'blitz', timeControlLabel: '3+2', fingerprint: 'b'.repeat(64), playerColor: 'black', opening: 'Italian Game', result: 'loss', analysis: { moves: [
    { index: 0, classification: 'good', clockSeconds: 160 }, { index: 1, classification: 'blunder', clockSeconds: 15 }, { index: 2, classification: 'inaccuracy', clockSeconds: 12 }, { index: 3, classification: 'inaccuracy', clockSeconds: 10 },
  ], summary: { whiteAcc: 80, blackAcc: 70 } } },
], '2026-03-03T00:00:00.000Z');
assert.equal(report.timeControls.blitz.count, 2);
assert.equal(report.timeControls.blitz.averageAccuracy, 80);
assert.equal(report.timeControls.blitz.userMoves, 4);
assert.equal(report.timeControls.blitz.classificationCounts.blunder, 1);
assert.equal(report.timeControls.blitz.issueRatesPer100Moves.blunder, 25);
assert.equal(report.timeControls.blitz.clock.clockedUserMoves, 4);
assert.equal(report.timeControls.blitz.clock.lowTimeMoves, 3);
assert.equal(report.timeControls.blitz.clock.lowTimeRatePer100Moves, 75);
assert.equal(report.timeControls.blitz.openings[0].name, 'Italian Game');
assert.equal(report.timeControls.bullet.count, 0);
assert.equal(report.sampleQuality.blitz.sufficientForPatterns, false);
console.log('PASS: per-time-control report aggregation uses player perspective and actual move denominators.');
const archiveSource = await readFile('src/game-archive.ts', 'utf8');
const archiveJs = ts.transpileModule(archiveSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const archiveUrl = 'data:text/javascript;base64,' + Buffer.from(archiveJs).toString('base64');
const { inferTimeClass } = await import(archiveUrl);
assert.equal(inferTimeClass('180+2', ''), 'unknown', 'time control alone must not be treated as a reliable class');
assert.equal(inferTimeClass('600+0', 'Rated Blitz game'), 'blitz');
assert.equal(inferTimeClass('300+3', 'Rapid game'), 'rapid');
console.log('PASS: PGN-only time class is not guessed from base time/increment.');
const workerSource = await readFile('public/engine-worker.js', 'utf8');
const engineAdapter = await readFile('public/vendor/wasm-engine.js', 'utf8');
assert.ok(workerSource.includes('const beforeScore=best.score;'), 'DNA engine must use explicit search score for the before position');
assert.ok(workerSource.includes('const afterScore=after.score;'), 'DNA engine must use explicit search score for the after position');
assert.ok(!workerSource.includes('engine.evaluate('), 'DNA engine must not mix an unverified evaluate() perspective into white-perspective search scores');
assert.ok(engineAdapter.includes("scorePov: 'white'"), 'WASM adapter must declare search scores as white-perspective');
console.log('PASS: engine score perspective contract is explicit for before/after position evaluation.');
const sameDay = selectLatestDnaGames([
  { ...game('older', 'rapid', '2026-03-10', '[Event "older"]\n1. e4 e5'), playedAt: '2026-03-10T10:00:00.000Z' },
  { ...game('newer', 'rapid', '2026-03-10', '[Event "newer"]\n1. d4 d5'), playedAt: '2026-03-10T18:00:00.000Z' },
]);
assert.equal(sameDay.selected.rapid[0].id, 'newer', 'verified timestamps order games within the same date');
console.log('PASS: same-day games use trustworthy timestamps when available.');

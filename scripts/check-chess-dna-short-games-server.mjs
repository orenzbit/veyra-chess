import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { _test, handler } from '../netlify/functions/chess-dna.mjs';
import { DNA_END_FIXTURES } from './lib/dna-end-fixtures.mjs';

const source = await readFile('src/chess-dna.ts', 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { classifyDnaGameEnd: clientClassify, DNA_ENGINE_VERSION } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

assert.equal(_test.DNA_MIN_PLIES, 12);
for (const fixture of DNA_END_FIXTURES) {
  const server = _test.classifyDnaGameEnd(fixture.pgn);
  const client = clientClassify(fixture.pgn);
  assert.deepEqual(server, client, 'client and server must agree: ' + fixture.name);
  assert.deepEqual(server, { plies: fixture.plies, endCause: fixture.endCause }, fixture.name);
}
console.log('PASS: client and server classify every shared PGN fixture identically (plies and end cause).');

const serverEngine = (await readFile('netlify/functions/chess-dna.mjs', 'utf8')).match(/const ENGINE_VERSION = '([^']+)'/)?.[1];
assert.equal(serverEngine, DNA_ENGINE_VERSION, 'engine version is unchanged and still shared by client and server');

const fp = (pgn) => _test.hashPgn(pgn);
const short = DNA_END_FIXTURES.find(f => f.name === 'five full moves, time forfeit, decisive result (10 plies)');
const shortFp = fp(short.pgn);
const keptFixture = DNA_END_FIXTURES.find(f => f.name === 'twelve plies (six full moves), time forfeit is kept');
const keptFp = fp(keptFixture.pgn);

assert.equal(_test.includesExcludedShortGame([{ fingerprint: shortFp, game_json: { endCause: 'other', plies: 10 } }],
  _test.validateReportStructure(reportWith('rapid', [{ fingerprint: shortFp, playerColor: 'white', date: '2026-03-01' }]))), true);
assert.equal(_test.includesExcludedShortGame([{ fingerprint: keptFp, game_json: { endCause: 'other', plies: 12 } }],
  _test.validateReportStructure(reportWith('rapid', [{ fingerprint: keptFp, playerColor: 'white', date: '2026-03-01' }]))), false, '12 plies is not excluded');
assert.equal(_test.includesExcludedShortGame([{ fingerprint: shortFp, game_json: { endCause: 'resignation_likely', plies: 10 } }],
  _test.validateReportStructure(reportWith('rapid', [{ fingerprint: shortFp, playerColor: 'white', date: '2026-03-01' }]))), false);
assert.equal(_test.includesExcludedShortGame([{ fingerprint: shortFp, game_json: { plies: 10 } }],
  _test.validateReportStructure(reportWith('rapid', [{ fingerprint: shortFp, playerColor: 'white', date: '2026-03-01' }]))), false, 'old rows without endCause are accepted as before');
console.log('PASS: server rejects only stored short games with a verified other end; mate/resignation/unknown/old rows pass.');

function emptySection() {
  return {
    count: 0,
    games: [],
    averageAccuracy: null,
    userMoves: 0,
    classificationCounts: {},
    issueRatesPer100Moves: { inaccuracy: 0, mistake: 0, miss: 0, blunder: 0 },
  };
}
function reportWith(timeClass, games) {
  return {
    schemaVersion: 2,
    engineVersion: DNA_ENGINE_VERSION,
    timeControls: {
      bullet: emptySection(),
      blitz: emptySection(),
      rapid: emptySection(),
      [timeClass]: { ...emptySection(), count: games.length, games },
    },
  };
}

const analysisFor = (whiteAcc) => ({
  moves: [
    { index: 0, classification: 'best', whiteChanceBefore: 50, whiteChanceAfter: 52, clockSeconds: null },
    { index: 1, classification: 'blunder', whiteChanceBefore: 52, whiteChanceAfter: 40, clockSeconds: null },
    { index: 2, classification: 'good', whiteChanceBefore: 40, whiteChanceAfter: 41, clockSeconds: null },
    { index: 3, classification: 'mistake', whiteChanceBefore: 41, whiteChanceAfter: 35, clockSeconds: null },
  ],
  summary: { whiteAcc, blackAcc: 70 },
});
const ownRapidSection = {
  count: 1,
  games: [{ fingerprint: '', playerColor: 'white', date: '2026-03-01' }],
  averageAccuracy: 90,
  userMoves: 2,
  classificationCounts: { best: 1, good: 1 },
  issueRatesPer100Moves: { inaccuracy: 0, mistake: 0, miss: 0, blunder: 0 },
};

function event(body) {
  return {
    httpMethod: 'POST',
    headers: { origin: 'https://veyra.test' },
    rawUrl: 'https://veyra.test/api/chess-dna',
    body: JSON.stringify(body),
  };
}
function fakeDb(savedRows, calls) {
  return async (path, options) => {
    calls.push({ path, options });
    if (options?.method === 'POST') return [];
    if (path.startsWith('user_chess_dna_games?select=fingerprint,game_json')) return savedRows;
    return [];
  };
}
const deps = (savedRows, calls) => ({
  currentSession: () => ({ user_id: 'user-a' }),
  rateLimit: () => true,
  supabaseRequest: fakeDb(savedRows, calls),
});

const saveCalls = [];
const saved = await handler(event({
  action: 'save-game',
  fingerprint: shortFp,
  pgn: short.pgn,
  game: { date: '2026-03-01', timeClass: 'rapid', playerColor: 'white', source: 'chesscom', analysis: analysisFor(90) },
}), deps([], saveCalls));
assert.equal(saved.statusCode, 200, saved.body);
const storedWrite = saveCalls.find(call => call.options?.method === 'POST');
const storedGame = JSON.parse(storedWrite.options.body)[0].game_json;
assert.equal(storedGame.plies, 10, 'save-game stores plies computed from the PGN');
assert.equal(storedGame.endCause, 'other', 'save-game stores the end cause computed from the PGN');
console.log('PASS: save-game stores plies and endCause computed server-side from the verified PGN.');

const reportId = '11111111-2222-4333-8444-555555555555';
const rejectCalls = [];
const rejected = await handler(event({
  action: 'save-report',
  reportId,
  report: reportWith('rapid', [{ fingerprint: shortFp, playerColor: 'white', date: '2026-03-01' }]),
}), deps([{ fingerprint: shortFp, game_json: { date: '2026-03-01', timeClass: 'rapid', playerColor: 'white', analysis: analysisFor(90), endCause: 'other', plies: 10 } }], rejectCalls));
assert.equal(rejected.statusCode, 422, rejected.body);
assert.equal(JSON.parse(rejected.body).error, 'report_includes_excluded_game');
assert.equal(rejectCalls.some(call => call.options?.method === 'POST'), false, 'a rejected report must not be written');
console.log('PASS: save-report rejects (422) a report that includes a stored short game with a verified other end, and writes nothing.');

const oldRowCalls = [];
const oldRowReport = { ...reportWith('rapid', [{ fingerprint: shortFp, playerColor: 'white', date: '2026-03-01' }]) };
oldRowReport.timeControls.rapid = { ...ownRapidSection, games: [{ ...ownRapidSection.games[0], fingerprint: shortFp }] };
const oldRow = await handler(event({ action: 'save-report', reportId, report: oldRowReport }),
  deps([{ fingerprint: shortFp, game_json: { date: '2026-03-01', timeClass: 'rapid', playerColor: 'white', analysis: analysisFor(90) } }], oldRowCalls));
assert.equal(oldRow.statusCode, 200, oldRow.body);
console.log('PASS: save-report accepts a report whose stored game has no end-cause fields (old rows are not rejected).');

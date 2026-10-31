import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import vm from 'node:vm';

const source = await readFile('src/dna-statistics.ts', 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const url = 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
const { buildDnaStatisticsOverview } = await import(url);

const report = {
  schemaVersion: 2,
  engineVersion: 'engine-v2',
  timeControls: {
    bullet: { count: 1, averageAccuracy: 80, userMoves: 20, classificationCounts: { blunder: 2, mistake: 1, inaccuracy: 1, miss: 2 } },
    blitz: { count: 2, averageAccuracy: 90, userMoves: 80, classificationCounts: { blunder: 1, mistake: 4, inaccuracy: 3, miss: 1 } },
    rapid: { count: 0, averageAccuracy: null, userMoves: 0, classificationCounts: {} },
  },
};
const result = buildDnaStatisticsOverview(report);
assert.equal(result.totalGames, 3);
assert.equal(result.totalUserMoves, 100);
assert.equal(result.averageAccuracy, 86.7);
assert.equal(result.classificationCounts.blunder, 3);
assert.equal(result.classificationCounts.mistake, 5);
assert.equal(result.classificationCounts.miss, 3);
assert.equal(result.issueRatesPer100Moves.miss, 3);
assert.equal(result.perTimeControl.bullet.issueRatesPer100Moves.miss, 10);
assert.equal(result.issueRatesPer100Moves.blunder, 3);
assert.equal(result.issueRatesPer100Moves.mistake, 5);
assert.equal(result.perTimeControl.bullet.sampleIsSmall, true);
assert.equal(result.perTimeControl.blitz.sampleIsSmall, true);
assert.equal(result.perTimeControl.rapid.averageAccuracy, null);
assert.equal(result.hasData, true);

const empty = buildDnaStatisticsOverview(null);
assert.equal(empty.totalGames, 0);
assert.equal(empty.totalUserMoves, 0);
assert.equal(empty.averageAccuracy, null);
assert.equal(empty.hasData, false);

const malformed = buildDnaStatisticsOverview({
  timeControls: { blitz: { count: 999, averageAccuracy: 140, userMoves: -3, classificationCounts: { blunder: -8 } } },
});
assert.equal(malformed.totalGames, 25, 'per-control counts are bounded to the report contract');
assert.equal(malformed.perTimeControl.blitz.averageAccuracy, null, 'out-of-range accuracy is unavailable');
assert.equal(malformed.totalUserMoves, 0);
assert.equal(malformed.classificationCounts.blunder, 0);
console.log('PASS: DNA statistics overview reuses report data, aggregates denominators correctly, handles missing data, and rejects invalid values.');

const appSource = await readFile('src/main.ts', 'utf8');
const dnaSource = await readFile('src/chess-dna.ts', 'utf8');
const currentClasses = JSON.parse(dnaSource.match(/const MOVE_CLASSES = (\[[^\]]+\])/)[1]);
assert.deepEqual(Object.keys(result.classificationCounts), currentClasses, 'statistics must preserve every current report classification');
assert.ok(appSource.includes("if(page==='stats')"), 'a separate statistics page is wired into the app');
assert.ok(appSource.includes('buildDnaStatisticsOverview(dnaReport)'), 'the page derives its view from the saved DNA report');
assert.ok(appSource.includes("h('button',{onClick:openStatsPage},'📊 סטטיסטיקות')"), 'the archive exposes the statistics page');
assert.ok(appSource.includes('לא מריץ מנוע מחדש ולא שומר עותק נוסף'), 'the page documents reuse without duplicate analysis storage');
console.log('PASS: statistics UI reuses the saved DNA report and exposes an archive entry point.');

const start = appSource.indexOf(' async function openStatsPage(){');
const end = appSource.indexOf(' async function runDnaReview(){', start);
assert.ok(start >= 0 && end > start, 'statistics and DNA load handlers exist');
const handlers = appSource.slice(start, end);
function fixture(response, owner = 'account-a') {
  const state = { report, loading: false, error: '', status: 'old report', page: 'archive' };
  const requests = [];
  const context = vm.createContext({
    authUser: owner ? { id: owner } : null,
    dnaOwnerRef: { current: owner },
    dnaLoadRequestRef: { current: 0 },
    setPage: value => { state.page = value; },
    setDnaReport: value => { state.report = value; },
    setDnaError: value => { state.error = value; },
    setDnaStatus: value => { state.status = value; },
    setStatsLoading: value => { state.loading = value; },
    dnaRequest: async (...args) => { requests.push(args); return typeof response === 'function' ? response() : response; },
  });
  const actions = vm.runInContext(handlers + '\n({ openStatsPage, openDnaPage });', context);
  return { state, context, requests, ...actions };
}
const saved = { ok: true, status: 200, data: { report: { report_json: report } } };
const success = fixture(saved);
await success.openStatsPage();
assert.equal(success.state.report, report);
assert.equal(success.state.loading, false);
assert.equal(success.requests.length, 1);
assert.equal(success.requests[0][0], '/api/chess-dna?action=latest');

const missing = fixture({ ok: true, status: 200, data: { report: null } });
await missing.openStatsPage();
assert.equal(missing.state.report, null);
assert.equal(missing.state.error, '');
assert.ok(missing.state.status.includes('עדיין אין'));
for (const status of [0, 401, 503]) {
  const failure = fixture({ ok: false, status, data: {} });
  await failure.openStatsPage();
  assert.equal(failure.state.report, null, 'failed loads must not retain old metrics');
  assert.equal(failure.state.loading, false);
  assert.equal(failure.state.status, '', 'loading message must clear on failure');
  assert.ok(failure.state.error.length > 0);
}
const anonymous = fixture(saved, null);
await anonymous.openStatsPage();
assert.equal(anonymous.requests.length, 0);
assert.equal(anonymous.state.loading, false);
assert.ok(anonymous.state.error);

const pending = [];
const race = fixture(() => new Promise(resolve => pending.push(resolve)));
const first = race.openStatsPage();
assert.equal(race.state.loading, true);
assert.equal(race.state.report, null);
const second = race.openStatsPage();
pending[1]({ ok: true, status: 200, data: { report: null } });
await second;
pending[0](saved);
await first;
assert.equal(race.state.report, null, 'older response cannot replace newer empty report');

const pageChange = fixture(() => new Promise(resolve => pending.push(resolve)));
const statsLoad = pageChange.openStatsPage();
const dnaLoad = pageChange.openDnaPage();
const newerReport = { ...report, engineVersion: 'newer-report' };
pending[3]({ ok: true, status: 200, data: { report: { report_json: newerReport } } });
await dnaLoad;
pending[2](saved);
await statsLoad;
assert.equal(pageChange.state.report, newerReport, 'late statistics response cannot replace DNA page report');

let finish;
const accountChange = fixture(() => new Promise(resolve => { finish = resolve; }));
const accountLoad = accountChange.openStatsPage();
accountChange.context.dnaOwnerRef.current = 'account-b';
finish(saved);
await accountLoad;
assert.equal(accountChange.state.report, null, 'late response from another account is ignored');
console.log('PASS: saved/empty/error/auth states, stale metrics, request ordering and account isolation.');

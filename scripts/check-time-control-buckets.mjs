import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const transpile = source => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const toUrl = js => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');

const [timeControlSource, dnaSource, tableSource, main, styles, preview] = await Promise.all([
  readFile('src/time-control.ts', 'utf8'),
  readFile('src/chess-dna.ts', 'utf8'),
  readFile('src/time-control-table.ts', 'utf8'),
  readFile('src/main.ts', 'utf8'),
  readFile('public/styles.css', 'utf8'),
  readFile('scripts/local-preview.mjs', 'utf8'),
]);
const timeControlUrl = toUrl(transpile(timeControlSource));
const {
  parseTimeControl, baseMinuteBucket, baseSecondsBucket, buildBaseMinuteTable, buildReportBaseMinuteTable,
  normalizeBaseMinuteTable, BASE_MINUTE_BUCKET_IDS, BASE_MINUTE_BUCKET_LABELS,
} = await import(timeControlUrl);
const { buildDnaReport } = await import(toUrl(transpile(dnaSource)));

// Parser: provider/PGN raw values (seconds), normalized labels (minutes), daily and junk values.
const tc = (baseSeconds, incrementSeconds) => ({ baseSeconds, incrementSeconds });
assert.deepEqual(parseTimeControl('180+2'), tc(180, 2));
assert.deepEqual(parseTimeControl('600'), tc(600, 0));
assert.deepEqual(parseTimeControl('180+2', 'seconds'), tc(180, 2));
assert.deepEqual(parseTimeControl(' 300 '), tc(300, 0));
assert.deepEqual(parseTimeControl('1/259200'), tc(259200, 0));
assert.deepEqual(parseTimeControl('3+2', 'minutes'), tc(180, 2));
assert.deepEqual(parseTimeControl('15+10', 'minutes'), tc(900, 10));
assert.deepEqual(parseTimeControl('15+10', 'seconds'), tc(15, 10));
assert.deepEqual(parseTimeControl('0.5+0'), tc(30, 0));
assert.deepEqual(parseTimeControl('0.5+0', 'minutes'), tc(30, 0));
assert.deepEqual(parseTimeControl('0:30+0'), tc(30, 0));
assert.deepEqual(parseTimeControl('0:30+0', 'minutes'), tc(30, 0));
assert.deepEqual(parseTimeControl('1:30+0', 'minutes'), tc(90, 0));
assert.deepEqual(parseTimeControl('10+0', 'minutes'), tc(600, 0));
assert.deepEqual(parseTimeControl('0+1'), tc(0, 1));
assert.deepEqual(parseTimeControl(180), tc(180, 0));
assert.deepEqual(parseTimeControl({ initial: 180, increment: 2, totalTime: 260 }), tc(180, 2));
assert.deepEqual(parseTimeControl({ limit: 600, increment: 0 }), tc(600, 0));
for (const bad of ['', '   ', '-', '?', 'abc', '3+', '+2', '3+2+1', '40/7200:3600', '0/0', '1/0', '0', '0+0', '1:75+0', '-5', 'לא ידוע', null, undefined, NaN, -1, 0, [], {}, { initial: -1 }, { initial: 'x' }, true]) {
  assert.equal(parseTimeControl(bad), null, 'must reject ' + JSON.stringify(bad));
  assert.equal(parseTimeControl(bad, 'minutes'), null, 'must reject (minutes) ' + JSON.stringify(bad));
  assert.equal(baseMinuteBucket(bad), 'other', 'unparseable goes to other: ' + JSON.stringify(bad));
}

// Bucket edges are inclusive upper bounds: 90s, 3.5 min, 7.5 min, 12.5 min.
const edges = [[0, '1'], [30, '1'], [60, '1'], [90, '1'], [90.01, '3'], [91, '3'], [120, '3'], [180, '3'], [210, '3'], [211, '5'], [300, '5'], [450, '5'], [451, '10'], [600, '10'], [750, '10'], [751, 'other'], [900, 'other'], [1800, 'other'], [259200, 'other']];
for (const [seconds, bucket] of edges) assert.equal(baseSecondsBucket(seconds), bucket, seconds + 's');
for (const [label, bucket] of [['60+0', '1'], ['60+1', '1'], ['60+2', '1'], ['0.5+0', '1'], ['120+1', '3'], ['180+0', '3'], ['180+2', '3'], ['300+0', '5'], ['300+3', '5'], ['600+0', '10'], ['600+5', '10'], ['900+10', 'other'], ['1/259200', 'other'], ['-', 'other'], ['', 'other']]) {
  assert.equal(baseMinuteBucket(label), bucket, label);
}
assert.equal(baseMinuteBucket('3:30+0', 'minutes'), '3');
assert.equal(baseMinuteBucket('3:31+0', 'minutes'), '5');
assert.equal(baseMinuteBucket('7:30+0', 'minutes'), '5');
assert.equal(baseMinuteBucket('7:31+0', 'minutes'), '10');
assert.equal(baseMinuteBucket('12:30+0', 'minutes'), '10');
assert.equal(baseMinuteBucket('12:31+0', 'minutes'), 'other');
assert.equal(baseMinuteBucket(tc(90, 0)), '1');
assert.equal(baseMinuteBucket({ baseSeconds: 750, incrementSeconds: 5 }), '10');
assert.equal(baseMinuteBucket({ initial: 180, increment: 2 }), '3');
assert.deepEqual([...BASE_MINUTE_BUCKET_IDS], ['1', '3', '5', '10', 'other']);
for (const id of BASE_MINUTE_BUCKET_IDS) {
  assert.ok(BASE_MINUTE_BUCKET_LABELS[id].he && BASE_MINUTE_BUCKET_LABELS[id].en, 'bilingual label for ' + id);
}
assert.equal(BASE_MINUTE_BUCKET_LABELS['1'].he, '1 דקה');
assert.equal(BASE_MINUTE_BUCKET_LABELS['3'].en, '3 min');
assert.equal(BASE_MINUTE_BUCKET_LABELS.other.he, 'אחר');

// Aggregation ignores missing accuracy and unknown results.
const table = buildBaseMinuteTable([
  { timeControlLabel: '1+0', result: 'win', accuracy: 80, userMoves: 30 },
  { timeControlLabel: '1+1', result: 'win', accuracy: null, userMoves: 20 },
  { timeControlLabel: '0:30+0', result: 'loss', accuracy: 60, userMoves: 10 },
  { timeControlLabel: '1+2', result: 'draw', accuracy: 101, userMoves: 5 },
  { timeControlLabel: '3+0', result: 'loss', accuracy: 70, userMoves: 40 },
  { timeControlLabel: '3+2', result: 'unknown', accuracy: undefined, userMoves: 'x' },
  { timeControlLabel: '5+3', result: 'win', accuracy: 50.6, userMoves: 25.9 },
  { timeControlLabel: '10+5', result: 'draw', accuracy: -1, userMoves: 0 },
  { timeControlLabel: '15+10', result: 'win', accuracy: 90, userMoves: 15 },
  { timeControlLabel: '1/259200', result: 'loss', accuracy: 40, userMoves: 12 },
  { timeControlLabel: '-', result: 'win', accuracy: 100, userMoves: 7 },
  { timeControlLabel: 'לא ידוע', result: 'draw', accuracy: 0, userMoves: 3 },
  { result: 'win' },
  null,
]);
assert.equal(table.version, 1);
assert.equal(table.totalGames, 13);
assert.deepEqual(table.rows.map(row => row.bucket), ['1', '3', '5', '10', 'other']);
const byBucket = Object.fromEntries(table.rows.map(row => [row.bucket, row]));
assert.deepEqual(byBucket['1'], {
  bucket: '1', games: 4, wins: 2, draws: 1, losses: 1, unknownResults: 0,
  winPct: 50, drawPct: 25, lossPct: 25, accuracyGames: 2, averageAccuracy: 70, moves: 65, unknownTimeControl: 0,
});
assert.deepEqual(byBucket['3'], {
  bucket: '3', games: 2, wins: 0, draws: 0, losses: 1, unknownResults: 1,
  winPct: 0, drawPct: 0, lossPct: 100, accuracyGames: 1, averageAccuracy: 70, moves: 40, unknownTimeControl: 0,
});
assert.equal(byBucket['5'].averageAccuracy, 50.6);
assert.equal(byBucket['5'].moves, 25);
assert.deepEqual([byBucket['10'].winPct, byBucket['10'].drawPct, byBucket['10'].lossPct, byBucket['10'].averageAccuracy, byBucket['10'].accuracyGames], [0, 100, 0, null, 0]);
assert.equal(byBucket.other.games, 5);
assert.equal(byBucket.other.unknownTimeControl, 3, 'missing and unparseable values are counted inside Other');
assert.equal(byBucket.other.accuracyGames, 4);
assert.equal(byBucket.other.averageAccuracy, 57.5);
assert.equal(byBucket.other.moves, 37);
assert.equal(table.rows.reduce((sum, row) => sum + row.games, 0), table.totalGames);
const empty = buildBaseMinuteTable([]);
assert.equal(empty.totalGames, 0);
for (const row of empty.rows) {
  assert.deepEqual([row.games, row.winPct, row.drawPct, row.lossPct, row.averageAccuracy, row.moves], [0, null, null, null, null, 0]);
}
assert.equal(buildBaseMinuteTable(undefined).totalGames, 0);

// Existing Bullet/Blitz/Rapid buckets must be unchanged, and the new table must not touch them.
const moves = [0, 1, 2, 3].map(index => ({ index, classification: index % 2 ? 'mistake' : 'best' }));
const fp = n => String(n).padStart(64, '0');
const game = (n, timeClass, label, result, whiteAcc, color = 'white') => ({
  id: 'fixture-' + n, source: 'chesscom', date: '2026-03-0' + n, pgn: '1. e4 e5', timeClass, timeControlLabel: label,
  fingerprint: fp(n), playerColor: color, opening: 'Fixture opening', result,
  analysis: { moves, summary: { whiteAcc, blackAcc: whiteAcc - 5 } },
});
const fixtures = [
  game(1, 'bullet', '1+0', 'win', 60),
  game(2, 'bullet', '0:30+0', 'loss', 70),
  game(3, 'blitz', '3+0', 'win', 90),
  game(4, 'blitz', '3+2', 'loss', 80, 'black'),
  game(5, 'blitz', '5+3', 'draw', 70),
  game(6, 'rapid', '10+0', 'win', 85),
  game(7, 'rapid', '15+10', 'loss', 75),
  game(8, 'rapid', 'לא ידוע', 'draw', 65),
  game(9, 'daily', '1/259200', 'win', 99),
  game(10, 'blitz', '3+0', 'win', Number.NaN),
];
const report = buildDnaReport(fixtures, '2026-03-10T00:00:00.000Z');
const before = JSON.stringify(report);
assert.deepEqual(Object.keys(report), ['schemaVersion', 'engineVersion', 'generatedAt', 'timeControls', 'sampleQuality']);
assert.deepEqual(Object.keys(report.timeControls), ['bullet', 'blitz', 'rapid']);
assert.deepEqual(['bullet', 'blitz', 'rapid'].map(key => report.timeControls[key].count), [2, 3, 3]);
assert.deepEqual(['bullet', 'blitz', 'rapid'].map(key => report.timeControls[key].averageAccuracy), [65, 78.3, 75]);
assert.deepEqual(['bullet', 'blitz', 'rapid'].map(key => report.timeControls[key].userMoves), [4, 6, 6]);
assert.equal(report.timeControls.blitz.games.map(item => item.fingerprint).join(), [fp(3), fp(4), fp(5)].join());

const reportTable = buildReportBaseMinuteTable(report, fixtures);
assert.equal(JSON.stringify(report), before, 'building the table must not mutate the report');
assert.equal(reportTable.totalGames, report.timeControls.bullet.count + report.timeControls.blitz.count + report.timeControls.rapid.count, 'totals match the existing cards');
const rows = Object.fromEntries(reportTable.rows.map(row => [row.bucket, row]));
assert.deepEqual([rows['1'].games, rows['1'].wins, rows['1'].losses, rows['1'].averageAccuracy, rows['1'].moves], [2, 1, 1, 65, 4]);
assert.deepEqual([rows['3'].games, rows['3'].wins, rows['3'].losses, rows['3'].winPct, rows['3'].lossPct, rows['3'].averageAccuracy, rows['3'].moves], [2, 1, 1, 50, 50, 82.5, 4]);
assert.deepEqual([rows['5'].games, rows['5'].draws, rows['5'].drawPct, rows['5'].averageAccuracy], [1, 1, 100, 70]);
assert.deepEqual([rows['10'].games, rows['10'].averageAccuracy], [1, 85]);
assert.deepEqual([rows.other.games, rows.other.unknownTimeControl, rows.other.losses, rows.other.draws], [2, 1, 1, 1]);
assert.equal(buildReportBaseMinuteTable(null, []).totalGames, 0);
assert.equal(buildReportBaseMinuteTable(report, []).rows.find(row => row.bucket === 'other').unknownTimeControl, 8, 'games without a label are unknown, not dropped');
assert.deepEqual(normalizeBaseMinuteTable(JSON.parse(JSON.stringify(reportTable))), reportTable);
assert.equal(normalizeBaseMinuteTable(undefined), null);
assert.equal(normalizeBaseMinuteTable({ rows: 'x' }), null);
const hostile = normalizeBaseMinuteTable({ rows: [{ bucket: '3', games: -4, wins: 'x', winPct: 500, averageAccuracy: NaN, moves: 2.7 }, { bucket: 'nope', games: 9 }, null] });
assert.deepEqual([hostile.rows.length, hostile.totalGames, hostile.rows[1].games, hostile.rows[1].winPct, hostile.rows[1].moves], [5, 0, 0, null, 2]);

// The saved report keeps working with the unchanged server contract: extra optional field, same schema version.
const { _test, handler } = await import('../netlify/functions/chess-dna.mjs');
const ENGINE = report.engineVersion;
const emptyReport = {
  schemaVersion: 2, engineVersion: ENGINE,
  timeControls: Object.fromEntries(['bullet', 'blitz', 'rapid'].map(key => [key, { count: 0, games: [], averageAccuracy: null, userMoves: 0, classificationCounts: {}, issueRatesPer100Moves: { inaccuracy: 0, mistake: 0, miss: 0, blunder: 0 } }])),
  baseMinuteBuckets: buildBaseMinuteTable([]),
};
assert.equal(report.schemaVersion, 2);
assert.deepEqual(_test.validateReportStructure(emptyReport), { fingerprints: [], classesByFingerprint: {} });
const writes = [];
const dependencies = {
  currentSession: () => ({ user_id: 'fixture-user' }),
  rateLimit: () => true,
  supabaseRequest: async (path, options) => { writes.push({ path, options }); return []; },
};
const saved = await handler({
  httpMethod: 'POST', rawUrl: 'https://example.test/api/chess-dna', headers: { origin: 'https://example.test' },
  body: JSON.stringify({ action: 'save-report', reportId: '3f0c1a52-6b1e-4f55-9a63-8e1d3f0c1a52', report: emptyReport }),
}, dependencies);
assert.equal(saved.statusCode, 200, 'server accepts a report carrying baseMinuteBuckets: ' + saved.body);
const stored = JSON.parse(writes.at(-1).options.body)[0].report_json;
assert.deepEqual(stored.baseMinuteBuckets, emptyReport.baseMinuteBuckets, 'optional field is kept as saved');
assert.equal(stored.schemaVersion, 2);

// UI component: renders both languages, the empty state and the "older saved report" state without a browser.
function render(language, tableValue) {
  const storage = new Map();
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  if (language === 'en') storage.set('tabia_language', 'en');
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  const element = (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity).filter(child => child !== false && child != null) });
  globalThis.React = { createElement: element, Fragment: 'fragment', useState: value => [value, () => {}], useEffect() {} };
  return { element, tree: null, tableValue };
}
const i18nUrl = toUrl(`export const getLang = () => globalThis.localStorage.getItem('tabia_language') === 'en' ? 'en' : 'he';`);
const tableJs = transpile(tableSource)
  .replace("'./i18n.js'", JSON.stringify(i18nUrl))
  .replace("'./time-control.js'", JSON.stringify(timeControlUrl));
const flatten = node => typeof node === 'string' ? [node] : node && typeof node === 'object' ? [...(node.children || []).flatMap(flatten)] : [];
const find = (node, predicate, hits = []) => {
  if (!node || typeof node !== 'object') return hits;
  if (predicate(node)) hits.push(node);
  for (const child of node.children || []) find(child, predicate, hits);
  return hits;
};
async function renderSection(language, tableValue) {
  render(language, tableValue);
  const { BaseMinuteTableSection } = await import(toUrl(tableJs) + '#' + language + Math.random());
  return BaseMinuteTableSection({ table: tableValue });
}
const heTree = await renderSection('he', reportTable);
const heText = flatten(heTree).join('|');
assert.ok(heText.includes('ביצועים לפי זמן בסיס') && heText.includes('1 דקה') && heText.includes('10 דקות') && heText.includes('אחר') && heText.includes('דיוק ממוצע') && heText.includes('מהלכים'));
const enTree = await renderSection('en', reportTable);
const enText = flatten(enTree).join('|');
assert.ok(enText.includes('Performance by base time') && enText.includes('1 min') && enText.includes('10 min') && enText.includes('Other') && enText.includes('Avg accuracy') && enText.includes('Moves') && enText.includes('Win'));
assert.ok(!/[\u0590-\u05FF]/.test(enText), 'English view has no Hebrew text');
assert.equal(find(enTree, node => node.type === 'tr').length, 6, 'header + 5 bucket rows');
assert.equal(find(enTree, node => node.props.className === 'dna-base-minute-scroll').length, 1, 'table scrolls inside its own container');
assert.ok(flatten(await renderSection('en', buildBaseMinuteTable([]))).join('|').includes('no games'), 'empty state when there are no games');
assert.ok(flatten(await renderSection('he', buildBaseMinuteTable([]))).join('|').includes('אין עדיין משחקים'));
assert.equal(find(await renderSection('en', buildBaseMinuteTable([])), node => node.type === 'table').length, 0);
assert.ok(flatten(await renderSection('en', undefined)).join('|').includes('Generate a new DNA report'), 'older saved reports explain how to get the table');
assert.ok(flatten(await renderSection('he', undefined)).join('|').includes('צרו דוח DNA חדש'));

// Wiring: minimal hooks in main.ts, styles, and a dev-only preview seed.
for (const token of [
  "import { buildReportBaseMinuteTable } from './time-control.js';",
  "import { BaseMinuteTableSection } from './time-control-table.js';",
  'report.baseMinuteBuckets=buildReportBaseMinuteTable(report,analyzed);',
  'h(BaseMinuteTableSection,{table:dnaReport.baseMinuteBuckets})',
  'h(BaseMinuteTableSection,{table:dnaReport?.baseMinuteBuckets})',
]) assert.ok(main.includes(token), 'main.ts hook missing: ' + token);
assert.ok(main.indexOf('h(BaseMinuteTableSection,{table:dnaReport.baseMinuteBuckets})') > main.indexOf("h('div',{className:'dna-time-controls'}"), 'table is rendered under the existing time-class cards');
for (const token of ['.dna-base-minute-scroll', '.dna-base-minute-table', 'overflow-x:auto']) assert.ok(styles.includes(token), 'style missing: ' + token);
assert.ok(preview.includes('--seed-time-controls'), 'local preview exposes the dev-only seed flag');

console.log('PASS: time-control parser, base-minute buckets, aggregation, unchanged Bullet/Blitz/Rapid cards, server compatibility and bilingual table.');

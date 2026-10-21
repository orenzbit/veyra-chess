import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

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
    bullet: { count: 1, averageAccuracy: 80, userMoves: 20, classificationCounts: { blunder: 2, mistake: 1, inaccuracy: 1 } },
    blitz: { count: 2, averageAccuracy: 90, userMoves: 80, classificationCounts: { blunder: 1, mistake: 4, inaccuracy: 3 } },
    rapid: { count: 0, averageAccuracy: null, userMoves: 0, classificationCounts: {} },
  },
};
const result = buildDnaStatisticsOverview(report);
assert.equal(result.totalGames, 3);
assert.equal(result.totalUserMoves, 100);
assert.equal(result.averageAccuracy, 86.7);
assert.equal(result.classificationCounts.blunder, 3);
assert.equal(result.classificationCounts.mistake, 5);
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

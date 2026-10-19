import assert from 'node:assert/strict';
import { _test } from '../netlify/functions/chess-dna.mjs';

const pgn = '\uFEFF[Event "X"]\r\n\r\n  1. e4 e5  ';
assert.equal(_test.normalizePgn(pgn), '[Event "X"]\n1. e4 e5');
assert.equal(_test.hashPgn(pgn), _test.hashPgn('[Event "X"]\n1. e4 e5'));
assert.notEqual(_test.hashPgn(pgn), _test.hashPgn('[Event "X"]\n1. d4 d5'));

const valid = {
  moves: [
    { index: 0, classification: 'best', whiteChanceBefore: 50, whiteChanceAfter: 52 },
    { index: 1, classification: 'mistake', whiteChanceBefore: 52, whiteChanceAfter: 47 },
  ],
  summary: { whiteAcc: 91.5, blackAcc: 84.2 },
};
assert.equal(_test.validateAnalysis(valid), true);
assert.equal(_test.validateAnalysis({ moves: [], summary: { whiteAcc: 50, blackAcc: 50 } }), false);
assert.equal(_test.validateAnalysis({ moves: [{ index: -1, classification: 'best', whiteChanceBefore: 50, whiteChanceAfter: 50 }], summary: { whiteAcc: 50, blackAcc: 50 } }), false);
assert.equal(_test.validateAnalysis({ moves: [{ index: 1, classification: 'best', whiteChanceBefore: 50, whiteChanceAfter: 50 }], summary: { whiteAcc: 50, blackAcc: 50 } }), false);
assert.equal(_test.validateAnalysis({ moves: [{ index: 0, classification: 'best', whiteChanceBefore: 101, whiteChanceAfter: 50 }], summary: { whiteAcc: 50, blackAcc: 50 } }), false);
assert.equal(_test.validateAnalysis({ moves: [{ index: 0, classification: 'best', whiteChanceBefore: 50, whiteChanceAfter: 50, clockSeconds: -1 }], summary: { whiteAcc: 50, blackAcc: 50 } }), false);
assert.equal(_test.validateAnalysis({ moves: [{ index: 0, classification: 'best', whiteChanceBefore: 'NaN', whiteChanceAfter: 50 }], summary: { whiteAcc: 50, blackAcc: 50 } }), false);
assert.equal(_test.validateAnalysis({ moves: [], summary: { whiteAcc: 101, blackAcc: 50 } }), false);
assert.equal(_test.validateAnalysis(null), false);
console.log('PASS: Chess DNA endpoint PGN hash normalization and analysis payload validation.');
const baseReport = {
  schemaVersion: 2,
  engineVersion: 'chessy-ai-fast-v2-depth14-node100000',
  timeControls: {
    bullet: { count: 0, games: [] },
    blitz: { count: 0, games: [] },
    rapid: { count: 0, games: [] },
  },
};
assert.deepEqual(_test.validateReportStructure(baseReport), { fingerprints: [], classesByFingerprint: {} });
const oneSavedGame = structuredClone(baseReport);
oneSavedGame.timeControls.blitz = { count: 1, games: [{ fingerprint: 'a'.repeat(64) }] };
oneSavedGame.timeControls.blitz.games[0].playerColor = 'white';
oneSavedGame.timeControls.blitz.games[0].date = '2026-03-01';
assert.deepEqual(_test.validateReportStructure(oneSavedGame), { fingerprints: ['a'.repeat(64)], classesByFingerprint: { ['a'.repeat(64)]: { timeClass: 'blitz', playerColor: 'white', date: '2026-03-01' } } });
const badCount = structuredClone(oneSavedGame);
badCount.timeControls.blitz.count = 2;
assert.equal(_test.validateReportStructure(badCount), null);
const duplicateFingerprint = structuredClone(oneSavedGame);
duplicateFingerprint.timeControls.rapid = { count: 1, games: [{ fingerprint: 'a'.repeat(64), playerColor: 'black', date: '2026-03-02' }] };
assert.equal(_test.validateReportStructure(duplicateFingerprint), null);
const incompatibleEngine = structuredClone(baseReport);
incompatibleEngine.engineVersion = 'old-engine';
assert.equal(_test.validateReportStructure(incompatibleEngine), null);
console.log('PASS: report shape, version, bucket counts and cross-bucket duplicate checks.');

const persisted = [{ fingerprint: 'a'.repeat(64), game_json: { timeClass: 'blitz', playerColor: 'white', date: '2026-03-01', analysis: {
  moves: [
    { index: 0, classification: 'best', whiteChanceBefore: 50, whiteChanceAfter: 52 },
    { index: 1, classification: 'blunder', whiteChanceBefore: 52, whiteChanceAfter: 47 },
  ], summary: { whiteAcc: 91.5, blackAcc: 84.2 },
} } }];
const accurateReport = {
  schemaVersion: 2, engineVersion: 'chessy-ai-fast-v2-depth14-node100000',
  timeControls: {
    bullet: { count: 0, games: [], averageAccuracy: null, userMoves: 0, classificationCounts: {}, issueRatesPer100Moves: {} },
    blitz: { count: 1, games: [{ fingerprint: 'a'.repeat(64), playerColor: 'white', date: '2026-03-01' }], averageAccuracy: 91.5, userMoves: 1, classificationCounts: { best: 1, brilliant: 0, great: 0, excellent: 0, good: 0, book: 0, forced: 0, inaccuracy: 0, mistake: 0, blunder: 0 }, issueRatesPer100Moves: { inaccuracy: 0, mistake: 0, blunder: 0 } },
    rapid: { count: 0, games: [], averageAccuracy: null, userMoves: 0, classificationCounts: {}, issueRatesPer100Moves: {} },
  },
};
const accurateStructure = _test.validateReportStructure(accurateReport);
assert.equal(_test.validateReportAgainstSavedGames(accurateReport, persisted, accurateStructure), true);
const fabricated = structuredClone(accurateReport);
fabricated.timeControls.blitz.averageAccuracy = 99.9;
assert.equal(_test.validateReportAgainstSavedGames(fabricated, persisted, _test.validateReportStructure(fabricated)), false, 'server must reject a fabricated accuracy value');
const fabricatedCounts = structuredClone(accurateReport);
fabricatedCounts.timeControls.blitz.classificationCounts.best = 0;
assert.equal(_test.validateReportAgainstSavedGames(fabricatedCounts, persisted, _test.validateReportStructure(fabricatedCounts)), false, 'server must reject fabricated move classification totals');
const fabricatedRate = structuredClone(accurateReport);
fabricatedRate.timeControls.blitz.issueRatesPer100Moves.blunder = 100;
assert.equal(_test.validateReportAgainstSavedGames(fabricatedRate, persisted, _test.validateReportStructure(fabricatedRate)), false, 'server must reject fabricated error rates');
console.log('PASS: server recomputes accuracy, own-move counts, classifications and error rates from persisted analyses; fabricated metrics are rejected.');

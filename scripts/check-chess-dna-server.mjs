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
assert.equal(_test.validateAnalysis({ moves: [{ index: 0, classification: 'best', whiteChanceBefore: 'NaN', whiteChanceAfter: 50 }], summary: { whiteAcc: 50, blackAcc: 50 } }), false);
assert.equal(_test.validateAnalysis({ moves: [], summary: { whiteAcc: 101, blackAcc: 50 } }), false);
assert.equal(_test.validateAnalysis(null), false);
console.log('PASS: Chess DNA endpoint PGN hash normalization and analysis payload validation.');
const baseReport = {
  schemaVersion: 1,
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
assert.deepEqual(_test.validateReportStructure(oneSavedGame), { fingerprints: ['a'.repeat(64)], classesByFingerprint: { ['a'.repeat(64)]: 'blitz' } });
const badCount = structuredClone(oneSavedGame);
badCount.timeControls.blitz.count = 2;
assert.equal(_test.validateReportStructure(badCount), null);
const duplicateFingerprint = structuredClone(oneSavedGame);
duplicateFingerprint.timeControls.rapid = { count: 1, games: [{ fingerprint: 'a'.repeat(64) }] };
assert.equal(_test.validateReportStructure(duplicateFingerprint), null);
const incompatibleEngine = structuredClone(baseReport);
incompatibleEngine.engineVersion = 'old-engine';
assert.equal(_test.validateReportStructure(incompatibleEngine), null);
console.log('PASS: report shape, version, bucket counts and cross-bucket duplicate checks.');

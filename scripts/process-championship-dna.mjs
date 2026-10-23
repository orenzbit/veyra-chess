import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Chess } from '../public/vendor/veyra-rules/chess-compat.js';

const arg = (name, fallback = '') => process.argv.find((value) => value.startsWith('--' + name + '='))?.slice(name.length + 3) ?? fallback;
const inputPath = resolve(arg('input', 'artifacts/championship-tournament/games.jsonl'));
const manifestPath = resolve(arg('manifest', 'public/data/bots/index.json'));
const outputPath = resolve(arg('out', 'artifacts/championship-tournament/dna-report.json'));
const analysisArg = arg('analysis', '');
const analysisPath = analysisArg ? resolve(analysisArg) : null;
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const records = (await readFile(inputPath, 'utf8')).split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
const eligible = records.filter((record) => record.status === 'completed' && record.pgn && record.result);
assert.ok(eligible.length > 0, 'No completed games available for DNA processing');
const manifestHash = createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
const moveClassifications = ['best', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder'];
const gamePlyCounts = new Map();
const expectedPositions = new Map();
const profile = new Map(manifest.map((bot) => [bot.id, {
  id: bot.id, name: bot.name, games: 0, wins: 0, draws: 0, losses: 0,
  gamesAsWhite: 0, gamesAsBlack: 0, totalPlies: 0, openingMoveCounts: {}, phasePlies: { opening: 0, middlegame: 0, endgame: 0 },
  captures: 0, checks: 0, castles: 0, promotions: 0, checkmatesDelivered: 0, timeForfeits: 0,
  opponentIds: new Set(), pgnFingerprints: new Set(),
  engineMetrics: { analyzedMoves: 0, classificationCounts: Object.fromEntries(moveClassifications.map((name) => [name, 0])), dropTotal: 0, dropCount: 0, depthTotal: 0, depthCount: 0, elapsedMs: 0, fingerprints: new Set() },
}]));
const materialValue = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
function phaseOf(game) {
  const pieces = game.board().flat().filter(Boolean);
  const material = pieces.reduce((sum, piece) => sum + (materialValue[piece.type] || 0), 0);
  if (material <= 13) return 'endgame';
  if (game.history().length < 20) return 'opening';
  return 'middlegame';
}
for (const record of eligible) {
  const white = profile.get(record.white?.id);
  const black = profile.get(record.black?.id);
  assert.ok(white && black && white !== black, 'Game references a bot outside the manifest: ' + record.gameId);
  const fingerprint = createHash('sha256').update(record.pgn.replace(/\r\n/g, '\n').trim()).digest('hex');
  white.pgnFingerprints.add(fingerprint); black.pgnFingerprints.add(fingerprint);
  white.games += 1; black.games += 1;
  white.gamesAsWhite += 1; black.gamesAsBlack += 1;
  white.opponentIds.add(black.id); black.opponentIds.add(white.id);
  if (record.result === '1-0') { white.wins += 1; black.losses += 1; }
  else if (record.result === '0-1') { black.wins += 1; white.losses += 1; }
  else if (record.result === '1/2-1/2') { white.draws += 1; black.draws += 1; }
  if (record.reason === 'time-forfeit') {
    const timedOut = record.moveTimes?.at(-1)?.botId;
    if (timedOut === white.id) white.timeForfeits += 1;
    if (timedOut === black.id) black.timeForfeits += 1;
  }
  const sourceGame = new Chess();
  sourceGame.loadPgn(record.pgn, { sloppy: true });
  const history = sourceGame.history({ verbose: true });
  const replay = new Chess();
  const sideMetrics = new Map([[white.id, white], [black.id, black]]);
  for (const move of history) {
    const moverId = replay.turn() === 'w' ? white.id : black.id;
    const bot = sideMetrics.get(moverId);
    const phase = phaseOf(replay);
    bot.phasePlies[phase] += 1;
    bot.totalPlies += 1;
    if (replay.history().length < 12) {
      const key = (replay.turn() === 'w' ? 'white:' : 'black:') + move.san;
      bot.openingMoveCounts[key] = (bot.openingMoveCounts[key] || 0) + 1;
    }
    if (move.captured) bot.captures += 1;
    if (String(move.san || '').includes('+') || String(move.san || '').includes('#')) bot.checks += 1;
    if (String(move.san || '').includes('O-O')) bot.castles += 1;
    if (move.promotion) bot.promotions += 1;
    const applied = replay.move({ from: move.from, to: move.to, promotion: move.promotion || undefined });
    assert.ok(applied, 'Could not replay move in game ' + record.gameId);
    if (replay.isCheckmate()) bot.checkmatesDelivered += 1;
  }
}
let engineAnalysis = { available: false, analysisPath: null, analysisRecords: 0, engineFingerprint: null, completeCoverage: false };
if (analysisPath) {
  const analysisRecords = (await readFile(analysisPath, 'utf8')).split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const gamesById = new Map(eligible.map((record) => [record.gameId, record]));
  const seenAnalysisIds = new Set();
  const engineFingerprints = new Set();
  for (const analysis of analysisRecords) {
    const game = gamesById.get(analysis.gameId);
    assert.ok(game, 'Engine analysis references a game outside the PGN archive: ' + analysis.gameId);
    const expectedPosition = expectedPositions.get(analysis.analysisId);
    assert.ok(expectedPosition, 'Engine analysis references an unknown PGN position: ' + analysis.analysisId);
    assert.equal(analysis.beforeFen, expectedPosition.beforeFen, 'Engine analysis before-FEN mismatch: ' + analysis.analysisId);
    assert.equal(analysis.afterFen, expectedPosition.afterFen, 'Engine analysis after-FEN mismatch: ' + analysis.analysisId);
    assert.equal(analysis.botId, expectedPosition.botId, 'Engine analysis bot mismatch: ' + analysis.analysisId);
    assert.equal(analysis.side, expectedPosition.side, 'Engine analysis side mismatch: ' + analysis.analysisId);
    assert.equal(analysis.schemaVersion, 1, 'Unsupported engine-analysis schema version');
    assert.equal(analysis.analysisSchemaVersion, 1, 'Unsupported move-analysis schema version');
    assert.ok(typeof analysis.analysisId === 'string' && analysis.analysisId, 'Missing stable analysis ID');
    assert.ok(!seenAnalysisIds.has(analysis.analysisId), 'Duplicate move analysis: ' + analysis.analysisId);
    seenAnalysisIds.add(analysis.analysisId);
    assert.ok(Number.isInteger(analysis.ply) && analysis.ply >= 1 && analysis.ply <= (gamePlyCounts.get(analysis.gameId) || 0), 'Invalid analysis ply: ' + analysis.analysisId);
    assert.equal(analysis.analysisId, analysis.gameId + '__ply-' + String(analysis.ply).padStart(4, '0'), 'Analysis ID does not match game and ply');
    const expectedBotId = analysis.side === 'white' ? game.white.id : analysis.side === 'black' ? game.black.id : null;
    assert.equal(analysis.botId, expectedBotId, 'Analysis bot does not match the side to move: ' + analysis.analysisId);
    assert.ok(typeof analysis.engineFingerprint === 'string' && analysis.engineFingerprint, 'Missing engine fingerprint');
    assert.ok(Number.isFinite(analysis.elapsedMs) && analysis.elapsedMs >= 0, 'Invalid analysis runtime');
    const bot = profile.get(analysis.botId);
    assert.ok(bot, 'Analysis references a bot outside the manifest: ' + analysis.botId);
    bot.engineMetrics.analyzedMoves += 1;
    bot.engineMetrics.elapsedMs += analysis.elapsedMs;
    bot.engineMetrics.fingerprints.add(analysis.engineFingerprint);
    engineFingerprints.add(analysis.engineFingerprint);
    assert.ok(moveClassifications.includes(analysis.classification), 'Unknown engine move classification: ' + analysis.classification);
    bot.engineMetrics.classificationCounts[analysis.classification] += 1;
    if (Number.isFinite(analysis.drop) && analysis.drop >= 0) {
      bot.engineMetrics.dropTotal += analysis.drop;
      bot.engineMetrics.dropCount += 1;
    }
    if (Number.isFinite(analysis.depth) && analysis.depth >= 0) {
      bot.engineMetrics.depthTotal += analysis.depth;
      bot.engineMetrics.depthCount += 1;
    }
  }
  assert.ok(engineFingerprints.size <= 1, 'Move-analysis file mixes engine fingerprints');
  engineAnalysis = {
    available: true,
    analysisPath,
    analysisRecords: analysisRecords.length,
    engineFingerprint: engineFingerprints.size ? [...engineFingerprints][0] : null,
    completeCoverage: [...profile.values()].every((bot) => bot.games === 0 || bot.engineMetrics.analyzedMoves === bot.totalPlies),
    metricDefinition: 'Chance drop is reported in engine percentage points; it is not centipawn loss (ACPL).',
  };
}
const bots = [...profile.values()].map((bot) => {
  const phaseTotal = bot.phasePlies.opening + bot.phasePlies.middlegame + bot.phasePlies.endgame;
  const topOpeningMoves = Object.entries(bot.openingMoveCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 12).map(([move, count]) => ({ move, count }));
  return {
    id: bot.id, name: bot.name, games: bot.games, gamesAsWhite: bot.gamesAsWhite, gamesAsBlack: bot.gamesAsBlack,
    wins: bot.wins, draws: bot.draws, losses: bot.losses,
    score: Number((bot.wins + bot.draws * 0.5).toFixed(1)),
    scorePercent: bot.games ? Number((100 * (bot.wins + bot.draws * 0.5) / bot.games).toFixed(2)) : null,
    averagePlies: bot.games ? Number((bot.totalPlies / bot.games).toFixed(2)) : null,
    phasePlyShare: Object.fromEntries(Object.entries(bot.phasePlies).map(([phase, count]) => [phase, phaseTotal ? Number((100 * count / phaseTotal).toFixed(2)) : 0])),
    capturesPer100Plies: bot.totalPlies ? Number((100 * bot.captures / bot.totalPlies).toFixed(2)) : null,
    checksPer100Plies: bot.totalPlies ? Number((100 * bot.checks / bot.totalPlies).toFixed(2)) : null,
    castlesPerGame: bot.games ? Number((bot.castles / bot.games).toFixed(3)) : null,
    promotions: bot.promotions, checkmatesDelivered: bot.checkmatesDelivered, timeForfeits: bot.timeForfeits,
    uniqueOpponents: bot.opponentIds.size, uniquePgnFingerprints: bot.pgnFingerprints.size, topOpeningMoves,
    sampleSizeStatus: bot.games >= 20 ? 'initial-sample' : 'small-sample',
    engineMetrics: analysisPath ? {
      analyzedMoves: bot.engineMetrics.analyzedMoves,
      expectedMoves: bot.totalPlies,
      coveragePercent: bot.totalPlies ? Number((100 * bot.engineMetrics.analyzedMoves / bot.totalPlies).toFixed(2)) : 0,
      completeCoverage: bot.games > 0 && bot.engineMetrics.analyzedMoves === bot.totalPlies,
      classificationCounts: bot.engineMetrics.classificationCounts,
      classificationSharePercent: Object.fromEntries(Object.entries(bot.engineMetrics.classificationCounts).map(([name, count]) => [name, bot.engineMetrics.analyzedMoves ? Number((100 * count / bot.engineMetrics.analyzedMoves).toFixed(2)) : 0])),
      averageChanceDropPoints: bot.engineMetrics.dropCount ? Number((bot.engineMetrics.dropTotal / bot.engineMetrics.dropCount).toFixed(3)) : null,
      averageDepth: bot.engineMetrics.depthCount ? Number((bot.engineMetrics.depthTotal / bot.engineMetrics.depthCount).toFixed(2)) : null,
      totalAnalysisSeconds: Number((bot.engineMetrics.elapsedMs / 1000).toFixed(3)),
      engineFingerprints: [...bot.engineMetrics.fingerprints],
    } : null,
  };
}).sort((a, b) => b.score - a.score || b.wins - a.wins || a.id.localeCompare(b.id));
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  manifestPath, manifestHash,
  inputPath, inputRecords: records.length, eligibleGames: eligible.length,
  engineAnalysis,
  methodology: {
    kind: analysisPath ? 'descriptive-pgn-patterns+engine-analysis' : 'descriptive-pgn-patterns',
    phaseDefinition: 'Opening: before ply 20; endgame: total material value <= 13 (pawn=1, knight/bishop=3, rook=5, queen=9); otherwise middlegame.',
    caveats: [
      'Descriptive patterns do not prove causal playing style. Engine-derived classifications are included only when a move-analysis file is supplied.',
      'Engine chance drop is reported in percentage points, not centipawns; ACPL is not calculated by this processor.',
      'Phase boundaries are operational heuristics and should be versioned if changed.',
      'A sample status of initial-sample is a convenience threshold, not a statistical guarantee.',
      'Duplicate normalized PGNs are counted once per participating bot only for the fingerprint metric; games themselves remain separate records.',
    ],
  },
  bots,
};
await writeFile(outputPath, JSON.stringify(report, null, 2) + '\n');
console.log('Wrote Chess DNA for ' + bots.length + ' bots from ' + eligible.length + ' completed games' + (analysisPath ? ' with ' + engineAnalysis.analysisRecords + ' engine analyses' : ' (descriptive PGN metrics only)') + ': ' + outputPath);

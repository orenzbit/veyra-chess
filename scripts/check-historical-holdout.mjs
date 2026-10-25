import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Chess } from '../public/vendor/veyra-rules/chess-compat.js';
import { chooseBotMove, preferredOpeningMove } from '../dist/src/bot-engine.js';

const manifest = JSON.parse(await readFile('public/data/bots/index.json', 'utf8'));
const requestedIds = String(process.env.HISTORICAL_BOT_IDS || '').split(',').map((value) => value.trim()).filter(Boolean);
const validationSearchDepth = Number(process.env.HISTORICAL_HOLDOUT_SEARCH_DEPTH || 2);
assert.ok(Number.isInteger(validationSearchDepth) && validationSearchDepth >= 1 && validationSearchDepth <= 5, 'HISTORICAL_HOLDOUT_SEARCH_DEPTH must be an integer from 1 to 5');
const historical = manifest.filter((bot) => bot.sourceFile && (!requestedIds.length || requestedIds.includes(bot.id)));
assert.ok(historical.length > 0, 'No historical PGN-backed profiles selected');
for (const id of requestedIds) assert.ok(historical.some((bot) => bot.id === id), 'Requested historical bot is missing: ' + id);

const anand = manifest.find((bot) => bot.id === 'anand');
assert.ok(anand && anand.openingMatchMode === 'position', 'Anand must opt into board-position opening matching');
const anandOpening = anand.openingsAsWhite?.[0];
assert.ok(anandOpening?.moves, 'Anand needs a source-derived White opening line for the position-match regression test');
const anandTokens = String(anandOpening.moves).replace(/\d+\.(\.\.\.)?/g, ' ').trim().split(/\s+/).filter(Boolean);
assert.ok(anandTokens.length > 4, 'Anand opening line is too short for a position-match regression test');
const anandProbe = new Chess();
for (const san of anandTokens.slice(0, 4)) assert.ok(anandProbe.move(san, { sloppy: true }), 'Invalid Anand opening prefix move: ' + san);
const expectedAnandMove = anandTokens[4];
const shiftedFenFields = anandProbe.fen().split(' ');
shiftedFenFields[4] = String(Number(shiftedFenFields[4]) + 7);
shiftedFenFields[5] = String(Number(shiftedFenFields[5]) + 1000);
const shiftedAnandPosition = new Chess(shiftedFenFields.join(' '));
assert.equal(
  preferredOpeningMove(shiftedAnandPosition, anand, Chess)?.san,
  expectedAnandMove,
  'Anand repertoire matching must ignore halfmove/fullmove counters when the board position is identical',
);
assert.equal(
  preferredOpeningMove(shiftedAnandPosition, { ...anand, openingMatchMode: undefined }, Chess),
  null,
  'Counter-insensitive repertoire matching must remain opt-in and must not change other bots',
);
const errors = [], warnings = [], results = [];
function selectHoldoutPositions(positions) {
  const selected = [];
  for (const phase of ['opening', 'middlegame', 'endgame']) {
    const group = positions.filter((position) => position.phase === phase);
    const take = Math.min(4, group.length);
    for (let i = 0; i < take; i += 1) {
      const position = group[Math.floor((i + 0.5) * group.length / take)];
      if (position && !selected.includes(position)) selected.push(position);
    }
  }
  for (const position of positions) {
    if (selected.length >= 24) break;
    if (!selected.includes(position)) selected.push(position);
  }
  return selected.slice(0, 24);
}
const originalRandom = Math.random;
Math.random = () => 0.99;
try {
  for (const bot of historical) {
    const positions = selectHoldoutPositions(bot.holdoutPositions || []);
    console.log('[holdout] ' + bot.id + ': checking ' + positions.length + ' positions across game phases');
    if (bot.sourceGeneratorVersion !== 4 || positions.length < 8 || bot.trainingGameCount + bot.holdoutGameCount !== bot.sourceGameCount) {
      errors.push(bot.id + ': holdout split/provenance is incomplete');
      continue;
    }
    let matches = 0;
    const styleSignals = {
      bot: { captures: 0, checks: 0, lateKingMoves: 0 },
      historical: { captures: 0, checks: 0, lateKingMoves: 0 },
    };
    const phases = { opening: { total: 0, matches: 0 }, middlegame: { total: 0, matches: 0 }, endgame: { total: 0, matches: 0 } };
    let validSignalSamples = 0;
    for (const position of positions) {
      const game = new Chess(position.fen);
      if (game.turn() !== position.side) { errors.push(bot.id + '/' + position.gameId + ': FEN side-to-move does not match the historical player'); continue; }
      const historicalMove = game.moves({ verbose: true }).find((move) => move.from + move.to + (move.promotion || '') === position.sourceMove);
      if (!historicalMove) { errors.push(bot.id + '/' + position.gameId + ': recorded historical move is illegal in held-out FEN'); continue; }
      const chosen = chooseBotMove(game, { ...bot, searchDepth: validationSearchDepth }, Chess);
      if (!chosen) { errors.push(bot.id + '/' + position.gameId + ': bot returned no move in holdout position'); continue; }
      const botPiece = game.get(chosen.from);
      const historicalPiece = game.get(historicalMove.from);
      const botAfter = new Chess(game.fen());
      const historicalAfter = new Chess(game.fen());
      const botApplied = botAfter.move({ from: chosen.from, to: chosen.to, promotion: chosen.promotion || undefined });
      const historicalApplied = historicalAfter.move({ from: historicalMove.from, to: historicalMove.to, promotion: historicalMove.promotion || undefined });
      if (!botApplied) { errors.push(bot.id + '/' + position.gameId + ': bot returned illegal holdout move'); continue; }
      if (!historicalApplied) { errors.push(bot.id + '/' + position.gameId + ': historical holdout move could not be replayed'); continue; }
      if (chosen.captured) styleSignals.bot.captures += 1;
      if (botAfter.isCheck()) styleSignals.bot.checks += 1;
      if (position.ply > 40 && botPiece?.type === 'k') styleSignals.bot.lateKingMoves += 1;
      if (historicalMove.captured) styleSignals.historical.captures += 1;
      if (historicalAfter.isCheck()) styleSignals.historical.checks += 1;
      if (position.ply > 40 && historicalPiece?.type === 'k') styleSignals.historical.lateKingMoves += 1;
      const applied = game.move({ from: chosen.from, to: chosen.to, promotion: chosen.promotion || undefined });
      if (!applied) { errors.push(bot.id + '/' + position.gameId + ': bot move failed when applied to live holdout board'); continue; }
      validSignalSamples += 1;
      const exact = chosen.from + chosen.to + (chosen.promotion || '') === position.sourceMove;
      if (exact) matches += 1;
      const phase = phases[position.phase] ? position.phase : 'middlegame';
      phases[phase].total += 1;
      if (exact) phases[phase].matches += 1;
    }
    const styleSignalComparison = {};
    for (const signal of ['captures', 'checks', 'lateKingMoves']) {
      const botCount = styleSignals.bot[signal];
      const historicalCount = styleSignals.historical[signal];
      const n = Math.max(1, validSignalSamples);
      const historicalRate = historicalCount / n;
      const toleranceCount = Math.max(1, Math.ceil(2 * Math.sqrt(historicalRate * (1 - historicalRate) * n)));
      const difference = Math.abs(botCount - historicalCount);
      styleSignalComparison[signal] = {
        botCount, historicalCount, difference, toleranceCount,
        withinTolerance: difference <= toleranceCount,
      };
      if (difference > toleranceCount) {
        warnings.push(bot.id + ': style authenticity signal ' + signal + ' differs from matched historical choices by ' + difference + ' positions (tolerance ' + toleranceCount + ', sample ' + validSignalSamples + '); review the source-grounded profile rather than treating this coarse 24-position proxy as proof of failure.');
      }
    }
    results.push({
      id: bot.id, name: bot.name, sourceFile: bot.sourceFile,
      sourceGames: bot.sourceGameCount, trainingGames: bot.trainingGameCount, holdoutGames: bot.holdoutGameCount,
      positions: positions.length, validSignalSamples, exactHistoricalMoveMatches: matches,
      historicalMoveOverlapPercent: Number((100 * matches / Math.max(1, positions.length)).toFixed(1)),
      styleSignals: { sampledPositions: validSignalSamples, bot: styleSignals.bot, historical: styleSignals.historical, comparison: styleSignalComparison, interpretation: 'Matched-position behavior counts with a conservative two-standard-error-style tolerance; a coarse authenticity gate, not proof of player identity.' },
      phases: Object.fromEntries(Object.entries(phases).map(([key, value]) => [key, {
        positions: value.total, matches: value.matches,
        overlapPercent: Number((100 * value.matches / Math.max(1, value.total)).toFixed(1)),
      }])),
    });
  }
} finally { Math.random = originalRandom; }
const report = {
  status: errors.length ? 'failed' : 'passed',
  checkedAt: new Date().toISOString(),
  method: 'Every tenth PGN chunk is held out deterministically. Opening repertoires and training style metrics exclude held-out games. Legal responses and historical-move overlap are measured at fixed validation search depth ' + validationSearchDepth + '; full profile search quality is measured separately by the Stockfish gate at the profile runtime depth.',
  validationSearchDepth,
  historicalProfiles: historical.length,
  positions: results.reduce((sum, item) => sum + item.positions, 0),
  results, errors, warnings,
  limitations: [
    'Exact historical-move overlap is a style proxy, not a chess-strength metric.',
    'Holdout move selection uses a fixed search-depth override for repeatable, bounded-cost style validation; it does not claim to measure the profile’s full runtime-depth move quality.',
    'Sampled captures, checks, and late king moves compare selected bot responses with historical moves on the same holdout positions; these descriptive counts are not representative per-100-move rates.',
    'Strength is checked separately by the mate-in-one and seeded tactical puzzle benchmark.',
    'This test does not claim external Stockfish analysis of every source move.',
    'Capture/check/late-king counts on 24 deterministic positions are coarse diagnostic signals, not a valid standalone identity test; deviations remain visible as warnings for review and do not alone fail the legal/provenance holdout gate.'
  ],
};
const out = resolve('artifacts/historical-holdout');
await mkdir(out, { recursive: true });
await writeFile(resolve(out, 'summary.json'), JSON.stringify(report, null, 2) + '\n');
const md = [
  '# Historical PGN holdout validation', '',
  '- Status: **' + report.status + '**',
  '- Historical profiles: ' + report.historicalProfiles,
  '- Held-out positions checked: ' + report.positions,
  '- Method: ' + report.method, '',
  '| Bot | Source games | Training | Holdout games | Positions | Exact move overlap |',
  '|---|---:|---:|---:|---:|---:|',
  ...results.map((item) => '| ' + item.name + ' | ' + item.sourceGames + ' | ' + item.trainingGames + ' | ' + item.holdoutGames + ' | ' + item.positions + ' | ' + item.historicalMoveOverlapPercent + '% |'),
  '', '## Sampled style signals', '',
  '| Bot | Signal | Bot moves | Historical moves | Delta | Allowed delta | Gate |',
  '|---|---|---:|---:|---:|---:|---|',
  ...results.flatMap((item) => ['captures', 'checks', 'lateKingMoves'].map((signal) => '| ' + item.name + ' | ' + signal + ' | ' + item.styleSignals.bot[signal] + ' | ' + item.styleSignals.historical[signal] + ' | ' + item.styleSignals.comparison[signal].difference + ' | ' + item.styleSignals.comparison[signal].toleranceCount + ' | ' + (item.styleSignals.comparison[signal].withinTolerance ? 'within tolerance' : 'WARN (review)') + ' |')),
  '', 'Counts compare the same held-out positions only. The tolerance is a coarse diagnostic gate; it is not a formal statistical proof of historical identity.',
  '', '## Warnings', '', ...(warnings.length ? warnings.map((warning) => '- ' + warning) : ['None.']), '',
  '## Errors', '', ...(errors.length ? errors.map((error) => '- ' + error) : ['None.']), '',
  '## Limitations', '', ...report.limitations.map((line) => '- ' + line), ''
];
await writeFile(resolve(out, 'summary.md'), md.join('\n'));
if (warnings.length) console.warn('WARN: ' + warnings.length + ' coarse style-signal deviation(s) recorded for review.');
assert.equal(errors.length, 0, errors.slice(0, 30).join('\n'));
assert.ok(report.positions >= historical.length * 8, 'Too few held-out positions were checked');
console.log('PASS: ' + report.positions + ' held-out positions across ' + historical.length + ' historical bots; legal responses validated and style overlap reported separately.');

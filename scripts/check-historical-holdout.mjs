import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Chess } from '../public/vendor/veyra-rules/chess-compat.js';
import { chooseBotMove, preferredOpeningMove } from '../dist/src/bot-engine.js';

const manifest = JSON.parse(await readFile('public/data/bots/index.json', 'utf8'));
const historical = manifest.filter((bot) => bot.sourceFile && bot.id !== 'carlsen');
assert.equal(historical.length, 11, 'Expected 11 in-scope historical PGN-backed profiles (Carlsen is explicitly excluded)');

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
const errors = [], results = [];
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
    if (selected.length >= 12) break;
    if (!selected.includes(position)) selected.push(position);
  }
  return selected.slice(0, 12);
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
    for (const position of positions) {
      const game = new Chess(position.fen);
      if (game.turn() !== position.side) { errors.push(bot.id + '/' + position.gameId + ': FEN side-to-move does not match the historical player'); continue; }
      const historicalMove = game.moves({ verbose: true }).find((move) => move.from + move.to + (move.promotion || '') === position.sourceMove);
      if (!historicalMove) { errors.push(bot.id + '/' + position.gameId + ': recorded historical move is illegal in held-out FEN'); continue; }
      const chosen = chooseBotMove(game, bot, Chess);
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
      const exact = chosen.from + chosen.to + (chosen.promotion || '') === position.sourceMove;
      if (exact) matches += 1;
      const phase = phases[position.phase] ? position.phase : 'middlegame';
      phases[phase].total += 1;
      if (exact) phases[phase].matches += 1;
    }
    results.push({
      id: bot.id, name: bot.name, sourceFile: bot.sourceFile,
      sourceGames: bot.sourceGameCount, trainingGames: bot.trainingGameCount, holdoutGames: bot.holdoutGameCount,
      positions: positions.length, exactHistoricalMoveMatches: matches,
      historicalMoveOverlapPercent: Number((100 * matches / Math.max(1, positions.length)).toFixed(1)),
      styleSignals: { sampledPositions: positions.length, bot: styleSignals.bot, historical: styleSignals.historical, interpretation: 'Descriptive counts on phase-balanced holdout samples; not per-100-move rates and not proof of player identity.' },
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
  method: 'Every tenth PGN chunk is held out deterministically. Opening repertoires and training style metrics exclude held-out games. This test checks legal bot responses and reports exact historical-move overlap separately from tactical strength.',
  historicalProfiles: historical.length,
  excludedByRequest: ['carlsen'],
  positions: results.reduce((sum, item) => sum + item.positions, 0),
  results, errors,
  limitations: [
    'Exact historical-move overlap is a style proxy, not a chess-strength metric.',
    'Sampled captures, checks, and late king moves compare selected bot responses with historical moves on the same holdout positions; these descriptive counts are not representative per-100-move rates.',
    'Strength is checked separately by the mate-in-one and seeded tactical puzzle benchmark.',
    'This test does not claim external Stockfish analysis of every source move.'
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
  '| Bot | Signal | Bot moves | Historical moves |',
  '|---|---|---:|---:|',
  ...results.flatMap((item) => ['captures', 'checks', 'lateKingMoves'].map((signal) => '| ' + item.name + ' | ' + signal + ' | ' + item.styleSignals.bot[signal] + ' | ' + item.styleSignals.historical[signal] + ' |')),
  '', 'Counts compare the selected holdout positions only; they are descriptive and must not be read as per-100-move statistics.',
  '', '## Errors', '', ...(errors.length ? errors.map((error) => '- ' + error) : ['None.']), '',
  '## Limitations', '', ...report.limitations.map((line) => '- ' + line), ''
];
await writeFile(resolve(out, 'summary.md'), md.join('\n'));
assert.equal(errors.length, 0, errors.slice(0, 30).join('\n'));
assert.ok(report.positions >= historical.length * 8, 'Too few held-out positions were checked');
console.log('PASS: ' + report.positions + ' held-out positions across ' + historical.length + ' historical bots; legal responses validated and style overlap reported separately.');

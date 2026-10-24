import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Chess } from '../public/vendor/veyra-rules/chess-compat.js';
import { chooseBotMove } from '../dist/src/bot-engine.js';

const manifest = JSON.parse(await readFile('public/data/bots/index.json', 'utf8'));
const requestedIds = String(process.env.HISTORICAL_BOT_IDS || '').split(',').map((value) => value.trim()).filter(Boolean);
const bots = manifest.filter((bot) => bot.sourceFile && (!requestedIds.length || requestedIds.includes(bot.id)));
assert.ok(bots.length > 0, 'No historical PGN-backed profiles selected');
for (const id of requestedIds) assert.ok(bots.some((bot) => bot.id === id), 'Requested historical bot is missing: ' + id);
const depth = Number(process.env.HISTORICAL_SURPRISE_SEARCH_DEPTH || 2);
assert.ok(Number.isInteger(depth) && depth >= 1 && depth <= 5, 'HISTORICAL_SURPRISE_SEARCH_DEPTH must be from 1 to 5');

const uci = (move) => move.from + move.to + (move.promotion || '');
function parseHeaders(pgn) {
  const headers = {};
  const re = /^\[([A-Za-z0-9_]+)\s+"((?:[^"\\]|\\.)*)"\]\s*$/gm;
  let match;
  while ((match = re.exec(pgn))) headers[match[1]] = match[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  return headers;
}
function gameId(file, headers) {
  return [file, headers.Date || 'unknown-date', headers.Event || 'unknown-event', headers.Round || '?', headers.White || '?', headers.Black || '?'].join(':');
}
function splitGames(text) {
  return text.split(/(?=^\[Event\s+")/m).filter((chunk) => /^\[Event\s+"/m.test(chunk));
}
function selectPositions(positions) {
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
function applyMove(game, move) {
  return game.move({ from: move.from, to: move.to, promotion: move.promotion || undefined });
}
function chooseSurprise(predecessor, originalMove) {
  const candidates = predecessor.moves({ verbose: true })
    .filter((move) => uci(move) !== uci(originalMove))
    .sort((a, b) => Number(Boolean(a.captured)) - Number(Boolean(b.captured))
      || Number(String(a.san || '').includes('+')) - Number(String(b.san || '').includes('+'))
      || uci(a).localeCompare(uci(b)));
  for (const move of candidates) {
    const probe = new Chess(predecessor.fen());
    if (!applyMove(probe, move) || probe.isCheckmate()) continue;
    if (probe.moves({ verbose: true }).length > 0) return move;
  }
  return null;
}

const errors = [];
const results = [];
const originalRandom = Math.random;
Math.random = () => 0.99;
try {
  for (const bot of bots) {
    const positions = selectPositions(bot.holdoutPositions || []);
    const sourceText = await readFile(bot.sourceFile, 'utf8');
    const sourceGames = new Map();
    for (const chunk of splitGames(sourceText)) {
      const headers = parseHeaders(chunk);
      const id = gameId(bot.sourceFile, headers);
      if (!sourceGames.has(id)) sourceGames.set(id, []);
      sourceGames.get(id).push(chunk);
    }
    const row = { id: bot.id, name: bot.name, sourceFile: bot.sourceFile, sampledPositions: positions.length, scenarios: [], errors: [] };
    for (const position of positions) {
      try {
        const chunks = sourceGames.get(position.gameId) || [];
        const playerMoveIndex = Number(position.ply) - 1;
        const opponentMoveIndex = Number(position.ply) - 2;
        const chunk = chunks.find((candidate) => {
          try {
            const candidateGame = new Chess();
            candidateGame.loadPgn(candidate, { sloppy: true });
            const candidateMoves = candidateGame.history({ verbose: true });
            if (playerMoveIndex < 1 || opponentMoveIndex < 0 || playerMoveIndex >= candidateMoves.length) return false;
            if (uci(candidateMoves[playerMoveIndex]) !== position.sourceMove) return false;
            const candidatePredecessor = new Chess();
            for (const move of candidateMoves.slice(0, opponentMoveIndex)) {
              if (!applyMove(candidatePredecessor, move)) return false;
            }
            const candidatePosition = new Chess(candidatePredecessor.fen());
            return !!applyMove(candidatePosition, candidateMoves[opponentMoveIndex]) &&
              candidatePosition.fen() === position.fen;
          } catch {
            return false;
          }
        });
        assert.ok(chunk, 'Could not find source PGN game matching stored move and FEN: ' + position.gameId);
        const original = new Chess();
        original.loadPgn(chunk, { sloppy: true });
        const moves = original.history({ verbose: true });
        assert.ok(playerMoveIndex >= 1 && opponentMoveIndex >= 0 && playerMoveIndex < moves.length, 'Invalid holdout ply ' + position.ply);
        assert.equal(uci(moves[playerMoveIndex]), position.sourceMove, 'PGN move does not match stored historical move');
        const historicalPlayerSide = position.side;
        const originalOpponentMove = moves[opponentMoveIndex];
        assert.notEqual(originalOpponentMove.color, historicalPlayerSide, 'Previous move was not made by the opponent');
        const predecessor = new Chess();
        for (const move of moves.slice(0, opponentMoveIndex)) assert.ok(applyMove(predecessor, move), 'Could not replay PGN to opponent predecessor position');
        assert.equal(predecessor.turn(), originalOpponentMove.color, 'Predecessor side-to-move mismatch');
        const replayOriginalOpponentMove = new Chess(predecessor.fen());
        assert.ok(applyMove(replayOriginalOpponentMove, originalOpponentMove), 'Original opponent move was illegal in source predecessor position');
        assert.equal(replayOriginalOpponentMove.fen(), position.fen, 'Stored holdout FEN does not match the source PGN after the original opponent move');
        const surpriseMove = chooseSurprise(predecessor, originalOpponentMove);
        assert.ok(surpriseMove, 'No legal alternative opponent move found');
        const changedPosition = new Chess(predecessor.fen());
        assert.ok(applyMove(changedPosition, surpriseMove), 'Alternative opponent move was illegal');
        assert.equal(changedPosition.turn(), historicalPlayerSide, 'Surprise move did not return turn to historical player');
        const legalResponseMoves = changedPosition.moves({ verbose: true });
        assert.ok(legalResponseMoves.length > 0, 'No legal bot response after surprise move');
        const chosen = chooseBotMove(changedPosition, { ...bot, searchDepth: depth }, Chess);
        assert.ok(chosen, 'Bot returned no response to surprise move');
        const applied = applyMove(changedPosition, chosen);
        assert.ok(applied, 'Bot response was illegal');
        const originalSourceMoveStillLegal = predecessor.moves({ verbose: true }).some((move) => uci(move) === uci(originalOpponentMove));
        const sourcePlayerMoveStillLegal = legalResponseMoves.some((move) => uci(move) === position.sourceMove);
        row.scenarios.push({
          gameId: position.gameId, date: position.date || null, event: position.event || null,
          opponent: position.opponent || null, phase: position.phase, ply: position.ply,
          historicalOpponentMove: originalOpponentMove.san, surpriseOpponentMove: surpriseMove.san,
          botResponse: chosen.san, responseUci: uci(chosen), responseLegal: true,
          originalHistoricalResponseStillLegal: sourcePlayerMoveStillLegal,
          botRepeatedHistoricalResponse: sourcePlayerMoveStillLegal && uci(chosen) === position.sourceMove,
          note: 'The opponent move is an experimental legal alternative, not part of the historical game.'
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        row.errors.push({ gameId: position.gameId, message });
        errors.push(bot.id + '/' + position.gameId + ': ' + message);
      }
    }
    row.phaseCoverage = Object.fromEntries(['opening', 'middlegame', 'endgame'].map((phase) => [phase, row.scenarios.filter((item) => item.phase === phase).length]));
    if (row.scenarios.length < Math.min(8, positions.length)) errors.push(bot.id + ': too few valid surprise scenarios (' + row.scenarios.length + '/' + positions.length + ')');
    if (['opening', 'middlegame', 'endgame'].some((phase) => row.phaseCoverage[phase] === 0)) errors.push(bot.id + ': missing surprise scenario phase coverage');
    results.push(row);
    console.log(bot.id + ': ' + row.scenarios.length + ' surprise scenarios; phase coverage ' + JSON.stringify(row.phaseCoverage));
  }
} finally {
  Math.random = originalRandom;
}
const report = {
  status: errors.length ? 'failed' : 'passed',
  checkedAt: new Date().toISOString(),
  method: 'For each phase-balanced held-out position, replay the source PGN to the position before the historical opponent move, substitute a different legal opponent move, then test whether the historical-player bot returns a legal response at fixed search depth ' + depth + '.',
  depth,
  historicalProfiles: bots.length,
  scenarios: results.reduce((sum, row) => sum + row.scenarios.length, 0),
  results,
  errors,
  limitations: [
    'Surprise moves are deterministic legal alternatives chosen for reproducibility; they are experimental and not historical moves.',
    'Legal response and the fact that a response exists do not alone prove stylistic authenticity or chess strength.',
    'Historical-move overlap is recorded only when the original response remains legal; compare these results with holdout and Stockfish reports.',
  ],
};
const out = resolve('artifacts/historical-surprise');
await mkdir(out, { recursive: true });
await writeFile(resolve(out, 'summary.json'), JSON.stringify(report, null, 2) + '\n');
const lines = [
  '# Historical bot surprise-move test', '',
  '- Status: **' + report.status + '**',
  '- Historical profiles: ' + report.historicalProfiles,
  '- Valid surprise scenarios: ' + report.scenarios,
  '- Search depth: ' + depth,
  '- Method: ' + report.method, '',
  '| Bot | Scenarios | Opening | Middlegame | Endgame | Errors |',
  '|---|---:|---:|---:|---:|---:|',
  ...results.map((row) => '| ' + row.name + ' | ' + row.scenarios.length + ' | ' + row.phaseCoverage.opening + ' | ' + row.phaseCoverage.middlegame + ' | ' + row.phaseCoverage.endgame + ' | ' + row.errors.length + ' |'),
  '', '## Scenario details', '',
  ...results.flatMap((row) => row.scenarios.map((scenario) => '- **' + row.name + '** · ' + scenario.phase + ' · ' + scenario.gameId + ': original opponent ' + scenario.historicalOpponentMove + ', surprise opponent ' + scenario.surpriseOpponentMove + ', bot response ' + scenario.botResponse + (scenario.originalHistoricalResponseStillLegal ? (scenario.botRepeatedHistoricalResponse ? ' (repeated original historical response)' : ' (different response although original move remained legal)') : ' (original response not legal in changed position)') + '. Experimental, not historical.')),
  '', '## Errors', '', ...(errors.length ? errors.map((error) => '- ' + error) : ['None.']), '',
  '## Limitations', '', ...report.limitations.map((line) => '- ' + line), ''
];
await writeFile(resolve(out, 'summary.md'), lines.join('\n'));
assert.equal(errors.length, 0, errors.slice(0, 40).join('\n'));
console.log('PASS: ' + report.scenarios + ' surprise responses across ' + bots.length + ' historical bots.');

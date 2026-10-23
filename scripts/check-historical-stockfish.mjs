import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';
import { Chess } from '../public/vendor/veyra-rules/chess-compat.js';
import { chooseBotMove } from '../dist/src/bot-engine.js';

const manifest = JSON.parse(await readFile('public/data/bots/index.json', 'utf8'));
const requestedIds = String(process.env.HISTORICAL_BOT_IDS || '').split(',').map((value) => value.trim()).filter(Boolean);
const historical = manifest.filter((bot) => bot.sourceFile && (!requestedIds.length || requestedIds.includes(bot.id)));
assert.ok(historical.length > 0, 'No historical PGN-backed profiles selected');
for (const id of requestedIds) assert.ok(historical.some((bot) => bot.id === id), 'Requested historical bot is missing: ' + id);
const depth = Number(process.env.STOCKFISH_DEPTH || 8);
const sampleSize = Number(process.env.STOCKFISH_POSITIONS_PER_BOT || 4);
const searchTimeoutMs = Number(process.env.STOCKFISH_SEARCH_TIMEOUT_MS || 30000);
if (!Number.isInteger(searchTimeoutMs) || searchTimeoutMs < 1000) throw new Error('STOCKFISH_SEARCH_TIMEOUT_MS must be an integer >= 1000');
async function findEngine() {
  for (const candidate of ['/usr/games/stockfish', '/usr/bin/stockfish']) {
    if (await access(candidate).then(() => true).catch(() => false)) return candidate;
  }
  if (process.platform === 'linux' && process.env.CI) {
    for (const args of [['apt-get', 'update'], ['apt-get', 'install', '-y', 'stockfish']]) {
      const result = spawnSync('sudo', args, { stdio: 'inherit' });
      if (result.status !== 0) throw new Error('Could not install Stockfish in CI: sudo ' + args.join(' '));
    }
    for (const candidate of ['/usr/games/stockfish', '/usr/bin/stockfish']) {
      if (await access(candidate).then(() => true).catch(() => false)) return candidate;
    }
  }
  throw new Error('Stockfish is required for this quality gate. Install Stockfish or run in a Linux CI runner.');
}
const enginePath = await findEngine();
const engine = spawn(enginePath, [], { stdio: ['pipe', 'pipe', 'inherit'] });
const rl = createInterface({ input: engine.stdout });
let currentSearch = null;
let resolveUci = null;
let resolveReady = null;
let lastExit = null;
engine.on('exit', (code) => {
  lastExit = code;
  if (currentSearch) {
    currentSearch.reject(new Error('Stockfish exited during search: ' + code));
    currentSearch = null;
  }
});
rl.on('line', (line) => {
  if (line === 'uciok' && resolveUci) { const done = resolveUci; resolveUci = null; done(); }
  if (line === 'readyok' && resolveReady) { const done = resolveReady; resolveReady = null; done(); }
  if (currentSearch) {
    currentSearch.lines.push(line);
    if (line.startsWith('bestmove ')) {
      const active = currentSearch;
      currentSearch = null;
      active.resolve(active.lines);
    }
  }
});
const sendReady = () => new Promise((resolvePromise, reject) => {
  if (lastExit !== null) return reject(new Error('Stockfish process has exited: ' + lastExit));
  resolveReady = resolvePromise;
  engine.stdin.write('isready\n');
});
const uciReady = new Promise((resolvePromise, reject) => {
  const timer = setTimeout(() => reject(new Error('Stockfish did not answer uciok')), 10000);
  resolveUci = () => { clearTimeout(timer); resolvePromise(); };
  engine.stdin.write('uci\n');
});
await uciReady;
engine.stdin.write('setoption name Threads value 1\n');
engine.stdin.write('setoption name Hash value 128\n');
await sendReady();

function scoreFromInfo(lines) {
  const infos = lines.filter((line) => line.startsWith('info depth ') && line.includes(' score ') && !line.includes(' lowerbound') && !line.includes(' upperbound'));
  let chosen = null;
  for (const line of infos) {
    const depthMatch = line.match(/\bdepth (\d+)/);
    const scoreMatch = line.match(/\bscore (cp|mate) (-?\d+)/);
    if (!depthMatch || !scoreMatch) continue;
    const currentDepth = Number(depthMatch[1]);
    const raw = Number(scoreMatch[2]);
    const cp = scoreMatch[1] === 'cp' ? raw : raw > 0 ? 100000 - Math.abs(raw) * 100 : -100000 + Math.abs(raw) * 100;
    if (!chosen || currentDepth >= chosen.depth) chosen = { depth: currentDepth, cp };
  }
  return chosen;
}
async function analyze(fen, onlyMove = null) {
  await sendReady();
  const lines = await new Promise((resolvePromise, reject) => {
    if (currentSearch) return reject(new Error('Stockfish search overlap'));
    const token = Symbol('stockfish-search');
    const timer = setTimeout(() => {
      if (currentSearch?.token !== token) return;
      const active = currentSearch;
      currentSearch = null;
      engine.stdin.write('stop\n');
      active.reject(new Error('Stockfish search exceeded ' + searchTimeoutMs + 'ms (target depth ' + depth + ') for FEN: ' + fen));
    }, searchTimeoutMs);
    currentSearch = {
      token,
      lines: [],
      resolve: (searchLines) => { clearTimeout(timer); resolvePromise(searchLines); },
      reject: (error) => { clearTimeout(timer); reject(error); },
    };
    engine.stdin.write('position fen ' + fen + '\n');
    engine.stdin.write(onlyMove ? 'go searchmoves ' + onlyMove + ' depth ' + depth + '\n' : 'go depth ' + depth + '\n');
  });
  const bestLine = lines.find((line) => line.startsWith('bestmove ')) || '';
  const bestMove = bestLine.split(/\s+/)[1] || '';
  const score = scoreFromInfo(lines);
  if (!bestMove || !score) throw new Error('Stockfish returned no usable score at depth ' + depth + ' for FEN: ' + fen);
  return { bestMove, score: score.cp, searchedDepth: score.depth };
}
const uci = (move) => move.from + move.to + (move.promotion || '');
function selectedSample(positions) {
  const selected = [];
  for (const phase of ['opening', 'middlegame', 'endgame']) {
    const group = positions.filter((position) => position.phase === phase);
    if (group.length) selected.push(group[Math.floor(group.length / 2)]);
  }
  for (const position of positions) {
    if (selected.length >= Math.min(sampleSize, positions.length)) break;
    if (!selected.includes(position)) selected.push(position);
  }
  return selected.slice(0, sampleSize);
}
const results = [], errors = [];
const originalRandom = Math.random;
Math.random = () => 0.99;
try {
  for (const bot of historical) {
    const positions = selectedSample(bot.holdoutPositions || []);
    const row = {
      id: bot.id, name: bot.name, sourceFile: bot.sourceFile, positions: positions.length,
      exactEngineMatches: 0, exactHistoricalMoveMatches: 0, averageCentipawnLoss: 0, maxCentipawnLoss: 0,
      blunders300cpOrMore: 0, highPrecisionMoves20cpOrLess: 0, soundSacrificeCandidates: 0, details: [],
    };
    let totalLoss = 0;
    for (const position of positions) {
      const game = new Chess(position.fen);
      if (game.turn() !== position.side) { errors.push(bot.id + '/' + position.gameId + ': wrong side to move'); continue; }
      const chosen = chooseBotMove(game, bot, Chess);
      if (!chosen) { errors.push(bot.id + '/' + position.gameId + ': no bot move'); continue; }
      const candidate = uci(chosen);
      try {
        const best = await analyze(position.fen);
        const constrained = await analyze(position.fen, candidate);
        const loss = Math.max(0, best.score - constrained.score);
        if (candidate === best.bestMove) row.exactEngineMatches += 1;
        if (candidate === position.sourceMove) row.exactHistoricalMoveMatches += 1;
        totalLoss += loss;
        row.maxCentipawnLoss = Math.max(row.maxCentipawnLoss, loss);
        if (loss >= 300) row.blunders300cpOrMore += 1;
        if (loss <= 20) row.highPrecisionMoves20cpOrLess += 1;
        const movedPiece = game.get(chosen.from);
        const applied = game.move({ from: chosen.from, to: chosen.to, promotion: chosen.promotion || undefined });
        if (!applied) { errors.push(bot.id + '/' + position.gameId + ': bot move was illegal'); continue; }
        const canBeTaken = movedPiece && movedPiece.type !== 'p' && game.moves({ verbose: true }).some((move) => move.to === chosen.to && move.captured);
        if (canBeTaken && !chosen.captured && loss <= 50) row.soundSacrificeCandidates += 1;
        row.details.push({
          gameId: position.gameId, phase: position.phase, historicalMove: position.sourceMove,
          botMove: candidate, stockfishBestMove: best.bestMove, engineMatch: candidate === best.bestMove,
          bestScoreCp: best.score, candidateScoreCp: constrained.score, centipawnLoss: loss,
          searchedDepth: Math.min(best.searchedDepth, constrained.searchedDepth),
          soundSacrificeCandidate: Boolean(canBeTaken && !chosen.captured && loss <= 50),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(bot.id + '/' + position.gameId + ': ' + message);
        row.details.push({ gameId: position.gameId, phase: position.phase, historicalMove: position.sourceMove, botMove: candidate, error: message });
        console.error(bot.id + '/' + position.gameId + ': ' + message);
      }
    }
    const completedDetails = row.details.filter((detail) => Number.isFinite(detail.centipawnLoss));
    row.completedPositions = completedDetails.length;
    row.averageCentipawnLoss = Number((totalLoss / Math.max(1, completedDetails.length)).toFixed(1));
    row.engineMoveOverlapPercent = Number((100 * row.exactEngineMatches / Math.max(1, completedDetails.length)).toFixed(1));
    row.historicalMoveOverlapPercent = Number((100 * row.exactHistoricalMoveMatches / Math.max(1, completedDetails.length)).toFixed(1));
    if (row.averageCentipawnLoss > 250 || row.blunders300cpOrMore > Math.max(2, Math.floor(row.positions * 0.25))) {
      errors.push(bot.id + ': Stockfish quality gate failed (average loss ' + row.averageCentipawnLoss + ' cp; blunders ' + row.blunders300cpOrMore + '/' + row.positions + ')');
    }
    results.push(row);
    console.log(bot.id + ': ' + row.engineMoveOverlapPercent + '% exact Stockfish move overlap; average loss ' + row.averageCentipawnLoss + ' cp; ' + row.soundSacrificeCandidates + ' sound sacrifice candidates');
  }
} finally {
  Math.random = originalRandom;
  engine.stdin.write('quit\n');
  engine.kill();
}
const report = {
  status: errors.length ? 'failed' : 'passed',
  checkedAt: new Date().toISOString(),
  engine: 'Stockfish UCI',
  depth,
  searchTimeoutMs,
  sampleSizePerHistoricalBot: sampleSize,
  historicalProfiles: historical.length,
  positionsChecked: results.reduce((sum, row) => sum + row.details.length, 0),
  results,
  errors,
  limitations: [
    'Engine-move overlap and centipawn loss measure move quality, not identity of style.',
    'A sound sacrifice candidate is a non-pawn piece that can be captured immediately while the engine estimates a loss of at most 50 cp; this is a review signal, not an automatic claim that a move is brilliant.',
    'Only a reproducible sample of held-out positions is checked here; full game analysis is still needed for stronger claims.',
  ],
};
const out = resolve('artifacts/historical-stockfish');
await mkdir(out, { recursive: true });
await writeFile(resolve(out, 'summary.json'), JSON.stringify(report, null, 2) + '\n');
const md = [
  '# Historical bot Stockfish quality report', '',
  '- Status: **' + report.status + '**',
  '- Engine: ' + report.engine + ', depth ' + depth,
  '- Per-search timeout: ' + searchTimeoutMs + ' ms',
  '- Historical bots: ' + report.historicalProfiles,
  '- Held-out positions checked: ' + report.positionsChecked, '',
  '| Bot | Positions | Historical move overlap | Engine overlap | Average loss (cp) | Max loss (cp) | Blunders ≥300 cp | Sound sacrifice candidates |',
  '|---|---:|---:|---:|---:|---:|---:|---:|',
  ...results.map((row) => '| ' + row.name + ' | ' + row.details.length + ' | ' + row.historicalMoveOverlapPercent + '% | ' + row.engineMoveOverlapPercent + '% | ' + row.averageCentipawnLoss + ' | ' + row.maxCentipawnLoss + ' | ' + row.blunders300cpOrMore + ' | ' + row.soundSacrificeCandidates + ' |'),
  '', '## Errors', '', ...(errors.length ? errors.map((error) => '- ' + error) : ['None.']), '',
  '## Limitations', '', ...report.limitations.map((line) => '- ' + line), '',
];
await writeFile(resolve(out, 'summary.md'), md.join('\n'));
const holdoutOut = resolve('artifacts/historical-holdout');
await mkdir(holdoutOut, { recursive: true });
await writeFile(resolve(holdoutOut, 'stockfish-summary.json'), JSON.stringify(report, null, 2) + '\n');
await writeFile(resolve(holdoutOut, 'stockfish-summary.md'), md.join('\n'));
assert.equal(errors.length, 0, errors.slice(0, 30).join('\n'));
console.log('PASS: Stockfish quality gate passed for ' + report.positionsChecked + ' held-out positions across ' + historical.length + ' historical bots.');

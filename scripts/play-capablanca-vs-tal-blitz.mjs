import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { Chess } from '../public/vendor/veyra-rules/chess-compat.js';
import { chooseBotMove } from '../dist/src/bot-engine.js';

const manifest = JSON.parse(await readFile('public/data/bots/index.json', 'utf8'));
const capablanca = manifest.find((bot) => bot.id === 'capablanca');
const tal = manifest.find((bot) => bot.id === 'tal');
assert.ok(capablanca, 'Capablanca bot missing from manifest');
assert.ok(tal, 'Tal bot missing from manifest');

// Fast-blitz profile: preserve Capablanca's openings/style but cap search at depth 3.
const capablancaBlitz = { ...capablanca, elo: Math.min(capablanca.elo || 2300, 2300) };
const talBlitz = { ...tal };

const originalRandom = Math.random;
Math.random = () => 0.99;
const game = new Chess();
const sanMoves = [];
const startedAt = Date.now();
const deadline = startedAt + 210_000;
let plies = 0;
const outputDir = 'artifacts/capablanca-vs-tal';

function resultOf(position) {
  if (position.isCheckmate()) return position.turn() === 'w' ? '0-1' : '1-0';
  if (position.isStalemate?.() || position.isDraw()) return '1/2-1/2';
  return '*';
}
function renderPgn(result) {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '.');
  const headers = [
    '[Event "Veyra Chess: Capablanca vs Tal (Blitz test)"]',
    '[Site "GitHub Actions"]',
    `[Date "${date}"]`,
    '[Round "1"]',
    `[White "${capablanca.name}"]`,
    `[Black "${tal.name}"]`,
    `[Result "${result}"]`,
    '[TimeControl "180+0"]',
    '[Annotator "Capablanca profile, depth capped at 3 for fast blitz"]',
    `[Termination "${result === '*' ? 'test limit reached' : 'normal'}"]`,
  ];
  const movetext = [];
  for (let i = 0; i < sanMoves.length; i += 2) {
    movetext.push(`${Math.floor(i / 2) + 1}. ${sanMoves[i]}`);
    if (sanMoves[i + 1]) movetext.push(sanMoves[i + 1]);
  }
  movetext.push(result);
  return headers.join('\n') + '\n\n' + movetext.join(' ') + '\n';
}
async function saveArtifacts(result) {
  await mkdir(outputDir, { recursive: true });
  await writeFile(`${outputDir}/capablanca-vs-tal.pgn`, renderPgn(result), 'utf8');
  await writeFile(`${outputDir}/result.json`, JSON.stringify({
    passed: result !== '*',
    result,
    plies,
    moves: sanMoves.length,
    white: capablanca.name,
    black: tal.name,
    elapsedMs: Date.now() - startedAt,
    searchMode: 'Capablanca profile with depth capped at 3 for fast blitz',
    pgn: 'capablanca-vs-tal.pgn'
  }, null, 2) + '\n', 'utf8');
}

let result = resultOf(game);
try {
  await saveArtifacts(result);
  while (result === '*' && plies < 160 && Date.now() < deadline) {
    const bot = game.turn() === 'w' ? capablancaBlitz : talBlitz;
    const move = chooseBotMove(game, bot, Chess);
    assert.ok(move, `${bot.name} returned no legal move on ply ${plies + 1}`);
    const applied = game.move({ from: move.from, to: move.to, promotion: move.promotion });
    assert.ok(applied, `${bot.name} returned an illegal move on ply ${plies + 1}`);
    sanMoves.push(applied.san);
    plies += 1;
    result = resultOf(game);
    if (plies % 4 === 0 || result !== '*') await saveArtifacts(result);
  }
  await saveArtifacts(result);
} finally {
  Math.random = originalRandom;
}

console.log(`Match: ${capablanca.name} vs ${tal.name}`);
console.log(`Result: ${result}; plies: ${plies}; elapsed: ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
console.log(renderPgn(result));
assert.ok(result !== '*', 'Game did not reach a natural terminal result before the 160-ply / time limit; inspect the PGN artifact.');

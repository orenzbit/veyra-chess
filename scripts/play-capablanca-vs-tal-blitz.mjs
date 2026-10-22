import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { Chess } from '../public/vendor/veyra-rules/chess-compat.js';
import { chooseBotMove } from '../dist/src/bot-engine.js';

const manifest = JSON.parse(await (await import('node:fs/promises')).readFile('public/data/bots/index.json', 'utf8'));
const capablanca = manifest.find((bot) => bot.id === 'capablanca');
const tal = manifest.find((bot) => bot.id === 'tal');
assert.ok(capablanca, 'Capablanca bot missing from manifest');
assert.ok(tal, 'Tal bot missing from manifest');

const originalRandom = Math.random;
Math.random = () => 0.99;
const game = new Chess();
const sanMoves = [];
const startedAt = Date.now();
const deadline = startedAt + 220_000;
let plies = 0;

function resultOf(position) {
  if (position.isCheckmate()) return position.turn() === 'w' ? '0-1' : '1-0';
  if (position.isStalemate?.() || position.isDraw()) return '1/2-1/2';
  return '*';
}

let result = resultOf(game);
try {
  while (result === '*' && plies < 160 && Date.now() < deadline) {
    const bot = game.turn() === 'w' ? capablanca : tal;
    const move = chooseBotMove(game, bot, Chess);
    assert.ok(move, `${bot.name} returned no legal move on ply ${plies + 1}`);
    const applied = game.move({ from: move.from, to: move.to, promotion: move.promotion });
    assert.ok(applied, `${bot.name} returned an illegal move on ply ${plies + 1}`);
    sanMoves.push(applied.san);
    plies += 1;
    result = resultOf(game);
  }
} finally {
  Math.random = originalRandom;
}

const finished = result !== '*';
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
  `[Termination "${finished ? 'normal' : 'test limit reached'}"]`,
];
const movetext = [];
for (let i = 0; i < sanMoves.length; i += 2) {
  movetext.push(`${Math.floor(i / 2) + 1}. ${sanMoves[i]}`);
  if (sanMoves[i + 1]) movetext.push(sanMoves[i + 1]);
}
movetext.push(result);
const pgn = headers.join('\n') + '\n\n' + movetext.join(' ') + '\n';
await mkdir('artifacts/capablanca-vs-tal', { recursive: true });
await writeFile('artifacts/capablanca-vs-tal/capablanca-vs-tal.pgn', pgn, 'utf8');
await writeFile('artifacts/capablanca-vs-tal/result.json', JSON.stringify({
  passed: finished,
  result,
  plies,
  moves: sanMoves.length,
  white: capablanca.name,
  black: tal.name,
  elapsedMs: Date.now() - startedAt,
  pgn: 'capablanca-vs-tal.pgn'
}, null, 2) + '\n', 'utf8');
console.log(`Match: ${capablanca.name} vs ${tal.name}`);
console.log(`Result: ${result}; plies: ${plies}; elapsed: ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
console.log(pgn);
assert.ok(finished, 'Game did not reach a natural terminal result before the 160-ply / time limit; inspect the PGN artifact.');

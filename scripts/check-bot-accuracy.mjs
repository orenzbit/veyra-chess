import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Chess } from '../public/vendor/veyra-rules/chess-compat.js';
import { chooseBotMove } from '../dist/src/bot-engine.js';

const manifest = JSON.parse(await readFile('public/data/bots/index.json', 'utf8'));
const positions = [
  { label: 'white mate in one', fen: '7k/5Q2/6K1/8/8/8/8/8 w - - 0 1' },
  { label: 'black mate in one', fen: '8/8/8/8/8/6k1/5q2/7K b - - 0 1' },
];

const repertoireErrors = [];
let repertoireLines = 0;
for (const bot of manifest) {
  for (const key of ['openingsAsWhite', 'openingsAsBlack', 'gambits']) {
    for (const line of bot[key] || []) {
      repertoireLines += 1;
      const game = new Chess();
      const tokens = String(line.moves || '').replace(/\d+\.(?:\.\.)?/g, ' ').split(/\\s+/).filter(Boolean);
      for (const token of tokens) {
        try {
          if (!game.move(token, { sloppy: true })) {
            repertoireErrors.push(`${bot.slug} / ${key} / ${line.name}: illegal SAN ${token}`);
            break;
          }
        } catch {
          repertoireErrors.push(`${bot.slug} / ${key} / ${line.name}: invalid SAN ${token}`);
          break;
        }
      }
    }
  }
}
console.log(`Opening repertoire validation: ${repertoireLines - repertoireErrors.length}/${repertoireLines} lines legal`);
assert.equal(repertoireErrors.length, 0, repertoireErrors.slice(0, 20).join('\n'));

for (const position of positions) {
  const game = new Chess(position.fen);
  const hasMate = game.moves({ verbose: true }).some(move => {
    const next = new Chess(game.fen());
    next.move(move);
    return next.isCheckmate();
  });
  assert.ok(hasMate, `Benchmark position has no mate in one: ${position.label}`);
}

const originalRandom = Math.random;
let total = 0;
let matesFound = 0;
const failures = [];
try {
  // Deterministic search test: disable intentional low-Elo randomness and score noise.
  Math.random = () => 0.99;
  for (const bot of manifest) {
    for (const position of positions) {
      const game = new Chess(position.fen);
      const move = chooseBotMove(game, bot, Chess);
      total += 1;
      if (!move) {
        failures.push(`${bot.slug} / ${position.label}: no move returned`);
        continue;
      }
      const applied = game.move({ from: move.from, to: move.to, promotion: move.promotion });
      if (!applied) {
        failures.push(`${bot.slug} / ${position.label}: illegal move returned`);
        continue;
      }
      if (game.isCheckmate()) matesFound += 1;
      else failures.push(`${bot.slug} / ${position.label}: missed available mate in one`);
    }
  }
} finally {
  Math.random = originalRandom;
}

const accuracy = total ? matesFound / total : 0;
console.log(`Mate-in-one benchmark: ${matesFound}/${total} (${(accuracy * 100).toFixed(1)}%)`);
if (accuracy < 0.9) {
  console.error(failures.slice(0, 20).join('\n'));
  throw new Error(`Required 90% tactical benchmark accuracy; got ${(accuracy * 100).toFixed(1)}%`);
}
assert.equal(failures.length, 0, failures.slice(0, 20).join('\n'));
console.log('PASS: all 50 bots found mate in one in both deterministic benchmark positions.');

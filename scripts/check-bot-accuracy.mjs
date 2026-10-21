import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Chess } from '../public/vendor/veyra-rules/chess-compat.js';
import { chooseBotMove } from '../dist/src/bot-engine.js';

const manifest = JSON.parse(await readFile('public/data/bots/index.json', 'utf8'));
const puzzleSeed = JSON.parse(await readFile('data/puzzle-seed.json', 'utf8'));
const benchmarkPuzzles = puzzleSeed.puzzles.filter((_, index) => index % 2 === 0);
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
      const tokens = String(line.moves || '').replace(/\d+\.(?:\.\.)?/g, ' ').split(/\s+/).filter(Boolean);
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

const grandmasters = manifest.filter(bot => bot.stage === 'grandmaster');
assert.ok(grandmasters.length > 0, 'No grandmaster bots found');
let puzzleTotal = 0;
let puzzleHits = 0;
const puzzleFailures = [];
for (const puzzle of benchmarkPuzzles) {
  const expected = puzzle.solution?.[0];
  assert.ok(expected, `Missing solution for puzzle ${puzzle.id}`);
  const solutionCheck = new Chess(puzzle.fen);
  const legalSolution = solutionCheck.move({
    from: expected.slice(0, 2),
    to: expected.slice(2, 4),
    promotion: expected.slice(4) || undefined,
  });
  assert.ok(legalSolution, `Seed solution is illegal for puzzle ${puzzle.id}: ${expected}`);
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
  for (const bot of grandmasters) {
    for (const puzzle of puzzleSeed.puzzles) {
      const expected = puzzle.solution[0];
      const game = new Chess(puzzle.fen);
      const move = chooseBotMove(game, bot, Chess);
      puzzleTotal += 1;
      if (!move) {
        puzzleFailures.push(`${bot.slug} / ${puzzle.id}: no move returned`);
        continue;
      }
      const applied = game.move({ from: move.from, to: move.to, promotion: move.promotion });
      if (!applied) {
        puzzleFailures.push(`${bot.slug} / ${puzzle.id}: illegal move returned`);
        continue;
      }
      const uci = move.from + move.to + (move.promotion || '');
      if (uci === expected) puzzleHits += 1;
      else puzzleFailures.push(`${bot.slug} / ${puzzle.id}: expected ${expected}, got ${uci}`);
    }
  }
} finally {
  Math.random = originalRandom;
}

const accuracy = total ? matesFound / total : 0;
const puzzleAccuracy = puzzleTotal ? puzzleHits / puzzleTotal : 0;
console.log(`Mate-in-one benchmark: ${matesFound}/${total} (${(accuracy * 100).toFixed(1)}%) across ${positions.length} positions and ${manifest.length} bots`);
console.log(`Grandmaster puzzle benchmark: ${puzzleHits}/${puzzleTotal} (${(puzzleAccuracy * 100).toFixed(1)}%) across ${benchmarkPuzzles.length} seeded puzzles and ${grandmasters.length} grandmaster bots`);
if (accuracy < 0.9) {
  console.error(failures.slice(0, 20).join('\n'));
  throw new Error(`Required 90% mate-in-one benchmark accuracy; got ${(accuracy * 100).toFixed(1)}%`);
}
if (puzzleAccuracy < 0.9) {
  console.error(puzzleFailures.slice(0, 30).join('\n'));
  throw new Error(`Required 90% grandmaster puzzle accuracy; got ${(puzzleAccuracy * 100).toFixed(1)}%`);
}
assert.equal(failures.length, 0, failures.slice(0, 20).join('\n'));
console.log(`PASS: all ${manifest.length} bots found mate in one across all ${positions.length} deterministic benchmark positions.`);

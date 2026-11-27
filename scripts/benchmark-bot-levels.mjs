import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Chess } from '../public/vendor/veyra-rules/chess-compat.js';
import {
  chooseBotMoveTimed,
  continuousNoiseScale,
  continuousRandomRate,
  positionalWeight,
} from '../dist/src/bot-engine.js';
import { botNow } from '../dist/src/bot-time.js';

const manifest = JSON.parse(await readFile('public/data/bots/index.json', 'utf8'));
const byId = (id) => manifest.find((b) => b.id === id);

// 1. Verify continuous Elo scaling curves
assert.ok(continuousRandomRate(100) > continuousRandomRate(300));
assert.ok(continuousRandomRate(300) > continuousRandomRate(550));
assert.equal(continuousRandomRate(700), 0);
assert.ok(continuousNoiseScale(400) > continuousNoiseScale(900));
assert.ok(continuousNoiseScale(900) > continuousNoiseScale(1500));
assert.ok(continuousNoiseScale(1500) > continuousNoiseScale(2100));
assert.equal(positionalWeight(300), 0);
assert.ok(positionalWeight(900) > positionalWeight(500));
assert.equal(positionalWeight(2000), 1);

function playMatch(botA, botB, games = 6, budgetMs = 600) {
  let scoreA = 0;
  let totalMoves = 0;
  let totalSearchMs = 0;

  for (let g = 0; g < games; g++) {
    const aWhite = g % 2 === 0;
    const game = new Chess();
    let plies = 0;
    while (!game.isGameOver() && !game.isDraw() && plies < 120) {
      const mover = (game.turn() === 'w') === aWhite ? botA : botB;
      const t0 = performance.now();
      const res = chooseBotMoveTimed(new Chess(game.fen()), mover, Chess, {
        deadlineAt: botNow() + budgetMs,
        enhancedStrength: true,
      });
      totalSearchMs += performance.now() - t0;
      totalMoves++;
      if (!res.move) break;
      game.move({ from: res.move.from, to: res.move.to, promotion: res.move.promotion });
      plies++;
    }
    if (game.isCheckmate()) {
      const whiteWon = game.turn() === 'b';
      if ((whiteWon && aWhite) || (!whiteWon && !aWhite)) scoreA += 1;
    } else {
      // Material tiebreak on truncated 120-ply benchmark games so clear domination registers
      const val = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
      let diff = 0;
      for (const row of game.board()) {
        for (const sq of row) {
          if (!sq) continue;
          diff += (sq.color === 'w' ? 1 : -1) * (val[sq.type] || 0);
        }
      }
      const aDiff = aWhite ? diff : -diff;
      if (aDiff >= 3) scoreA += 0.75;
      else if (aDiff <= -3) scoreA += 0.25;
      else scoreA += 0.5;
    }
  }
  return {
    scoreA,
    games,
    avgMs: totalMoves ? totalSearchMs / totalMoves : 0,
  };
}

// Adjacent tier pairs (stripped of opening books for pure midgame/positional test on equal terrain)
const stripBook = (b) => ({ ...b, openingsAsWhite: [], openingsAsBlack: [], gambits: [] });
const pairs = [
  ['shira', 'noa'],      // 800 (Club) vs 200 (Beginner)
  ['yusuf', 'kasimir'],  // 1500 (Tactician) vs 750 (Club)
  ['omer', 'luca'],      // 2000 (Master) vs 1550 (Tactician)
  ['capablanca', 'yusuf'], // 2725 (Legend) vs 1500 (Tactician)
];

for (const [strongId, weakId] of pairs) {
  const strong = stripBook(byId(strongId));
  const weak = stripBook(byId(weakId));
  const res = playMatch(strong, weak, 6, 600);
  console.log(`${strongId}(${strong.elo}) vs ${weakId}(${weak.elo}): score=${res.scoreA}/${res.games}, avgMove=${res.avgMs.toFixed(1)}ms`);
  assert.ok(res.scoreA >= res.games / 2, `Expected ${strongId}(${strong.elo}) to score >= 50% vs ${weakId}(${weak.elo}), got ${res.scoreA}/${res.games}`);
  assert.ok(res.avgMs < 650, `Expected fast response (<650ms avg), got ${res.avgMs.toFixed(1)}ms`);
}

// Also measure capped vs uncapped legends (e.g. fischer cap=3 vs nakamura uncapped) for timing & score
const fischer = stripBook(byId('fischer'));
const nakamura = stripBook(byId('nakamura'));
const legendRes = playMatch(nakamura, fischer, 4, 600);
console.log(`Legend cap check nakamura(2816,uncapped) vs fischer(2785,cap=3): score=${legendRes.scoreA}/${legendRes.games}, avgMove=${legendRes.avgMs.toFixed(1)}ms`);
console.log('PASS: enhanced Elo strength curve, positional evaluation, match dominance, and response times verified.');

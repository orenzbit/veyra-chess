import assert from 'node:assert/strict';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Chess } from '../public/vendor/veyra-rules/chess-compat.js';
import { chooseBotMove } from '../dist/src/bot-engine.js';
import { chromium } from 'playwright';

const OUT = 'games/capablanca-vs-tal';
const DATE = process.env.CAPABLANCA_MATCH_DATE || '2026.10.22';
const MAX_PLIES = 300;
const manifest = JSON.parse(await readFile('public/data/bots/index.json', 'utf8'));
const capablanca = manifest.find((bot) => bot.id === 'capablanca');
const tal = manifest.find((bot) => bot.id === 'tal');
assert.ok(capablanca, 'Capablanca bot missing from manifest');
assert.ok(tal, 'Tal-inspired bot missing from manifest');

const matches = [
  { round: 1, white: capablanca, black: tal, stem: 'capablanca-white' },
  { round: 2, white: tal, black: capablanca, stem: 'capablanca-black' },
];

function outcomeFor(game, reachedLimit) {
  if (game.isCheckmate()) return { result: game.turn() === 'w' ? '0-1' : '1-0', termination: 'checkmate' };
  if (game.isStalemate()) return { result: '1/2-1/2', termination: 'stalemate' };
  if (game.isDraw() || game.isThreefoldRepetition() || game.isInsufficientMaterial()) return { result: '1/2-1/2', termination: 'draw' };
  if (reachedLimit) return { result: '*', termination: '300-ply safety limit' };
  return { result: '*', termination: 'unfinished' };
}

function makePgn(match, moves, outcome) {
  const headers = [
    ['Event', 'Veyra Chess Capablanca vs Tal-inspired Bot'],
    ['Site', 'Veyra Chess deterministic bot simulation'],
    ['Date', DATE],
    ['Round', String(match.round)],
    ['White', match.white.id === 'capablanca' ? 'Capablanca-inspired bot' : 'Tal-inspired bot'],
    ['Black', match.black.id === 'capablanca' ? 'Capablanca-inspired bot' : 'Tal-inspired bot'],
    ['Result', outcome.result],
    ['Termination', outcome.termination],
    ['PlyCount', String(moves.length)],
    ['Annotator', 'Veyra Chess bot-vs-bot simulation'],
  ];
  const headerText = headers.map(([key, value]) => '[' + key + ' "' + value + '"]').join('\n');
  const sanText = moves.map((move, index) => index % 2 === 0
    ? (Math.floor(index / 2) + 1) + '. ' + move.san
    : move.san).join(' ');
  return headerText + '\n\n' + sanText + ' ' + outcome.result + '\n';
}

function svgForFen(fen, title, result, whiteName, blackName, plies) {
  const rows = fen.split(' ')[0].split('/');
  const glyphs = { K:'♔', Q:'♕', R:'♖', B:'♗', N:'♘', P:'♙', k:'♚', q:'♛', r:'♜', b:'♝', n:'♞', p:'♟' };
  const shapes = [];
  const labels = [];
  for (let rank = 0; rank < 8; rank += 1) {
    let file = 0;
    for (const char of rows[rank]) {
      if (/^[1-8]$/.test(char)) {
        const count = Number(char);
        for (let empty = 0; empty < count; empty += 1, file += 1) {
          const x = 34 + file * 60, y = 78 + rank * 60;
          shapes.push('<rect x="' + x + '" y="' + y + '" width="60" height="60" fill="' + ((rank + file) % 2 === 0 ? '#f0d9b5' : '#b58863') + '"/>');
        }
      } else {
        const x = 34 + file * 60, y = 78 + rank * 60;
        shapes.push('<rect x="' + x + '" y="' + y + '" width="60" height="60" fill="' + ((rank + file) % 2 === 0 ? '#f0d9b5' : '#b58863') + '"/>');
        const isWhite = char === char.toUpperCase();
        shapes.push('<text x="' + (x + 30) + '" y="' + (y + 43) + '" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="42" fill="' + (isWhite ? '#fffdf5' : '#202733') + '" stroke="' + (isWhite ? '#202733' : '#fffdf5') + '" stroke-width="0.8" paint-order="stroke">' + glyphs[char] + '</text>');
        file += 1;
      }
    }
  }
  for (let i = 0; i < 8; i += 1) {
    labels.push('<text x="' + (64 + i * 60) + '" y="570" font-family="Arial, sans-serif" font-size="13" text-anchor="middle" fill="#4b5563">' + 'abcdefgh'[i] + '</text>');
    labels.push('<text x="22" y="' + (114 + i * 60) + '" font-family="Arial, sans-serif" font-size="13" text-anchor="middle" fill="#4b5563">' + (8 - i) + '</text>');
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" width="548" height="610" viewBox="0 0 548 610">' +
    '<rect width="548" height="610" rx="16" fill="#f8fafc"/>' +
    '<text x="274" y="25" font-family="Arial, sans-serif" font-size="16" font-weight="700" text-anchor="middle" fill="#111827">' + title + '</text>' +
    '<text x="274" y="47" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="#374151">' + whiteName + ' • ' + blackName + '</text>' +
    '<text x="274" y="64" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="#374151">Result: ' + result + ' | ' + plies + ' half-moves | ' + DATE + '</text>' +
    shapes.join('') + labels.join('') + '</svg>';
}

async function simulate(match) {
  const game = new Chess();
  const moves = [];
  const originalRandom = Math.random;
  try {
    Math.random = () => 0.99;
    while (moves.length < MAX_PLIES) {
      if (game.isCheckmate() || game.isStalemate() || game.isDraw() || game.isThreefoldRepetition() || game.isInsufficientMaterial()) break;
      const mover = game.turn() === 'w' ? match.white : match.black;
      const candidate = chooseBotMove(game, mover, Chess);
      assert.ok(candidate, 'No move returned for ' + mover.id + ' at ply ' + (moves.length + 1));
      const applied = game.move({ from: candidate.from, to: candidate.to, promotion: candidate.promotion || undefined });
      assert.ok(applied, 'Illegal move from ' + mover.id + ' at ply ' + (moves.length + 1));
      moves.push(applied);
    }
  } finally {
    Math.random = originalRandom;
  }
  const reachedLimit = moves.length >= MAX_PLIES && !game.isCheckmate() && !game.isStalemate() && !game.isDraw();
  const outcome = outcomeFor(game, reachedLimit);
  return { match, game, moves, outcome, pgn: makePgn(match, moves, outcome) };
}

async function renderPng(svg, path) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 548, height: 610 }, deviceScaleFactor: 1 });
    await page.setContent('<!doctype html><html><body style="margin:0">' + svg + '</body></html>');
    await page.locator('svg').screenshot({ path, type: 'png' });
  } finally {
    await browser.close();
  }
}

function parsePgn(pgn) {
  const headers = Object.fromEntries([...pgn.matchAll(/^\[([A-Za-z]+) "([^"]*)"\]$/gm)].map((m) => [m[1], m[2]]));
  const movetext = pgn.split(/\r?\n\s*\r?\n/).slice(1).join(' ').replace(/\{[^}]*\}/g, ' ').replace(/\([^)]*\)/g, ' ');
  const tokens = movetext.split(/\s+/).map((token) => token.replace(/^\d+\.(?:\.\.\.)?/, '')).filter((token) => token && !/^\d+\.{1,3}$/.test(token) && !['1-0', '0-1', '1/2-1/2', '*'].includes(token));
  const replay = new Chess();
  for (const san of tokens) assert.ok(replay.move(san, { sloppy: true }), 'Illegal SAN in generated PGN: ' + san);
  return { headers, tokens, replay };
}

await mkdir(OUT, { recursive: true });
if (process.argv.includes('--check')) {
  const summary = await readFile(join(OUT, 'README.md'), 'utf8');
  for (const match of matches) {
    const pgnPath = join(OUT, match.stem + '.pgn');
    const pngPath = join(OUT, match.stem + '.png');
    const pgn = await readFile(pgnPath, 'utf8');
    const parsed = parsePgn(pgn);
    assert.equal(parsed.headers.Date, DATE, 'Unexpected match date in ' + pgnPath);
    assert.equal(parsed.headers.Round, String(match.round));
    assert.equal(parsed.headers.White, match.white.id === 'capablanca' ? 'Capablanca-inspired bot' : 'Tal-inspired bot');
    assert.equal(parsed.headers.Black, match.black.id === 'capablanca' ? 'Capablanca-inspired bot' : 'Tal-inspired bot');
    assert.equal(parsed.headers.PlyCount, String(parsed.tokens.length));
    assert.ok(summary.includes(match.stem) && summary.includes(parsed.headers.Result), 'Match summary is missing generated metadata');
    assert.ok((await stat(pngPath)).size > 1000, 'PNG evidence missing or too small: ' + pngPath);
  }
  console.log('PASS: both Capablanca-vs-Tal PGNs replay legally; colors, date, metadata and PNG evidence validated.');
} else {
  const generated = [];
  for (const match of matches) {
    const data = await simulate(match);
    const whiteName = match.white.id === 'capablanca' ? 'Capablanca-inspired bot' : 'Tal-inspired bot';
    const blackName = match.black.id === 'capablanca' ? 'Capablanca-inspired bot' : 'Tal-inspired bot';
    const pgnPath = join(OUT, match.stem + '.pgn');
    const pngPath = join(OUT, match.stem + '.png');
    await writeFile(pgnPath, data.pgn, 'utf8');
    const svg = svgForFen(data.game.fen(), 'Capablanca vs Tal-inspired bot · Game ' + match.round, data.outcome.result, whiteName, blackName, data.moves.length);
    await renderPng(svg, pngPath);
    generated.push({ match, data, whiteName, blackName });
  }
  const lines = [
    '# Capablanca vs Tal-inspired bot · simulation record',
    '',
    '- Generation date: ' + DATE.replaceAll('.', '-'),
    '- These are generated Veyra bot-vs-bot simulations, not historical games between the two players.',
    '- Move selection uses the repository bot engine with deterministic random sampling (Math.random = 0.99).',
    '- PNGs show the final position; PGNs contain the full legal move sequence.',
    '',
    '| Game | White | Black | Result | Half-moves | PGN | Final board PNG |',
    '|---|---|---|---|---:|---|---|',
    ...generated.map(({ match, data, whiteName, blackName }) => '| ' + match.round + ' | ' + whiteName + ' | ' + blackName + ' | ' + data.outcome.result + ' (' + data.outcome.termination + ') | ' + data.moves.length + ' | [' + match.stem + '.pgn](./' + match.stem + '.pgn) | [' + match.stem + '.png](./' + match.stem + '.png) |'),
    '',
    '## Reproduction',
    '',
    'Run npm run build, install Playwright/Chromium, then run npm run build:capablanca-matches.',
    'Validate committed artifacts with npm run check:capablanca-matches.',
    '',
  ];
  await writeFile(join(OUT, 'README.md'), lines.join('\n'), 'utf8');
  for (const { data } of generated) {
    const parsed = parsePgn(data.pgn);
    assert.equal(parsed.headers.PlyCount, String(parsed.tokens.length));
    assert.equal(parsed.headers.Result, data.outcome.result);
  }
  console.log('Generated ' + generated.length + ' Capablanca-vs-Tal simulation records: ' + generated.map(({ match, data }) => match.stem + ' ' + data.outcome.result + '/' + data.moves.length + ' plies').join('; '));
}

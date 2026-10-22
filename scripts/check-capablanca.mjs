import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Chess } from '../public/vendor/veyra-rules/chess-compat.js';

const [manifestText, runtimeText, pgnText, research, analysis] = await Promise.all([
  readFile('public/data/bots/index.json', 'utf8'),
  readFile('public/data/bots/capablanca.json', 'utf8'),
  readFile('Capablanca.pgn', 'utf8'),
  readFile('docs/LEGENDS_PGN_RESEARCH.md', 'utf8'),
  readFile('docs/CAPABLANCA_PGN_ANALYSIS.md', 'utf8'),
]);
const manifest = JSON.parse(manifestText);
const bot = manifest.find((entry) => entry.id === 'capablanca');
const runtime = JSON.parse(runtimeText);
assert.ok(bot, 'Capablanca is missing from the bot manifest');
assert.deepEqual(bot, runtime, 'Capablanca manifest and runtime file must match');
assert.equal(bot.sourceFile, 'Capablanca.pgn');
assert.equal(bot.sourceGeneratorVersion, 3);
assert.equal(bot.sourceSha256, createHash('sha256').update(pgnText).digest('hex'), 'PGN source hash mismatch');
assert.equal((pgnText.match(/^\[Event\s+"/gm) || []).length, 597, 'Unexpected source PGN game count');
assert.equal(bot.sourceGameCount, 597, 'Expected 597 valid Capablanca games');
assert.equal(bot.trainingGameCount + bot.holdoutGameCount, bot.sourceGameCount);
assert.ok(bot.trainingGameCount > 0 && bot.holdoutGameCount > 0);
assert.equal(bot.style, 'endgame');
assert.ok(bot.styleMetrics && bot.styleMetrics.whiteGames > 0 && bot.styleMetrics.blackGames > 0);
assert.ok(bot.exampleGames?.length >= 2);
assert.ok(bot.holdoutPositions?.length >= 8);
assert.ok(bot.openingsAsWhite?.length >= 8 && bot.openingsAsBlack?.length >= 8);
for (const line of [...bot.openingsAsWhite, ...bot.openingsAsBlack, ...bot.gambits]) {
  assert.ok(Number.isInteger(line.games) && line.games > 0, 'Opening frequency missing');
  const replay = new Chess();
  const tokens = String(line.moves).replace(/\d+\.(?:\.\.\.)?/g, ' ').trim().split(/\s+/).filter(Boolean);
  assert.ok(tokens.length >= 8, 'Opening line is too short');
  for (const san of tokens) assert.ok(replay.move(san, { sloppy: true }), 'Illegal Capablanca repertoire SAN: ' + san);
}
const triggers = { general: 'after-move', opening: 'opening-phase', threat: 'check-or-checkmate', tactics: 'capture-or-tactical-move', endgame: 'endgame-phase' };
const phraseIds = new Set();
for (const category of Object.keys(triggers)) {
  const entries = bot.phraseArchive?.[category];
  assert.ok(Array.isArray(entries) && entries.length >= 2, 'Missing phrase category: ' + category);
  for (const phrase of entries) {
    assert.equal(phrase.category, category);
    assert.equal(phrase.trigger, triggers[category]);
    assert.equal(phrase.language, 'he');
    assert.ok(typeof phrase.text === 'string' && phrase.text.trim());
    assert.ok(typeof phrase.id === 'string' && !phraseIds.has(phrase.id), 'Phrase ID is missing or duplicated');
    phraseIds.add(phrase.id);
  }
}
for (const position of bot.holdoutPositions) {
  const replay = new Chess(position.fen);
  assert.ok(replay.fen(), 'Invalid holdout FEN');
  assert.ok(replay.move(position.sourceSan, { sloppy: true }), 'Historical holdout move is illegal: ' + position.sourceSan);
}
assert.ok(research.includes('José Raúl Capablanca') && research.includes('Capablanca.pgn'));
assert.ok(analysis.includes('597') && analysis.includes('חמשת הקווים השכיחים בלבן') && analysis.includes('חמשת הקווים השכיחים בשחור'));
console.log('PASS: Capablanca source hash, 597 games, per-color legal repertoire, holdout positions and categorized phrases validated.');

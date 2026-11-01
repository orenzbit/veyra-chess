import assert from 'node:assert';
import fs from 'node:fs';
import { getExpertForOpening, getExpertBotIdForOpening, buildBotTrainingRepertoire, HISTORICAL_BOT_EXPERTS } from '../dist/src/opening-bot-map.js';
import { preferredOpeningMove, bookCandidates } from '../dist/src/bot-engine.js';

// Load repertoire and bots
const repertoire = JSON.parse(fs.readFileSync('public/data/repertoire.json', 'utf8'));
const bots = JSON.parse(fs.readFileSync('public/data/bots/index.json', 'utf8'));
const { Chess } = await import('../public/vendor/veyra-rules/chess-compat.js');

console.log('1. Testing opening coverage:');
assert.strictEqual(repertoire.length, 77, 'Must have 77 openings');

const validBotIds = new Set(Object.keys(HISTORICAL_BOT_EXPERTS));
for (const op of repertoire) {
  const botId = getExpertBotIdForOpening(op.id);
  assert.ok(validBotIds.has(botId), `Opening ${op.id} must map to a valid historical bot, got ${botId}`);
  const botProfile = bots.find(b => b.id === botId);
  assert.ok(botProfile, `Historical bot profile ${botId} must exist in bots index`);
  assert.strictEqual(botProfile.elo, getExpertForOpening(op.id).elo, `Displayed Elo for ${op.id} must match its bot profile`);
}
const explicitlyMappedIds = Object.values(HISTORICAL_BOT_EXPERTS).flatMap(expert => expert.openings);
assert.strictEqual(new Set(explicitlyMappedIds).size, explicitlyMappedIds.length, 'An opening must not be assigned to multiple historical bots');
for (const op of repertoire) {
  assert.ok(explicitlyMappedIds.includes(op.id), `Opening ${op.id} must be explicitly assigned, not silently use the fallback bot`);
}
console.log('  PASS: All 77 openings map to valid indexed historical bots.');

console.log('2. Testing Sicilian -> Mikhail Tal:');
const sicilianExpert = getExpertForOpening('sicilian');
assert.strictEqual(sicilianExpert.botId, 'tal', 'Sicilian must map to Mikhail Tal');
assert.strictEqual(sicilianExpert.elo, 2705, 'Tal Elo must be 2705');
console.log('  PASS: Sicilian maps to Mikhail Tal (2705 Elo).');

console.log('3. Testing repertoire enrichment:');
const sicilian = repertoire.find(o => o.id === 'sicilian');
assert.ok(sicilian, 'Sicilian opening must exist in repertoire');
const najdorfLine = sicilian.lines.find(l => l.name.toLowerCase().includes('najdorf')) || sicilian.lines[0];
assert.ok(najdorfLine, 'Najdorf or primary line must exist');

// Bot plays Black
const blackTraining = buildBotTrainingRepertoire(sicilian, najdorfLine, 'b');
assert.ok(blackTraining.openingsAsBlack.length > 0, 'openingsAsBlack must contain training lines');
assert.strictEqual(blackTraining.openingsAsWhite.length, 0, 'openingsAsWhite must be empty when bot is Black');
assert.strictEqual(blackTraining.openingsAsBlack.length, 1, 'Line-only practice must include the selected line only');
assert.strictEqual(blackTraining.openingsAsBlack[0].games, 100, 'Selected line must have high priority weight 100');
const allSicilianLines = buildBotTrainingRepertoire(sicilian, null, 'b');
assert.strictEqual(
  allSicilianLines.openingsAsBlack.length,
  sicilian.lines.filter(l => l.moves.length > 0).length,
  'Opening-wide practice must include every line with moves'
);
console.log('  PASS: Training repertoire formatted correctly.');

console.log('4. Testing theory move execution (Bot as Black):');
const talBot = bots.find(b => b.id === 'tal');
const enrichedTal = {
  ...talBot,
  openingsAsBlack: blackTraining.openingsAsBlack,
  openingsAsWhite: [],
  gambits: [],
};

// Start game: 1. e4
const game = new Chess();
game.move('e4');
assert.strictEqual(game.turn(), 'b', "It must be Black's turn");

const botMove1 = preferredOpeningMove(game, enrichedTal, Chess);
assert.ok(botMove1, 'Bot must have a book candidate move after 1.e4');
assert.strictEqual(botMove1.san, 'c5', 'Mikhail Tal must play 1...c5 in the Sicilian');
console.log('  PASS: Tal plays 1...c5 after 1.e4.');

game.move('c5');
game.move('Nf3'); // White plays 2.Nf3
const botMove2 = preferredOpeningMove(game, enrichedTal, Chess);
assert.ok(botMove2, 'Bot must have a candidate move after 2.Nf3');
console.log(`  PASS: Tal plays theory move 2...${botMove2.san} after 2.Nf3.`);

console.log('5. Testing out-of-theory deviation fallback:');
// Reset game and play an off-book nonsense move: 1. h4
const devGame = new Chess();
devGame.move('h4');
const outOfTheoryMove = preferredOpeningMove(devGame, enrichedTal, Chess);
assert.strictEqual(outOfTheoryMove, null, 'Bot must return null when position is not in repertoire');
console.log('  PASS: When player deviates (1.h4), bot returns null to trigger minimax engine.');

console.log('6. Testing theory move execution (Bot as White):');
const french = repertoire.find(o => o.id === 'french');
const karpovBot = bots.find(b => b.id === 'karpov');
const whiteTraining = buildBotTrainingRepertoire(french, french.lines[0], 'w');
const enrichedKarpov = {
  ...karpovBot,
  openingsAsWhite: whiteTraining.openingsAsWhite,
  openingsAsBlack: [],
  gambits: [],
};

const whiteGame = new Chess();
assert.strictEqual(whiteGame.turn(), 'w', "It must be White's turn");
const karpovMove1 = preferredOpeningMove(whiteGame, enrichedKarpov, Chess);
assert.ok(karpovMove1, 'Karpov must have a book move from move 1 as White');
assert.strictEqual(karpovMove1.san, 'e4', 'Karpov plays 1.e4 against French line');
console.log('  PASS: Karpov plays 1.e4 from move 1 as White.');

const mainSource = fs.readFileSync('src/main.ts', 'utf8');
assert.ok(mainSource.includes('setBotGameSource(page);'), 'Practice must remember whether it started from Openings or Daily Openings');
assert.ok(
  mainSource.includes("onBack:()=>setPage(botGameSource==='openings'||botGameSource==='daily-openings'?botGameSource:'bots')"),
  'Back navigation must return to the originating opening page'
);
console.log('7. PASS: Practice returns to its originating Openings page.');
assert.ok(mainSource.includes("onClick:()=>{setBotGameSource('bots');setPage('botgame');}"), 'Campaign games must reset the return destination to the bots page');
console.log('8. PASS: Campaign games reset their return destination.');
assert.ok(mainSource.includes("backLabel:botGameSource==='openings'||botGameSource==='daily-openings'?'חזרה לפתיחות':'חזרה לבוטים'"), 'Bot game return label must match its destination');

console.log('\\nALL 8 OPENING BOT PRACTICE TEST GROUPS PASSED SUCCESSFULLY! ✓');

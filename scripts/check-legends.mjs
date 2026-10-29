import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile('public/data/bots/index.json', 'utf8'));
const tal = manifest.find((bot) => bot.id === 'tal');
const capablanca = manifest.find((bot) => bot.id === 'capablanca');
const capablancaRuntime = JSON.parse(await readFile('public/data/bots/capablanca.json', 'utf8'));
const runtime = JSON.parse(await readFile('public/data/bots/tal.json', 'utf8'));
const main = await readFile('src/main.ts', 'utf8');
const page = await readFile('src/legends-page.ts', 'utf8');
const blindfold = await readFile('src/blindfold-page.ts', 'utf8');
const prompt = await readFile('docs/LEGENDS_BOT_PROMPT.md', 'utf8');
const progress = await readFile('docs/LEGENDS_PROGRESS.md', 'utf8');

if (manifest.length !== 61) throw new Error(`Expected 61 tournament bots, got ${manifest.length}`);
if (!tal || tal.name !== 'The Magician from Riga') throw new Error('Tal identity was not installed in the manifest');
if (tal.style !== 'attacking' || tal.legendCategory !== 'attacking') throw new Error('Tal style must favor attacking initiative');
if (JSON.stringify(tal) !== JSON.stringify(runtime)) throw new Error('Tal manifest and runtime JSON disagree');
if (tal.description !== 'בוט שחמט עצמאי המתוכנת לחקות את סגנון המשחק האגרסיבי של מיכאל טל. אין לבוט זה קשר רשמי לשחקן או לעיזבונו.') throw new Error('Tal independence description is missing or changed');
if (tal.sourceGameCount !== 2431 || tal.sourceYearRange !== '1952–1992') throw new Error('Tal source-game provenance is incorrect');
if (!Array.isArray(tal.openingsAsWhite) || tal.openingsAsWhite.length < 8 || !Array.isArray(tal.openingsAsBlack) || tal.openingsAsBlack.length < 8) throw new Error('Tal opening repertoire is incomplete');
if (!tal.phraseArchive || !['general','opening','threat','tactics','endgame'].every((key) => Array.isArray(tal.phraseArchive[key]) && tal.phraseArchive[key].length)) throw new Error('Tal phrase archive categories are incomplete');
if (!capablanca || capablanca.name !== 'José Raúl Capablanca') throw new Error('Capablanca identity is missing');
if (JSON.stringify(capablanca) !== JSON.stringify(capablancaRuntime)) throw new Error('Capablanca manifest and runtime JSON disagree');
if (capablanca.sourceFile !== 'Capablanca.pgn' || (!Number.isInteger(capablanca.sourceGeneratorVersion) || capablanca.sourceGeneratorVersion < 3) || capablanca.sourceGameCount !== 597) throw new Error('Capablanca source provenance or generation version is incorrect');
if (capablanca.style !== 'endgame' || capablanca.legendCategory !== 'endgame') throw new Error('Capablanca style must favor endgame play');
if (!Array.isArray(capablanca.openingsAsWhite) || capablanca.openingsAsWhite.length < 8 || !Array.isArray(capablanca.openingsAsBlack) || capablanca.openingsAsBlack.length < 8) throw new Error('Capablanca opening repertoire is incomplete');
const capPhraseIds = new Set();
const capTriggers = { general: 'after-move', opening: 'opening-phase', threat: 'check-or-checkmate', tactics: 'capture-or-tactical-move', endgame: 'endgame-phase' };
for (const category of Object.keys(capTriggers)) {
  const entries = capablanca.phraseArchive?.[category];
  if (!Array.isArray(entries) || entries.length < 2) throw new Error('Capablanca phrase archive category is incomplete: ' + category);
  for (const entry of entries) {
    if (!entry || entry.category !== category || entry.trigger !== capTriggers[category] || entry.language !== 'he' || typeof entry.text !== 'string' || !entry.text.trim() || typeof entry.id !== 'string' || capPhraseIds.has(entry.id)) throw new Error('Capablanca phrase archive metadata is invalid: ' + category);
    capPhraseIds.add(entry.id);
  }
}
for (const line of [...tal.openingsAsWhite, ...tal.openingsAsBlack, ...tal.gambits]) {
  if (!line.moves || !/^1\./.test(line.moves) || !Number.isInteger(line.games) || line.games < 1) throw new Error('Invalid source-derived repertoire line');
}
if (!page.includes('export function LegendsPage') || !page.includes('applyNextMove') || !page.includes('onReview(game.pgn())')) throw new Error('Legends simulation/review surface is incomplete');
if (!page.includes('legends-commentary') || !page.includes('mover?.phraseArchive') || !main.includes('bot?.phraseArchive')) throw new Error('Categorized phrase archive is not wired to bot and simulation UI');
if (!main.includes("page==='legends'") || !main.includes("setBlindfoldBotId('tal')")) throw new Error('Legends route or Tal blindfold handoff is missing');
if (!blindfold.includes("initialBotId === 'tal' ? 'advanced' : 'beginner'")) throw new Error('Tal blindfold training does not select the Tal tier');
if (!prompt.includes('Do not delete the branch without explicit user approval') || !prompt.includes('בכישלון')) throw new Error('Reusable workflow prompt is missing recovery safeguards');
if (!progress.includes('מחיקת הענף אינה חלק מהאוטומציה')) throw new Error('Progress dashboard is missing branch deletion safeguard');
console.log('PASS: Tal identity/provenance/repertoire, Legends route, bot-vs-bot review handoff and Tal blindfold handoff validated.');

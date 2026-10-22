import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile('public/data/bots/index.json', 'utf8'));
const tal = manifest.find((bot) => bot.id === 'tal');
const immortalGambit = manifest.find((bot) => bot.id === 'anderssen');
const cubanEndgame = manifest.find((bot) => bot.id === 'capablanca');
const immortalRuntime = JSON.parse(await readFile('public/data/bots/anderssen.json', 'utf8'));
const cubanRuntime = JSON.parse(await readFile('public/data/bots/capablanca.json', 'utf8'));

const runtime = JSON.parse(await readFile('public/data/bots/tal.json', 'utf8'));
const main = await readFile('src/main.ts', 'utf8');
const page = await readFile('src/legends-page.ts', 'utf8');
const blindfold = await readFile('src/blindfold-page.ts', 'utf8');
const prompt = await readFile('docs/LEGENDS_BOT_PROMPT.md', 'utf8');
const progress = await readFile('docs/LEGENDS_PROGRESS.md', 'utf8');
const research = await readFile('docs/LEGENDS_PGN_RESEARCH.md', 'utf8');

if (manifest.length !== 61) throw new Error(`Expected 61 bots, got ${manifest.length}`);
if (!immortalGambit || immortalGambit.name !== 'The Immortal Gambit' || immortalGambit.searchDepth !== 5 || immortalGambit.style !== 'attacking') throw new Error('The Immortal Gambit identity/search profile is missing');
if (!cubanEndgame || cubanEndgame.name !== 'Cuban Endgame Maestro' || cubanEndgame.style !== 'endgame') throw new Error('Cuban Endgame Maestro identity is missing');
if (JSON.stringify(immortalGambit) !== JSON.stringify(immortalRuntime) || JSON.stringify(cubanEndgame) !== JSON.stringify(cubanRuntime)) throw new Error('Historical bot manifest/runtime JSON disagree');
for (const bot of [immortalGambit, cubanEndgame]) {
 if (!bot.sourceFile || !bot.sourceGameCount || bot.trainingGameCount + bot.holdoutGameCount !== bot.sourceGameCount || bot.holdoutPositions?.length < 8 || !bot.styleMetrics) throw new Error('Historical bot provenance/holdout profile is incomplete: ' + bot.id);
 if (!bot.phraseArchive || !['general','opening','threat','tactics','endgame'].every((key) => Array.isArray(bot.phraseArchive[key]) && bot.phraseArchive[key].length >= 2)) throw new Error('Historical bot phrase archive is incomplete: ' + bot.id);
}
if (!tal || tal.name !== 'The Magician from Riga') throw new Error('Tal identity was not installed in the manifest');
if (tal.style !== 'attacking' || tal.legendCategory !== 'attacking') throw new Error('Tal style must favor attacking initiative');
if (JSON.stringify(tal) !== JSON.stringify(runtime)) throw new Error('Tal manifest and runtime JSON disagree');
if (tal.description !== 'בוט שחמט עצמאי המתוכנת לחקות את סגנון המשחק האגרסיבי של מיכאל טל. אין לבוט זה קשר רשמי לשחקן או לעיזבונו.') throw new Error('Tal independence description is missing or changed');
if (tal.sourceGameCount !== 2430 || tal.sourceYearRange !== '1952–1992' || tal.trainingGameCount + tal.holdoutGameCount !== tal.sourceGameCount || tal.holdoutPositions?.length < 8 || tal.sourceGeneratorVersion !== 3 || !/^[a-f0-9]{64}$/.test(tal.sourceSha256 || '')) throw new Error('Tal source-game provenance is incorrect');
if (!Array.isArray(tal.openingsAsWhite) || tal.openingsAsWhite.length < 8 || !Array.isArray(tal.openingsAsBlack) || tal.openingsAsBlack.length < 8) throw new Error('Tal opening repertoire is incomplete');
if (!tal.phraseArchive || !['general','opening','threat','tactics','endgame'].every((key) => Array.isArray(tal.phraseArchive[key]) && tal.phraseArchive[key].length)) throw new Error('Tal phrase archive categories are incomplete');
for (const id of ['anand','anderssen','capablanca','carlsen','fischer','karpov','kasparov','marshall','morphy','nakamura','polgarj','tal']) {
 const bot = manifest.find((item) => item.id === id);
 if (!bot || bot.sourceGeneratorVersion !== 3 || !bot.sourceFile || !bot.sourceGameCount || bot.trainingGameCount + bot.holdoutGameCount !== bot.sourceGameCount || bot.holdoutPositions?.length < 8 || !/^[a-f0-9]{64}$/.test(bot.sourceSha256 || '') || !bot.styleMetrics || bot.openingsAsWhite.length < 8 || bot.openingsAsBlack.length < 8) throw new Error('Historical source profile is incomplete: ' + id);
 if (!bot.phraseArchive || !['general','opening','threat','tactics','endgame'].every((key) => Array.isArray(bot.phraseArchive[key]) && bot.phraseArchive[key].length >= 2 && bot.phraseArchive[key].every((phrase) => phrase && phrase.id && phrase.category === key && phrase.trigger && phrase.text && phrase.language === 'he'))) throw new Error('Historical phrase archive schema is incomplete: ' + id);
 if (!Array.isArray(bot.exampleGames) || bot.exampleGames.length < 2 || !research.includes('## ' + bot.name + ' (' + id + ')') || !research.includes(bot.sourceFile)) throw new Error('Historical PGN research evidence is incomplete: ' + id);
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

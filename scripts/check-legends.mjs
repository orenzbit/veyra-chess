import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile('public/data/bots/index.json', 'utf8'));
const tal = manifest.find((bot) => bot.id === 'tal');
const immortalGambit = manifest.find((bot) => bot.id === 'anderssen');
const cubanEndgame = manifest.find((bot) => bot.id === 'capablanca');
const immortalRuntime = JSON.parse(await readFile('public/data/bots/anderssen.json', 'utf8'));
const cubanRuntime = JSON.parse(await readFile('public/data/bots/capablanca.json', 'utf8'));

const runtime = JSON.parse(await readFile('public/data/bots/tal.json', 'utf8'));
const main = await readFile('src/main.ts', 'utf8');
const botEngine = await readFile('src/bot-engine.ts', 'utf8');
const page = await readFile('src/legends-page.ts', 'utf8');
const blindfold = await readFile('src/blindfold-page.ts', 'utf8');
const prompt = await readFile('docs/LEGENDS_BOT_PROMPT.md', 'utf8');
const targetedHistoricalIds = new Set(String(process.env.HISTORICAL_BOT_IDS || '').split(',').map((value) => value.trim()).filter(Boolean));
const researchNames = { anand: 'Viswanathan Anand', anderssen: 'Adolf Anderssen', capablanca: 'José Raúl Capablanca', carlsen: 'Magnus Carlsen', fischer: 'Bobby Fischer', karpov: 'Anatoly Karpov', kasparov: 'Garry Kasparov', marshall: 'Frank Marshall', morphy: 'Paul Morphy', nakamura: 'Hikaru Nakamura', polgarj: 'Judit Polgár', tal: 'Mihail Tal' };
const progress = await readFile('docs/LEGENDS_PROGRESS.md', 'utf8');
const research = await readFile('docs/LEGENDS_PGN_RESEARCH.md', 'utf8');

if (manifest.length !== 61) throw new Error(`Expected 61 bots, got ${manifest.length}`);
const archiveTextOwners = new Map();
for (const bot of manifest) {
 if (bot.sourceGeneratorVersion === 4 && bot.phraseArchiveVersion !== 2) throw new Error('Historical phrase archive version is stale: ' + bot.id);
 if (!bot.phraseArchive || !['general','opening','threat','tactics','endgame'].every((key) => Array.isArray(bot.phraseArchive[key]) && bot.phraseArchive[key].length >= 2 && bot.phraseArchive[key].every((phrase) => phrase && phrase.id && phrase.category === key && phrase.trigger && phrase.text && phrase.language === 'he'))) throw new Error('Phrase archive schema is incomplete: ' + bot.id);
 const phrases = ['general','opening','threat','tactics','endgame'].flatMap((key) => bot.phraseArchive[key].map((phrase) => phrase.text));
 if (new Set(phrases).size < 8) throw new Error('Phrase archive lacks enough distinct lines: ' + bot.id);
 const runtime = JSON.parse(await readFile('public/data/bots/' + bot.id + '.json', 'utf8'));
 if (runtime.name !== bot.name || runtime.phraseArchiveVersion !== bot.phraseArchiveVersion || runtime.openingMatchMode !== bot.openingMatchMode || JSON.stringify(runtime.phraseArchive) !== JSON.stringify(bot.phraseArchive)) throw new Error('Bot manifest/runtime profile or phrase archive mismatch: ' + bot.id);
 for (const phrase of phrases) {
  const owners = archiveTextOwners.get(phrase) || new Set();
  owners.add(bot.id);
  archiveTextOwners.set(phrase, owners);
 }
}
for (const [phrase, owners] of archiveTextOwners) {
 if (owners.size > 1 && owners.has('anand')) throw new Error('Anand phrase is shared with another bot (' + [...owners].join(', ') + '): ' + phrase);
}
if (!immortalGambit || immortalGambit.name !== 'The Immortal Gambit' || immortalGambit.searchDepth !== 5 || immortalGambit.style !== 'attacking') throw new Error('The Immortal Gambit identity/search profile is missing');
if (!botEngine.includes('Number(bot.searchDepth)') || !botEngine.includes('function quiescence(') || !botEngine.includes('bot.searchDepth ? 0') || !botEngine.includes('const transpositionTable=new Map()') || !botEngine.includes('table.get(key)') || !botEngine.includes('centerDistance') || !botEngine.includes("bot?.openingMatchMode==='position'") || !botEngine.includes('probeFen.split')) throw new Error('Historical tactical/positional search controls or opt-in opening-position matching are not wired into the bot engine');
if (!cubanEndgame || cubanEndgame.name !== 'Cuban Endgame Maestro' || cubanEndgame.style !== 'endgame') throw new Error('Cuban Endgame Maestro identity is missing');
if (JSON.stringify(immortalGambit) !== JSON.stringify(immortalRuntime) || JSON.stringify(cubanEndgame) !== JSON.stringify(cubanRuntime)) throw new Error('Historical bot manifest/runtime JSON disagree');
for (const bot of [immortalGambit, cubanEndgame]) {
 if (!bot.sourceFile || !bot.sourceGameCount || bot.trainingGameCount + bot.holdoutGameCount !== bot.sourceGameCount || bot.holdoutPositions?.length < 8 || !bot.styleMetrics) throw new Error('Historical bot provenance/holdout profile is incomplete: ' + bot.id);
 if (!bot.phraseArchive || !['general','opening','threat','tactics','endgame'].every((key) => Array.isArray(bot.phraseArchive[key]) && bot.phraseArchive[key].length >= 2)) throw new Error('Historical bot phrase archive is incomplete: ' + bot.id);
}
if (!tal || tal.name !== 'The Magician from Riga') throw new Error('Tal identity was not installed in the manifest');
const expectedAliases = { anand: 'The Lightning Strategist' };
for (const [id, name] of Object.entries(expectedAliases)) if (manifest.find((bot) => bot.id === id)?.name !== name) throw new Error('Historical display alias is incorrect: ' + id);
if (manifest.find((bot) => bot.id === 'carlsen')?.name !== 'השחקן הטוב בכל הזמנים') throw new Error('Carlsen display alias must be השחקן הטוב בכל הזמנים');
if (tal.style !== 'attacking' || tal.legendCategory !== 'attacking') throw new Error('Tal style must favor attacking initiative');
if (JSON.stringify(tal) !== JSON.stringify(runtime)) throw new Error('Tal manifest and runtime JSON disagree');
if (tal.description !== 'בוט שחמט עצמאי המתוכנת לחקות את סגנון המשחק האגרסיבי של מיכאל טל. אין לבוט זה קשר רשמי לשחקן או לעיזבונו.') throw new Error('Tal independence description is missing or changed');
if (tal.sourceGameCount !== 2430 || tal.sourceYearRange !== '1952–1992' || tal.trainingGameCount + tal.holdoutGameCount !== tal.sourceGameCount || tal.holdoutPositions?.length < 8 || !Number.isInteger(tal.sourceGeneratorVersion) || tal.sourceGeneratorVersion < 3 || !/^[a-f0-9]{64}$/.test(tal.sourceSha256 || '')) throw new Error('Tal source-game provenance is incorrect');
if (!Array.isArray(tal.openingsAsWhite) || tal.openingsAsWhite.length < 8 || !Array.isArray(tal.openingsAsBlack) || tal.openingsAsBlack.length < 8) throw new Error('Tal opening repertoire is incomplete');
if (!tal.phraseArchive || !['general','opening','threat','tactics','endgame'].every((key) => Array.isArray(tal.phraseArchive[key]) && tal.phraseArchive[key].length)) throw new Error('Tal phrase archive categories are incomplete');
for (const id of ['anand','anderssen','capablanca','carlsen','fischer','karpov','kasparov','marshall','morphy','nakamura','polgarj','tal']) {
 const bot = manifest.find((item) => item.id === id);
 const expectedGeneratorVersion = 4;
 if (!bot || ((!targetedHistoricalIds.size || targetedHistoricalIds.has(id)) && bot.sourceGeneratorVersion !== expectedGeneratorVersion) || !bot.sourceFile || !bot.sourceGameCount || bot.trainingGameCount + bot.holdoutGameCount !== bot.sourceGameCount || bot.holdoutPositions?.length < 8 || !/^[a-f0-9]{64}$/.test(bot.sourceSha256 || '') || !bot.styleMetrics || bot.openingsAsWhite.length < 8 || bot.openingsAsBlack.length < 8) throw new Error('Historical source profile is incomplete: ' + id);
 if (!bot.phraseArchive || !['general','opening','threat','tactics','endgame'].every((key) => Array.isArray(bot.phraseArchive[key]) && bot.phraseArchive[key].length >= 2 && bot.phraseArchive[key].every((phrase) => phrase && phrase.id && phrase.category === key && phrase.trigger && phrase.text && phrase.language === 'he'))) throw new Error('Historical phrase archive schema is incomplete: ' + id);
 if (bot.sourceGeneratorVersion === 4 && (!Array.isArray(bot.quips) || ['general','opening','threat','tactics','endgame'].some((key, index) => bot.quips[index] !== bot.phraseArchive[key][0].text))) throw new Error('Historical quips and phrase archive disagree: ' + id);
 const researchName = researchNames[id] || bot.name;
 if (id === 'anand') {
  if (bot.name !== 'The Lightning Strategist') throw new Error('Anand display name must be the approved alias');
  if (bot.openingMatchMode !== 'position') throw new Error('Anand must opt into position-based repertoire matching');
  if (bot.styleLabel !== 'אוניברסלי־דינמי' || bot.styleProfile?.id !== 'anand-dynamic-universal-v1') throw new Error('Anand dynamic-universal style profile is missing');
  if (!botEngine.includes("profile?.id === 'anand-dynamic-universal-v1'") || !botEngine.includes('openingDevelopmentBonus') || !botEngine.includes('endgameKingActivityBonus')) throw new Error('Anand-specific style preferences are not wired into move selection');
  if (JSON.stringify(bot.styleProfile) !== JSON.stringify({ id: 'anand-dynamic-universal-v1', openingDevelopmentBonus: 1.4, centralPawnBonus: 1, castlingSafetyBonus: 1, endgameKingActivityBonus: 1.3 })) throw new Error('Anand style tuning changed without updating the regression contract');
  const anandPhrases = ['general','opening','threat','tactics','endgame'].flatMap((key) => bot.phraseArchive[key].map((phrase) => phrase.text));
  const publicText = [bot.name, bot.title, bot.persona, bot.historicalNote, bot.description, bot.flavor, bot.openingEraNote, ...(bot.quips || []), ...anandPhrases];
  if (publicText.some((value) => /\bViswanathan\s+Anand\b|\bAnand\b/i.test(value))) throw new Error('Anand real name leaks into public display text, quips, or phrase archive');
  if (new Set(anandPhrases).size !== anandPhrases.length) throw new Error('Anand phrase archive contains duplicate lines');
  if (anandPhrases.length !== 10) throw new Error('Anand must have exactly ten curated phrases across five categories');
 }
 if (!Array.isArray(bot.exampleGames) || bot.exampleGames.length < 2 || !research.includes('## ' + researchName + ' (' + id + ')') || !research.includes(bot.sourceFile)) throw new Error('Historical PGN research evidence is incomplete: ' + id);
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

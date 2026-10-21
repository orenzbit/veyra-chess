import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile('public/data/bots/index.json', 'utf8'));
const tal = manifest.find((bot) => bot.id === 'tal');
const runtime = JSON.parse(await readFile('public/data/bots/tal.json', 'utf8'));
const main = await readFile('src/main.ts', 'utf8');
const page = await readFile('src/legends-page.ts', 'utf8');
const blindfold = await readFile('src/blindfold-page.ts', 'utf8');
const prompt = await readFile('docs/LEGENDS_BOT_PROMPT.md', 'utf8');
const progress = await readFile('docs/LEGENDS_PROGRESS.md', 'utf8');

if (manifest.length !== 50) throw new Error(`Expected 50 bots, got ${manifest.length}`);
if (!tal || tal.name !== 'The Magician from Riga') throw new Error('Tal identity was not installed in the manifest');
if (JSON.stringify(tal) !== JSON.stringify(runtime)) throw new Error('Tal manifest and runtime JSON disagree');
if (tal.description !== 'בוט שחמט עצמאי המתוכנת לחקות את סגנון המשחק האגרסיבי של מיכאל טל. אין לבוט זה קשר רשמי לשחקן או לעיזבונו.') throw new Error('Tal independence description is missing or changed');
if (tal.sourceGameCount !== 2431 || tal.sourceYearRange !== '1952–1992') throw new Error('Tal source-game provenance is incorrect');
if (!Array.isArray(tal.openingsAsWhite) || tal.openingsAsWhite.length < 8 || !Array.isArray(tal.openingsAsBlack) || tal.openingsAsBlack.length < 8) throw new Error('Tal opening repertoire is incomplete');
for (const line of [...tal.openingsAsWhite, ...tal.openingsAsBlack, ...tal.gambits]) {
  if (!line.moves || !/^1\./.test(line.moves) || !Number.isInteger(line.games) || line.games < 1) throw new Error('Invalid source-derived repertoire line');
}
if (!page.includes('export function LegendsPage') || !page.includes('applyNextMove') || !page.includes('onReview(game.pgn())')) throw new Error('Legends simulation/review surface is incomplete');
if (!main.includes("page==='legends'") || !main.includes("setBlindfoldBotId('tal')")) throw new Error('Legends route or Tal blindfold handoff is missing');
if (!blindfold.includes("initialBotId === 'tal' ? 'advanced' : 'beginner'")) throw new Error('Tal blindfold training does not select the Tal tier');
if (!prompt.includes('Do not delete the branch without explicit user approval') || !prompt.includes('בכישלון')) throw new Error('Reusable workflow prompt is missing recovery safeguards');
if (!progress.includes('מחיקת הענף אינה חלק מהאוטומציה')) throw new Error('Progress dashboard is missing branch deletion safeguard');
console.log('PASS: Tal identity/provenance/repertoire, Legends route, bot-vs-bot review handoff and Tal blindfold handoff validated.');

import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const arg = (name, fallback = '') => process.argv.find((value) => value.startsWith('--' + name + '='))?.slice(name.length + 3) || fallback;
const input = resolve(arg('input', 'artifacts/legends-tournament/audit.json'));
const out = resolve(arg('out', 'artifacts/legends-tournament'));
const audit = JSON.parse(await readFile(input, 'utf8'));
assert.equal(audit.status, 'passed', 'Cannot create a podium from a failed audit');
assert.equal(audit.errors.length, 0, 'Cannot create a podium while audit errors remain');
assert.equal(audit.expectedGames, 3660, 'Podium requires a full 61-bot double round-robin');
assert.equal(audit.records, 3660, 'Podium requires 3,660 actual game records');
assert.equal(audit.standings.length, 61, 'Podium requires standings for all 61 bots');
const podium = audit.standings.slice(0, 3).map((bot, index) => ({
  place: index + 1, id: bot.id, name: bot.name, score: bot.score, scorePercent: bot.scorePercent,
  wins: bot.wins, draws: bot.draws, losses: bot.losses, games: bot.games, elo: bot.elo,
}));
assert.equal(podium.length, 3, 'Three podium places are required');
await mkdir(out, { recursive: true });
await writeFile(resolve(out, 'podium.json'), JSON.stringify({
  status: 'passed', basedOn: 'audited tournament results', auditStatus: audit.status,
  gameCount: audit.records, botCount: audit.botCount, tieBreak: 'points, then existing internal rating (Elo)',
  podium,
}, null, 2) + '\n');
await writeFile(resolve(out, 'podium.md'), [
  '# Tournament podium',
  '',
  'Based on the audited results of all ' + audit.records + ' completed games.',
  'Tie-break: total points, then the existing internal rating parameter.',
  '',
  '| Place | Bot | Points | Score | W | D | L |',
  '|---:|---|---:|---:|---:|---:|---:|',
  ...podium.map((bot) => '| ' + bot.place + ' | ' + bot.name + ' (' + bot.id + ') | ' + bot.score + ' | ' + bot.scorePercent + '% | ' + bot.wins + ' | ' + bot.draws + ' | ' + bot.losses + ' |'),
  '',
].join('\n') + '\n');
console.log('PASS: podium generated from audited results: ' + podium.map((bot) => bot.place + '. ' + bot.name + ' (' + bot.score + ')').join('; '));

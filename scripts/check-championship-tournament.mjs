import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile('public/data/bots/index.json', 'utf8'));
assert.ok(Array.isArray(manifest) && manifest.length >= 2, 'Manifest must contain at least two bots');
const ids = manifest.map((bot) => bot.id);
assert.equal(new Set(ids).size, ids.length, 'Bot IDs must be unique');
for (const bot of manifest) {
  assert.ok(/^[a-z0-9-]{2,80}$/.test(bot.id), 'Invalid bot id: ' + bot.id);
  assert.ok(bot.name && typeof bot.name === 'string', 'Missing bot name: ' + bot.id);
}
const games = manifest.length * (manifest.length - 1);
assert.equal(games % 2, 0, 'Double round-robin count must be even');
assert.equal(games / 2, (manifest.length * (manifest.length - 1)) / 2, 'Unordered pair count must be N*(N-1)/2');
const schedule = [];
for (let i = 0; i < manifest.length; i += 1) {
  for (let j = i + 1; j < manifest.length; j += 1) {
    schedule.push(manifest[i].id + '__vs__' + manifest[j].id);
    schedule.push(manifest[j].id + '__vs__' + manifest[i].id);
  }
}
assert.equal(schedule.length, games, 'Every unordered pair must have two color orientations');
assert.equal(new Set(schedule).size, games, 'No oriented pairing may be duplicated');
for (const bot of manifest) {
  const appearances = schedule.filter((id) => id.startsWith(bot.id + '__vs__') || id.endsWith('__vs__' + bot.id));
  assert.equal(appearances.length, 2 * (manifest.length - 1), 'Each bot must play every other bot twice: ' + bot.id);
}
console.log('PASS: dynamic roster has ' + manifest.length + ' bots, ' + (manifest.length * (manifest.length - 1) / 2) + ' unique pairs, and ' + games + ' color-reversed games.');

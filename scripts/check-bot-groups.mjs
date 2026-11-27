import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BOT_GROUPS, getBotGroup, groupBots } from '../dist/src/bot-groups.js';

const bots = JSON.parse(await readFile('public/data/bots/index.json', 'utf8'));
assert.equal(BOT_GROUPS.length, 5, 'Expected 5 bot skill groups');

const grouped = groupBots(bots);
assert.equal(grouped.length, 5, 'All 5 groups must be non-empty');

const totalGrouped = grouped.reduce((sum, entry) => sum + entry.bots.length, 0);
assert.equal(totalGrouped, bots.length, 'Every bot in index.json must belong to exactly one group');

const tal = bots.find((b) => b.id === 'tal');
assert.ok(tal, 'Tal bot must exist');
assert.equal(tal.tier, 3, 'Tal tier must be 3');
assert.equal(tal.stage, 'grandmaster', 'Tal stage must be grandmaster');
assert.equal(getBotGroup(tal).id, 'legends', 'Tal must belong to the legends group');

console.log('PASS: 5 non-empty bot groups cover all', bots.length, 'bots:', grouped.map((g) => `${g.group.id}=${g.bots.length}`).join(', '));

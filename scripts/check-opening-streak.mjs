import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile('src/opening-streak.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { createOpeningStreakClient } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
const data = new Map([
  ['veyra_daily_streak_outbox_v1:account-a', '[{"eventId":"old-puzzle"}]'],
  ['veyra_progress_v1', '{"done":{"existing/line":1},"completed":{"existing":1},"bot":4}'],
  ['veyra_puzzle_best_streak_v1', '28'],
  ['volume', '0.37'],
]);
const original = new Map(data);
const storage = { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
const requests = [];
const updates = [];
let mode = 'offline';
let finish;
let sequence = 0;
const request = async (url, options) => {
  requests.push(JSON.parse(options.body));
  assert.equal(url, '/api/daily-streak?action=record');
  assert.equal(options.credentials, 'same-origin');
  if (mode === 'offline') throw new TypeError('Test offline');
  if (mode === 'wait') return new Promise(resolve => { finish = resolve; });
  if (mode === 'disabled') return Response.json({ ok: false, error: 'DISABLED' }, { status: 404 });
  if (mode === 'rejected') return Response.json({ ok: false, error: 'activity_not_verified' }, { status: 422 });
  return Response.json({ ok: true, accepted: true });
};
const options = userId => ({ userId, storage, fetch: request, uuid: () => 'event-' + ++sequence, timezone: 'UTC', onChange: update => updates.push(update) });
const client = createOpeningStreakClient(options('account-a'));
const lines = [{ lineId: 'main', moves: ['e4', 'e5'] }];
await client.record('opening', lines);
const key = 'veyra_opening_streak_outbox_v1:account-a';
const queued = JSON.parse(data.get(key));
assert.equal(queued.length, 1);
assert.equal(updates.at(-1).status, 'pending');
assert.equal(requests[0].ownerId, 'account-a');
assert.equal(requests[0].activityType, 'training');
mode = 'disabled';
await client.flush();
assert.deepEqual(JSON.parse(data.get(key)), queued, 'feature off must preserve queued work');
assert.equal(updates.at(-1).status, 'disabled');
mode = 'rejected';
await client.flush();
assert.deepEqual(JSON.parse(data.get(key)), queued, 'server rejection must not silently discard work');
assert.equal(updates.at(-1).status, 'error');
mode = 'accepted';
const other = createOpeningStreakClient(options('account-b'));
await other.flush();
assert.deepEqual(JSON.parse(data.get(key)), queued, 'new account cannot drain old account queue');
await client.flush();
assert.equal(JSON.parse(data.get(key)).length, 0);
assert.equal(updates.at(-1).status, 'accepted');
assert.equal(requests.at(-1).eventId, queued[0].eventId, 'retry reuses stable event ID');

mode = 'wait';
const first = client.record('first', lines);
await Promise.resolve();
const second = client.record('second', lines);
mode = 'accepted';
finish(Response.json({ ok: true, accepted: true }));
await Promise.all([first, second]);
assert.equal(JSON.parse(data.get(key)).length, 0, 'completion added during request also flushes');
assert.deepEqual(requests.slice(-2).map(item => item.openingId), ['first', 'second']);

mode = 'wait';
const late = client.record('late', lines);
await Promise.resolve();
client.dispose();
const count = updates.length;
finish(Response.json({ ok: true, accepted: true }));
await late;
assert.equal(updates.length, count, 'unmounted/old account cannot update current UI');
assert.equal(JSON.parse(data.get(key)).length, 1, 'aborted request retains event for idempotent retry');
const broken = createOpeningStreakClient({ ...options('broken'), storage: { getItem: () => '{corrupt', setItem: () => { throw new Error('must not overwrite corrupt data'); } } });
await broken.flush();
assert.equal(updates.at(-1).status, 'error', 'corrupt queue is surfaced');
const blocked = createOpeningStreakClient({ ...options('blocked'), storage: { getItem: () => null, setItem: () => { throw new Error('Storage unavailable'); } } });
await blocked.record('new', lines);
assert.equal(updates.at(-1).status, 'error', 'storage failure is not presented as saved');
assert.equal(updates.at(-1).error, 'Storage unavailable');
for (const [key, value] of original) assert.equal(data.get(key), value, 'existing progress, puzzle queues, high scores and volume must not change');
other.dispose(); broken.dispose(); blocked.dispose();
const main = await readFile('src/main.ts', 'utf8');
assert.ok(main.includes('if(now&&!was)'));
assert.ok(main.includes('openingStreakClient.current?.record(op.id'));
assert.ok(main.includes("window.removeEventListener('online',retry)"));
assert.ok((await readFile('netlify.toml', 'utf8')).includes('"public/data/repertoire.json"'));
assert.ok((await readFile('scripts/build.mjs', 'utf8')).includes('"dist/src/opening-core.mjs"'));
console.log('PASS: opening queue retries, feature-off retention, errors, concurrency, account isolation and unchanged existing storage.');

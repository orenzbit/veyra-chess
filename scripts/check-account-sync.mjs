import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { mergeAppStateData, mergeProgressData } from '../netlify/functions/sync.mjs';

const source = await readFile('src/account-sync.ts', 'utf8');
const transpiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { normalizeAccountState, mergeAccountState } = await import('data:text/javascript;base64,' + Buffer.from(transpiled).toString('base64'));

const local = normalizeAccountState({
  archiveReviews: {
    old: { accuracy: 71.2, reviewedAt: '2026-01-01T00:00:00Z' },
    shared: { accuracy: 50, reviewedAt: '2026-02-01T00:00:00Z' },
    bad: { accuracy: 900, reviewedAt: 'not-a-date' },
    negative: { accuracy: -1, reviewedAt: '2026-03-01T00:00:00Z' },
  },
  usernames: { chesscom: 'LocalUser', lichess: 'LocalLichess' },
  language: 'he',
  adaptiveOptIn: false,
});
assert.equal(local.archiveReviews.old.accuracy, 71.2);
assert.equal(local.archiveReviews.bad, undefined);
assert.equal(local.archiveReviews.negative, undefined);

const remote = {
  archiveReviews: {
    shared: { accuracy: 94, reviewedAt: '2026-03-01T00:00:00Z' },
    remoteOnly: { accuracy: 88, reviewedAt: '2026-02-15T00:00:00Z' },
    tooHigh: { accuracy: 101, reviewedAt: '2026-03-02T00:00:00Z' },
  },
  usernames: { chesscom: 'RemoteUser', lichess: '' },
  language: 'en',
  adaptiveOptIn: true,
};
const merged = mergeAccountState(local, remote);
assert.equal(merged.archiveReviews.old.accuracy, 71.2, 'local-only review must survive');
assert.equal(merged.archiveReviews.shared.accuracy, 94, 'newer remote review must win');
assert.equal(merged.archiveReviews.remoteOnly.accuracy, 88, 'remote-only review must sync');
assert.equal(merged.archiveReviews.tooHigh, undefined, 'invalid remote accuracy must be rejected');
assert.equal(merged.usernames.chesscom, 'RemoteUser', 'account username wins over older device state');
assert.equal(merged.usernames.lichess, 'LocalLichess', 'empty remote value must not erase local data');
assert.equal(merged.language, 'en');
assert.equal(merged.adaptiveOptIn, true);

const many = {};
for (let i = 0; i < 650; i++) many['game-' + i] = { accuracy: i % 101, reviewedAt: new Date(Date.UTC(2026, 0, 1) + i * 1000).toISOString() };
const bounded = normalizeAccountState({ archiveReviews: many });
assert.equal(Object.keys(bounded.archiveReviews).length, 500, 'review history should be bounded');
assert.ok(bounded.archiveReviews['game-649'], 'most recent review should be preserved');
assert.ok(!bounded.archiveReviews['game-0'], 'oldest review should be evicted first');

const serverProgress = mergeProgressData(
  { done: { lineA: 2, shared: 3 }, completed: { lineA: 1 }, bot: 4 },
  { done: { lineB: 5, shared: 1 }, completed: { lineB: 2 }, bot: 7 },
);
assert.deepEqual(serverProgress.done, { lineA: 2, shared: 3, lineB: 5 }, 'server merge must preserve progress from both devices and keep highest counts');
assert.deepEqual(serverProgress.completed, { lineA: 1, lineB: 2 });
assert.equal(serverProgress.bot, 7, 'server merge must keep the furthest bot progression');

const mergedServerState = mergeAppStateData(
  { archiveReviews: { old: { accuracy: 70, reviewedAt: '2026-01-01T00:00:00Z' }, shared: { accuracy: 40, reviewedAt: '2026-01-01T00:00:00Z' } }, usernames: { chesscom: 'A', lichess: 'L' }, language: 'he', adaptiveOptIn: false },
  { archiveReviews: { new: { accuracy: 91, reviewedAt: '2026-02-01T00:00:00Z' }, shared: { accuracy: 95, reviewedAt: '2026-03-01T00:00:00Z' } }, usernames: { chesscom: 'B', lichess: '' }, language: 'en', adaptiveOptIn: true },
);
assert.equal(mergedServerState.archiveReviews.old.accuracy, 70, 'server merge must preserve reviews only on the first device');
assert.equal(mergedServerState.archiveReviews.new.accuracy, 91, 'server merge must preserve reviews only on the second device');
assert.equal(mergedServerState.archiveReviews.shared.accuracy, 95, 'newer review must win on server');
assert.equal(mergedServerState.usernames.chesscom, 'B');
assert.equal(mergedServerState.language, 'en');
assert.equal(mergedServerState.adaptiveOptIn, true);

const sync = await readFile('netlify/functions/sync.mjs', 'utf8');
for (const token of ['currentSession(event)', 'sameOrigin(event)', 'user_app_state', 'body.appState', 'MAX_APP_STATE_BYTES', 'sanitizeAppState', 'mergeProgressData', 'mergeAppStateData']) {
  assert.ok(sync.includes(token), 'sync endpoint missing safety/feature token: ' + token);
}
assert.ok(!/body\.user_id|body\.userId/.test(sync), 'client must never select account owner id');

const schema = await readFile('public/data/supabase-schema.sql', 'utf8');
assert.ok(schema.includes('create table if not exists public.user_app_state'), 'account-state migration must be documented');
assert.ok(schema.includes('alter table public.user_app_state enable row level security'), 'account state must have RLS enabled');
assert.ok(schema.includes('revoke all on table public.user_app_state from public, anon, authenticated'), 'browser roles must not directly access account state');

const main = await readFile('src/main.ts', 'utf8');
for (const token of ['mergeAccountState', 'setSyncSettingsUserId', 'veyra_archive_reviews_v1', 'appState', 'tabia-language-change', 'ACCOUNT_SYNC_OWNER_KEY', 'previousOwner', 'mayImportLocal', 'localStorage.setItem(BOT_PROGRESS_KEY,String(remoteBot))', 'fetch(\'/api/sync\'', 'archiveReviews:next']) {
  assert.ok(main.includes(token), 'client sync integration missing: ' + token);
}
assert.ok(main.includes('if(!mayImportLocal)'), 'switching accounts must reset device-local bot progress to the current account');
assert.ok(main.includes('const mayImportLocal=!previousOwner||previousOwner===userId;'), 'account state must be imported locally only for the current owner');
assert.ok(schema.includes('grant select, insert, update, delete on table public.user_progress, public.user_games to service_role'), 'server role must be able to access progress and saved games');
console.log('PASS: account-state validation, recency merge, 500-review bound, account isolation, archive accuracy upload, server grants, ownership boundary, RLS and client sync wiring.');

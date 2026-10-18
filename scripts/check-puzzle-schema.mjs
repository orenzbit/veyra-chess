// Static check of the puzzle-engine SQL and config. Does not touch any database.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sql = await readFile(join(root, 'public/data/supabase-schema.sql'), 'utf8');
const cfg = await import(pathToFileURL(join(root, 'netlify/functions/lib/puzzle-config.mjs')).href);

const tables = ['user_puzzles', 'user_puzzle_state', 'puzzle_attempts', 'puzzle_rush_runs', 'puzzle_jobs', 'puzzle_game_log'];
for (const t of tables) {
  assert.match(sql, new RegExp(`create table if not exists public\\.${t} \\(`), `table ${t} missing`);
  assert.match(sql, new RegExp(`alter table public\\.${t} enable row level security`), `RLS missing for ${t}`);
  const grant = sql.match(/grant select, insert, update, delete on table ([^;]+) to service_role;/g) || [];
  assert.ok(grant.some((g) => g.includes(`public.${t}`)), `service_role grant missing for ${t}`);
  const revoke = sql.match(/revoke all on table ([^;]+) from public, anon, authenticated;/g) || [];
  assert.ok(revoke.some((g) => g.includes(`public.${t}`)), `revoke missing for ${t}`);
}
// No policy may exist for the browser roles on these tables.
for (const t of tables) assert.doesNotMatch(sql, new RegExp(`create policy[^;]*public\\.${t}`, 'i'), `policy found on ${t}`);
assert.match(sql, /puzzle_jobs_one_active_idx[\s\S]*where status in \('queued','running'\)/, 'one-active-job index missing');
assert.match(sql, /accepted text\[\] not null default '\{\}'/, 'accepted column missing');
assert.match(sql, /unique \(user_id, puzzle_id\)/, 'per-user puzzle uniqueness missing');

assert.equal(cfg.KIT_REGULAR, 15);
assert.equal(cfg.KIT_RUSH, 30);
assert.ok(cfg.POOL_CAP >= cfg.POOL_TARGET && cfg.POOL_TARGET >= cfg.POOL_LOW_WATER);
assert.equal(cfg.ambiguousLimit(30), 5);
assert.equal(cfg.ambiguousLimit(5), 3);
assert.equal(cfg.puzzlesEnabledFor('u1', {}), false);
assert.equal(cfg.puzzlesEnabledFor('u1', { PUZZLES_SERVER_ENABLED: '1' }), true);
assert.equal(cfg.puzzlesEnabledFor('u1', { PUZZLES_SERVER_ENABLED: '1', PUZZLES_ALLOWLIST: 'u2' }), false);
assert.equal(cfg.puzzlesEnabledFor('U2', { PUZZLES_SERVER_ENABLED: 'true', PUZZLES_ALLOWLIST: 'u2' }), true);
console.log('PASS: puzzle SQL (6 tables, RLS, service_role only, one-active-job index) and config flags.');

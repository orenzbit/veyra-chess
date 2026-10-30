import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const schema = await readFile('public/data/supabase-schema.sql', 'utf8');
const games = schema.slice(schema.indexOf('create table if not exists public.user_chess_dna_games'));
const reports = schema.slice(schema.indexOf('create table if not exists public.user_chess_dna_reports'));
assert.ok(games.includes('user_id uuid not null references auth.users(id) on delete cascade'));
assert.ok(games.includes('primary key (user_id, fingerprint, engine_version, analysis_schema_version)'));
assert.ok(games.includes('fingerprint text not null check (fingerprint ~'));
assert.ok(reports.includes('user_id uuid not null references auth.users(id) on delete cascade'));
assert.ok(reports.includes('primary key (user_id, report_id)'));
assert.ok(schema.includes('alter table public.user_chess_dna_games enable row level security'));
assert.ok(schema.includes('alter table public.user_chess_dna_reports enable row level security'));
assert.ok(schema.includes('revoke all on table public.user_chess_dna_games, public.user_chess_dna_reports from public, anon, authenticated'));
assert.ok(schema.includes('grant select, insert, update, delete on table public.user_chess_dna_games, public.user_chess_dna_reports to service_role'));
assert.ok(schema.includes('user_chess_dna_games_user_updated_idx'));
assert.ok(schema.includes('user_chess_dna_reports_user_created_idx'));
console.log('PASS: Chess DNA schema has account cascade, idempotency keys, RLS, service-only grants and lookup indexes.');

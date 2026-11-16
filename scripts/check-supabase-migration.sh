#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
container="veyra-migration-test-$$"
trap 'docker rm -f "$container" >/dev/null 2>&1 || true' EXIT
docker run --rm -d --name "$container" -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17 >/dev/null
ready=false
for _ in {1..60}; do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
$ready || { echo 'Postgres did not start'; exit 1; }
psql_local() { docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres "$@"; }
psql_local >/dev/null <<'SQL'
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create table auth.users(id uuid primary key);
create table auth.identities(user_id uuid,provider text);
create table auth.sessions(id uuid,not_after timestamptz);
grant usage on schema public to anon,authenticated,service_role;
SQL
psql_local < public/data/supabase-schema.sql >/dev/null
# Simulate the observed live DB: ten absent feature tables and missing server grants.
psql_local >/dev/null <<'SQL'
drop table public.user_puzzles,public.user_puzzle_state,public.puzzle_attempts,public.puzzle_rush_runs,public.puzzle_jobs,public.puzzle_game_log,public.user_chess_dna_games,public.user_chess_dna_reports,public.user_daily_streak_settings,public.user_daily_streak_events;
revoke select,insert,update,delete on public.telemetry_events,public.adaptive_signals,public.bot_overrides,public.user_profiles,public.user_consents,public.user_training_events,public.signup_access_codes from service_role;
revoke all on sequence public.telemetry_events_id_seq,public.adaptive_signals_id_seq,public.user_consents_id_seq,public.user_training_events_id_seq from service_role;
insert into public.bot_overrides(slug,payload) values ('preserve','{"keep":true}');
SQL
migration=supabase/migrations/20261116214055_restore_feature_tables_and_server_grants.sql
psql_local -1 < "$migration" >/dev/null
psql_local < scripts/fixtures/supabase/verify-feature-tables.sql >/dev/null
# Reapplying after populated tables must preserve data and tolerate existing objects.
psql_local -1 < "$migration" >/dev/null
psql_local >/dev/null <<'SQL'
do $$ begin
  if (select payload from public.bot_overrides where slug='preserve') <> '{"keep":true}'::jsonb then raise exception 'existing data changed'; end if;
  if (select count(*) from public.user_chess_dna_reports) <> 1 then raise exception 'new data lost'; end if;
end $$;
SQL
# Validate the full snapshot in a separate fresh database as well.
psql_local -c 'create database fresh' >/dev/null
psql_local -d fresh >/dev/null <<'SQL'
create schema auth;
create table auth.users(id uuid primary key);
create table auth.identities(user_id uuid,provider text);
create table auth.sessions(id uuid,not_after timestamptz);
grant usage on schema public to anon,authenticated,service_role;
SQL
psql_local -d fresh < public/data/supabase-schema.sql >/dev/null
psql_local -d fresh -1 < "$migration" >/dev/null
psql_local -d fresh < scripts/fixtures/supabase/verify-feature-tables.sql >/dev/null
echo 'PASS: Postgres 17 migration, server writes/generated IDs, browser denial, uniqueness, reapply/data preservation and schema snapshot'

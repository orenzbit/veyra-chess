-- Restore tables already required by the shipped app; preserve existing rows.
-- Personal puzzle engine (server-only access via Netlify /api/puzzles*). Do not expose to browser roles.
create table if not exists public.user_puzzles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  puzzle_id text not null,
  fen text not null,
  solution text[] not null,
  accepted text[] not null default '{}',
  played text not null default '',
  motif text not null default 'general',
  phase text not null default 'middlegame',
  class text not null,
  severity real not null,
  rating integer not null,
  origin text not null default 'harvest',
  source jsonb not null default '{}'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  next_due timestamptz not null default now(),
  status text not null default 'active',
  engine_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, puzzle_id),
  constraint user_puzzles_status_chk check (status in ('active','mastered','retired')),
  constraint user_puzzles_class_chk check (class in ('mistake','blunder')),
  constraint user_puzzles_phase_chk check (phase in ('opening','middlegame','endgame')),
  constraint user_puzzles_origin_chk check (origin in ('harvest','seed'))
);
create index if not exists user_puzzles_user_status_due_idx on public.user_puzzles(user_id, status, next_due);
create index if not exists user_puzzles_user_game_idx on public.user_puzzles(user_id, ((source->>'gameKey')));

create table if not exists public.user_puzzle_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  kits jsonb not null default '{}'::jsonb,
  rush_best integer not null default 0,
  counters jsonb not null default '{}'::jsonb,
  cursors jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.puzzle_attempts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  puzzle_id text not null,
  mode text not null,
  solved boolean not null,
  ms integer not null,
  move text not null,
  via_alt boolean not null default false,
  attempted_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint puzzle_attempts_mode_chk check (mode in ('regular','rush','streak'))
);
create index if not exists puzzle_attempts_user_time_idx on public.puzzle_attempts(user_id, attempted_at desc);

create table if not exists public.puzzle_rush_runs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  score integer not null,
  strikes integer not null,
  duration_ms integer not null,
  puzzle_ids text[] not null default '{}',
  started_at timestamptz not null,
  ended_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists puzzle_rush_runs_user_idx on public.puzzle_rush_runs(user_id, ended_at desc);

create table if not exists public.puzzle_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  status text not null default 'queued',
  params jsonb not null default '{}'::jsonb,
  progress jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  error text,
  lease_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint puzzle_jobs_kind_chk check (kind in ('dna','refill')),
  constraint puzzle_jobs_status_chk check (status in ('queued','running','done','failed','cancelled'))
);
create unique index if not exists puzzle_jobs_one_active_idx on public.puzzle_jobs(user_id) where status in ('queued','running');

create table if not exists public.puzzle_game_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_key text not null,
  provider text not null,
  analyzed_at timestamptz not null default now(),
  plies_scanned integer not null default 0,
  candidates integer not null default 0,
  puzzles_added integer not null default 0,
  skip_reason text,
  engine_version integer not null default 1,
  primary key (user_id, game_key)
);

alter table public.user_puzzles enable row level security;
alter table public.user_puzzle_state enable row level security;
alter table public.puzzle_attempts enable row level security;
alter table public.puzzle_rush_runs enable row level security;
alter table public.puzzle_jobs enable row level security;
alter table public.puzzle_game_log enable row level security;

revoke all on table public.user_puzzles, public.user_puzzle_state, public.puzzle_attempts,
  public.puzzle_rush_runs, public.puzzle_jobs, public.puzzle_game_log from public, anon, authenticated;
grant select, insert, update, delete on table public.user_puzzles, public.user_puzzle_state,
  public.puzzle_attempts, public.puzzle_rush_runs, public.puzzle_jobs, public.puzzle_game_log to service_role;

-- Private per-account Chess DNA cache and immutable report snapshots.
-- Application access is server-only through /api/chess-dna; no browser policies.
create table if not exists public.user_chess_dna_games (
  user_id uuid not null references auth.users(id) on delete cascade,
  fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
  engine_version text not null,
  analysis_schema_version integer not null check (analysis_schema_version > 0),
  game_json jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, fingerprint, engine_version, analysis_schema_version)
);

create index if not exists user_chess_dna_games_user_updated_idx
  on public.user_chess_dna_games(user_id, updated_at desc);

create table if not exists public.user_chess_dna_reports (
  user_id uuid not null references auth.users(id) on delete cascade,
  report_id uuid not null,
  report_schema_version integer not null check (report_schema_version > 0),
  report_json jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, report_id)
);

create index if not exists user_chess_dna_reports_user_created_idx
  on public.user_chess_dna_reports(user_id, created_at desc);

alter table public.user_chess_dna_games enable row level security;
alter table public.user_chess_dna_reports enable row level security;
revoke all on table public.user_chess_dna_games, public.user_chess_dna_reports from public, anon, authenticated;
grant select, insert, update, delete on table public.user_chess_dna_games, public.user_chess_dna_reports to service_role;

-- Daily streak: server-verified learning activity only. Keep browser roles denied.
create table if not exists public.user_daily_streak_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timezone_id text not null default 'UTC',
  pending_timezone_id text,
  timezone_change_requested_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint user_daily_streak_timezone_length_chk check (length(timezone_id) between 1 and 100),
  constraint user_daily_streak_pending_timezone_length_chk check (pending_timezone_id is null or length(pending_timezone_id) between 1 and 100)
);

create table if not exists public.user_daily_streak_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null,
  activity_type text not null,
  source_id text not null,
  completed_at timestamptz not null default now(),
  local_date date not null,
  timezone_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id),
  constraint user_daily_streak_activity_type_chk check (activity_type in ('puzzle', 'training'))
);

create index if not exists user_daily_streak_events_user_date_idx
  on public.user_daily_streak_events(user_id, local_date desc);
create index if not exists user_daily_streak_events_user_completed_idx
  on public.user_daily_streak_events(user_id, completed_at desc);
-- Keep at most one puzzle and one training qualification row per local date.
create unique index if not exists user_daily_streak_events_user_date_type_uidx
  on public.user_daily_streak_events(user_id, local_date, activity_type);

alter table public.user_daily_streak_settings enable row level security;
alter table public.user_daily_streak_events enable row level security;
revoke all on table public.user_daily_streak_settings, public.user_daily_streak_events from public, anon, authenticated;
grant select, insert, update, delete on table public.user_daily_streak_settings, public.user_daily_streak_events to service_role;

-- Explicit privileges for the existing server-only Netlify endpoints.
revoke all on table public.telemetry_events, public.adaptive_signals, public.bot_overrides,
  public.user_profiles, public.user_consents, public.user_training_events,
  public.signup_access_codes from public, anon, authenticated;
grant select, insert on table public.telemetry_events, public.adaptive_signals to service_role;
grant select, insert, update on table public.bot_overrides, public.signup_access_codes to service_role;
grant select, insert, delete on table public.user_profiles, public.user_consents,
  public.user_training_events to service_role;

-- Table INSERT grants do not grant access to their generated-ID sequences.
revoke all on sequence public.telemetry_events_id_seq, public.adaptive_signals_id_seq,
  public.user_consents_id_seq, public.user_training_events_id_seq from public, anon, authenticated;
grant usage, select on sequence public.telemetry_events_id_seq, public.adaptive_signals_id_seq,
  public.user_consents_id_seq, public.user_training_events_id_seq to service_role;

notify pgrst, 'reload schema';

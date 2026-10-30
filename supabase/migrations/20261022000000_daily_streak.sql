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

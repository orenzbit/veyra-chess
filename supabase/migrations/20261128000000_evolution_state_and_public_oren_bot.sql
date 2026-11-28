-- Evolution state (private per-user personal bot, Past-You, hybrid courses, 5-game follow-ups, daily micro-loop)
-- plus public Oren Bot versions (readable publicly via server endpoint; writable ONLY by server-verified owner).
-- Idempotent and safe to reapply on live databases.

create table if not exists public.user_evolution_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state_json jsonb not null default '{}'::jsonb,
  revision integer not null default 1,
  last_scan_ts bigint not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists user_evolution_state_updated_idx
  on public.user_evolution_state(updated_at desc);

create table if not exists public.public_oren_bot_versions (
  slug text primary key default 'orenzbit',
  active_version text not null,
  active_payload jsonb not null,
  past_payload jsonb,
  quality_gate jsonb not null default '{}'::jsonb,
  published_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.user_evolution_state enable row level security;
alter table public.public_oren_bot_versions enable row level security;

revoke all on table public.user_evolution_state, public.public_oren_bot_versions from public, anon, authenticated;
grant select, insert, update, delete on table public.user_evolution_state, public.public_oren_bot_versions to service_role;

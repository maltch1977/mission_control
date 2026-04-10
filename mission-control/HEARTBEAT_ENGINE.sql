-- Heartbeat Engine schema for Mission Control
-- Run in Supabase SQL editor for tbhesdzwefgntxeublnb

create table if not exists public.heartbeat_runs (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  status text not null check (status in ('active','delayed','disabled','error')),
  duration_ms integer,
  supermemory_ok boolean,
  warning_count integer default 0,
  error_count integer default 0,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_heartbeat_runs_ran_at on public.heartbeat_runs (ran_at desc);

create table if not exists public.heartbeat_checks (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.heartbeat_runs(id) on delete cascade,
  check_key text not null,
  result text not null check (result in ('pass','fail','skipped')),
  message text,
  completed_at timestamptz not null default now(),
  unique (run_id, check_key)
);

create index if not exists idx_heartbeat_checks_run_id on public.heartbeat_checks (run_id);
create index if not exists idx_heartbeat_checks_check_key on public.heartbeat_checks (check_key);

-- Optional quick seed row (delete in production)
-- insert into public.heartbeat_runs (status, supermemory_ok, warning_count, error_count, notes)
-- values ('active', true, 0, 0, 'seed');

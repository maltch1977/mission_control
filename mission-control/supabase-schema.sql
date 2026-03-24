create extension if not exists pgcrypto;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  owner text not null check (owner in ('Chad','Panda')),
  project text not null default 'General',
  updated text not null default 'just now',
  priority text not null check (priority in ('high','med','low')),
  status text not null check (status in ('recurring','backlog','in-progress','review','done')),
  due_date date null,
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.activity (
  id uuid primary key default gen_random_uuid(),
  agent text not null,
  text text not null,
  time_label text,
  created_at timestamptz not null default now()
);

create table if not exists public.scheduled_runs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cadence text not null,
  next_run text not null,
  owner text not null default 'Panda',
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;
alter table public.activity enable row level security;
alter table public.scheduled_runs enable row level security;

drop policy if exists tasks_all_anon on public.tasks;
create policy tasks_all_anon on public.tasks for all to anon using (true) with check (true);

drop policy if exists activity_all_anon on public.activity;
create policy activity_all_anon on public.activity for all to anon using (true) with check (true);

drop policy if exists scheduled_runs_all_anon on public.scheduled_runs;
create policy scheduled_runs_all_anon on public.scheduled_runs for all to anon using (true) with check (true);

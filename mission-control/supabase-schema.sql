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

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  status text not null default 'Planning' check (status in ('Active','Planning','Paused')),
  owner text not null default 'Panda',
  priority text not null default 'medium' check (priority in ('high','medium','low')),
  created_at timestamptz not null default now()
);

create table if not exists public.memory_entries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date_key date not null,
  summary text not null default '',
  content text not null default '',
  word_count int not null default 0,
  updated_ago text not null default 'just now',
  tags jsonb not null default '[]'::jsonb,
  source text not null default 'manual' check (source in ('manual','heartbeat','task','chat')),
  importance text not null default 'med' check (importance in ('high','med','low')),
  created_at timestamptz not null default now()
);

create table if not exists public.long_term_memory (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null default '',
  updated_ago text not null default 'just now',
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric(10,2) not null,
  account text not null check (account in ('Brex','SoFi','Mercury')),
  billing_cycle text null check (billing_cycle in ('monthly','yearly','weekly','unknown')),
  renewal_date date null,
  status text not null default 'active' check (status in ('active','canceling','canceled','trial')),
  category text null,
  owner text null,
  cancel_url text null,
  notes text null,
  created_at timestamptz not null default now()
);

create table if not exists public.agents_org (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  role text not null,
  model text not null,
  status text not null default 'idle' check (status in ('idle','working','blocked','review')),
  last_active text not null default 'just now',
  mission text null,
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;
alter table public.activity enable row level security;
alter table public.scheduled_runs enable row level security;
alter table public.projects enable row level security;
alter table public.memory_entries enable row level security;
alter table public.long_term_memory enable row level security;
alter table public.subscriptions enable row level security;
alter table public.agents_org enable row level security;

drop policy if exists tasks_all_anon on public.tasks;
create policy tasks_all_anon on public.tasks for all to anon using (true) with check (true);

drop policy if exists activity_all_anon on public.activity;
create policy activity_all_anon on public.activity for all to anon using (true) with check (true);

drop policy if exists scheduled_runs_all_anon on public.scheduled_runs;
create policy scheduled_runs_all_anon on public.scheduled_runs for all to anon using (true) with check (true);

drop policy if exists projects_all_anon on public.projects;
create policy projects_all_anon on public.projects for all to anon using (true) with check (true);

drop policy if exists memory_entries_all_anon on public.memory_entries;
create policy memory_entries_all_anon on public.memory_entries for all to anon using (true) with check (true);

drop policy if exists long_term_memory_all_anon on public.long_term_memory;
create policy long_term_memory_all_anon on public.long_term_memory for all to anon using (true) with check (true);

drop policy if exists subscriptions_all_anon on public.subscriptions;
create policy subscriptions_all_anon on public.subscriptions for all to anon using (true) with check (true);

drop policy if exists agents_org_all_anon on public.agents_org;
create policy agents_org_all_anon on public.agents_org for all to anon using (true) with check (true);

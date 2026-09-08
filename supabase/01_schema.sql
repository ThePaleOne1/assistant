-- ============================================================
--  Assistant — schema, security and realtime
--  Run this FIRST, in the Supabase SQL Editor.
--  Safe to run more than once.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
--  lists  (one row for now; the table exists so extra lists can
--          be added later without a migration)
-- ------------------------------------------------------------
create table if not exists public.lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null default 'Todo',
  position    double precision not null default 1000,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
--  items  (a row is either a task or a section header — both
--          live in one ordered list so drag-and-drop is trivial)
-- ------------------------------------------------------------
create table if not exists public.items (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  list_id      uuid not null references public.lists(id) on delete cascade,
  kind         text not null default 'task',
  name         text not null default '',
  note         text not null default '',
  note_colour  text not null default 'none',
  due_date     date,
  collapsed    boolean not null default false,
  position     double precision not null default 1000,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint items_kind_chk check (kind in ('task', 'header'))
);

-- note_colour is deliberately a free text key, not an enum, so you
-- can add new highlight colours in Settings without touching the DB.

create index if not exists items_user_pos_idx
  on public.items (user_id, position);

create index if not exists items_due_idx
  on public.items (user_id, due_date)
  where archived_at is null and due_date is not null;

-- ------------------------------------------------------------
--  settings  (one row per user)
--    reminder_times = minutes past local midnight.
--    465 = 07:45, 960 = 16:00
-- ------------------------------------------------------------
create table if not exists public.settings (
  user_id        uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  ntfy_topic     text,
  timezone       text not null default 'Australia/Sydney',
  reminder_times integer[] not null default '{465,960}',
  app_url        text,          -- optional: makes reminders tappable straight into the app
  prefs          jsonb not null default '{}'::jsonb,
  updated_at     timestamptz not null default now()
);

-- if you already ran an earlier version of this file:
alter table public.settings add column if not exists app_url text;

-- ------------------------------------------------------------
--  notify_log  (stops the same reminder slot firing twice)
--  Server-side only: RLS on, no policies, so the client can
--  never read or write it.
-- ------------------------------------------------------------
create table if not exists public.notify_log (
  user_id     uuid not null references auth.users(id) on delete cascade,
  local_date  date not null,
  slot        integer not null,
  sent_at     timestamptz not null default now(),
  primary key (user_id, local_date, slot)
);

-- ============================================================
--  Row Level Security — you can only ever see your own rows
-- ============================================================
alter table public.lists      enable row level security;
alter table public.items      enable row level security;
alter table public.settings   enable row level security;
alter table public.notify_log enable row level security;

drop policy if exists lists_own on public.lists;
create policy lists_own on public.lists
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists items_own on public.items;
create policy items_own on public.items
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists settings_own on public.settings;
create policy settings_own on public.settings
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- notify_log intentionally has NO policy.

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.lists    to authenticated;
grant select, insert, update, delete on public.items    to authenticated;
grant select, insert, update, delete on public.settings to authenticated;

-- ============================================================
--  Realtime — this is what makes the phone and the PC update
--  each other within a second or so.
-- ============================================================

-- full replica identity so UPDATE/DELETE events carry enough
-- information for the client-side filters to work.
alter table public.items    replica identity full;
alter table public.settings replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'items'
  ) then
    alter publication supabase_realtime add table public.items;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'settings'
  ) then
    alter publication supabase_realtime add table public.settings;
  end if;
exception
  when undefined_object then
    raise notice 'Publication supabase_realtime not found — enable Realtime in the dashboard, then re-run.';
end $$;

-- ============================================================
--  Done. Run 02_reminders.sql next.
-- ============================================================

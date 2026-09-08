-- ============================================================
--  Assistant — time log
--  Run this THIRD, after 01_schema.sql and 02_reminders.sql.
--  Safe to run more than once.
-- ============================================================

-- ------------------------------------------------------------
--  time_entries — one row per thing you did, exactly like a
--  line in the spreadsheet: date, category, what it was, hours.
--
--  Categories are free text, not an enum, so you can rename or
--  add one in Settings without a migration.
--  hours is nullable on purpose: an entry you haven't timed yet
--  (or never will) still belongs in the record.
-- ------------------------------------------------------------
create table if not exists public.time_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  work_date  date not null,
  category   text not null default 'Misc',
  task       text not null default '',
  hours      numeric(6,2),
  position   double precision not null default 1000,
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists time_entries_user_date_idx
  on public.time_entries (user_id, work_date, position);

create index if not exists time_entries_user_cat_idx
  on public.time_entries (user_id, category);

-- ============================================================
--  Row Level Security
-- ============================================================
alter table public.time_entries enable row level security;

drop policy if exists time_entries_own on public.time_entries;
create policy time_entries_own on public.time_entries
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.time_entries to authenticated;

-- ============================================================
--  Realtime, so the grid stays in step across your devices
-- ============================================================
alter table public.time_entries replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'time_entries'
  ) then
    alter publication supabase_realtime add table public.time_entries;
  end if;
exception
  when undefined_object then
    raise notice 'Publication supabase_realtime not found — enable Realtime in the dashboard, then re-run.';
end $$;

-- ============================================================
--  Done. Run 04_seed_timelog.sql next to load your history.
-- ============================================================

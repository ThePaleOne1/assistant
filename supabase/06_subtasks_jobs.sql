-- ============================================================
--  Assistant — sub-tasks and jobs  (for app version 1.7)
--
--  RUN THIS BEFORE UPLOADING 1.7.  Safe to run more than once.
--
--  The app sends each todo item to the database as a whole row.
--  Once 1.7 is live, items carry three new fields; if the columns
--  below don't exist yet, the database rejects those rows and the
--  sync badge turns red ("Needs DB update"). Nothing is lost — the
--  changes wait on the device — but nothing syncs until this runs.
--
--  What the columns are for:
--
--    subtasks   The tick-off checklist inside an item. A small JSON
--               list of { id, text, done }. Kept on the item itself
--               rather than in a table of its own: it's always read
--               and written together with its item, so it syncs,
--               archives, restores and undoes with no extra machinery.
--
--    is_job     Marks an item as a job. A job is an ordinary todo
--               item — it lives in the "Jobs" section of the list —
--               that also appears on the Jobs tab.
--
--    job_notes  The free-form notes you write about a job on the
--               Jobs tab. Separate from the short highlighter note
--               that every item already has.
--
--  No new tables, so no new security rules: the existing ones on
--  items already cover these columns. Realtime picks up new columns
--  on its own.
-- ============================================================

alter table public.items
  add column if not exists subtasks  jsonb   not null default '[]'::jsonb,
  add column if not exists is_job    boolean not null default false,
  add column if not exists job_notes text    not null default '';

comment on column public.items.subtasks is
  'Checklist inside an item: JSON array of {id, text, done}.';
comment on column public.items.is_job is
  'True when this item is a job, shown on the Jobs tab as well as in the list.';
comment on column public.items.job_notes is
  'Free-form notes about a job, written on the Jobs tab.';

-- Nothing to backfill: every existing item simply has an empty
-- checklist, isn't a job, and has no job notes.

-- Check it worked (should return three rows):
--   select column_name, data_type, column_default
--     from information_schema.columns
--    where table_schema = 'public' and table_name = 'items'
--      and column_name in ('subtasks', 'is_job', 'job_notes');

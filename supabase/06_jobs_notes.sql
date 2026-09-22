-- ============================================================
--  Assistant — more than one note per item, and jobs  (app v1.8)
--
--  RUN THIS BEFORE UPLOADING 1.8.  Safe to run more than once, and
--  safe whether or not you ran the earlier 06_subtasks_jobs.sql.
--
--  The app sends each todo item to the database as a whole row.
--  Once 1.8 is live, items carry these fields; if the columns don't
--  exist yet, the database rejects those rows and the sync badge
--  turns red ("Needs DB update"). Nothing is lost — the changes wait
--  on the device — but nothing syncs until this has run.
--
--  What the columns are for:
--
--    extra_notes  An item's second, third... notes. The first note
--                 stays in the existing `note` / `note_colour`
--                 columns, so reminders and everything else that
--                 reads them carry on unchanged. A small JSON list of
--                 { id, text, colour }.
--
--    is_job       Marks an item as a job. A job is an ordinary todo
--                 item — it lives in the "Jobs" section of the list —
--                 that also appears on the Jobs tab, where its notes
--                 are shown as its task list.
--
--    job_notes    The free writing about a job, shown on the Jobs tab
--                 as "Details". (The column keeps the name it was
--                 given first; on screen the word "note" only ever
--                 means the highlighter chips.)
--
--  No new tables, so no new security rules: the existing ones on
--  items already cover these columns. Realtime picks up new columns
--  on its own.
-- ============================================================

alter table public.items
  add column if not exists extra_notes jsonb   not null default '[]'::jsonb,
  add column if not exists is_job      boolean not null default false,
  add column if not exists job_notes   text    not null default '';

comment on column public.items.extra_notes is
  'Second and later notes on an item: JSON array of {id, text, colour}. The first note is note/note_colour.';
comment on column public.items.is_job is
  'True when this item is a job, shown on the Jobs tab as well as in the list.';
comment on column public.items.job_notes is
  'Free writing about a job, shown on the Jobs tab as Details.';

-- If the earlier 06_subtasks_jobs.sql was run, it also added a
-- `subtasks` column, for a checklist that was replaced before it ever
-- went live. It's left alone on purpose: it's empty and harmless, but
-- devices will have been caching rows that include it, and dropping it
-- would make the database reject those rows when they're sent back.

-- Check it worked (should return three rows):
--   select column_name, data_type, column_default
--     from information_schema.columns
--    where table_schema = 'public' and table_name = 'items'
--      and column_name in ('extra_notes', 'is_job', 'job_notes');

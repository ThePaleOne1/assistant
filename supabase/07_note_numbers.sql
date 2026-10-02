-- ============================================================
--  Assistant — a number on a note  (app v1.10)
--
--  RUN THIS BEFORE UPLOADING 1.10.  Safe to run more than once.
--
--  The app sends each todo item to the database as a whole row.
--  Once 1.10 is live, an item whose first note has a number carries
--  `note_num`; if the column doesn't exist yet, the database rejects
--  that row and the sync badge turns red ("Needs DB update"). Nothing
--  is lost — the change waits on the device — but nothing syncs until
--  this has run.
--
--    note_num   The number shown beside an item's first note, or
--               empty for none. It's only a label: the app doesn't
--               sort or renumber by it. The second and later notes
--               keep theirs inside `extra_notes`, as { ..., num }.
--
--  No new tables, so no new security rules. Realtime picks up the new
--  column on its own.
-- ============================================================

alter table public.items
  add column if not exists note_num smallint;

comment on column public.items.note_num is
  'Optional number shown beside the first note (a label only). Later notes keep theirs in extra_notes as num.';

-- Check it worked (should return one row):
--   select column_name, data_type
--     from information_schema.columns
--    where table_schema = 'public' and table_name = 'items'
--      and column_name = 'note_num';

-- ============================================================
--  Assistant — which section a deleted item came from  (app v1.14)
--
--  RUN THIS BEFORE UPLOADING 1.14.  Safe to run more than once.
--
--  Restoring an item from the Archive now puts it back in the section
--  it was deleted from. Its old position alone can't say which that
--  was — a section dragged elsewhere since leaves the old position
--  inside a different section — so deleting records the section here.
--
--  Until this has run, deleting a task is rejected and the sync badge
--  says "Needs DB update"; nothing is lost, the change waits on the
--  device.
--
--    archived_section   the id of the section header the item sat
--                       under when it was deleted, or empty.
--
--  No new tables, so no new security rules. Realtime picks up the new
--  column on its own.
-- ============================================================

alter table public.items
  add column if not exists archived_section text;

comment on column public.items.archived_section is
  'Id of the section header the item was under when it was deleted, so Restore can put it back there.';

-- Check it worked (should return one row):
--   select column_name from information_schema.columns
--    where table_schema = 'public' and table_name = 'items'
--      and column_name = 'archived_section';

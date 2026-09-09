-- ============================================================
--  Assistant — end times on the daily tracker
--  Run this once, after 04_seed_timelog.sql.
--  Safe to run more than once.
--
--  You now type the time a task finished rather than how long it
--  took, and the app works out the duration from the previous
--  row's finish time (or the day's start, 7:30 by default).
--
--  hours is still stored, because everything in Insights is built
--  on it and your 307 imported rows only have hours. Rows without
--  an end time keep working exactly as they did — the app chains
--  through them using their stored hours instead.
-- ============================================================

alter table public.time_entries
  add column if not exists end_time text;

comment on column public.time_entries.end_time is
  'When this task finished, "HH:MM" local. Null for rows imported from the spreadsheet, which only recorded a duration.';

-- Nothing to backfill: the imported rows genuinely have no finish
-- times recorded, and inventing them would put made-up precision
-- into your history. The app shows a derived finish time for those
-- rows in grey instead, so a day still reads top to bottom.

-- Check it worked:
--   select count(*) as rows, count(end_time) as with_end_time
--     from public.time_entries;

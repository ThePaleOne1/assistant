-- ============================================================
--  Assistant — reminder engine
--  Run this SECOND, in the Supabase SQL Editor.
--
--  How it works, in one paragraph:
--  pg_cron wakes up every 5 minutes inside your database and calls
--  send_due_reminders(). That function converts "now" into YOUR
--  local time, checks whether it has just passed one of your
--  reminder times, and if so posts to ntfy.sh — which pushes to
--  the ntfy app on your phone. Nothing runs on your computer, no
--  server to keep alive, no cost.
-- ============================================================

create extension if not exists pg_net;
create extension if not exists pg_cron;
-- If either line errors, enable them from the dashboard instead:
--   Database -> Extensions -> search "pg_net" and "pg_cron" -> toggle on
-- then re-run this file.


-- ------------------------------------------------------------
--  send_ntfy — post a single push notification
-- ------------------------------------------------------------
create or replace function public.send_ntfy(
  p_topic    text,
  p_title    text,
  p_message  text,
  p_priority integer default 3,
  p_tags     text[]  default '{}',
  p_click    text    default null
)
returns bigint
language plpgsql
security definer
set search_path = public, extensions, net
as $fn$
declare
  v_body jsonb;
begin
  v_body := jsonb_build_object(
    'topic',    p_topic,
    'title',    p_title,
    'message',  p_message,
    'priority', p_priority
  );

  if p_tags is not null and coalesce(array_length(p_tags, 1), 0) > 0 then
    v_body := v_body || jsonb_build_object('tags', to_jsonb(p_tags));
  end if;

  if p_click is not null and length(p_click) > 0 then
    v_body := v_body || jsonb_build_object('click', p_click);
  end if;

  return net.http_post(
    url                  := 'https://ntfy.sh',
    body                 := v_body,
    headers              := '{"Content-Type":"application/json"}'::jsonb,
    timeout_milliseconds := 8000
  );
end
$fn$;


-- ------------------------------------------------------------
--  send_due_reminders — the scheduled job
--
--  Pass true to fire immediately regardless of the clock, for
--  testing:   select public.send_due_reminders(true);
-- ------------------------------------------------------------
create or replace function public.send_due_reminders(p_force boolean default false)
returns integer
language plpgsql
security definer
set search_path = public, extensions, net
as $fn$
declare
  v_s        record;
  v_it       record;
  v_local    timestamp;
  v_date     date;
  v_mins     integer;
  v_slot     integer;
  v_over     integer;
  v_prio     integer;
  v_tags     text[];
  v_digest   text;
  v_count    integer;
  v_click    text;
  v_sent     integer := 0;
begin
  for v_s in
    select * from public.settings
    where ntfy_topic is not null and btrim(ntfy_topic) <> ''
  loop
    -- what time is it where you are?
    v_local := (now() at time zone coalesce(nullif(btrim(v_s.timezone), ''), 'Australia/Sydney'));
    v_date  := v_local::date;
    v_mins  := extract(hour from v_local)::int * 60 + extract(minute from v_local)::int;

    -- have we just crossed one of the reminder times? (10 minute window,
    -- because cron runs every 5 minutes)
    if p_force then
      v_slot := -1;
    else
      v_slot := null;
      select t into v_slot
      from unnest(v_s.reminder_times) as t
      where v_mins >= t and v_mins < t + 10
      order by t
      limit 1;
    end if;

    if v_slot is null then
      continue;
    end if;

    -- already handled this slot today?
    if not p_force and exists (
      select 1 from public.notify_log l
      where l.user_id = v_s.user_id
        and l.local_date = v_date
        and l.slot = v_slot
    ) then
      continue;
    end if;

    v_click := nullif(btrim(coalesce(v_s.app_url, '')), '');

    -- ------------------------------------------------------
    --  1. Overdue: one notification each, getting louder
    -- ------------------------------------------------------
    for v_it in
      select
        i.name,
        i.note,
        i.due_date,
        (v_date - i.due_date) as days_over,
        (select h.name
           from public.items h
          where h.user_id = i.user_id
            and h.list_id = i.list_id
            and h.kind = 'header'
            and h.archived_at is null
            and h.position < i.position
          order by h.position desc
          limit 1) as section
      from public.items i
      where i.user_id = v_s.user_id
        and i.kind = 'task'
        and i.archived_at is null
        and i.due_date is not null
        and i.due_date < v_date
      order by i.due_date asc
    loop
      v_over := v_it.days_over;

      if v_over <= 2 then
        v_prio := 4; v_tags := array['warning'];
      elsif v_over <= 7 then
        v_prio := 5; v_tags := array['rotating_light'];
      else
        v_prio := 5; v_tags := array['rotating_light', 'bangbang'];
      end if;

      perform public.send_ntfy(
        v_s.ntfy_topic,
        v_over || (case when v_over = 1 then ' day' else ' days' end) || ' overdue: '
          || coalesce(nullif(btrim(v_it.name), ''), 'Untitled'),
        coalesce(nullif(btrim(v_it.note), '') || E'\n', '')
          || coalesce('Section: ' || v_it.section || E'\n', '')
          || 'Was due ' || to_char(v_it.due_date, 'FMDay FMDD FMMon'),
        v_prio,
        v_tags,
        v_click
      );
      v_sent := v_sent + 1;
    end loop;

    -- ------------------------------------------------------
    --  2. Due today and tomorrow: one digest
    -- ------------------------------------------------------
    select count(*), string_agg(q.line, E'\n' order by q.ord, q.nm)
      into v_count, v_digest
    from (
      select
        case when i.due_date = v_date then 0 else 1 end as ord,
        i.name as nm,
        (case when i.due_date = v_date then '• Today  ' else '• Tomorrow  ' end)
          || coalesce(nullif(btrim(i.name), ''), 'Untitled')
          || coalesce(' — ' || nullif(btrim(i.note), ''), '') as line
      from public.items i
      where i.user_id = v_s.user_id
        and i.kind = 'task'
        and i.archived_at is null
        and i.due_date in (v_date, v_date + 1)
    ) q;

    if coalesce(v_count, 0) > 0 then
      perform public.send_ntfy(
        v_s.ntfy_topic,
        'Due now: ' || v_count || (case when v_count = 1 then ' item' else ' items' end),
        v_digest,
        3,
        array['calendar'],
        v_click
      );
      v_sent := v_sent + 1;
    end if;

    -- remember that this slot is done
    if not p_force then
      insert into public.notify_log (user_id, local_date, slot)
      values (v_s.user_id, v_date, v_slot)
      on conflict do nothing;
    end if;
  end loop;

  -- tidy up
  delete from public.notify_log where local_date < current_date - 30;

  return v_sent;
end
$fn$;


-- ------------------------------------------------------------
--  Nobody but the scheduler should be able to run these.
-- ------------------------------------------------------------
revoke all on function public.send_ntfy(text, text, text, integer, text[], text)
  from public, anon, authenticated;
revoke all on function public.send_due_reminders(boolean)
  from public, anon, authenticated;


-- ------------------------------------------------------------
--  Schedule it: every 5 minutes, forever.
-- ------------------------------------------------------------
do $sched$
begin
  if exists (select 1 from cron.job where jobname = 'assistant-reminders') then
    perform cron.unschedule('assistant-reminders');
  end if;
end
$sched$;

select cron.schedule(
  'assistant-reminders',
  '*/5 * * * *',
  $job$ select public.send_due_reminders(); $job$
);


-- ============================================================
--  Handy checks
-- ============================================================

-- What is scheduled?
--   select jobid, jobname, schedule, active from cron.job;

-- Did the last few runs succeed?
--   select runid, status, return_message, start_time
--     from cron.job_run_details
--    order by start_time desc limit 10;

-- Did ntfy actually accept the pushes? (200 = yes)
--   select id, status_code, content, created
--     from net._http_response
--    order by created desc limit 10;

-- Fire everything right now, ignoring the clock:
--   select public.send_due_reminders(true);

-- Preview what would be sent, without sending:
--   select i.name, i.note, i.due_date, (current_date - i.due_date) as days_over
--     from public.items i
--    where i.kind = 'task' and i.archived_at is null and i.due_date is not null
--    order by i.due_date;

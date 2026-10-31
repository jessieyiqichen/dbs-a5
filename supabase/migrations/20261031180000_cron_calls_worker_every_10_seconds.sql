-- Supabase Cron calls the worker every 10 seconds. Each call checks at most one board, the most overdue one, so the
-- boards' own intervals (boards.interval_seconds) decide how often each site is fetched, not this schedule.
-- The URL is the project's public address, not a secret: the worker needs no key from the caller, and a call when no
-- board is due does nothing (see claim_next_board).
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'board-worker-every-10s',
  '10 seconds',
  $$
  select net.http_post(
    url := 'https://huhlnktlxocphsejyjpm.supabase.co/functions/v1/board-worker',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- Every call leaves a row in cron.job_run_details (8,640 a day). Keep one day of them so the free database stays small.
select cron.schedule(
  'trim-cron-history-daily',
  '15 4 * * *',
  $$ delete from cron.job_run_details where end_time < now() - interval '1 day'; $$
);

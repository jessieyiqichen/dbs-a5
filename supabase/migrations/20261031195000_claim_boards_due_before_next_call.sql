-- Boards set to 60 seconds were checked every 70. last_checked_at is when a run finished, about 0.7 seconds after Cron
-- called, so 60 seconds later the board was still a moment short of due and waited for the next call. A board now
-- counts as due if it will be due within 5 seconds (half of Cron's 10), so it is checked on the call nearest its time.
-- create or replace keeps the function's grants: only the worker may run it.
create or replace function public.claim_next_board() returns setof public.boards
language sql security definer set search_path = '' as $$
  update public.boards b set claimed_at = now()
  where b.id = (
    select id from public.boards
    where enabled
      and coalesce(last_checked_at, 'epoch'::timestamptz) + make_interval(secs => interval_seconds)
        <= now() + interval '5 seconds'
      and (claimed_at is null or claimed_at < now() - interval '60 seconds')
    order by coalesce(last_checked_at, 'epoch'::timestamptz) + make_interval(secs => interval_seconds)
    limit 1
    for update skip locked
  )
  returning b.*;
$$;

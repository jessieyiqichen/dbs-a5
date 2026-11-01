-- Fewer Realtime messages for the same board (free-tier check, 2026-11-01).
--
-- Measured over one hour on 2026-11-01: 257 worker runs wrote 1,712 rows, so an open page received about 2,000
-- messages an hour (one more per run for `boards`). Two causes:
--   1. A score change was two writes: the worker wrote the score, then refresh_rise wrote the rise (550 an hour).
--   2. refresh_rise ran after every run and rewrote every rise whose hour-ago baseline had moved, score or no score:
--      hn_front alone was 1,095 rows an hour, most of them that.
-- Now a trigger sets rise_1h in the same write as the score, and Cron refreshes the standing rises every five minutes
-- instead of the worker after every run (the worker no longer calls refresh_rise). A rise can be up to five minutes
-- behind; the score itself is never behind.

/** The score an item had an hour ago: its last recorded score at or before then, else its first ever, else the score
 *  it has now (nothing recorded: it has not moved since it was first seen). */
create function public.score_hour_ago(p_source text, p_id text, p_score bigint) returns bigint
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select h.score from public.item_history h
      where h.source = p_source and h.external_id = p_id and h.at <= now() - interval '1 hour'
      order by h.at desc limit 1),
    (select h.score from public.item_history h
      where h.source = p_source and h.external_id = p_id
      order by h.at asc limit 1),
    p_score);
$$;

create function public.set_rise() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.rise_1h := new.score - public.score_hour_ago(new.source, new.external_id, new.score);
  return new;
end;
$$;

-- Before the row is written, so the row that reaches every open page already carries its rise
create trigger items_set_rise before insert or update of score on public.items
  for each row execute function public.set_rise();

-- The same refresh, now sharing the baseline rule. create or replace keeps its grants (service_role only).
create or replace function public.refresh_rise(p_board text) returns integer
language sql security definer set search_path = '' as $$
  with base as (
    select i.source, i.external_id, i.score, public.score_hour_ago(i.source, i.external_id, i.score) as before
    from public.board_entries e
    join public.items i on i.source = e.source and i.external_id = e.external_id
    where e.board_id = p_board
  ), changed as (
    update public.items i set rise_1h = b.score - b.before
    from base b
    where i.source = b.source and i.external_id = b.external_id and i.rise_1h is distinct from b.score - b.before
    returning 1
  )
  select count(*)::integer from changed;
$$;

revoke execute on function public.score_hour_ago(text, text, bigint), public.set_rise() from public, anon, authenticated;

-- Standing rises (an item whose score did not move, but whose hour-ago baseline did) catch up every five minutes
select cron.schedule(
  'refresh-rises-every-5-minutes',
  '*/5 * * * *',
  $$ select public.refresh_rise(id) from public.boards where enabled; $$
);

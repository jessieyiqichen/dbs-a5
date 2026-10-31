-- Builder's Board (Assignment 5): the worker's tables, as drawn in docs/data-flow.md. Nudge's four tables are not
-- touched, so the A4 site keeps working on the same project.
-- Leaderboard data is the same for everyone: signed-in people may read it, and only the worker writes it (it uses the
-- secret key, which bypasses RLS, so there are no write policies). Each person's follows are theirs alone.

-- boards: the seven leaderboards, how often each is checked, and how its last check went (the page's freshness)
create table public.boards (
  id text primary key check (id in ('hn_front', 'hn_show', 'github_trending', 'hf_models', 'hf_papers', 'producthunt', 'v2ex_hot')),
  name text not null check (char_length(name) between 1 and 60),
  interval_seconds integer not null check (interval_seconds between 10 and 3600),
  enabled boolean not null default true,
  claimed_at timestamptz,          -- a run is checking it now; stops two overlapping runs fetching the same board
  last_checked_at timestamptz,     -- the last check that finished, ok or not
  last_ok_at timestamptz,
  last_status text check (last_status in ('ok', 'failed')),
  last_error text check (char_length(last_error) <= 500)
);

-- How often: Hacker News moves fastest; V2EX limits calls per hour; the GitHub page and Hugging Face trending change slowly
insert into public.boards (id, name, interval_seconds) values
  ('hn_front', 'Hacker News', 30),
  ('hn_show', 'Show HN', 60),
  ('github_trending', 'GitHub trending', 300),
  ('hf_models', 'Hugging Face models', 300),
  ('hf_papers', 'Daily Papers', 60),
  ('producthunt', 'Product Hunt', 60),
  ('v2ex_hot', 'V2EX', 120);

-- items: one row per thing on any board, stored once even when it sits on two boards
create table public.items (
  source text not null check (source in ('hn', 'github', 'hf_model', 'hf_paper', 'producthunt', 'v2ex')),
  external_id text not null check (char_length(external_id) between 1 and 200),
  title text not null check (char_length(title) between 1 and 300),
  url text not null check (url like 'https://%' and char_length(url) <= 2000),
  subtitle text check (char_length(subtitle) <= 500),
  meta text check (char_length(meta) <= 100),
  score bigint not null default 0 check (score >= 0),
  comments integer check (comments >= 0),
  rise_1h bigint not null default 0,  -- score now minus score an hour ago (or when first seen, if newer)
  first_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (source, external_id)
);

-- board_entries: where each item stands on each board right now
create table public.board_entries (
  board_id text not null references public.boards (id) on delete cascade,
  source text not null,
  external_id text not null,
  rank integer not null check (rank between 1 and 100),
  updated_at timestamptz not null default now(),
  primary key (board_id, source, external_id),
  foreign key (source, external_id) references public.items (source, external_id) on delete cascade
);

-- item_history: an item's score each time it changed; "rise in the last hour" is worked out from it
create table public.item_history (
  id bigint generated always as identity primary key,
  source text not null,
  external_id text not null,
  score bigint not null,
  at timestamptz not null default now(),
  foreign key (source, external_id) references public.items (source, external_id) on delete cascade
);

-- runs: one row per worker run, for the logs and the class demo
create table public.runs (
  id bigint generated always as identity primary key,
  board_id text references public.boards (id) on delete set null,
  started_at timestamptz not null,
  finished_at timestamptz not null default now(),
  ok boolean not null,
  rows_changed integer not null default 0 check (rows_changed >= 0),
  error text check (char_length(error) <= 500)
);

-- follows: which boards and keywords a person follows; user_id is the Clerk user id, filled in by the database
create table public.follows (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub'),
  kind text not null check (kind in ('board', 'keyword')),
  value text not null check (char_length(value) between 1 and 40),
  created_at timestamptz not null default now(),
  check (kind = 'keyword' or value in ('hn_front', 'hn_show', 'github_trending', 'hf_models', 'hf_papers', 'producthunt', 'v2ex_hot')),
  unique (user_id, kind, value)
);

create index board_entries_item_idx on public.board_entries (source, external_id);
create index item_history_item_at_idx on public.item_history (source, external_id, at desc);
create index runs_finished_at_idx on public.runs (finished_at desc);
create index follows_user_id_idx on public.follows (user_id);

alter table public.boards enable row level security;
alter table public.items enable row level security;
alter table public.board_entries enable row level security;
alter table public.item_history enable row level security;
alter table public.runs enable row level security;
alter table public.follows enable row level security;

create policy "Signed-in people read boards" on public.boards for select to authenticated using (true);
create policy "Signed-in people read items" on public.items for select to authenticated using (true);
create policy "Signed-in people read board entries" on public.board_entries for select to authenticated using (true);
create policy "Signed-in people read item history" on public.item_history for select to authenticated using (true);
-- runs has no policy: only the worker reads and writes it

create policy "Read own follows" on public.follows for select to authenticated
  using (((select auth.jwt()) ->> 'sub') = user_id);
create policy "Add own follows" on public.follows for insert to authenticated
  with check (((select auth.jwt()) ->> 'sub') = user_id);
create policy "Delete own follows" on public.follows for delete to authenticated
  using (((select auth.jwt()) ->> 'sub') = user_id);

revoke all on table public.boards, public.items, public.board_entries, public.item_history, public.runs, public.follows
  from anon, authenticated, public;
grant select on table public.boards, public.items, public.board_entries, public.item_history to authenticated;
grant select, insert, delete on table public.follows to authenticated;

-- The worker picks the board whose next check is most overdue and marks it claimed, in one step, so two runs that
-- overlap never fetch the same board. A claim older than 60 seconds is treated as a run that died.
create function public.claim_next_board() returns setof public.boards
language sql security definer set search_path = '' as $$
  update public.boards b set claimed_at = now()
  where b.id = (
    select id from public.boards
    where enabled
      and coalesce(last_checked_at, 'epoch'::timestamptz) + make_interval(secs => interval_seconds) <= now()
      and (claimed_at is null or claimed_at < now() - interval '60 seconds')
    order by coalesce(last_checked_at, 'epoch'::timestamptz) + make_interval(secs => interval_seconds)
    limit 1
    for update skip locked
  )
  returning b.*;
$$;

-- After a run, works out each of the board's items' rise over the last hour and writes only the ones that changed
-- (an unchanged row would still be sent to every open page). Returns how many it wrote.
create function public.refresh_rise(p_board text) returns integer
language sql security definer set search_path = '' as $$
  with base as (
    select i.source, i.external_id, i.score,
      coalesce(
        (select h.score from public.item_history h
          where h.source = i.source and h.external_id = i.external_id and h.at <= now() - interval '1 hour'
          order by h.at desc limit 1),
        (select h.score from public.item_history h
          where h.source = i.source and h.external_id = i.external_id
          order by h.at asc limit 1),
        i.score) as before
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

revoke execute on function public.claim_next_board(), public.refresh_rise(text) from public, anon, authenticated;

-- saves: the items a person keeps (user, 2026-11-01: "can people save the news or products they are interested in").
-- Like follows: user_id is the Clerk user id, filled in by the database from the token, and row-level security lets
-- each person read and change only their own rows. board_id is the board the item was saved from, for its unit and
-- name once it has left the board. Not in the Realtime publication: the page writes and reads its own saves.
create table public.saves (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub'),
  source text not null,
  external_id text not null,
  board_id text not null check (board_id in ('hn_front', 'hn_show', 'github_trending', 'hf_models', 'hf_papers', 'producthunt')),
  saved_at timestamptz not null default now(),
  foreign key (source, external_id) references public.items (source, external_id) on delete cascade,
  unique (user_id, source, external_id)
);

create index saves_user_id_idx on public.saves (user_id);

alter table public.saves enable row level security;

create policy "Read own saves" on public.saves for select to authenticated
  using (((select auth.jwt()) ->> 'sub') = user_id);
create policy "Add own saves" on public.saves for insert to authenticated
  with check (((select auth.jwt()) ->> 'sub') = user_id);
create policy "Delete own saves" on public.saves for delete to authenticated
  using (((select auth.jwt()) ->> 'sub') = user_id);

revoke all on table public.saves from anon, authenticated, public;
grant select, insert, delete on table public.saves to authenticated;

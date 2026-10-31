-- Step 5: the page updates without a refresh. Realtime needs three things for each table; the other two are already in
-- 20261031061000_builders_board_tables.sql (select granted to authenticated, and a policy letting signed-in people read).
-- This adds the third: the tables to the Realtime publication.
--   boards: each check's time and status, for the fresh / stale / down states
--   items: a story's score, comments and rise
--   board_entries: a story's rank on a board, and stories joining or leaving it (its primary key is enough for deletes)
-- item_history and runs stay out: the page never shows them, and every change sent counts against the free tier.
alter publication supabase_realtime add table public.boards, public.items, public.board_entries;

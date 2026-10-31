-- The second worker call failed one step later: "permission denied for table board_entries" (and boards). This project
-- gives service_role no rights on new tables by default, so the worker gets them here: read and write the leaderboard
-- tables. It never touches follows, which stays with each signed-in person under RLS.
grant select, insert, update, delete on table
  public.boards, public.items, public.board_entries, public.item_history, public.runs
  to service_role;

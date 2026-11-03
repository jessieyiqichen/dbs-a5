-- Daily Papers was checked every 60 seconds like the Hacker News boards, but it is the slowest board there is: about
-- 3 score changes an hour over a day (log.md, 2026-11-01), against 378 for the HN front page. Five minutes, the same as
-- the other Hugging Face board and GitHub, as the README has said all along; it also stops the one-board-per-call
-- schedule spending one check in five on a board that has not moved. Stale for this board is now three missed checks
-- of 5 minutes, so 15 minutes without a check, not 3.
update public.boards set interval_seconds = 300 where id = 'hf_papers';

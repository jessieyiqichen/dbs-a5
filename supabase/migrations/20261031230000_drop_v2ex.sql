-- V2EX is dropped (user, 2026-10-31): its hot list is the whole site's, mostly life and career posts, not builders'.
-- Its items go, and with them their ranks and score history (on delete cascade); any follows of it go; then the board,
-- so claim_next_board never picks it again. Its runs stay as a record of what the worker did, with no board.
delete from public.follows where kind = 'board' and value = 'v2ex_hot';
delete from public.items where source = 'v2ex';
delete from public.boards where id = 'v2ex_hot';

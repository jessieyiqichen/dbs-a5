-- The first Cron logs showed the boards' intervals add up to about 5.9 checks a minute, against 6 a minute from one
-- board per 10-second call: Hacker News set to 30 seconds was really checked every 40. At 60 seconds the total is about
-- 4.9 a minute, so every board can be checked on time; front-page points move little in a minute.
update public.boards set interval_seconds = 60 where id = 'hn_front';

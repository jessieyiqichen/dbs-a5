// Builder's Board worker. Supabase Cron calls it every 10 seconds; each call checks the one board whose next check
// is most overdue (or nothing, if none is due), writes only what changed, and records the run.
// It writes with the project's secret key, which Supabase gives the function on its own servers: it is never in code.
// Calling it more often than Cron does cannot make it fetch more: claim_next_board only returns a board that is due.

import { createClient } from "npm:@supabase/supabase-js@2";
import { fetchBoard } from "./lib/fetch.ts";
import { runBoard } from "./lib/run.ts";
import type { BoardId } from "./lib/types.ts";
import { supabaseStore } from "./store.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SECRET_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const json = (body: unknown, status = 200) => Response.json(body, { status });

Deno.serve(async () => {
  if (!SUPABASE_URL || !SECRET_KEY) {
    console.error(JSON.stringify({ ok: false, error: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing" }));
    return json({ ok: false }, 500);
  }
  const db = createClient(SUPABASE_URL, SECRET_KEY, { auth: { persistSession: false } });
  const started = new Date();

  const { data: claimed, error: claimError } = await db.rpc("claim_next_board");
  if (claimError) {
    console.error(JSON.stringify({ ok: false, step: "claim", error: claimError.message }));
    return json({ ok: false }, 500);
  }
  const board = (claimed as { id: BoardId }[] | null)?.[0]?.id;
  if (!board) return json({ ok: true, board: null, note: "no board is due" });

  let result: { fetched: number; changed: number } | null = null;
  let failure: string | null = null;
  try {
    const fetchItems = () => fetchBoard(board, { productHuntToken: Deno.env.get("PRODUCTHUNT_TOKEN") });
    result = await runBoard(board, fetchItems, supabaseStore(db));
  } catch (e) {
    failure = (e instanceof Error ? e.message : String(e)).slice(0, 500);
  }

  const finished = new Date();
  const ok = failure === null;
  const [boardUpdate, runInsert] = await Promise.all([
    db.from("boards").update({
      claimed_at: null,
      last_checked_at: finished.toISOString(),
      last_status: ok ? "ok" : "failed",
      last_error: failure,
      ...(ok ? { last_ok_at: finished.toISOString() } : {}),
    }).eq("id", board),
    db.from("runs").insert({
      board_id: board, started_at: started.toISOString(), finished_at: finished.toISOString(), ok,
      rows_changed: result?.changed ?? 0, error: failure,
    }),
  ]);
  const bookkeeping = boardUpdate.error?.message ?? runInsert.error?.message ?? null;

  const log = {
    board, ok, fetched: result?.fetched ?? 0, changed: result?.changed ?? 0,
    ms: finished.getTime() - started.getTime(), error: failure, bookkeeping,
  };
  (ok && !bookkeeping ? console.log : console.error)(JSON.stringify(log));
  return json(log, ok ? 200 : 502);
});

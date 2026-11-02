"use client";

import type { HourRow } from "@/lib/board/changes";
import { STATE_NOTE } from "@/lib/board/copy";
import { ageLabel, type Freshness } from "@/lib/board/freshness";
import { BOARD_DOMAIN } from "@/lib/board/look";
import type { Board } from "@/lib/board/types";
import { BoardIcon } from "./art/BoardIcon";
import { HourRows } from "./HourRows";

interface Props {
  board: Board;
  state: Freshness;
  /** The board's rows in rank order, each with its own hour. */
  rows: HourRow[];
  keywords: string[];
  now: Date;
  saved: Set<string>;
  onToggleSave: (row: HourRow) => void;
  /** Stops following this board (user, 2026-11-01: taking a board away happens on the board, not on a chooser page). */
  onUnfollow: () => void;
}

/** What the header says about a board's last check, in each of the four states (docs/data-flow.md). */
function stateLine(state: Freshness, board: Board, now: Date): string {
  const age = ageLabel(board.lastCheckedAt, now);
  if (state === "loading") return "waiting for its first check";
  if (state === "stale") return `not updating · checked ${age}`;
  if (state === "down") return `last check failed · ${age}`;
  return `updated ${age}`;
}

/** One leaderboard as a browser window on poster paper (after Aleksandar Savić's windows, docs/references.md): the
 *  site in its title bar, its sign and state, then its ranking, each row with its own hour. */
export function BoardPanel({ board, state, rows, keywords, now, saved, onToggleSave, onUnfollow }: Props) {
  const note = STATE_NOTE[state];
  const quiet = state === "stale" || state === "down";
  return (
    <section aria-labelledby={`board-${board.id}`} className="border-2 border-bh-navy bg-bh-off shadow-[6px_6px_0_var(--color-bh-navy)]">
      <div aria-hidden className="flex items-center gap-1.5 border-b-2 border-bh-navy bg-bh-page px-3 py-1.5 font-bh-mono text-[11px] text-bh-muted">
        {[0, 1, 2].map((i) => <span key={i} className="size-2.5 rounded-full border-[1.5px] border-bh-navy" />)}
        <span className="ml-2 truncate">{BOARD_DOMAIN[board.id]}</span>
      </div>
      <header className={`flex flex-wrap items-center gap-3 border-b-2 border-bh-navy px-4 py-3 ${quiet ? "bh-hatched" : ""}`}>
        {quiet ? (
          <span aria-hidden className="block size-9 shrink-0 border border-dashed border-bh-navy bg-bh-off" />
        ) : (
          <BoardIcon board={board.id} size={36} className="block size-9 shrink-0 border-2 border-bh-navy" />
        )}
        <h3 id={`board-${board.id}`} className="flex-1 text-xl font-extrabold tracking-[-0.02em]">{board.name}</h3>
        <p className="font-bh-mono text-[11px]" aria-live="polite">
          <span aria-hidden className={`mr-1.5 inline-block size-2 ${state === "fresh" ? "rounded-full bg-bh-cobalt" : state === "down" ? "bg-bh-red" : "bg-bh-muted"}`} />
          {stateLine(state, board, now)}
        </p>
        {/* A switch, on: this board is followed (user, 2026-11-01: a state, not a key to press). Flip it to let the
            board go; "+" beside the tabs brings it back. Pointing at it slides the knob over, a preview of off */}
        <button
          type="button"
          role="switch"
          aria-checked
          aria-label={`Following ${board.name}`}
          onClick={onUnfollow}
          className="group flex min-h-11 items-center gap-2 font-bh-mono text-[11px] font-bold focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-bh-navy"
        >
          <span aria-hidden>Following</span>
          <span aria-hidden className="relative block h-5 w-10 border-2 border-bh-navy bg-bh-mustard transition-colors duration-150 group-hover:bg-bh-off group-focus-visible:bg-bh-off motion-reduce:transition-none">
            <span className="absolute inset-y-0 right-0 w-1/2 bg-bh-navy transition-transform duration-150 ease-out group-hover:-translate-x-full group-focus-visible:-translate-x-full motion-reduce:transition-none" />
          </span>
        </button>
      </header>
      {note && (
        <p role="status" className="border-b-2 border-bh-navy bg-bh-mustard px-4 py-2 text-sm font-bold">
          {note}
          {state === "down" && board.lastError && <span className="mt-0.5 block font-bh-mono text-[11px] font-normal">{board.lastError}</span>}
        </p>
      )}
      {state === "loading" && rows.length === 0 ? (
        <p className="px-4 py-6 font-bh-mono text-sm">Nothing yet.</p>
      ) : (
        <HourRows rows={rows} keywords={keywords} now={now} saved={saved} onToggleSave={onToggleSave} />
      )}
    </section>
  );
}

"use client";

import type { ReactNode } from "react";
import type { Changes } from "@/lib/board/changes";
import { STATE_NOTE } from "@/lib/board/copy";
import { ageLabel, type Freshness } from "@/lib/board/freshness";
import { BOARD_DOMAIN } from "@/lib/board/look";
import type { Board } from "@/lib/board/types";
import { BoardIcon } from "./art/BoardIcon";
import { ChangesFeed } from "./ChangesFeed";

interface Props {
  board: Board;
  state: Freshness;
  changes: Changes;
  keywords: string[];
  now: Date;
  /** Shown between the header and the rows: the board's own pulse. */
  pulse?: ReactNode;
  lookedAt: string | null;
  onLooked: () => void;
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
 *  site in its title bar, its sign and state, its pulse, then what changed on it this hour. */
export function BoardPanel({ board, state, changes, keywords, now, pulse, lookedAt, onLooked }: Props) {
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
      </header>
      {note && (
        <p role="status" className="border-b-2 border-bh-navy bg-bh-mustard px-4 py-2 text-sm font-bold">
          {note}
          {state === "down" && board.lastError && <span className="mt-0.5 block font-bh-mono text-[11px] font-normal">{board.lastError}</span>}
        </p>
      )}
      {pulse}
      {state === "loading" && changes.changed.length === 0 && changes.quiet.length === 0 ? (
        <p className="px-4 py-6 font-bh-mono text-sm">Nothing yet.</p>
      ) : (
        <ChangesFeed changes={changes} keywords={keywords} now={now} lookedAt={lookedAt} onLooked={onLooked} />
      )}
    </section>
  );
}

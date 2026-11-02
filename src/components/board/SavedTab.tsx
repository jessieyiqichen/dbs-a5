"use client";

import type { HourRow } from "@/lib/board/changes";
import { SAVED_EMPTY } from "@/lib/board/copy";
import { BOARD_LOOK } from "@/lib/board/look";
import type { BoardId } from "@/lib/board/types";
import { BoardIcon } from "./art/BoardIcon";
import { HourRows } from "./HourRows";
import { LetterHeading } from "./LetterHeading";

interface Props {
  /** The saved items grouped by board (lib/board/saves.ts savedByBoard), newest save first in each. */
  groups: { boardId: BoardId; rows: HourRow[] }[];
  keywords: string[];
  now: Date;
  saved: Set<string>;
  onToggleSave: (row: HourRow) => void;
}

/** The "Saved" tab: what this person kept, grouped by the board each came from (user, 2026-11-01), each row still
 *  drawing its own hour. One window scrolls over all the groups; each group's heading stays while its rows pass. */
export function SavedTab({ groups, keywords, now, saved, onToggleSave }: Props) {
  return (
    <section aria-labelledby="saved-heading">
      {/* No note beside the heading (user, 2026-11-01: "what is this for"); the empty state says what to do */}
      <LetterHeading id="saved-heading" label="Saved" lines={["SAVED"]} />
      <div className="max-h-[34rem] overflow-y-auto overscroll-contain border-2 border-t-0 border-bh-navy bg-bh-off">
        {groups.length === 0 ? (
          <p className="px-4 py-6 font-bh-mono text-sm">{SAVED_EMPTY}</p>
        ) : (
          groups.map(({ boardId, rows }) => (
            <section key={boardId} aria-labelledby={`saved-${boardId}`}>
              <h3 id={`saved-${boardId}`} className="sticky top-0 z-10 flex items-center gap-2 border-y-2 border-bh-navy bg-bh-page px-4 py-2 first:border-t-0">
                <BoardIcon board={boardId} size={20} className="block size-5 shrink-0 border-[1.5px] border-bh-navy" />
                <span className="font-bold">{BOARD_LOOK[boardId].short}</span>
                <span className="font-bh-mono text-[11px] text-bh-muted">{rows.length === 1 ? "1 saved" : `${rows.length} saved`}</span>
              </h3>
              <HourRows rows={rows} keywords={keywords} now={now} showBoard underBoardHeading scroll={false} saved={saved} onToggleSave={onToggleSave} />
            </section>
          ))
        )}
      </div>
    </section>
  );
}

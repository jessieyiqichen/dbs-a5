"use client";

import { changeRows, type Changes, type HourRow } from "@/lib/board/changes";
import { BOARD_LOOK, LETTER_COLORS } from "@/lib/board/look";
import { pulse, type Series } from "@/lib/board/trends";
import type { BoardData, BoardId } from "@/lib/board/types";
import { Shape } from "./art/Shape";
import { HourRows } from "./HourRows";
import { LetterHeading } from "./LetterHeading";
import { PulseScore } from "./PulseScore";
import { TREND_MINUTES } from "./useTrends";

/** Which followed board each shown item belongs to (its first, if it sits on two), for the pulse. */
export function boardOfItems(data: BoardData, boards: BoardId[]): Record<string, BoardId> {
  const boardOf: Record<string, BoardId> = {};
  for (const e of Object.values(data.entries)) if (boards.includes(e.boardId) && !boardOf[e.key]) boardOf[e.key] = e.boardId;
  return boardOf;
}

interface Props {
  data: BoardData;
  boards: BoardId[];
  keywords: string[];
  series: Series;
  now: Date;
  saved: Set<string>;
  onToggleSave: (row: HourRow) => void;
}

/** The "All changes" tab: every followed board's changes this hour in one feed, then the pulse of all of them. */
export function RisingTab({ data, boards, keywords, series, now, saved, onToggleSave }: Props) {
  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="changes-heading">
        <LetterHeading id="changes-heading" label="All changes" lines={["CHANGES"]}>
          <Pictograms boards={boards} />
        </LetterHeading>
        <div className="border-2 border-t-0 border-bh-navy bg-bh-off">
          <HourRows {...feedRows(changeRows(data, boards, series))} keywords={keywords} now={now} showBoard saved={saved} onToggleSave={onToggleSave} />
        </div>
      </section>
      <section aria-labelledby="pulse-heading">
        <LetterHeading id="pulse-heading" label="Pulse, the last hour" lines={["PULSE"]}>
          <p className="max-w-xs font-bh-mono text-[11px] text-bh-off">One note for each change on your boards, minute by minute.</p>
        </LetterHeading>
        <PulseScore marks={pulse(series, boardOfItems(data, boards), now, TREND_MINUTES)} boards={boards} />
      </section>
    </div>
  );
}

const feedRows = ({ changed, quiet }: Changes) => ({ rows: changed, quiet });

/** A row of the followed boards' shapes in the heading colours, as the Accessibility poster sets its pictograms. */
function Pictograms({ boards }: { boards: BoardId[] }) {
  return (
    <div aria-hidden className="flex flex-wrap gap-3">
      {boards.map((b, i) => <Shape key={b} shape={BOARD_LOOK[b].shape} color="off" fill={LETTER_COLORS[i % LETTER_COLORS.length]} size={44} />)}
    </div>
  );
}

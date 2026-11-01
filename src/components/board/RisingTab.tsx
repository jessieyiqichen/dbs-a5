"use client";

import { risingNow } from "@/lib/board/live";
import { BOARD_LOOK, LETTER_COLORS } from "@/lib/board/look";
import { pulse, type Series } from "@/lib/board/trends";
import type { BoardData, BoardId } from "@/lib/board/types";
import { Shape } from "./art/Shape";
import { LetterHeading } from "./LetterHeading";
import { PulseScore } from "./PulseScore";
import { RisingBlocks } from "./RisingBlocks";
import { TREND_MINUTES } from "./useTrends";

/** Which followed board each shown item belongs to (its first, if it sits on two), for the pulse. */
export function boardOfItems(data: BoardData, boards: BoardId[]): Record<string, BoardId> {
  const boardOf: Record<string, BoardId> = {};
  for (const e of Object.values(data.entries)) if (boards.includes(e.boardId) && !boardOf[e.key]) boardOf[e.key] = e.boardId;
  return boardOf;
}

/** The "Rising now" tab: every followed board's fastest riser, then the pulse of all of them together. */
export function RisingTab({ data, boards, series, now }: { data: BoardData; boards: BoardId[]; series: Series; now: Date }) {
  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="rising-heading">
        <LetterHeading id="rising-heading" label="Rising now" lines={["RISING-", "NOW"]}>
          <Pictograms boards={boards} />
        </LetterHeading>
        <RisingBlocks risers={risingNow(data, boards)} series={series} />
      </section>
      <section aria-labelledby="pulse-heading">
        <LetterHeading id="pulse-heading" label="Pulse, the last hour" lines={["PULSE"]}>
          <p className="max-w-xs font-bh-mono text-[11px] text-bh-off">One note for each change on your boards&apos; top rows, minute by minute.</p>
        </LetterHeading>
        <PulseScore marks={pulse(series, boardOfItems(data, boards), now, TREND_MINUTES)} boards={boards} />
      </section>
    </div>
  );
}

/** A row of the followed boards' shapes in the heading colours, as the Accessibility poster sets its pictograms. */
function Pictograms({ boards }: { boards: BoardId[] }) {
  return (
    <div aria-hidden className="flex flex-wrap gap-3">
      {boards.map((b, i) => <Shape key={b} shape={BOARD_LOOK[b].shape} color="off" fill={LETTER_COLORS[i % LETTER_COLORS.length]} size={44} />)}
    </div>
  );
}

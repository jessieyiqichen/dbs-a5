"use client";

import { BOARD_LOOK, LETTER_COLORS } from "@/lib/board/look";
import type { PulseMark } from "@/lib/board/trends";
import type { BoardId } from "@/lib/board/types";
import { BoardIcon } from "./art/BoardIcon";

/** The last hour as a score: one stave per board, one column per minute, a note where the board changed (bigger for
 *  more changes). Each board's rhythm can be read at a glance; the newest column is on the right. The counts are
 *  summed in words for assistive technology. */
export function PulseScore({ marks, boards }: { marks: PulseMark[]; boards: BoardId[] }) {
  const totals = boards.map((b) => marks.reduce((sum, m) => sum + (m[b] ?? 0), 0));
  return (
    <div className="bg-bh-navy px-[4%] pb-6 text-bh-off">
      <p className="sr-only">
        Changes in the last hour: {boards.map((b, i) => `${BOARD_LOOK[b].short} ${totals[i]}`).join(", ")}.
      </p>
      <div aria-hidden className="grid gap-2">
        {boards.map((board, i) => (
          <div key={board} className="grid grid-cols-[7.5rem_minmax(0,1fr)_2.5rem] items-center gap-3">
            <span className="flex items-center gap-2 truncate font-bh-mono text-[11px]">
              <BoardIcon board={board} size={14} className="block size-3.5 shrink-0 border border-bh-off" />
              {BOARD_LOOK[board].short}
            </span>
            <Stave marks={marks} board={board} color={LETTER_COLORS[i % LETTER_COLORS.length]} />
            <span className="text-right font-bh-mono text-[11px] tabular-nums">{totals[i]}</span>
          </div>
        ))}
        <div className="grid grid-cols-[7.5rem_minmax(0,1fr)_2.5rem] gap-3 font-bh-mono text-[10px] text-bh-off">
          <span />
          <span className="flex justify-between"><span>60 min ago</span><span>now</span></span>
          <span />
        </div>
      </div>
    </div>
  );
}

function Stave({ marks, board, color }: { marks: PulseMark[]; board: BoardId; color: string }) {
  return (
    <div className="relative grid h-6 items-center" style={{ gridTemplateColumns: `repeat(${marks.length}, 1fr)` }}>
      <span className="absolute inset-x-0 top-1/2 h-px bg-bh-off/25" />
      {marks.map((mark, minute) => {
        const n = mark[board] ?? 0;
        return (
          <span key={minute} className="relative grid place-items-center">
            {n > 0 && <span key={n} className="bh-pop block rounded-full" style={{ background: color, width: 4 + Math.min(n, 4) * 2, height: 4 + Math.min(n, 4) * 2 }} />}
          </span>
        );
      })}
    </div>
  );
}

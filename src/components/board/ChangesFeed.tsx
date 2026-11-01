"use client";

import { useState } from "react";
import type { ChangeRow, Changes } from "@/lib/board/changes";
import { SCORE_UNIT } from "@/lib/board/copy";
import { itemKeywords } from "@/lib/board/follows";
import { ageLabel } from "@/lib/board/freshness";
import { BOARD_LOOK } from "@/lib/board/look";
import { ItemDetail } from "./ItemDetail";
import { StepLine } from "./StepLine";
import { useChangeCount } from "./useChangeCount";

const number = new Intl.NumberFormat("en-US");
const TIME = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });

interface Props {
  changes: Changes;
  keywords: string[];
  now: Date;
  /** When the person last pressed "Mark all seen" here, or null. */
  lookedAt: string | null;
  onLooked: () => void;
  /** Name each row's board: the feed across every followed board. */
  showBoard?: boolean;
}

/** What changed on a board this hour, latest first, each item with its own hour drawn on its own scale (the user,
 *  2026-11-01: not a race, "I want to see each item's own change"). Changes since the person last looked are on
 *  mustard; items that did not move are folded under the list. */
export function ChangesFeed({ changes, keywords, now, lookedAt, onLooked, showBoard = false }: Props) {
  const [open, setOpen] = useState<ChangeRow | null>(null);
  const unseen = changes.changed.filter((r) => r.unseen).length;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-bh-navy px-4 py-2.5 text-bh-off">
        <p className="flex items-baseline gap-3 font-bh-mono text-[11px]" aria-live="polite">
          <span className="font-bh-condensed text-3xl leading-none font-black text-bh-mustard tabular-nums">{unseen}</span>
          <span>
            {unseen === 1 ? "change" : "changes"} since you looked
            {lookedAt ? ` at ${TIME.format(new Date(lookedAt))}` : ", in the last hour"}
          </span>
        </p>
        {unseen > 0 && (
          <button type="button" onClick={onLooked} className="bh-keycap ml-auto min-h-9 border-2 border-bh-off bg-bh-off px-3 font-bh-mono text-[11px] text-bh-navy">
            Mark all seen
          </button>
        )}
      </div>
      {changes.changed.length === 0 ? (
        <p className="px-4 py-6 font-bh-mono text-sm">Nothing on this board has moved in the last hour.</p>
      ) : (
        <ol>
          {changes.changed.map((row) => (
            <Row key={`${row.boardId}|${row.item.key}`} row={row} keywords={keywords} now={now} showBoard={showBoard} onOpen={() => setOpen(row)} />
          ))}
        </ol>
      )}
      <Quiet rows={changes.quiet} />
      {open && <ItemDetail row={open} unit={SCORE_UNIT[open.boardId]} boardName={BOARD_LOOK[open.boardId].short} points={open.points} onClose={() => setOpen(null)} />}
    </div>
  );
}

interface RowProps {
  row: ChangeRow;
  keywords: string[];
  now: Date;
  showBoard: boolean;
  onOpen: () => void;
}

function Row({ row, keywords, now, showBoard, onOpen }: RowProps) {
  const { item, boardId } = row;
  const unit = SCORE_UNIT[boardId];
  const matched = itemKeywords(item, keywords);
  const before = item.score - item.rise;
  const changes = useChangeCount(item.score);
  return (
    <li className={`grid grid-cols-[4.5rem_minmax(0,1fr)_5rem] items-center gap-x-3 gap-y-2 border-b border-bh-navy/15 px-4 py-3 sm:grid-cols-[4.5rem_minmax(0,1fr)_11rem_5rem] ${row.unseen ? "bg-bh-mustard" : ""}`}>
      <p className="font-bh-mono text-[11px] leading-snug">
        <span className="block">{row.at ? ageLabel(row.at, now) : "this hour"}</span>
        <span className="block text-bh-muted">{showBoard ? BOARD_LOOK[boardId].short : `#${row.rank}`}</span>
      </p>
      <div className="min-w-0">
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="line-clamp-2 font-bold leading-tight underline-offset-4 hover:underline">
          {item.title}
        </a>
        <p className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 font-bh-mono text-[11px] text-bh-muted">
          <span>
            {number.format(before)} → {number.format(item.score)} {unit}
          </span>
          {showBoard && <span className="border border-bh-navy px-1 text-bh-navy">#{row.rank}</span>}
          {matched.map((k) => <span key={k} className="border border-bh-cobalt px-1 text-bh-cobalt">{k}</span>)}
        </p>
      </div>
      <button type="button" onClick={onOpen} aria-label={`The last hour of ${item.title}`} className="col-span-3 min-h-11 border-2 border-transparent hover:border-bh-navy focus-visible:outline-3 focus-visible:outline-bh-navy sm:col-span-1">
        <StepLine points={row.points} before={before} now={now} />
      </button>
      <p className="row-start-1 col-start-3 text-right sm:col-start-4">
        <span key={changes} className={`block font-bh-condensed text-3xl leading-none font-black tabular-nums ${item.rise < 0 ? "text-bh-muted" : ""} ${changes ? "bh-flash" : ""}`}>
          {item.rise > 0 ? "+" : ""}{number.format(item.rise)}
        </span>
        <span className="block font-bh-mono text-[10px] text-bh-muted">this hour</span>
      </p>
    </li>
  );
}

/** Items that did not move this hour, folded away: their titles and scores only. */
function Quiet({ rows }: { rows: ChangeRow[] }) {
  if (rows.length === 0) return null;
  return (
    <details className="border-t-2 border-bh-navy px-4 py-2 font-bh-mono text-[11px]">
      <summary className="cursor-pointer py-1 text-bh-muted">{rows.length} quiet for an hour</summary>
      <ul className="columns-1 gap-6 py-2 sm:columns-2">
        {rows.map((r) => (
          <li key={`${r.boardId}|${r.item.key}`} className="flex gap-2 py-0.5">
            <span className="shrink-0 text-bh-muted">#{String(r.rank).padStart(2, "0")}</span>
            <a href={r.item.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate underline-offset-4 hover:underline">{r.item.title}</a>
            <span className="ml-auto shrink-0 tabular-nums">{number.format(r.item.score)}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

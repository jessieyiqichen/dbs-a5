"use client";

import { useState } from "react";
import type { HourRow } from "@/lib/board/changes";
import { SCORE_UNIT } from "@/lib/board/copy";
import { itemKeywords } from "@/lib/board/follows";
import { ageLabel } from "@/lib/board/freshness";
import { BOARD_LOOK } from "@/lib/board/look";
import { OFF_BOARD_RANK } from "@/lib/board/saves";
import { ItemDetail } from "./ItemDetail";
import { StepLine } from "./StepLine";
import { useChangeCount } from "./useChangeCount";
import { useFlip } from "./useFlip";

const number = new Intl.NumberFormat("en-US");

interface Props {
  /** The rows to show, in the caller's order: a board's ranking, or every board's changes latest first. */
  rows: HourRow[];
  /** Rows folded under the list because nothing happened to them this hour (the feed across boards). */
  quiet?: HourRow[];
  keywords: string[];
  now: Date;
  /** Name each row's board: the feed across every followed board. */
  showBoard?: boolean;
  /** With showBoard, leave the board's name off each row: the rows sit under a heading that names it (Saved, grouped). */
  underBoardHeading?: boolean;
  /** Scroll inside a window of fixed height (a board's ranking); false when the caller scrolls a larger list. */
  scroll?: boolean;
  /** Keys of the items this person saved, and what the mark beside each score does (user, 2026-11-01). */
  saved: Set<string>;
  onToggleSave: (row: HourRow) => void;
}

const rowKey = (row: HourRow) => `${row.boardId}|${row.item.key}`;

/** Rows that each draw their own hour on their own scale, and slide to their new place when the order changes (the
 *  user, 2026-11-01: a ranking that moves, with each item's own change in it, not a race and not a feed). */
export function HourRows({ rows, quiet = [], keywords, now, showBoard = false, underBoardHeading = false, scroll = true, saved, onToggleSave }: Props) {
  const [open, setOpen] = useState<HourRow | null>(null);
  const list = useFlip<HTMLOListElement>(rows.map(rowKey).join(","));
  return (
    <div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 font-bh-mono text-sm">{showBoard ? "Nothing on your boards has moved in the last hour." : "No rows on this board right now."}</p>
      ) : (
        // A window of a fixed height that scrolls, so a 30-row board does not stretch the page (user, 2026-11-01)
        <ol ref={list} className={scroll ? "max-h-[34rem] overflow-y-auto overscroll-contain" : ""}>
          {rows.map((row) => (
            <Row key={rowKey(row)} row={row} keywords={keywords} now={now} showBoard={showBoard} nameBoard={!underBoardHeading} onOpen={() => setOpen(row)} isSaved={saved.has(row.item.key)} onToggleSave={() => onToggleSave(row)} />
          ))}
        </ol>
      )}
      <Quiet rows={quiet} />
      {open && <ItemDetail row={open} unit={SCORE_UNIT[open.boardId]} boardName={BOARD_LOOK[open.boardId].short} points={open.points} onClose={() => setOpen(null)} />}
    </div>
  );
}

interface RowProps {
  row: HourRow;
  keywords: string[];
  now: Date;
  showBoard: boolean;
  nameBoard: boolean;
  onOpen: () => void;
  isSaved: boolean;
  onToggleSave: () => void;
}

function Row({ row, keywords, now, showBoard, nameBoard, onOpen, isSaved, onToggleSave }: RowProps) {
  const { item, boardId } = row;
  const unit = SCORE_UNIT[boardId];
  const matched = itemKeywords(item, keywords);
  const before = item.score - item.rise;
  // Sat still all hour: a grey line
  const still = row.points.length === 0 && item.rise === 0;
  const changes = useChangeCount(item.score);
  return (
    // The number's column sizes to its widest value (GitHub stars run to six digits), never under the line; the last
    // column is the save mark
    <li data-key={rowKey(row)} className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-2 border-b border-bh-navy/15 bg-bh-off px-4 py-3 sm:grid-cols-[4.5rem_minmax(0,1fr)_11rem_auto_auto]">
      {/* A board's own tab is a ranking: just the rank. The feed across boards: when, then which board */}
      <p className="font-bh-mono text-[11px] leading-snug">
        {showBoard ? (
          <>
            <span className="block">{row.at ? ageLabel(row.at, now) : "this hour"}</span>
            {nameBoard && <span className="block text-bh-muted">{BOARD_LOOK[boardId].short}</span>}
          </>
        ) : (
          <span className="block text-base font-bold tabular-nums">{String(row.rank).padStart(2, "0")}</span>
        )}
      </p>
      <div className="min-w-0">
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="line-clamp-2 font-bold leading-tight underline-offset-4 hover:underline">
          {item.title}
        </a>
        {/* What the source says about it: a Product Hunt tagline, a repository's description, a model's task, a paper's lab */}
        {item.subtitle && <p className="mt-0.5 truncate text-sm text-bh-muted">{item.subtitle}</p>}
        {(showBoard || matched.length > 0) && (
          <p className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 font-bh-mono text-[11px] text-bh-muted">
            {showBoard && <span className="border border-bh-navy px-1 text-bh-navy">{row.rank === OFF_BOARD_RANK ? "off the board" : `#${row.rank}`}</span>}
            {matched.map((k) => <span key={k} className="border border-bh-cobalt px-1 text-bh-cobalt">{k}</span>)}
          </p>
        )}
      </div>
      <button type="button" onClick={onOpen} aria-label={`The last hour of ${item.title}`} className={`col-span-4 min-h-11 border-2 border-transparent hover:border-bh-navy focus-visible:outline-3 focus-visible:outline-bh-navy sm:col-span-1 ${still ? "text-bh-muted" : "text-bh-navy"}`}>
        <StepLine points={row.points} before={before} now={now} />
      </button>
      {/* The number itself, as a leaderboard shows it (the user, 2026-11-01); the line beside it is the hour's change */}
      <p className="row-start-1 col-start-3 min-w-16 text-right sm:col-start-4">
        <span key={changes} className={`block font-bh-condensed text-3xl leading-none font-black tabular-nums ${changes ? "bh-flash" : ""}`}>
          {number.format(item.score)}
        </span>
        <span className="block font-bh-mono text-[10px] text-bh-muted">{unit}</span>
      </p>
      {/* A small key that says what it does: Save, and once pressed, Saved in mustard like every chosen key (user,
          2026-11-01: a bare square gave no hint that it could save) */}
      <button
        type="button"
        onClick={onToggleSave}
        aria-pressed={isSaved}
        aria-label={isSaved ? `Saved: ${item.title}. Press to remove it from Saved` : `Save ${item.title}`}
        className={`bh-keycap row-start-1 col-start-4 min-h-9 justify-self-end border-2 border-bh-navy px-2 font-bh-mono text-[11px] font-bold focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-bh-navy sm:col-start-5 ${isSaved ? "bg-bh-mustard" : "bg-bh-off hover:bg-bh-page"}`}
      >
        {isSaved ? "Saved" : "Save"}
      </button>
    </li>
  );
}

/** Items that did not move this hour, folded away: their titles and scores only. */
function Quiet({ rows }: { rows: HourRow[] }) {
  if (rows.length === 0) return null;
  return (
    <details className="border-t-2 border-bh-navy px-4 py-2 font-bh-mono text-[11px]">
      <summary className="cursor-pointer py-1 text-bh-muted">{rows.length} quiet for an hour</summary>
      <ul className="columns-1 gap-6 py-2 sm:columns-2">
        {rows.map((r) => (
          <li key={rowKey(r)} className="flex gap-2 py-0.5">
            <span className="shrink-0 text-bh-muted">#{String(r.rank).padStart(2, "0")}</span>
            <a href={r.item.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate underline-offset-4 hover:underline">{r.item.title}</a>
            <span className="ml-auto shrink-0 tabular-nums">{number.format(r.item.score)}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

"use client";

import type { ReactNode } from "react";
import { SCORE_UNIT, STATE_NOTE } from "@/lib/board/copy";
import { itemKeywords } from "@/lib/board/follows";
import { ageLabel, type Freshness } from "@/lib/board/freshness";
import type { BoardRow } from "@/lib/board/live";
import { BOARD_DOMAIN, BOARD_LOOK, TILE_CLASS } from "@/lib/board/look";
import type { Point } from "@/lib/board/trends";
import type { Board } from "@/lib/board/types";
import { VIEWS, type View } from "@/lib/board/views";
import { Shape } from "./art/Shape";
import { RaceView } from "./RaceView";
import { Sparkline } from "./Sparkline";
import { TilesView } from "./TilesView";
import { useChangeCount } from "./useChangeCount";

const number = new Intl.NumberFormat("en-US");

interface Props {
  board: Board;
  state: Freshness;
  rows: BoardRow[];
  keywords: string[];
  series: Record<string, Point[]>;
  now: Date;
  /** Shown between the header and the rows: the board's own pulse. */
  pulse?: ReactNode;
  /** The item that rose most on this board in the last hour, marked with a sparkle. */
  starKey?: string;
  view: View;
  onView: (view: View) => void;
}

const VIEW_LABEL: Record<View, string> = { race: "Race", tiles: "Tiles", list: "List" };
/** How many items each view shows. */
export const VIEW_ROWS: Record<View, number> = { tiles: 12, race: 10, list: 15 };

/** What the header says about a board's last check, in each of the four states (docs/data-flow.md). */
function stateLine(state: Freshness, board: Board, now: Date): string {
  const age = ageLabel(board.lastCheckedAt, now);
  if (state === "loading") return "waiting for its first check";
  if (state === "stale") return `not updating · checked ${age}`;
  if (state === "down") return `last check failed · ${age}`;
  return `updated ${age}`;
}

/** One leaderboard as a browser window on poster paper (after Aleksandar Savić's windows, docs/references.md): the
 *  site in its title bar, its shape and state, its pulse, then its rows, each with the last hour drawn in. */
export function BoardPanel({ board, state, rows, keywords, series, now, pulse, starKey, view, onView }: Props) {
  const look = BOARD_LOOK[board.id];
  const note = STATE_NOTE[state];
  const quiet = state === "stale" || state === "down";
  return (
    <section aria-labelledby={`board-${board.id}`} className="border-2 border-bh-navy bg-bh-off shadow-[6px_6px_0_var(--color-bh-navy)]">
      <div aria-hidden className="flex items-center gap-1.5 border-b-2 border-bh-navy bg-bh-page px-3 py-1.5 font-bh-mono text-[11px] text-bh-muted">
        {[0, 1, 2].map((i) => <span key={i} className="size-2.5 rounded-full border-[1.5px] border-bh-navy" />)}
        <span className="ml-2 truncate">{BOARD_DOMAIN[board.id]}</span>
      </div>
      <header className={`flex flex-wrap items-center gap-3 border-b-2 border-bh-navy px-4 py-3 ${quiet ? "bh-hatched" : ""}`}>
        <span className={`grid size-9 shrink-0 place-items-center overflow-hidden ${TILE_CLASS[quiet ? "off" : look.tile]} ${quiet ? "border border-dashed border-bh-navy" : ""}`}>
          {!quiet && <Shape shape={look.shape} color={look.color} size={36} />}
        </span>
        <h3 id={`board-${board.id}`} className="flex-1 text-xl font-extrabold tracking-[-0.02em]">{board.name}</h3>
        <ViewPicker view={view} onView={onView} />
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
      {rows.length === 0 ? (
        <p className="px-4 py-6 font-bh-mono text-sm">{state === "loading" ? "Nothing yet." : "No rows on this board right now."}</p>
      ) : view === "tiles" ? (
        <TilesView rows={rows} unit={SCORE_UNIT[board.id]} series={series} starKey={starKey} />
      ) : view === "race" ? (
        <RaceView rows={rows} unit={SCORE_UNIT[board.id]} boardName={board.name} series={series} starKey={starKey} />
      ) : (
        <ol className="divide-y divide-bh-navy/15">
          {rows.map((row) => (
            <Row key={row.item.key} row={row} unit={SCORE_UNIT[board.id]} keywords={keywords} points={series[row.item.key] ?? []} star={row.item.key === starKey} />
          ))}
        </ol>
      )}
    </section>
  );
}

function ViewPicker({ view, onView }: { view: View; onView: (view: View) => void }) {
  return (
    <div role="radiogroup" aria-label="Show the board as" className="flex border-2 border-bh-navy">
      {VIEWS.map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={view === v}
          onClick={() => onView(v)}
          className={`min-h-9 px-2.5 text-sm font-bold ${view === v ? "bg-bh-navy text-bh-off" : "hover:bg-bh-mustard"}`}
        >
          {VIEW_LABEL[v]}
        </button>
      ))}
    </div>
  );
}

function Row({ row, unit, keywords, points, star }: { row: BoardRow; unit: string; keywords: string[]; points: Point[]; star: boolean }) {
  const { item } = row;
  const matched = itemKeywords(item, keywords);
  const detail = [item.subtitle, item.meta].filter(Boolean).join(" · ");
  const changes = useChangeCount(item.score);
  return (
    <li className="grid grid-cols-[2rem_minmax(0,1fr)_4.5rem_auto] items-center gap-3 px-4 py-2.5">
      <span className="font-bh-mono text-xs tabular-nums">
        {star ? <><span aria-hidden className="text-base text-bh-red">✦</span><span className="sr-only">Rose most this hour, </span></> : String(row.rank).padStart(2, "0")}
      </span>
      <div className="min-w-0">
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="line-clamp-2 font-semibold underline-offset-4 hover:underline">
          {item.title}
        </a>
        {(detail || matched.length > 0) && (
          <p className="mt-0.5 flex min-w-0 items-center gap-1.5 font-bh-mono text-[11px] text-bh-muted">
            {matched.map((k) => <span key={k} className="shrink-0 border border-bh-cobalt px-1 text-bh-cobalt">{k}</span>)}
            <span className="truncate">{detail}</span>
          </p>
        )}
      </div>
      <Sparkline points={points} width={72} height={22} className="text-bh-navy" />
      <div className="text-right font-bh-mono text-xs tabular-nums">
        <span key={changes} className={`block px-1 ${changes ? "bh-flash" : ""}`}>
          {number.format(item.score)} <span className="text-bh-muted">{unit}</span>
        </span>
        {item.rise > 0 && (
          <span className="block font-bold">
            <span aria-hidden className="text-bh-red">▲</span> +{number.format(item.rise)}
          </span>
        )}
      </div>
    </li>
  );
}

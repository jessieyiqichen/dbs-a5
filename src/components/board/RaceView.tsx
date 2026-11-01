"use client";

import { useState } from "react";
import type { BoardRow } from "@/lib/board/live";
import type { Point } from "@/lib/board/trends";
import { raceLanes, type Lane } from "@/lib/board/views";
import { ItemDetail } from "./ItemDetail";
import { useChangeCount } from "./useChangeCount";

const number = new Intl.NumberFormat("en-US");
/** One lane, in rem: a title line over a bar. Lanes are placed by position, so a pass slides a lane to its new place. */
const LANE = 4;

interface Props {
  rows: BoardRow[];
  unit: string;
  boardName: string;
  series: Record<string, Point[]>;
  starKey?: string;
}

/** The board as a race (user's pick, 2026-10-31): items by score, each bar the score an hour ago in mustard and the
 *  rise since in red, so a fast riser shows a long red end. When the worker writes, bars grow and lanes pass each
 *  other. Choosing a lane opens its last hour. */
export function RaceView({ rows, unit, boardName, series, starKey }: Props) {
  const lanes = raceLanes(rows);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const opened = lanes.find((l) => l.row.item.key === openKey)?.row;
  return (
    <div className="px-4 pt-3 pb-4">
      <p className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-bh-mono text-[11px] text-bh-muted">
        <span><span aria-hidden className="mr-1.5 inline-block h-3 w-5 rounded-r-full bg-bh-mustard align-middle" />{unit} an hour ago</span>
        <span><span aria-hidden className="mr-1.5 inline-block h-3 w-5 rounded-r-full bg-bh-red align-middle" />gained since</span>
        <span>#: its place on the board · choose a lane for its last hour</span>
      </p>
      <ol className="relative" style={{ height: `${lanes.length * LANE}rem` }}>
        {lanes.map((lane, place) => (
          <RaceLane key={lane.row.item.key} lane={lane} place={place} unit={unit} star={lane.row.item.key === starKey} onOpen={() => setOpenKey(lane.row.item.key)} />
        ))}
      </ol>
      {opened && (
        <ItemDetail row={opened} unit={unit} boardName={boardName} points={series[opened.item.key] ?? []} onClose={() => setOpenKey(null)} />
      )}
    </div>
  );
}

interface LaneProps {
  lane: Lane;
  place: number;
  unit: string;
  star: boolean;
  onOpen: () => void;
}

function RaceLane({ lane, place, unit, star, onOpen }: LaneProps) {
  const { item, rank } = lane.row;
  const changes = useChangeCount(item.score);
  const end = (lane.before + lane.rise) * 100;
  return (
    <li className="bh-lane absolute inset-x-0" style={{ transform: `translateY(${place * LANE}rem)`, height: `${LANE - 0.5}rem` }}>
      <button
        type="button"
        onClick={onOpen}
        className="group grid h-full w-full grid-cols-[3rem_minmax(0,1fr)_6.5rem] items-center gap-3 text-left focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-bh-navy"
      >
        <span className="font-bh-condensed text-4xl leading-none font-bold tabular-nums">{String(place + 1).padStart(2, "0")}</span>
        <span className="relative block h-full min-w-0">
          {/* One bar, mustard for the score an hour ago then red for the rise, cut to length with a half-round end */}
          <span
            aria-hidden
            className="bh-bar absolute inset-0"
            style={{
              background: `linear-gradient(to right, var(--color-bh-mustard) ${lane.before * 100}%, var(--color-bh-red) ${lane.before * 100}%)`,
              clipPath: `inset(0 ${100 - Math.max(end, 3)}% 0 0 round 0 999px 999px 0)`,
            }}
          />
          <span className="relative flex h-full min-w-0 items-center gap-2 px-3 text-[19px] leading-tight font-extrabold tracking-[-0.01em]">
            {star && <span aria-label="Rose most this hour">✦</span>}
            <span className="truncate group-hover:underline">{item.title}</span>
          </span>
        </span>
        <span className="flex flex-col items-end leading-none">
          <span key={changes} className={`px-1 font-bh-condensed text-[28px] font-bold tabular-nums ${changes ? "bh-flash" : ""}`}>
            {number.format(item.score)}
          </span>
          <span className="mt-1 flex items-center gap-1.5 font-bh-mono text-[10px] whitespace-nowrap text-bh-muted">
            {item.rise > 0 && <span className="bg-bh-red px-1 font-bh-condensed text-[19px] leading-tight font-bold text-bh-off">+{number.format(item.rise)}</span>}
            <span>#{rank}</span>
          </span>
          <span className="sr-only">{unit}, #{rank} on the board</span>
        </span>
      </button>
    </li>
  );
}

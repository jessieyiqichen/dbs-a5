"use client";

import { useState } from "react";
import type { BoardRow } from "@/lib/board/live";
import type { Point } from "@/lib/board/trends";
import { raceLanes, type Lane } from "@/lib/board/views";
import { ItemDetail } from "./ItemDetail";
import { useChangeCount } from "./useChangeCount";

const number = new Intl.NumberFormat("en-US");
/** One lane, in rem: a title line over a bar. Lanes are placed by position, so a pass slides a lane to its new place. */
const LANE = 3.5;

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
      <p className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-bh-mono text-[11px] text-bh-muted">
        <span><span aria-hidden className="mr-1.5 inline-block h-2.5 w-4 bg-bh-mustard align-middle" />{unit} an hour ago</span>
        <span><span aria-hidden className="mr-1.5 inline-block h-2.5 w-4 bg-bh-red align-middle" />gained since</span>
        <span>choose a lane for its last hour</span>
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
  return (
    <li className="bh-lane absolute inset-x-0" style={{ transform: `translateY(${place * LANE}rem)`, height: `${LANE - 0.5}rem` }}>
      <button
        type="button"
        onClick={onOpen}
        className="group grid h-full w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 text-left focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-bh-navy"
      >
        <span className="font-bh-mono text-xs tabular-nums">{String(place + 1).padStart(2, "0")}</span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="flex min-w-0 items-baseline gap-2">
            {star && <span className="text-bh-red" aria-label="Rose most this hour">✦</span>}
            <span className="truncate text-sm font-bold group-hover:underline">{item.title}</span>
            <span className="shrink-0 font-bh-mono text-[10px] text-bh-muted">#{rank} on the board</span>
          </span>
          <span aria-hidden className="relative block h-3 overflow-hidden border-2 border-bh-navy bg-bh-off">
            <span className="bh-bar absolute inset-y-0 left-0 w-full origin-left bg-bh-mustard" style={{ transform: `scaleX(${lane.before})` }} />
            <span className="bh-bar absolute inset-y-0 left-0 w-full origin-left bg-bh-red" style={{ transform: `translateX(${lane.before * 100}%) scaleX(${lane.rise})` }} />
          </span>
        </span>
        <span className="text-right font-bh-mono text-xs tabular-nums">
          <span key={changes} className={`block px-1 ${changes ? "bh-flash" : ""}`}>{number.format(item.score)} {unit}</span>
          {item.rise > 0 && <span className="block font-bold"><span aria-hidden className="text-bh-red">▲</span> +{number.format(item.rise)}</span>}
        </span>
      </button>
    </li>
  );
}

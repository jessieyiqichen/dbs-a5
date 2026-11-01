"use client";

import { useState } from "react";
import type { BoardRow } from "@/lib/board/live";
import type { Point } from "@/lib/board/trends";
import { raceLanes, type Lane } from "@/lib/board/views";
import { ItemDetail } from "./ItemDetail";
import { useChangeCount } from "./useChangeCount";

const number = new Intl.NumberFormat("en-US");
const pad = (n: number) => String(n).padStart(2, "0");

interface Props {
  rows: BoardRow[];
  unit: string;
  boardName: string;
  series: Record<string, Point[]>;
  starKey?: string;
}

/** The board as a race (user's pick, 2026-10-31), with the titles kept apart from the bars (the user: titles too long
 *  to sit on a bar). Columns by score, each the score an hour ago in mustard topped by the rise since in red, numbered;
 *  beside them a key of the same numbers with the full titles. Pointing at either lights both; choosing either opens
 *  the item's last hour. When the worker writes, columns grow and pass each other. */
export function RaceView({ rows, unit, boardName, series, starKey }: Props) {
  const lanes = raceLanes(rows);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [lit, setLit] = useState<string | null>(null);
  const opened = lanes.find((l) => l.row.item.key === openKey)?.row;
  const link = { lit, onLight: setLit, onOpen: setOpenKey };
  return (
    <div className="px-4 pt-3 pb-5">
      <p className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-bh-mono text-[11px] text-bh-muted">
        <span><span aria-hidden className="mr-1.5 inline-block h-4 w-3 rounded-t-full bg-bh-mustard align-middle" />{unit} an hour ago</span>
        <span><span aria-hidden className="mr-1.5 inline-block h-4 w-3 rounded-t-full bg-bh-red align-middle" />gained since</span>
        <span>choose a column or a title for its last hour</span>
      </p>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
        <Columns lanes={lanes} starKey={starKey} {...link} />
        <Key lanes={lanes} starKey={starKey} {...link} />
      </div>
      {opened && <ItemDetail row={opened} unit={unit} boardName={boardName} points={series[opened.item.key] ?? []} onClose={() => setOpenKey(null)} />}
    </div>
  );
}

interface LinkProps {
  lanes: Lane[];
  starKey?: string;
  lit: string | null;
  onLight: (key: string | null) => void;
  onOpen: (key: string) => void;
}

/** The chart: one column per item, placed by its place in the race, so a pass slides it sideways. */
function Columns({ lanes, starKey, lit, onLight, onOpen }: LinkProps) {
  const width = 100 / Math.max(1, lanes.length);
  return (
    <ol aria-hidden className="relative h-72 border-b-2 border-bh-navy">
      {lanes.map((lane, place) => (
        <Column key={lane.row.item.key} lane={lane} place={place} width={width} star={lane.row.item.key === starKey}
          lit={lit === lane.row.item.key} onLight={onLight} onOpen={onOpen} />
      ))}
    </ol>
  );
}

interface ColumnProps {
  lane: Lane;
  place: number;
  width: number;
  star: boolean;
  lit: boolean;
  onLight: (key: string | null) => void;
  onOpen: (key: string) => void;
}

function Column({ lane, place, width, star, lit, onLight, onOpen }: ColumnProps) {
  const { item } = lane.row;
  const changes = useChangeCount(item.score);
  const top = (lane.before + lane.rise) * 100;
  const split = lane.before / Math.max(lane.before + lane.rise, 0.0001);
  return (
    <li className="bh-lane absolute inset-y-0 left-0 flex flex-col justify-end px-[3%]" style={{ width: `${width}%`, transform: `translateX(${place * 100}%)` }}
      onMouseEnter={() => onLight(item.key)} onMouseLeave={() => onLight(null)} onClick={() => onOpen(item.key)}>
      {/* The score rides on the column's top, so a short column keeps its number close */}
      <span
        key={changes}
        className={`bh-lane absolute left-1/2 -translate-x-1/2 font-bh-condensed text-lg leading-none font-bold tabular-nums ${changes ? "bh-flash" : ""}`}
        style={{ bottom: `calc(1.75rem + ${Math.max(top, 2) / 100} * (100% - 3.25rem) + 0.35rem)` }}
      >
        {number.format(item.score)}
      </span>
      {/* One column cut to height with a half-round top: mustard below, red for the rise on top */}
      <span
        className={`bh-bar block w-full cursor-pointer ${lit ? "outline-3 outline-offset-2 outline-bh-navy" : ""}`}
        style={{
          height: "calc(100% - 3.25rem)",
          background: `linear-gradient(to top, var(--color-bh-mustard) ${split * top}%, var(--color-bh-red) ${split * top}%)`,
          clipPath: `inset(${100 - Math.max(top, 2)}% 0 0 0 round 999px 999px 0 0)`,
        }}
      />
      <span className="mt-1.5 self-center font-bh-condensed text-xl leading-none font-bold">{star ? "✦" : pad(place + 1)}</span>
    </li>
  );
}

/** The titles, numbered as the columns are. Each is a button: the accessible way into an item's last hour. */
function Key({ lanes, starKey, lit, onLight, onOpen }: LinkProps) {
  return (
    <ol className="flex flex-col">
      {lanes.map((lane, place) => {
        const { item, rank } = lane.row;
        const star = item.key === starKey;
        return (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => onOpen(item.key)}
              onMouseEnter={() => onLight(item.key)}
              onMouseLeave={() => onLight(null)}
              onFocus={() => onLight(item.key)}
              onBlur={() => onLight(null)}
              className={`grid w-full grid-cols-[2.25rem_minmax(0,1fr)_auto] items-start gap-2 border-b border-bh-navy/15 px-1 py-1.5 text-left focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-bh-navy ${lit === item.key ? "bg-bh-mustard" : ""}`}
            >
              <span className="font-bh-condensed text-xl leading-none font-bold">{star ? "✦" : pad(place + 1)}<span className="sr-only">{star ? " rose most this hour" : ""}</span></span>
              <span className="line-clamp-2 text-sm leading-snug font-semibold">{item.title}</span>
              <span className="flex items-center gap-1.5 font-bh-mono text-[10px] whitespace-nowrap text-bh-muted">
                {item.rise > 0 && <span className="bg-bh-red px-1 font-bh-condensed text-[19px] leading-tight font-bold text-bh-off">+{number.format(item.rise)}</span>}
                #{rank}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

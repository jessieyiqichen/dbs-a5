"use client";

import type { BoardRow } from "@/lib/board/live";
import { TILE_CLASS, type BlockColor } from "@/lib/board/look";
import type { Point } from "@/lib/board/trends";
import { itemImage, tileSpans } from "@/lib/board/views";
import { Sparkline } from "./Sparkline";
import { useChangeCount } from "./useChangeCount";

const number = new Intl.NumberFormat("en-US");

/** Tile colours in turn (red is left out: it carries large text only, and tiles have small labels). */
const TURN: BlockColor[] = ["mustard", "off", "navy", "cobalt", "off", "green"];

interface Props {
  rows: BoardRow[];
  unit: string;
  series: Record<string, Point[]>;
  starKey?: string;
}

/** The board as a mosaic: each item a tile, bigger the more of the board's rise it took this hour (lib/board/views.ts).
 *  A repository or paper shows its picture in two inks, the tile's own colour over grey, coming up in full colour on
 *  hover, as the A1 portfolio's screenshots do. Tiles touch edge to edge, as on the poster. */
export function TilesView({ rows, unit, series, starKey }: Props) {
  const spans = tileSpans(rows);
  return (
    <ol className="grid grid-flow-dense auto-rows-[12rem] grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
      {rows.map((row, i) => (
        <TileItem key={row.item.key} row={row} unit={unit} points={series[row.item.key] ?? []} span={spans[row.item.key]} color={TURN[i % TURN.length]} star={row.item.key === starKey} />
      ))}
    </ol>
  );
}

interface ItemProps {
  row: BoardRow;
  unit: string;
  points: Point[];
  span: [number, number];
  color: BlockColor;
  star: boolean;
}

function TileItem({ row, unit, points, span, color, star }: ItemProps) {
  const { item } = row;
  const image = itemImage(item.key);
  const changes = useChangeCount(item.score);
  const big = span[0] > 1 && span[1] > 1;
  return (
    <li className={`relative overflow-hidden ${TILE_CLASS[color]}`} style={{ gridColumn: `span ${span[0]}`, gridRow: `span ${span[1]}` }}>
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="group flex h-full flex-col p-3 focus-visible:outline-3 focus-visible:-outline-offset-4 focus-visible:outline-current">
        {image && (
          <span aria-hidden className="relative -mx-3 -mt-3 mb-2 block min-h-0 flex-1 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- a remote social card, shown as found */}
            <img src={image} alt="" loading="lazy" className="h-full w-full object-cover mix-blend-multiply grayscale contrast-125 transition duration-300 group-hover:mix-blend-normal group-hover:grayscale-0" />
          </span>
        )}
        <span className="flex items-baseline justify-between gap-2 font-bh-mono text-[11px]">
          <span>{star ? "✦ " : ""}{String(row.rank).padStart(2, "0")}</span>
          {item.rise > 0 && <span className="font-bold">+{number.format(item.rise)}</span>}
        </span>
        <span className={`mt-1 font-bold group-hover:underline ${big ? "line-clamp-3 text-2xl leading-tight tracking-[-0.02em]" : "line-clamp-2 text-sm leading-snug"} ${image ? "" : "flex-1"}`}>
          {item.title}
        </span>
        <span className="mt-1 flex items-end gap-2">
          <span key={changes} className={`font-bh-mono text-[11px] tabular-nums ${changes ? "bh-flash" : ""}`}>
            {number.format(item.score)} {unit}
          </span>
          <Sparkline points={points} width={80} height={20} className="min-w-0 flex-1" />
        </span>
      </a>
    </li>
  );
}

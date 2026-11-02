"use client";

import { CONNECTION_LABEL } from "@/lib/board/copy";
import type { Connection } from "@/lib/board/feed";
import { TILE_CLASS } from "@/lib/board/look";
import { mosaic, type Star, type Tile } from "@/lib/board/mosaic";
import type { BoardId } from "@/lib/board/types";
import { Shape } from "./art/Shape";
import { Tape } from "./art/Tape";

interface Props {
  weights: { boardId: BoardId; weight: number }[];
  turns: Partial<Record<BoardId, number>>;
  connection: Connection;
  now: Date;
}

// The title as one line of condensed capitals across the sheet, a strip of tiles under it, and the board that rose
// most stamped over the title's end (user, 2026-11-01: bigger and more striking than the stage with the woven title).
// Still a banner, not a hero: the boards' tabs stay in the first view (user, 2026-10-31).
const WIDE = { cols: 12, rows: 1 };
const NARROW = { cols: 6, rows: 2 };
/** No stage any more: every cell is a tile, and the board that rose most is the stamp. */
const NO_STAGE = { col: 0, row: 0, w: 0, h: 0 };

/** The poster across the top, taped to a wall. Nothing under it: the user (2026-11-01) wants the board, not a running
 *  commentary on its changes. */
export function PosterHero({ weights, turns, connection, now }: Props) {
  return (
    <section aria-labelledby="board-title" className="bg-bh-cobalt text-bh-off">
      <h1 id="board-title" className="sr-only">Builder&apos;s Board</h1>
      <div className="mx-auto w-full max-w-6xl px-6 pt-8 pb-4">
        <div className="relative -rotate-[0.6deg] bg-bh-off p-[2.2%] text-bh-navy shadow-[-18px_30px_34px_-14px_rgb(10_10_40/0.6)] [container-type:inline-size]">
          <Tape className="-top-3 -left-6 -rotate-[38deg]" />
          <Tape className="-top-3 -right-6 rotate-[38deg]" />
          <Poster weights={weights} turns={turns} {...WIDE} className="hidden md:block" />
          <Poster weights={weights} turns={turns} {...NARROW} className="md:hidden" />
          <Dateline now={now} connection={connection} />
        </div>
      </div>
    </section>
  );
}

interface PosterProps {
  weights: Props["weights"];
  turns: Props["turns"];
  cols: number;
  rows: number;
  className: string;
}

function Poster({ weights, turns, cols, rows, className }: PosterProps) {
  const { star, tiles } = mosaic(weights, turns, cols, rows, NO_STAGE);
  return (
    <div className={`relative ${className}`}>
      {/* The page's h1 carries the title for assistive technology; this is the drawing of it */}
      <p aria-hidden className="relative z-10 -ml-[0.03em] font-bh-condensed text-[clamp(40px,14.6cqw,170px)] leading-[0.82] font-bold tracking-[-0.01em] uppercase whitespace-nowrap">
        Builder&apos;s Board
      </p>
      <div className="mt-[1%] grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`, aspectRatio: `${cols} / ${rows}` }}>
        {tiles.map((t) => <TileView key={t.key} tile={t} />)}
      </div>
      {star && <Stamp star={star} />}
    </div>
  );
}

function TileView({ tile: t }: { tile: Tile }) {
  return (
    <div aria-hidden className={`relative overflow-hidden ${TILE_CLASS[t.tile]}`} style={{ gridColumn: `${t.col + 1} / span ${t.w}`, gridRow: `${t.row + 1} / span ${t.h}` }}>
      {t.shape && (
        <div className="bh-shape absolute inset-0" style={{ transform: `rotate(${t.rotate}deg)` }}>
          <Shape shape={t.shape} color={t.color} size={100} className="h-full w-full" />
        </div>
      )}
    </div>
  );
}

/** The board that rose most this hour: its shape on its tile, stamped over the end of the title. It turns a quarter
 *  each time its board moves, like every tile. */
function Stamp({ star }: { star: Star }) {
  return (
    <div aria-hidden className={`absolute -top-[3%] right-[1.5%] z-20 aspect-square w-[12%] overflow-hidden border-2 border-bh-navy ${TILE_CLASS[star.tile]}`}>
      <div className="bh-shape h-full w-full" style={{ transform: `rotate(${star.rotate}deg)` }}>
        <Shape shape={star.shape} color={star.color} size={100} className="h-full w-full" />
      </div>
    </div>
  );
}

const DATE = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
const TIME = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });

/** The poster's date line, live: today underlined, then the time and whether updates are arriving. */
function Dateline({ now, connection }: { now: Date; connection: Connection }) {
  const live = connection === "live";
  return (
    <div className="flex items-end justify-between gap-4 pt-[2%]">
      <p className="text-[clamp(14px,1.6vw,20px)] leading-tight font-extrabold">
        <span className="border-b-[3px] border-bh-navy">{DATE.format(now).replace(",", "").toLowerCase()}</span>
        <span className="mt-1 block font-bh-mono text-[11px] font-normal" aria-live="polite">
          {TIME.format(now)} · <span className={live ? "" : "text-bh-red"}>{CONNECTION_LABEL[connection]}</span>
        </span>
      </p>
      <p className="hidden max-w-[22rem] text-right font-bh-mono text-[11px] leading-relaxed text-bh-muted sm:block">
        The leaderboards builders check every day. The board that rose most this hour takes the stamp.
      </p>
    </div>
  );
}

"use client";

import { CONNECTION_LABEL } from "@/lib/board/copy";
import type { Connection } from "@/lib/board/feed";
import { TILE_CLASS, titleHalo } from "@/lib/board/look";
import { mosaic, type Area, type Star, type Tile } from "@/lib/board/mosaic";
import type { BoardId } from "@/lib/board/types";
import { Shape } from "./art/Shape";

interface Props {
  weights: { boardId: BoardId; weight: number }[];
  turns: Partial<Record<BoardId, number>>;
  connection: Connection;
  now: Date;
}

// A banner, not a hero: about a third of the screen, so the boards' tabs are in the first view (user, 2026-10-31)
const WIDE = { cols: 12, rows: 2, stage: { col: 0, row: 0, w: 3, h: 2 } };
const NARROW = { cols: 6, rows: 3, stage: { col: 0, row: 0, w: 3, h: 3 } };

/** The poster across the top, taped to a wall: a stage with the board that rose most and the title woven through it,
 *  beside a mosaic the data lays out (lib/board/mosaic.ts). Nothing under it: the user (2026-11-01) wants the board,
 *  not a running commentary on its changes. */
export function PosterHero({ weights, turns, connection, now }: Props) {
  return (
    <section aria-labelledby="board-title" className="bg-bh-cobalt text-bh-off">
      <h1 id="board-title" className="sr-only">Builder&apos;s Board</h1>
      <div className="mx-auto w-full max-w-6xl px-6 pt-8 pb-4">
        <div className="relative -rotate-[0.6deg] bg-bh-off p-[2.2%] text-bh-navy shadow-[-18px_30px_34px_-14px_rgb(10_10_40/0.6)]">
          <Tape className="-top-3 -left-6 -rotate-[38deg]" />
          <Tape className="-top-3 -right-6 rotate-[38deg]" />
          <Poster weights={weights} turns={turns} {...WIDE} className="hidden md:grid" />
          <Poster weights={weights} turns={turns} {...NARROW} className="grid md:hidden" />
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
  stage: Area;
  className: string;
}

function Poster({ weights, turns, cols, rows, stage, className }: PosterProps) {
  const { star, tiles } = mosaic(weights, turns, cols, rows, stage);
  return (
    <div className={className} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`, aspectRatio: `${cols} / ${rows}` }}>
      <Stage star={star} area={stage} />
      {tiles.map((t) => <TileView key={t.key} tile={t} />)}
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

const WORDS = ["builder's", "board"] as const;

/** The board that rose most, as one large shape, with the title threaded through it: the same words are drawn twice,
 *  once under the shape and once over it with every other letter left out, so letters pass behind and in front of it
 *  (after monday.com's hackathon poster). The page's h1 carries the title for assistive technology. */
function Stage({ star, area }: { star: Star | null; area: Area }) {
  const tile = star?.tile ?? "mustard";
  return (
    <div aria-hidden className={`relative overflow-hidden [container-type:inline-size] ${TILE_CLASS[tile]}`} style={{ gridColumn: `${area.col + 1} / span ${area.w}`, gridRow: `${area.row + 1} / span ${area.h}` }}>
      <Words front={false} halo="off" />
      {star && (
        // A square in the middle of the stage, so the shape keeps its proportions on a wide stage
        <div className="absolute top-1/2 left-1/2 z-20 aspect-square h-[74%] -translate-x-1/2 -translate-y-1/2">
          <div className="bh-shape h-full w-full" style={{ transform: `rotate(${star.rotate}deg)` }}>
            <Shape shape={star.shape} color={star.color} size={100} className="h-full w-full" />
          </div>
        </div>
      )}
      <Words front halo={titleHalo(star?.color ?? null)} />
    </div>
  );
}

/** Front letters carry a halo, so they read over any shape (navy over cobalt alone is 2.3:1): off-white, or navy over
 *  an off-white shape. Both classes are written out so Tailwind finds them. */
const HALO_CLASS = {
  off: "[paint-order:stroke_fill] [-webkit-text-stroke:0.07em_var(--color-bh-off)]",
  navy: "[paint-order:stroke_fill] [-webkit-text-stroke:0.07em_var(--color-bh-navy)]",
} as const;

function Words({ front, halo }: { front: boolean; halo: keyof typeof HALO_CLASS }) {
  return (
    <div className={`absolute inset-0 flex flex-col justify-between px-[5%] py-[3%] ${front ? "z-30" : "z-10"}`}>
      {WORDS.map((word, w) => (
        <p key={word} className={`text-[18.5cqw] leading-none font-black tracking-[-0.05em] lowercase ${w === 1 ? "self-end" : ""} ${front ? HALO_CLASS[halo] : ""}`}>
          {[...word].map((letter, i) => (
            <span key={i} className={front && (i + w) % 2 === 1 ? "text-transparent" : ""}>{letter}</span>
          ))}
        </p>
      ))}
    </div>
  );
}

/** Two strips of tape holding the poster to the wall. */
function Tape({ className }: { className: string }) {
  return <span aria-hidden className={`absolute z-10 h-8 w-28 bg-bh-off/70 shadow-[0_1px_2px_rgb(0_0_0/0.15)] ${className}`} />;
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
        The leaderboards builders check every day. The board that rose most this hour takes the stage.
      </p>
    </div>
  );
}

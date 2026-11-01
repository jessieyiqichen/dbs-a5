"use client";

import { SCORE_UNIT } from "@/lib/board/copy";
import type { Riser } from "@/lib/board/live";
import { BOARD_LOOK, TILE_CLASS, type BlockColor } from "@/lib/board/look";
import type { Series } from "@/lib/board/trends";
import { Shape } from "./art/Shape";
import { Sparkline } from "./Sparkline";
import { useRoll } from "./useRoll";

const number = new Intl.NumberFormat("en-US");

/** Each followed board's fastest riser in the last hour, as tiles that touch edge to edge (the poster's mosaic carried
 *  down the page). The first, from the board that rose most, is twice the size. */
export function RisingBlocks({ risers, series }: { risers: Riser[]; series: Series }) {
  if (risers.length === 0) return <p className="bg-bh-off px-[4%] py-6 font-bh-mono text-sm">Nothing on your boards has risen in the last hour yet.</p>;
  return (
    <ul className="grid grid-cols-2 md:grid-cols-4">
      {risers.map((riser, i) => (
        <RisingBlock key={riser.boardId} riser={riser} points={series[riser.item.key] ?? []} big={i === 0} />
      ))}
    </ul>
  );
}

function RisingBlock({ riser, points, big }: { riser: Riser; points: Series[string]; big: boolean }) {
  const look = BOARD_LOOK[riser.boardId];
  // Red passes only for large text, so a red board's block is navy and keeps red for its shape
  const tile: BlockColor = look.tile === "red" ? "navy" : look.tile;
  const shape: BlockColor = look.tile === "red" ? "red" : look.color;
  const rise = useRoll(riser.item.rise);
  return (
    <li className={`relative flex min-h-56 flex-col justify-between overflow-hidden p-5 ${TILE_CLASS[tile]} ${big ? "col-span-2 md:row-span-2 md:min-h-[28rem]" : ""}`}>
      {/* In the top corner, clear of the number and the title it would otherwise hide */}
      <Shape shape={look.shape} color={shape} size={100} className={`pointer-events-none absolute -top-[10%] -right-[10%] h-auto ${big ? "w-[42%]" : "w-[38%]"}`} />
      <p className="relative max-w-[62%] font-bh-mono text-[11px]">
        {look.short} · #{riser.rank} · last hour
      </p>
      <div className="relative">
        <p className={`leading-none font-black tracking-[-0.04em] tabular-nums ${big ? "text-[clamp(72px,10vw,140px)]" : "text-6xl"}`}>
          +{number.format(rise)}
        </p>
        <p className="mt-1 font-bh-mono text-xs">{SCORE_UNIT[riser.boardId]} in the last hour</p>
        <a href={riser.item.url} target="_blank" rel="noopener noreferrer" className={`mt-3 line-clamp-2 max-w-[85%] font-bold underline-offset-4 hover:underline ${big ? "text-2xl" : "text-base"}`}>
          {riser.item.title}
        </a>
        <Sparkline points={points} width={200} height={big ? 72 : 36} variant="fill" strokeWidth={2.5} className="mt-3 max-w-[85%]" />
      </div>
    </li>
  );
}

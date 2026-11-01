"use client";

import { useEffect, useRef } from "react";
import type { BoardRow } from "@/lib/board/live";
import { sparkPath, type Point } from "@/lib/board/trends";

const number = new Intl.NumberFormat("en-US");
const TIME = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });
const W = 560;
const H = 180;

interface Props {
  row: BoardRow;
  unit: string;
  boardName: string;
  points: Point[];
  onClose: () => void;
}

/** One item's last hour, in a native modal dialog (Esc and the close button close it; focus returns to the lane). */
export function ItemDetail({ row, unit, boardName, points, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);
  const { item } = row;
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="detail-title"
      className="m-auto w-[min(40rem,calc(100%-2rem))] border-2 border-bh-navy bg-bh-off p-0 text-bh-navy shadow-[8px_8px_0_var(--color-bh-navy)] backdrop:bg-bh-navy/60"
    >
      <div className="flex items-center justify-between gap-3 border-b-2 border-bh-navy bg-bh-page px-4 py-2 font-bh-mono text-[11px]">
        <span>{boardName} · #{row.rank}</span>
        <button type="button" onClick={() => ref.current?.close()} className="min-h-9 border-2 border-bh-navy bg-bh-off px-3 font-bh font-bold hover:bg-bh-mustard">
          Close
        </button>
      </div>
      <div className="flex flex-col gap-4 p-5">
        <h2 id="detail-title" className="text-2xl leading-tight font-extrabold tracking-[-0.02em] text-balance">{item.title}</h2>
        {item.subtitle && <p className="text-sm text-bh-muted">{item.subtitle}</p>}
        <dl className="grid grid-cols-3 gap-3 font-bh-mono text-xs">
          <Fact label={unit} value={number.format(item.score)} />
          <Fact label="last hour" value={`+${number.format(Math.max(0, item.rise))}`} />
          <Fact label="comments" value={item.comments === null ? "none" : number.format(item.comments)} />
        </dl>
        <HourChart points={points} unit={unit} />
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="bh-keycap self-start border-2 border-bh-navy bg-bh-mustard px-4 py-2 font-bold">
          Open the original
        </a>
      </div>
    </dialog>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-bh-navy px-3 py-2">
      <dt className="text-bh-muted">{label}</dt>
      <dd className="text-xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}

/** The score over the last hour, with its first and last reading named in words, so the chart's ends are explicit. */
function HourChart({ points, unit }: { points: Point[]; unit: string }) {
  if (points.length === 0) return <p className="font-bh-mono text-xs text-bh-muted">No change recorded in the last hour.</p>;
  const [first, last] = [points[0], points[points.length - 1]];
  const d = sparkPath(points, W, H);
  return (
    <figure className="flex flex-col gap-1">
      <svg role="img" aria-label={`From ${first.score} to ${last.score} ${unit} in the last hour`} viewBox={`0 0 ${W} ${H}`} className="h-44 w-full border-2 border-bh-navy bg-bh-page" preserveAspectRatio="none">
        <path d={`${d} L${W} ${H} L0 ${H} Z`} fill="var(--color-bh-mustard)" fillOpacity="0.55" />
        <path d={d} pathLength={1} className="bh-draw" fill="none" stroke="var(--color-bh-navy)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption className="flex justify-between font-bh-mono text-[11px] text-bh-muted">
        <span>{TIME.format(new Date(first.at))} · {number.format(first.score)}</span>
        <span>{TIME.format(new Date(last.at))} · {number.format(last.score)}</span>
      </figcaption>
    </figure>
  );
}

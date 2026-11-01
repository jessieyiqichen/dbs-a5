import type { ReactNode } from "react";
import type { BoardId } from "@/lib/board/types";
import { FILL } from "./Shape";

/** Each board's pictogram, after the row of signs on Mercedes Bazan's Accessibility Hackathon poster (user's pick,
 *  2026-10-31). Where a board must be recognised (tabs, follow keys, window title bars, pulse staves) it is this sign;
 *  the poster and its legend keep the Bauhaus shapes. No sign uses mustard: that is a pressed key's colour. */
const SIGN: Record<BoardId, { tile: string; draw: ReactNode }> = {
  // Hacker News: a row of peaks, what is hot
  hn_front: {
    tile: FILL.off,
    draw: [0, 1, 2].map((i) => <path key={i} d={`M${18 + i * 24} 82L${30 + i * 24} 26L${42 + i * 24} 82Z`} fill={FILL.red} />),
  },
  // Show HN: a pair of eyes, look at this
  hn_show: {
    tile: FILL.red,
    draw: (
      <>
        <ellipse cx="34" cy="50" rx="14" ry="22" fill={FILL.off} />
        <ellipse cx="66" cy="50" rx="14" ry="22" fill={FILL.off} />
        <circle cx="38" cy="55" r="6.5" fill={FILL.navy} />
        <circle cx="70" cy="55" r="6.5" fill={FILL.navy} />
      </>
    ),
  },
  // GitHub trending: blocks of code in a cross
  github_trending: {
    tile: FILL.off,
    draw: [[38, 14], [14, 38], [62, 38], [38, 62]].map(([x, y]) => <rect key={`${x},${y}`} x={x} y={y} width="24" height="24" fill={FILL.cobalt} />),
  },
  // Hugging Face models: a signal going out from a point
  hf_models: {
    tile: FILL.green,
    draw: (
      <>
        {[16, 32, 48].map((r) => <path key={r} d={`M20 ${80 - r}A${r} ${r} 0 0 1 ${20 + r} 80`} fill="none" stroke={FILL.off} strokeWidth="9" />)}
        <circle cx="20" cy="80" r="7" fill={FILL.red} />
      </>
    ),
  },
  // Daily Papers: lines of text
  hf_papers: {
    tile: FILL.cobalt,
    draw: [0, 1, 2, 3].map((i) => <rect key={i} x="18" y={18 + i * 18} width={i % 2 ? 46 : 64} height="9" fill={FILL.off} />),
  },
  // Product Hunt: a launch
  producthunt: {
    tile: FILL.navy,
    draw: (
      <>
        <path d="M50 12A12 12 0 0 1 62 24V62H38V24A12 12 0 0 1 50 12Z" fill={FILL.off} />
        <path d="M38 48L26 68H38Z" fill={FILL.red} />
        <path d="M62 48L74 68H62Z" fill={FILL.red} />
        <circle cx="50" cy="32" r="6" fill={FILL.navy} />
        <path d="M42 66H58L50 86Z" fill={FILL.red} />
      </>
    ),
  },
};

/** A board's sign on its own tile, `size` px square. The caller frames it (an ink border keeps it apart from a key). */
export function BoardIcon({ board, size, className }: { board: BoardId; size: number; className?: string }) {
  const sign = SIGN[board];
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 100 100" className={className}>
      <rect width="100" height="100" fill={sign.tile} />
      {sign.draw}
    </svg>
  );
}

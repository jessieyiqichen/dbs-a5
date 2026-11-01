import type { BlockColor, Shape as ShapeName } from "@/lib/board/look";

/** The block colours as fills (the same values as the bh-* tokens in globals.css). */
export const FILL: Record<BlockColor, string> = {
  red: "#d8503a",
  cobalt: "#2547c7",
  mustard: "#e2b04a",
  green: "#1f3d39",
  navy: "#1b1a2c",
  off: "#f4f1ea",
};

/** Each shape in a 100×100 tile, touching its edges as the Dublin posters' shapes do. A circle carries a dot off
 *  centre and the square sits in a corner, so a quarter turn can be seen. */
const PATH: Record<ShapeName, string> = {
  quarter: "M0 0 H100 A100 100 0 0 1 0 100 Z",
  half: "M0 100 A50 50 0 0 1 100 100 Z",
  square: "M0 0 H58 V58 H0 Z",
  circle: "M50 0 A50 50 0 1 1 49.9 0 Z",
  triangle: "M50 0 L100 100 H0 Z",
  arch: "M0 100 V50 A50 50 0 0 1 100 50 V100 Z",
};

const MARK: Partial<Record<ShapeName, [number, number]>> = { circle: [70, 30] };

interface Props {
  shape: ShapeName;
  color: BlockColor;
  size: number;
  /** A fill other than the block colours, for pictograms on navy (look.ts LETTER_COLORS). */
  fill?: string;
  className?: string;
}

/** A flat Bauhaus shape. Decoration beside the words that name it, so hidden from assistive technology. */
export function Shape({ shape, color, size, fill, className }: Props) {
  const mark = MARK[shape];
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 100 100" className={className} overflow="visible" preserveAspectRatio="none">
      <path d={PATH[shape]} fill={fill ?? FILL[color]} />
      {mark && !fill && <circle cx={mark[0]} cy={mark[1]} r="7" fill={color === "off" || color === "mustard" ? FILL.navy : FILL.off} />}
    </svg>
  );
}

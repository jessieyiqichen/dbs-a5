import { sparkPath, type Point } from "@/lib/board/trends";

interface Props {
  points: Point[];
  width: number;
  height: number;
  /** "fill" lays a soft area under the line, for the larger charts. */
  variant?: "line" | "fill";
  strokeWidth?: number;
  className?: string;
}

/** An item's score over the last hour, in the current text colour. It draws itself in from the left on first show.
 *  Decoration beside the numbers it summarises, so hidden from assistive technology. */
export function Sparkline({ points, width, height, variant = "line", strokeWidth = 1.75, className }: Props) {
  const d = sparkPath(points, width, height);
  if (!d) return <span aria-hidden className={className} style={{ display: "block", height }} />;
  return (
    <svg aria-hidden width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" overflow="visible" className={className}>
      {variant === "fill" && <path d={`${d} L${width} ${height} L0 ${height} Z`} fill="currentColor" fillOpacity="0.18" />}
      <path
        d={d}
        pathLength={1}
        className="bh-draw"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="square"
        strokeLinejoin="miter"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

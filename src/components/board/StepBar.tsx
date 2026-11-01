import { stepPath, type Point } from "@/lib/board/trends";

/** One item's last hour as a block that climbs in steps (the user's pick for rows and tiles, 2026-10-31), drawn in the
 *  current text colour on a shared frame: the hour across, and up to `span`, the biggest gain among the items shown,
 *  measured from the score an hour ago. Decoration beside the numbers it shows, so hidden from assistive technology. */
export function StepBar({ points, score, rise, span, now, className }: {
  points: Point[];
  score: number;
  rise: number;
  span: number;
  now: Date;
  className?: string;
}) {
  const [w, h] = [80, 22];
  const to = now.getTime();
  const d = stepPath(points, w, h, { from: to - 60 * 60_000, to, base: score - Math.max(0, rise), span });
  return (
    <svg aria-hidden width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className}>
      <path d={d} fill="currentColor" />
      <rect x="0" y={h - 1.5} width={w} height="1.5" fill="currentColor" />
    </svg>
  );
}

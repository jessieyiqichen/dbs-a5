"use client";

import { lastStep, stepLine, type Point } from "@/lib/board/trends";
import { TREND_MINUTES } from "./useTrends";

const W = 200;
const H = 36;

/** One item's last hour as a step line on its own scale: the score an hour ago at the left, each recorded change a
 *  step, the latest step in red with a dot at its end. A flat line in the text colour means it sat still. */
export function StepLine({ points, before, now }: { points: Point[]; before: number; now: Date }) {
  const to = now.getTime();
  const from = to - TREND_MINUTES * 60_000;
  // The hour starts at the score the item had then, so the first step is where it first moved
  const run = [{ at: new Date(from).toISOString(), score: before }, ...points];
  const all = stepLine(run, W, H, from, to);
  const last = points.length ? lastStep(run, W, H, from, to) : { d: "", endY: H / 2 };
  return (
    <svg aria-hidden viewBox={`-2 -4 ${W + 4} ${H + 8}`} className="block h-10 w-full" preserveAspectRatio="none">
      <path d={all} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {last.d && <path d={last.d} fill="none" stroke="var(--color-bh-red)" strokeWidth="3" vectorEffect="non-scaling-stroke" />}
      <circle cx={W} cy={last.endY} r="3.5" fill={last.d ? "var(--color-bh-red)" : "currentColor"} />
    </svg>
  );
}

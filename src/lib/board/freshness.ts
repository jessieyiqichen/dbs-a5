import type { Board } from "./types";

/** The four states in docs/data-flow.md. Loading: never checked yet. Stale: three checks missed in a row, so the worker or
 *  Cron has stopped (this wins over down: a failure that old says nothing about now). Down: the last check failed. */
export type Freshness = "loading" | "fresh" | "stale" | "down";

/** How many of a board's intervals may pass with no check before it counts as stale. */
export const MISSED_CHECKS_FOR_STALE = 3;

export function freshness(board: Board, now: Date): Freshness {
  if (!board.lastCheckedAt) return "loading";
  const age = now.getTime() - new Date(board.lastCheckedAt).getTime();
  if (age > MISSED_CHECKS_FOR_STALE * board.intervalSeconds * 1000) return "stale";
  return board.lastStatus === "failed" ? "down" : "fresh";
}

const UNITS: [seconds: number, suffix: string][] = [[86_400, "d"], [3_600, "h"], [60, "m"], [1, "s"]];

/** "42s ago", "5m ago": the largest whole unit, so the label changes rarely enough to read. */
export function ageLabel(at: string | null, now: Date): string {
  if (!at) return "never";
  const seconds = Math.floor((now.getTime() - new Date(at).getTime()) / 1000);
  if (seconds < 5) return "just now";
  const [size, suffix] = UNITS.find(([unit]) => seconds >= unit) ?? UNITS[UNITS.length - 1];
  return `${Math.floor(seconds / size)}${suffix} ago`;
}

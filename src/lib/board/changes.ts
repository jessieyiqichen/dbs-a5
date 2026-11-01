// Each row's own hour (user, 2026-11-01: "I just want to see each item's own change", on a ranking that moves,
// not a feed that makes a thing of changes). Nothing here compares one item to another.
import type { Point, Series } from "./trends";
import type { BoardData, BoardId, Item } from "./types";

export interface HourRow {
  boardId: BoardId;
  rank: number;
  item: Item;
  /** The scores recorded this hour, oldest first. item_history is written when a score changes, so each is a change. */
  points: Point[];
  /** When it last changed, or null when it rose this hour but its history has not been read yet, or sat still. */
  at: string | null;
}

export interface Changes {
  changed: HourRow[];
  quiet: HourRow[];
}

/** One board as the leaderboard it is: every item in rank order, each with its own hour. */
export function rankedRows(data: BoardData, boardId: BoardId, series: Series): HourRow[] {
  return allRows(data, [boardId], series).sort((a, b) => a.rank - b.rank);
}

/** Every followed board's items in one feed, once each (on the first board that has it, boards in the order given),
 *  split into what changed this hour, latest first, and what did not. */
export function changeRows(data: BoardData, boards: BoardId[], series: Series): Changes {
  const rows = allRows(data, boards, series);
  const moved = (r: HourRow) => r.points.length > 0 || r.item.rise !== 0;
  const changed = rows.filter(moved).sort(latestFirst);
  const quiet = rows.filter((r) => !moved(r)).sort((a, b) => a.rank - b.rank);
  return { changed, quiet };
}

function allRows(data: BoardData, boards: BoardId[], series: Series): HourRow[] {
  const seen = new Set<string>();
  const rows: HourRow[] = [];
  for (const boardId of boards) {
    const entries = Object.values(data.entries).filter((e) => e.boardId === boardId && data.items[e.key] && !seen.has(e.key));
    for (const e of entries) {
      seen.add(e.key);
      const points = series[e.key] ?? [];
      rows.push({ boardId, rank: e.rank, item: data.items[e.key], points, at: points.length ? points[points.length - 1].at : null });
    }
  }
  return rows;
}

/** Timed changes newest first; a rise whose time is not known yet after them, biggest first; then by rank. */
function latestFirst(a: HourRow, b: HourRow): number {
  if (a.at && b.at && a.at !== b.at) return a.at < b.at ? 1 : -1;
  if (Boolean(a.at) !== Boolean(b.at)) return a.at ? -1 : 1;
  return Math.abs(b.item.rise) - Math.abs(a.item.rise) || a.rank - b.rank;
}

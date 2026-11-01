// The changes view (user, 2026-11-01: "I just want to see each item's own change", not a race): every item on a
// board that moved in the last hour, latest change first, each with its own hour on its own scale; what has not
// moved is folded away. Nothing here compares one item to another.
import type { Point, Series } from "./trends";
import type { BoardData, BoardId, Item } from "./types";

export interface ChangeRow {
  boardId: BoardId;
  rank: number;
  item: Item;
  /** The scores recorded this hour, oldest first. item_history is written when a score changes, so each is a change. */
  points: Point[];
  /** When it last changed, or null when it rose this hour but its history has not been read yet. */
  at: string | null;
  /** Changed after the person last looked. Nothing is unseen until a first look is recorded: a page just opened has
   *  been looked at (the user, 2026-11-01: the whole feed came up yellow). */
  unseen: boolean;
}

export interface Changes {
  changed: ChangeRow[];
  quiet: ChangeRow[];
}

/** Each item on the boards, once (on the first board that has it, boards in the order given), split into what changed
 *  this hour and what did not. `lookedAt` is when the person last marked the feed seen, from browser storage. */
export function changeRows(data: BoardData, boards: BoardId[], series: Series, lookedAt: string | null): Changes {
  const seen = new Set<string>();
  const rows: ChangeRow[] = [];
  for (const boardId of boards) {
    const entries = Object.values(data.entries).filter((e) => e.boardId === boardId && data.items[e.key] && !seen.has(e.key));
    for (const e of entries) {
      seen.add(e.key);
      const points = series[e.key] ?? [];
      const at = points.length ? points[points.length - 1].at : null;
      rows.push({ boardId, rank: e.rank, item: data.items[e.key], points, at, unseen: at !== null && lookedAt !== null && at > lookedAt });
    }
  }
  const moved = (r: ChangeRow) => r.points.length > 0 || r.item.rise !== 0;
  const changed = rows.filter(moved).sort(latestFirst);
  const quiet = rows.filter((r) => !moved(r)).sort((a, b) => a.rank - b.rank);
  return { changed, quiet };
}

/** Timed changes newest first; a rise whose time is not known yet after them, biggest first; then by rank. */
function latestFirst(a: ChangeRow, b: ChangeRow): number {
  if (a.at && b.at && a.at !== b.at) return a.at < b.at ? 1 : -1;
  if (Boolean(a.at) !== Boolean(b.at)) return a.at ? -1 : 1;
  return Math.abs(b.item.rise) - Math.abs(a.item.rise) || a.rank - b.rank;
}

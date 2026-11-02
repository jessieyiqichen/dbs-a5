// The items a person has saved, shown on their own tab (user, 2026-11-01). A saved item stays after it leaves its
// board: its row in items is never deleted, and Realtime keeps its score moving like any other.
import type { HourRow } from "./changes";
import type { Series } from "./trends";
import { BOARD_IDS, type BoardData, type BoardId, type Save } from "./types";

/** The rank shown for a saved item that is on no board any more. */
export const OFF_BOARD_RANK = 0;

export function savedKeys(saves: Save[]): Set<string> {
  return new Set(saves.map((s) => s.key));
}

/** Where a saved item ranks now: on the board it was saved from, else on any board, else off the board. */
function rankNow(data: BoardData, key: string, boardId: BoardId): number {
  const entries = Object.values(data.entries).filter((e) => e.key === key);
  return (entries.find((e) => e.boardId === boardId) ?? entries[0])?.rank ?? OFF_BOARD_RANK;
}

/** The saved items as rows, newest save first, each with its own hour. One whose item is not read yet is left out
 *  until it arrives (missingSaved names it). */
export function savedRows(data: BoardData, saves: Save[], series: Series): HourRow[] {
  return [...saves]
    .sort((a, b) => (a.savedAt < b.savedAt ? 1 : a.savedAt > b.savedAt ? -1 : 0))
    .flatMap((save) => {
      const item = data.items[save.key];
      if (!item) return [];
      const points = series[save.key] ?? [];
      return [{ boardId: save.boardId, rank: rankNow(data, save.key, save.boardId), item, points, at: points.length ? points[points.length - 1].at : null }];
    });
}

/** The saved rows grouped by the board each was saved from, boards in the page's order, only boards with something
 *  saved (user, 2026-11-01: "can Saved be sorted by board?"). */
export function savedByBoard(data: BoardData, saves: Save[], series: Series): { boardId: BoardId; rows: HourRow[] }[] {
  const rows = savedRows(data, saves, series);
  return BOARD_IDS.map((boardId) => ({ boardId, rows: rows.filter((r) => r.boardId === boardId) })).filter((g) => g.rows.length > 0);
}

/** Saved items the page has not read: ones that left every board before the page opened. */
export function missingSaved(data: BoardData, saves: Save[]): { source: string; externalId: string }[] {
  return saves
    .filter((s) => !data.items[s.key])
    .map((s) => ({ source: s.key.slice(0, s.key.indexOf(":")), externalId: s.key.slice(s.key.indexOf(":") + 1) }));
}

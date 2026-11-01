// Realtime changes applied to what the page shows. Each change returns a new BoardData and never edits the old one, so
// React sees exactly what changed; a change that cannot be read returns the same object, so nothing re-renders.
import { rowKey, rowToBoard, rowToEntry, rowToItem } from "./rows";
import { entryKey, type BoardData, type BoardId, type Item } from "./types";

type Row = Record<string, unknown>;

/** The part of a Supabase Realtime postgres_changes payload the page uses. */
export interface Change {
  table: string;
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Row;
  old: Row;
}

export function applyChange(data: BoardData, change: Change): BoardData {
  if (change.table === "boards") {
    const board = rowToBoard(change.new);
    return board ? { ...data, boards: { ...data.boards, [board.id]: board } } : data;
  }
  if (change.table === "items") {
    const key = rowKey(change.new);
    const item = key ? rowToItem(key, change.new) : null;
    return item ? { ...data, items: { ...data.items, [item.key]: item } } : data;
  }
  if (change.table === "board_entries") return applyEntryChange(data, change);
  return data;
}

function applyEntryChange(data: BoardData, change: Change): BoardData {
  if (change.eventType === "DELETE") {
    // A delete carries only the primary key: board, source and id
    const key = rowKey(change.old);
    const id = key && typeof change.old.board_id === "string" ? entryKey(change.old.board_id, key) : null;
    if (!id || !(id in data.entries)) return data;
    return { ...data, entries: Object.fromEntries(Object.entries(data.entries).filter(([k]) => k !== id)) };
  }
  const entry = rowToEntry(change.new);
  return entry ? { ...data, entries: { ...data.entries, [entryKey(entry.boardId, entry.key)]: entry } } : data;
}

export type SortOrder = "rank" | "rising";

export interface BoardRow {
  rank: number;
  item: Item;
}

/** One board's rows to show. "rising" puts what gained most in the last hour first (ties keep rank order). An entry whose
 *  item has not arrived yet is left out until it does. */
export function boardRows(data: BoardData, boardId: BoardId, sort: SortOrder, limit: number): BoardRow[] {
  const rows = Object.values(data.entries)
    .filter((e) => e.boardId === boardId && data.items[e.key])
    .map((e) => ({ rank: e.rank, item: data.items[e.key] }));
  const byRank = (a: BoardRow, b: BoardRow) => a.rank - b.rank;
  const byRise = (a: BoardRow, b: BoardRow) => b.item.rise - a.item.rise || byRank(a, b);
  return rows.sort(sort === "rising" ? byRise : byRank).slice(0, limit);
}

/** Items that are ranked on a board but not read yet: one that came back onto a board unchanged sends a rank but no item. */
export function missingItems(data: BoardData): { source: string; externalId: string }[] {
  const keys = new Set(Object.values(data.entries).map((e) => e.key).filter((key) => !data.items[key]));
  return [...keys].map((key) => {
    const at = key.indexOf(":");
    return { source: key.slice(0, at), externalId: key.slice(at + 1) };
  });
}

export interface Riser extends BoardRow {
  boardId: BoardId;
}

/** Each board's fastest riser in the last hour, for the strip across the top. A board where nothing rose is left out. */
export function risingNow(data: BoardData, boardIds: BoardId[]): Riser[] {
  return boardIds.flatMap((boardId) => {
    const [top] = boardRows(data, boardId, "rising", 1);
    return top && top.item.rise > 0 ? [{ ...top, boardId }] : [];
  });
}

/** The items the page shows for these boards (the top `limit` by rank and by rise): the ones that get trend lines. */
export function shownKeys(data: BoardData, boardIds: BoardId[], limit: number): string[] {
  const keys = boardIds.flatMap((id) => [...boardRows(data, id, "rank", limit), ...boardRows(data, id, "rising", limit)]);
  return [...new Set(keys.map((row) => row.item.key))];
}

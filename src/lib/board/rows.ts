// Rows from Supabase (the first load and each Realtime change) read into the page's types. Every row is checked before
// it is used: one with the wrong shape is dropped and counted, never shown.
import { BOARD_IDS, SOURCES, entryKey, itemKey, type Board, type BoardData, type Entry, type Item } from "./types";

type Row = Record<string, unknown>;

const isText = (v: unknown): v is string => typeof v === "string";
const isTextOrNull = (v: unknown): v is string | null => v === null || typeof v === "string";
const isWhole = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);
const isBoardId = (v: unknown): v is Board["id"] => (BOARD_IDS as readonly unknown[]).includes(v);
const isSource = (v: unknown) => (SOURCES as readonly unknown[]).includes(v);

export const BOARD_COLUMNS = "id, name, interval_seconds, last_checked_at, last_ok_at, last_status, last_error";
export const ITEM_COLUMNS = "title, url, subtitle, meta, score, comments, rise_1h";
/** Each rank with its item, in one request (board_entries has a foreign key to items). */
export const ENTRY_WITH_ITEM_COLUMNS = `board_id, source, external_id, rank, items(${ITEM_COLUMNS})`;

export function rowToBoard(r: Row): Board | null {
  const status = r.last_status;
  if (!isBoardId(r.id) || !isText(r.name) || !isWhole(r.interval_seconds)) return null;
  if (!isTextOrNull(r.last_checked_at) || !isTextOrNull(r.last_ok_at) || !isTextOrNull(r.last_error)) return null;
  if (status !== null && status !== "ok" && status !== "failed") return null;
  return {
    id: r.id, name: r.name, intervalSeconds: r.interval_seconds, lastCheckedAt: r.last_checked_at,
    lastOkAt: r.last_ok_at, lastStatus: status, lastError: r.last_error,
  };
}

/** The key of the item a row is about, from its source and id. */
export function rowKey(r: Row): string | null {
  return isSource(r.source) && isText(r.external_id) && r.external_id.length > 0 ? itemKey(r.source as string, r.external_id) : null;
}

/** An item's fields; `key` comes from the row that holds them (an items row, or the board_entries row it is nested in). */
export function rowToItem(key: string, r: Row): Item | null {
  if (!isText(r.title) || !isText(r.url) || !r.url.startsWith("https://")) return null;
  if (!isTextOrNull(r.subtitle) || !isTextOrNull(r.meta)) return null;
  // bigint columns can arrive as strings
  const score = Number(r.score);
  const rise = Number(r.rise_1h ?? 0);
  if (!Number.isFinite(score) || !Number.isFinite(rise)) return null;
  if (r.comments !== null && !isWhole(r.comments)) return null;
  return { key, title: r.title, url: r.url, subtitle: r.subtitle, meta: r.meta, score, comments: r.comments, rise };
}

export function rowToEntry(r: Row): Entry | null {
  const key = rowKey(r);
  if (!key || !isBoardId(r.board_id) || !isWhole(r.rank)) return null;
  return { boardId: r.board_id, key, rank: r.rank };
}

export function readSnapshot(boardRows: Row[], entryRows: Row[]): BoardData {
  const boards: BoardData["boards"] = {};
  const items: BoardData["items"] = {};
  const entries: BoardData["entries"] = {};
  for (const row of boardRows) {
    const board = rowToBoard(row);
    if (board) boards[board.id] = board;
  }
  for (const row of entryRows) {
    const entry = rowToEntry(row);
    const item = entry && row.items && typeof row.items === "object" ? rowToItem(entry.key, row.items as Row) : null;
    if (!entry || !item) continue;
    items[item.key] = item;
    entries[entryKey(entry.boardId, entry.key)] = entry;
  }
  const dropped = boardRows.length + entryRows.length - Object.keys(boards).length - Object.keys(entries).length;
  if (dropped > 0) console.error(`Builder's Board: skipped ${dropped} unreadable rows`);
  return { boards, items, entries };
}

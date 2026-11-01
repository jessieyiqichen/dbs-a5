// One board's run: fetch it, compare with what is stored, write only what changed. The database sits behind the
// Store interface, so a test can run this on saved responses with an in-memory store.

import { diffBoard } from "./diff.ts";
import { type BoardId, type BoardItem, itemKey, type StoredItem } from "./types.ts";

export interface Store {
  /** Stored items among these keys, whichever board they were stored for. */
  loadItems(keys: string[]): Promise<Map<string, StoredItem>>;
  /** This board's ranks as last stored, by item key. */
  loadRanks(board: BoardId): Promise<Map<string, number>>;
  upsertItems(items: BoardItem[]): Promise<void>;
  upsertRanks(board: BoardId, items: BoardItem[]): Promise<void>;
  deleteRanks(board: BoardId, keys: string[]): Promise<void>;
  insertHistory(rows: { key: string; score: number }[]): Promise<void>;
}

export interface RunResult {
  fetched: number;
  /** Rows written: changed items, changed or new ranks, removed ranks. An item's rise over the last hour is set by
   *  the database in the same write as its score (items_set_rise), and refreshed by Cron every five minutes. */
  changed: number;
}

export async function runBoard(
  board: BoardId,
  fetchItems: () => Promise<BoardItem[]>,
  store: Store,
): Promise<RunResult> {
  const fetched = await fetchItems();
  if (fetched.length === 0) throw new Error("found no rows: the site may have changed its page or API");
  const [storedItems, storedRanks] = await Promise.all([
    store.loadItems(fetched.map(itemKey)),
    store.loadRanks(board),
  ]);
  const diff = diffBoard(fetched, storedItems, storedRanks);
  // Items first: ranks and history point at them
  if (diff.items.length > 0) await store.upsertItems(diff.items);
  await Promise.all([
    diff.ranks.length > 0 ? store.upsertRanks(board, diff.ranks) : Promise.resolve(),
    diff.removed.length > 0 ? store.deleteRanks(board, diff.removed) : Promise.resolve(),
    diff.scores.length > 0 ? store.insertHistory(diff.scores) : Promise.resolve(),
  ]);
  return { fetched: fetched.length, changed: diff.items.length + diff.ranks.length + diff.removed.length };
}

// Compares what a board shows now with what the database holds, so the worker writes only what changed.
// Realtime sends every written row to every open page, so an unchanged row must never be written.

import { type BoardItem, itemKey, type StoredItem } from "./types.ts";

export interface BoardDiff {
  /** Items that are new, or whose title, link, subtitle, meta, score or comments changed. */
  items: BoardItem[];
  /** Items that are new on this board or moved to another rank on it. */
  ranks: BoardItem[];
  /** Keys of items that were on this board and are not any more: their place is removed, the item stays. */
  removed: string[];
  /** A history row for each new item and each changed score, so "rise in the last hour" can be worked out. */
  scores: { key: string; score: number }[];
}

const FIELDS = ["title", "url", "subtitle", "meta", "score", "comments"] as const;

const changed = (now: BoardItem, before: StoredItem) => FIELDS.some((f) => now[f] !== before[f]);

/**
 * `storedItems` holds every stored item this board's rows might match (an item can already be stored because it
 * sits on another board); `storedRanks` holds the ranks this board had last time.
 */
export function diffBoard(
  fetched: BoardItem[],
  storedItems: Map<string, StoredItem>,
  storedRanks: Map<string, number>,
): BoardDiff {
  const diff: BoardDiff = { items: [], ranks: [], removed: [], scores: [] };
  const present = new Set<string>();
  for (const item of fetched) {
    const key = itemKey(item);
    if (present.has(key)) continue;
    present.add(key);
    const before = storedItems.get(key);
    if (before === undefined || changed(item, before)) diff.items.push(item);
    if (before === undefined || before.score !== item.score) diff.scores.push({ key, score: item.score });
    if (storedRanks.get(key) !== item.rank) diff.ranks.push(item);
  }
  diff.removed = [...storedRanks.keys()].filter((key) => !present.has(key));
  return diff;
}

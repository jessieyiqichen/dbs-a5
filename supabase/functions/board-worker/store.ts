// The Store the worker uses on Supabase: each method is one query on the tables in
// supabase/migrations/20261031061000_builders_board_tables.sql. Every error is thrown with the table it came from.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { Store } from "./lib/run.ts";
import type { BoardId, BoardItem, Source, StoredItem } from "./lib/types.ts";

const ITEM_COLUMNS = "source, external_id, title, url, subtitle, meta, score, comments";

/** "hn:123" back into its source and id (an id may itself hold ":"). */
function split(key: string): { source: Source; externalId: string } {
  const at = key.indexOf(":");
  return { source: key.slice(0, at) as Source, externalId: key.slice(at + 1) };
}

/** Keys grouped by source, so each source is one query. */
function bySource(keys: string[]): Map<Source, string[]> {
  const groups = new Map<Source, string[]>();
  for (const key of keys) {
    const { source, externalId } = split(key);
    groups.set(source, [...(groups.get(source) ?? []), externalId]);
  }
  return groups;
}

function check(table: string, error: { message: string } | null): void {
  if (error) throw new Error(`${table}: ${error.message}`);
}

const itemRow = (i: BoardItem) => ({
  source: i.source, external_id: i.externalId, title: i.title, url: i.url, subtitle: i.subtitle, meta: i.meta,
  score: i.score, comments: i.comments, updated_at: new Date().toISOString(),
});

export function supabaseStore(db: SupabaseClient): Store {
  return {
    async loadItems(keys) {
      const found = new Map<string, StoredItem>();
      for (const [source, ids] of bySource(keys)) {
        const { data, error } = await db.from("items").select(ITEM_COLUMNS).eq("source", source).in("external_id", ids);
        check("items", error);
        for (const r of data ?? []) {
          found.set(`${r.source}:${r.external_id}`, {
            title: r.title, url: r.url, subtitle: r.subtitle, meta: r.meta, score: Number(r.score), comments: r.comments,
          });
        }
      }
      return found;
    },
    async loadRanks(board) {
      const { data, error } = await db.from("board_entries").select("source, external_id, rank").eq("board_id", board);
      check("board_entries", error);
      return new Map((data ?? []).map((r) => [`${r.source}:${r.external_id}`, r.rank as number]));
    },
    async upsertItems(items) {
      const { error } = await db.from("items").upsert(items.map(itemRow), { onConflict: "source,external_id" });
      check("items", error);
    },
    async upsertRanks(board: BoardId, items) {
      const rows = items.map((i) => ({
        board_id: board, source: i.source, external_id: i.externalId, rank: i.rank, updated_at: new Date().toISOString(),
      }));
      const { error } = await db.from("board_entries").upsert(rows, { onConflict: "board_id,source,external_id" });
      check("board_entries", error);
    },
    async deleteRanks(board, keys) {
      for (const [source, ids] of bySource(keys)) {
        const { error } = await db.from("board_entries").delete()
          .eq("board_id", board).eq("source", source).in("external_id", ids);
        check("board_entries", error);
      }
    },
    async insertHistory(rows) {
      const history = rows.map((r) => {
        const { source, externalId } = split(r.key);
        return { source, external_id: externalId, score: r.score };
      });
      const { error } = await db.from("item_history").insert(history);
      check("item_history", error);
    },
  };
}

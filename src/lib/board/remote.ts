// The board page's reads and writes, as the signed-in person. Row-level security decides what comes back: every
// signed-in person may read the boards, and only their own follows.
import type { SupabaseClient } from "@supabase/supabase-js";
import { BOARD_COLUMNS, ENTRY_WITH_ITEM_COLUMNS, ITEM_COLUMNS, readSnapshot, rowKey, rowToItem } from "./rows";
import type { Series } from "./trends";
import { BOARD_IDS, itemKey, type BoardData, type BoardId, type Follow, type Item, type Save } from "./types";

type Db = Pick<SupabaseClient, "from">;

function check(what: string, error: { message: string } | null): void {
  if (error) throw new Error(`${what}: ${error.message}`);
}

/** Every board and every item on one, in two requests (7 boards of at most 50, well under Supabase's 1,000 a request). */
export async function loadBoardData(db: Db): Promise<BoardData> {
  const [boards, entries] = await Promise.all([
    db.from("boards").select(BOARD_COLUMNS),
    db.from("board_entries").select(ENTRY_WITH_ITEM_COLUMNS),
  ]);
  check("boards", boards.error);
  check("board_entries", entries.error);
  return readSnapshot(boards.data ?? [], entries.data ?? []);
}

/** Items ranked on a board that the page has not read yet, one request per source. */
export async function loadItems(db: Db, wanted: { source: string; externalId: string }[]): Promise<Item[]> {
  const bySource = Map.groupBy(wanted, (w) => w.source);
  const found: Item[] = [];
  for (const [source, list] of bySource) {
    const { data, error } = await db.from("items").select(`source, external_id, ${ITEM_COLUMNS}`)
      .eq("source", source).in("external_id", list.map((w) => w.externalId));
    check("items", error);
    for (const row of data ?? []) {
      const key = rowKey(row);
      const item = key ? rowToItem(key, row) : null;
      if (item) found.push(item);
    }
  }
  return found;
}

const isFollow = (r: Record<string, unknown>): r is Follow & Record<string, unknown> =>
  typeof r.id === "string" && (r.kind === "board" || r.kind === "keyword") && typeof r.value === "string";

/** The signed-in person's follows. No "where user_id = ...": the database answers with their rows only. */
export async function loadFollows(db: Db): Promise<Follow[]> {
  const { data, error } = await db.from("follows").select("id, kind, value").order("created_at");
  check("follows", error);
  return (data ?? []).filter(isFollow).map(({ id, kind, value }) => ({ id, kind, value }));
}

/** user_id is never sent: the database fills it in from the person's token. */
export async function addFollow(db: Db, kind: Follow["kind"], value: string): Promise<Follow> {
  const { data, error } = await db.from("follows").insert({ kind, value }).select("id, kind, value").single();
  check("follows", error);
  if (!data || !isFollow(data)) throw new Error("follows: the new row came back in the wrong shape");
  return { id: data.id, kind: data.kind, value: data.value };
}

export async function removeFollow(db: Db, id: string): Promise<void> {
  const { error } = await db.from("follows").delete().eq("id", id);
  check("follows", error);
}

const isBoardId = (v: unknown): v is BoardId => (BOARD_IDS as readonly unknown[]).includes(v);
const SAVE_COLUMNS = "id, source, external_id, board_id, saved_at";

function rowToSave(r: Record<string, unknown>): Save | null {
  if (typeof r.id !== "string" || typeof r.source !== "string" || typeof r.external_id !== "string") return null;
  if (!isBoardId(r.board_id) || typeof r.saved_at !== "string") return null;
  return { id: r.id, key: itemKey(r.source, r.external_id), boardId: r.board_id, savedAt: r.saved_at };
}

/** The signed-in person's saved items; as with follows, the database answers with their rows only. */
export async function loadSaves(db: Db): Promise<Save[]> {
  const { data, error } = await db.from("saves").select(SAVE_COLUMNS).order("saved_at");
  check("saves", error);
  return (data ?? []).map(rowToSave).filter((s): s is Save => s !== null);
}

/** Saves one item from one board. user_id is never sent: the database fills it in from the person's token. */
export async function addSave(db: Db, key: string, boardId: BoardId): Promise<Save> {
  const at = key.indexOf(":");
  const row = { source: key.slice(0, at), external_id: key.slice(at + 1), board_id: boardId };
  const { data, error } = await db.from("saves").insert(row).select(SAVE_COLUMNS).single();
  check("saves", error);
  const save = data ? rowToSave(data) : null;
  if (!save) throw new Error("saves: the new row came back in the wrong shape");
  return save;
}

export async function removeSave(db: Db, id: string): Promise<void> {
  const { error } = await db.from("saves").delete().eq("id", id);
  check("saves", error);
}

/** Supabase answers at most 1,000 rows a request, so history is read page by page. */
const HISTORY_PAGE = 1000;

/** The score history since `since` for the items the page shows, oldest first. Signed-in people may read it (RLS). */
export async function loadHistory(db: Db, keys: string[], since: string): Promise<Series> {
  const split = (key: string) => [key.slice(0, key.indexOf(":")), key.slice(key.indexOf(":") + 1)] as const;
  const bySource = Map.groupBy(keys.map(split), ([source]) => source);
  // Built up here and handed back once, so no one else ever sees it half filled
  const series: Series = {};
  for (const [source, pairs] of bySource) {
    for (let from = 0; ; from += HISTORY_PAGE) {
      const { data, error } = await db.from("item_history").select("external_id, score, at")
        .eq("source", source).in("external_id", pairs.map(([, id]) => id)).gte("at", since)
        .order("at").range(from, from + HISTORY_PAGE - 1);
      check("item_history", error);
      for (const row of data ?? []) {
        if (typeof row.external_id !== "string" || typeof row.at !== "string" || !Number.isFinite(Number(row.score))) continue;
        (series[`${source}:${row.external_id}`] ??= []).push({ at: row.at, score: Number(row.score) });
      }
      if ((data ?? []).length < HISTORY_PAGE) break;
    }
  }
  return series;
}

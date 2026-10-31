// The board page's reads and writes, as the signed-in person. Row-level security decides what comes back: every
// signed-in person may read the boards, and only their own follows.
import type { SupabaseClient } from "@supabase/supabase-js";
import { BOARD_COLUMNS, ENTRY_WITH_ITEM_COLUMNS, ITEM_COLUMNS, readSnapshot, rowKey, rowToItem } from "./rows";
import type { BoardData, Follow, Item } from "./types";

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

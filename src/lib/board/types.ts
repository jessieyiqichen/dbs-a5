// The board page's view of the tables in supabase/migrations/20261031061000_builders_board_tables.sql.
// The worker writes them; the page only reads, except for each person's own follows.

export const BOARD_IDS = [
  "hn_front", "hn_show", "github_trending", "hf_models", "hf_papers", "producthunt",
] as const;
export type BoardId = (typeof BOARD_IDS)[number];

export const SOURCES = ["hn", "github", "hf_model", "hf_paper", "producthunt"] as const;
export type Source = (typeof SOURCES)[number];

/** One leaderboard and how its last check went. */
export interface Board {
  id: BoardId;
  name: string;
  intervalSeconds: number;
  lastCheckedAt: string | null;
  lastOkAt: string | null;
  lastStatus: "ok" | "failed" | null;
  lastError: string | null;
}

/** One story, repo, model, paper, product or topic. The same item can sit on two boards (a Show HN on the front page). */
export interface Item {
  key: string;
  title: string;
  url: string;
  subtitle: string | null;
  meta: string | null;
  score: number;
  comments: number | null;
  rise: number;
}

/** Where an item sits on one board. */
export interface Entry {
  boardId: BoardId;
  key: string;
  rank: number;
}

/** Everything the page shows, as plain objects so each change makes a new copy instead of editing the old one. */
export interface BoardData {
  boards: Record<string, Board>;
  items: Record<string, Item>;
  entries: Record<string, Entry>;
}

export interface Follow {
  id: string;
  kind: "board" | "keyword";
  value: string;
}

/** An item a person kept, with the board it was saved from: its unit and name once it has left the board. */
export interface Save {
  id: string;
  key: string;
  boardId: BoardId;
  savedAt: string;
}

/** "hn:123", the same key the worker uses (supabase/functions/board-worker/lib/types.ts). */
export const itemKey = (source: string, externalId: string) => `${source}:${externalId}`;
export const entryKey = (boardId: string, key: string) => `${boardId}|${key}`;

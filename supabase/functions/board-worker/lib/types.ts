// Shapes shared by the parsers, the diff and the worker. No Deno or Node imports here, so vitest can test this code
// and the Edge Function can run it unchanged.

/** Where an item comes from. One item can sit on two boards (a Show HN story is often on the front page too). */
export type Source = "hn" | "github" | "hf_model" | "hf_paper" | "producthunt";

/** The six leaderboards (V2EX was dropped 2026-10-31: its hot list is mostly life and career posts). */
export type BoardId =
  | "hn_front"
  | "hn_show"
  | "github_trending"
  | "hf_models"
  | "hf_papers"
  | "producthunt";

/** One row of a leaderboard, the same shape whichever site it came from. */
export interface BoardItem {
  source: Source;
  externalId: string;
  title: string;
  url: string;
  /** A second line: a description or a tagline. */
  subtitle: string | null;
  /** A short extra fact, like "+1,140 stars today". */
  meta: string | null;
  /** The number that rises: points, stars, likes, upvotes, replies or votes. */
  score: number;
  comments: number | null;
  /** 1 is the top of this board. */
  rank: number;
}

/** What the database already holds for one item (the part the worker compares). */
export type StoredItem = Pick<BoardItem, "title" | "url" | "subtitle" | "meta" | "score" | "comments">;

/** The key an item is stored under: its source and its id on that source. */
export const itemKey = (item: { source: Source; externalId: string }) => `${item.source}:${item.externalId}`;

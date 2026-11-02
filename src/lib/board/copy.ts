import type { Freshness } from "./freshness";
import type { BoardId } from "./types";

/** What each board's main number counts, as the worker stores it (supabase/functions/board-worker/lib/parse.ts). */
export const SCORE_UNIT: Record<BoardId, string> = {
  hn_front: "points",
  hn_show: "points",
  github_trending: "stars",
  hf_models: "likes",
  hf_papers: "upvotes",
  producthunt: "votes",
};

export const BOARD_BLURB: Record<BoardId, string> = {
  hn_front: "The 30 stories on news.ycombinator.com",
  hn_show: "What people just built and showed HN",
  github_trending: "Repositories gaining the most stars today",
  hf_models: "Models trending on Hugging Face",
  hf_papers: "Today's papers, by upvotes",
  producthunt: "Today's launches, by votes",
};

export const STATE_LABEL: Record<Freshness, string> = {
  loading: "Waiting for its first check",
  fresh: "Live",
  stale: "Not updating",
  down: "Last check failed",
};

/** What a stale or down board means for the person reading it. */
export const STATE_NOTE: Partial<Record<Freshness, string>> = {
  stale: "These numbers may be out of date. The worker hasn't checked this board for a while.",
  down: "Showing the last good numbers. The worker will try again on its next check.",
};

export const CONNECTION_LABEL = { connecting: "connecting", live: "live", reconnecting: "reconnecting" } as const;

export const LOAD_FAILED = "The board didn't load. Check your connection, then reload the page.";
export const SAVE_FAILED = "That change didn't save. Check your connection and try again.";
export const KEYWORD_INVALID = "Use 1 to 40 characters.";
export const SAVED_EMPTY = "Nothing saved yet. Press Save beside a score to keep an item here.";
export const SAVES_LOAD_FAILED = "Your saved items didn't load. Reload the page to see them.";
export const ROWS_PER_BOARD = 8;

import type { BoardId, Source } from "./types";

// Each board's colours and shape, in the muted Bauhaus set of Stripe's Dublin Hackathon posters (studied 2026-10-31):
// a shape in one colour on a tile of another. Text on a tile uses the colour that passes on it (globals.css).
// No board uses mustard: it is the colour of a pressed key, a chosen tab and a number that just changed (user, 2026-10-31).
export type BlockColor = "red" | "cobalt" | "mustard" | "green" | "navy" | "off";
export type Shape = "quarter" | "half" | "square" | "circle" | "triangle" | "arch";

export const BOARD_LOOK: Record<BoardId, { color: BlockColor; tile: BlockColor; shape: Shape; short: string }> = {
  hn_front: { color: "red", tile: "off", shape: "quarter", short: "HN" },
  hn_show: { color: "off", tile: "red", shape: "half", short: "Show HN" },
  github_trending: { color: "cobalt", tile: "off", shape: "square", short: "GitHub" },
  hf_models: { color: "off", tile: "green", shape: "circle", short: "HF models" },
  hf_papers: { color: "off", tile: "cobalt", shape: "triangle", short: "Papers" },
  producthunt: { color: "red", tile: "navy", shape: "arch", short: "Product Hunt" },
};

/** Where each board lives, for the title bar of its window. */
export const BOARD_DOMAIN: Record<BoardId, string> = {
  hn_front: "news.ycombinator.com",
  hn_show: "news.ycombinator.com/show",
  github_trending: "github.com/trending",
  hf_models: "huggingface.co/models",
  hf_papers: "huggingface.co/papers",
  producthunt: "producthunt.com",
};

/** A tile's background and the text colour that passes on it. Red passes only for large text (3.6:1). */
export const TILE_CLASS: Record<BlockColor, string> = {
  red: "bg-bh-red text-bh-off",
  cobalt: "bg-bh-cobalt text-bh-off",
  mustard: "bg-bh-mustard text-bh-navy",
  green: "bg-bh-green text-bh-off",
  navy: "bg-bh-navy text-bh-off",
  off: "bg-bh-off text-bh-navy",
};

/** Letter colours for headings on navy, one per letter in turn (after the Accessibility Hackathon poster). Lighter
 *  than the tile colours, since cobalt and green are too dark on navy: every one is at least 5.3:1 on navy. */
export const LETTER_COLORS = ["#6f8ff0", "#e2b04a", "#ee98a3", "#4fae86", "#f4f1ea", "#e8674f"] as const;

/** What each source's score counts, short, for the rising blocks and the last-change line. */
export const SOURCE_UNIT: Record<Source, string> = {
  hn: "points",
  github: "stars",
  hf_model: "likes",
  hf_paper: "upvotes",
  producthunt: "votes",
};

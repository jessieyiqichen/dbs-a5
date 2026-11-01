// The ways a board can be looked at (user, 2026-10-31: a plain list was too plain): tiles sized by what rose, with
// pictures where a source has them; a race of bars; the list.
import type { BoardRow } from "./live";

/** The race first: the user's pick of the three (2026-10-31). */
export const VIEWS = ["race", "tiles", "list"] as const;
export type View = (typeof VIEWS)[number];

/** Ids that can go into an image address as they are: letters, digits and . _ - /, no ".." or leading "/". */
const SAFE_PATH = /^(?!.*\.\.)(?!\/)[A-Za-z0-9._\/-]+$/;

/** A picture for an item, from its source: GitHub's social card for a repository, Hugging Face's thumbnail for a
 *  paper (both checked 2026-10-31, no key). Other sources have none. */
export function itemImage(key: string): string | null {
  const at = key.indexOf(":");
  const [source, id] = [key.slice(0, at), key.slice(at + 1)];
  if (!SAFE_PATH.test(id)) return null;
  if (source === "github") return `https://opengraph.githubassets.com/1/${id}`;
  if (source === "hf_paper") return `https://cdn-thumbnails.huggingface.co/social-thumbnails/papers/${id}.png`;
  return null;
}

/** A tile's share of the board's rise in the last hour (or of its score, when nothing rose) sets its size in cells. */
const BIG = 0.3;
const WIDE = 0.15;

export function tileSpans(rows: BoardRow[]): Record<string, [w: number, h: number]> {
  const rose = rows.some((r) => r.item.rise > 0);
  const size = (r: BoardRow) => Math.max(0, rose ? r.item.rise : r.item.score);
  const total = rows.reduce((sum, r) => sum + size(r), 0) || 1;
  return Object.fromEntries(
    rows.map((r) => {
      const share = size(r) / total;
      return [r.item.key, share >= BIG ? [2, 2] : share >= WIDE ? [2, 1] : [1, 1]];
    }),
  );
}

export interface Lane {
  row: BoardRow;
  /** The score an hour ago, and the rise since, each as a share of the leader's score (0 to 1). */
  before: number;
  rise: number;
}

/** The race: items by score, highest first (ties keep the board's rank), each bar split into what it had an hour ago
 *  and what it gained since, so a fast riser shows as a long red end. */
export function raceLanes(rows: BoardRow[]): Lane[] {
  const lead = Math.max(1, ...rows.map((r) => r.item.score));
  return [...rows]
    .sort((a, b) => b.item.score - a.item.score || a.rank - b.rank)
    .map((row) => {
      const score = Math.max(0, row.item.score);
      const rise = Math.min(score, Math.max(0, row.item.rise));
      return { row, before: (score - rise) / lead, rise: rise / lead };
    });
}

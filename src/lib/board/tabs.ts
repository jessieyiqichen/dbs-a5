// The tabs under the poster: one per followed board, then "All changes" (user, 2026-10-31: the boards were at the
// bottom of a long page), then "Saved" (user, 2026-11-01). A tab counts how many times its board moved while another
// tab was open.
import { BOARD_IDS, type BoardId } from "./types";

export const RISING_TAB = "rising";
export const SAVED_TAB = "saved";
export type Tab = BoardId | typeof RISING_TAB | typeof SAVED_TAB;

/** How many times each board has moved since the page opened (useTrends' turns), or as last seen. */
export type Moves = Partial<Record<BoardId, number>>;

/** The followed boards in the page's own order, so tabs never jump about as numbers change, then the rising tab,
 *  then saved (always there, so people find it). */
export function tabsFor(followed: BoardId[]): Tab[] {
  return [...BOARD_IDS.filter((id) => followed.includes(id)), RISING_TAB, SAVED_TAB];
}

/** The remembered tab if it is still one of the tabs, else the first. `remembered` comes from browser storage. */
export function pickTab(tabs: Tab[], remembered: string | null): Tab {
  return tabs.find((t) => t === remembered) ?? tabs[0];
}

/** Moves each board made since it was last open; the open tab shows none. */
export function unseen(moves: Moves, seen: Moves, open: Tab): Moves {
  return Object.fromEntries(
    Object.entries(moves).map(([id, n]) => [id, id === open ? 0 : Math.max(0, (n ?? 0) - (seen[id as BoardId] ?? 0))]),
  );
}

/** A board's moves so far, recorded as seen when its tab opens. */
export function markSeen(seen: Moves, moves: Moves, open: Tab): Moves {
  if (open === RISING_TAB || open === SAVED_TAB) return seen;
  return { ...seen, [open]: moves[open] ?? 0 };
}

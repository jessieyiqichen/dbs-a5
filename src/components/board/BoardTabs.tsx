"use client";

import { useRef, type KeyboardEvent } from "react";
import { BOARD_LOOK } from "@/lib/board/look";
import { RISING_TAB, SAVED_TAB, type Moves, type Tab } from "@/lib/board/tabs";
import { BoardIcon } from "./art/BoardIcon";

interface Props {
  tabs: Tab[];
  /** What this group of tabs is, for assistive technology ("Your boards", "Across your boards"). */
  label: string;
  open: Tab;
  onOpen: (tab: Tab) => void;
  /** Moves each board made while its tab was closed. */
  counts: Moves;
}

export const tabId = (tab: Tab) => `tab-${tab}`;
export const panelId = (tab: Tab) => `panel-${tab}`;

/** One group of keycap tabs (ARIA tabs: arrow keys, Home and End move within the group). A closed board that moves
 *  shows how many times, so it is clear where things are happening without opening every tab. The page lays out two
 *  groups, boards on one row and the tabs across boards on the next (BoardNav). */
export function BoardTabs({ tabs, label, open, onOpen, counts }: Props) {
  const refs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
  // The open tab takes the keyboard; a group with no open tab hands it to its first, so the group stays reachable
  const focusable = tabs.includes(open) ? open : tabs[0];
  const go = (tab: Tab) => {
    onOpen(tab);
    refs.current[tab]?.focus();
  };
  const onKey = (e: KeyboardEvent, i: number) => {
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    go(tabs[(next + tabs.length) % tabs.length]);
  };
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-x-3 gap-y-4">
      {tabs.map((tab, i) => {
        const selected = tab === open;
        const count = tab === RISING_TAB || tab === SAVED_TAB ? 0 : (counts[tab] ?? 0);
        return (
          <button
            key={tab}
            ref={(el) => void (refs.current[tab] = el)}
            id={tabId(tab)}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={panelId(tab)}
            tabIndex={tab === focusable ? 0 : -1}
            onClick={() => onOpen(tab)}
            onKeyDown={(e) => onKey(e, i)}
            className={`bh-keycap relative flex min-h-11 items-center gap-2 border-2 border-bh-navy px-3 font-bold focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-bh-navy ${selected ? "bg-bh-mustard" : "bg-bh-off hover:bg-bh-page"}`}
          >
            <TabSign tab={tab} />
            {tab === RISING_TAB ? "All changes" : tab === SAVED_TAB ? "Saved" : BOARD_LOOK[tab].short}
            {count > 0 && (
              <span className="absolute -top-2.5 -right-2.5 grid min-w-6 place-items-center bg-bh-navy px-1 font-bh-mono text-[11px] text-bh-off">
                {count}
                <span className="sr-only"> new changes</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** What sits before a tab's name: a board's sign, the red triangle of changes, or the filled square of a saved item. */
function TabSign({ tab }: { tab: Tab }) {
  if (tab === RISING_TAB) return <span aria-hidden className="text-bh-red">▲</span>;
  if (tab === SAVED_TAB) return <span aria-hidden className="block size-3.5 shrink-0 border-2 border-bh-navy bg-bh-mustard" />;
  return <BoardIcon board={tab} size={20} className="block size-5 shrink-0 border-[1.5px] border-bh-navy" />;
}

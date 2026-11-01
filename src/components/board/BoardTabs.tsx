"use client";

import { useRef, type KeyboardEvent } from "react";
import { BOARD_LOOK, TILE_CLASS } from "@/lib/board/look";
import { RISING_TAB, type Moves, type Tab } from "@/lib/board/tabs";
import { Shape } from "./art/Shape";

interface Props {
  tabs: Tab[];
  open: Tab;
  onOpen: (tab: Tab) => void;
  /** Moves each board made while its tab was closed. */
  counts: Moves;
}

export const tabId = (tab: Tab) => `tab-${tab}`;
export const panelId = (tab: Tab) => `panel-${tab}`;

/** One keycap per followed board, then "Rising now". A closed board that moves shows how many times, so it is clear
 *  where things are happening without opening every tab. Arrow keys, Home and End move between tabs (ARIA tabs). */
export function BoardTabs({ tabs, open, onOpen, counts }: Props) {
  const refs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
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
    <div role="tablist" aria-label="Your boards" className="flex flex-wrap gap-x-3 gap-y-4">
      {tabs.map((tab, i) => {
        const selected = tab === open;
        const count = tab === RISING_TAB ? 0 : (counts[tab] ?? 0);
        return (
          <button
            key={tab}
            ref={(el) => void (refs.current[tab] = el)}
            id={tabId(tab)}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={panelId(tab)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onOpen(tab)}
            onKeyDown={(e) => onKey(e, i)}
            className={`bh-keycap relative flex min-h-11 items-center gap-2 border-2 border-bh-navy px-3 font-bold focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-bh-navy ${selected ? "bg-bh-mustard" : "bg-bh-off hover:bg-bh-page"}`}
          >
            {tab === RISING_TAB ? <span aria-hidden className="text-bh-red">▲</span> : <TabShape tab={tab} />}
            {tab === RISING_TAB ? "Rising now" : BOARD_LOOK[tab].short}
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

function TabShape({ tab }: { tab: Exclude<Tab, typeof RISING_TAB> }) {
  const look = BOARD_LOOK[tab];
  return (
    <span aria-hidden className={`block size-5 overflow-hidden ${TILE_CLASS[look.tile]}`}>
      <Shape shape={look.shape} color={look.color} size={20} />
    </span>
  );
}

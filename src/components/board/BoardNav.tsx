"use client";

import { useState } from "react";
import { RISING_TAB, SAVED_TAB, type Moves, type Tab } from "@/lib/board/tabs";
import { BOARD_IDS, type Board, type BoardId, type Follow } from "@/lib/board/types";
import { BoardTabs } from "./BoardTabs";
import { BoardKey, Keywords } from "./FollowEditor";
import { PaperDialog } from "./PaperDialog";

interface Props {
  tabs: Tab[];
  open: Tab;
  onOpen: (tab: Tab) => void;
  counts: Moves;
  boards: Record<string, Board>;
  follows: Follow[];
  /** The boards followed now, so the add sheet offers only the others. */
  shown: BoardId[];
  keywordCounts: Record<string, number>;
  onAdd: (kind: Follow["kind"], value: string) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>;
}

type Dialog = "boards" | "keywords" | null;

const KEYCAP = "bh-keycap flex min-h-11 items-center gap-2 border-2 border-bh-navy bg-bh-off px-3 font-bold hover:bg-bh-page focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-bh-navy";
const isBoard = (tab: Tab): tab is BoardId => tab !== RISING_TAB && tab !== SAVED_TAB;

/** The two rows under the poster (user, 2026-11-01: one row mixed boards with everything else and wrapped badly).
 *  First row: the followed boards and "+" to add one. Second row: the tabs across boards (All changes, Saved) and
 *  "Keywords". "+" and "Keywords" open a sheet over the board, so no one is sent back to the first-time chooser;
 *  taking a board away is done on the board itself (its window's Following key). */
export function BoardNav({ tabs, open, onOpen, counts, boards, follows, shown, keywordCounts, onAdd, onRemove }: Props) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState<BoardId | null>(null);
  const unfollowed = BOARD_IDS.filter((id) => !shown.includes(id));

  const addBoard = async (id: BoardId) => {
    setBusy(id);
    const added = await onAdd("board", id);
    setBusy(null);
    if (!added) return;
    setDialog(null);
    onOpen(id);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-4">
        <BoardTabs tabs={tabs.filter(isBoard)} label="Your boards" open={open} onOpen={onOpen} counts={counts} />
        {unfollowed.length > 0 && (
          <button type="button" onClick={() => setDialog("boards")} className={KEYCAP}>
            <span aria-hidden className="text-xl leading-none">+</span>
            Add a board
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-4">
        <BoardTabs tabs={tabs.filter((t) => !isBoard(t))} label="Across your boards" open={open} onOpen={onOpen} counts={counts} />
        <button type="button" onClick={() => setDialog("keywords")} className={`${KEYCAP} ml-auto`}>
          Keywords
        </button>
      </div>
      <PaperDialog open={dialog === "boards"} onClose={() => setDialog(null)} title="Add a board">
        <ul className="grid gap-3">
          {unfollowed.map((id) => (
            <li key={id}>
              <BoardKey id={id} name={boards[id]?.name ?? id} on={false} busy={busy === id} onToggle={() => void addBoard(id)} />
            </li>
          ))}
        </ul>
      </PaperDialog>
      <PaperDialog open={dialog === "keywords"} onClose={() => setDialog(null)} title="Keywords">
        <Keywords follows={follows.filter((f) => f.kind === "keyword")} counts={keywordCounts} onAdd={onAdd} onRemove={onRemove} heading={false} />
      </PaperDialog>
    </div>
  );
}

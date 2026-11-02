"use client";

import { useState } from "react";
import { BOARD_IDS, type Board, type BoardId, type Follow } from "@/lib/board/types";
import { BoardKey, Keywords } from "./FollowEditor";
import { PaperDialog } from "./PaperDialog";

interface Props {
  boards: Record<string, Board>;
  follows: Follow[];
  /** The boards followed now, so the add dialog offers only the others. */
  shown: BoardId[];
  counts: Record<string, number>;
  onAdd: (kind: Follow["kind"], value: string) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>;
  /** Opens a board's tab, once it has been added. */
  onOpen: (id: BoardId) => void;
}

type Dialog = "boards" | "keywords" | null;

const KEYCAP = "bh-keycap flex min-h-11 items-center gap-2 border-2 border-bh-navy bg-bh-off px-3 font-bold hover:bg-bh-page focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-bh-navy";

/** The two keys beside the tabs: "+" adds a board, "Keywords" edits the words picked out. Each opens a sheet over the
 *  board, so no one is sent back to the first-time chooser (user, 2026-11-01). Taking a board away is done on the
 *  board itself (its window's Following key). */
export function FollowControls({ boards, follows, shown, counts, onAdd, onRemove, onOpen }: Props) {
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
    <div className="ml-auto flex flex-wrap gap-3">
      {unfollowed.length > 0 && (
        <button type="button" onClick={() => setDialog("boards")} className={KEYCAP}>
          <span aria-hidden className="text-xl leading-none">+</span>
          Add a board
        </button>
      )}
      <button type="button" onClick={() => setDialog("keywords")} className={KEYCAP}>
        Keywords
      </button>
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
        <Keywords follows={follows.filter((f) => f.kind === "keyword")} counts={counts} onAdd={onAdd} onRemove={onRemove} heading={false} />
      </PaperDialog>
    </div>
  );
}

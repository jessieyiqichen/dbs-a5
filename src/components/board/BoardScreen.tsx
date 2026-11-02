"use client";

import { useState } from "react";
import { rankedRows, type HourRow } from "@/lib/board/changes";
import { LOAD_FAILED, SAVE_FAILED, SAVES_LOAD_FAILED } from "@/lib/board/copy";
import { SUGGESTED_KEYWORDS, followedBoards, keywordCounts, keywordsIn } from "@/lib/board/follows";
import { freshness } from "@/lib/board/freshness";
import { shownKeys } from "@/lib/board/live";
import { savedByBoard, savedKeys } from "@/lib/board/saves";
import { RISING_TAB, SAVED_TAB, markSeen, pickTab, tabsFor, unseen, type Moves, type Tab } from "@/lib/board/tabs";
import { boardWeights, type Series } from "@/lib/board/trends";
import type { BoardData, BoardId } from "@/lib/board/types";
import { BoardNav } from "./BoardNav";
import { BoardPanel } from "./BoardPanel";
import { panelId, tabId } from "./BoardTabs";
import { FollowEditor } from "./FollowEditor";
import { LetterHeading } from "./LetterHeading";
import { PosterHero } from "./PosterHero";
import { RisingTab } from "./RisingTab";
import { SavedTab } from "./SavedTab";
import { useFollows } from "./useFollows";
import { useBoardDb, useBoardLive, useNow } from "./useBoardLive";
import { usePersisted } from "./usePersisted";
import { useSaves } from "./useSaves";
import { useTrends } from "./useTrends";

/** How many of a board's rows (by rank and by rise) get their hour read: the whole board, so every change has a line. */
const ROWS_WITH_HISTORY = 50;

/** Builder's Board: a poster banner the data draws, then a tab per followed board and one for all changes
 *  (user, 2026-10-31: the boards were at the bottom of a long page). */
export function BoardScreen() {
  const db = useBoardDb();
  const saves = useSaves(db);
  const mySaves = saves.state.kind === "ready" ? saves.state.saves : [];
  const { load, connection } = useBoardLive(db, mySaves);
  const follows = useFollows(db);
  const now = useNow();
  const [editing, setEditing] = useState(false);
  const [remembered, setRemembered] = usePersisted<string>("bb-tab", (s) => s ?? "");
  const [seen, setSeen] = useState<Moves>({});

  const data = load.kind === "ready" ? load.data : null;
  const mine = follows.state.kind === "ready" ? follows.state.follows : [];
  const shown = followedBoards(mine);
  const saved = savedKeys(mySaves);
  // Saved items get their hour read too, so the Saved tab draws lines for items that left their board
  const withHistory = data ? [...new Set([...shownKeys(data, shown, ROWS_WITH_HISTORY), ...saved])] : [];
  const trends = useTrends(db, data, withHistory, shown);
  // Nothing followed yet: the chooser counts as opened by the person, so their first pick does not close it (seen on
  // the live site, 2026-11-01); Done closes it. Set during render, as React does for state that follows props.
  if (follows.state.kind === "ready" && shown.length === 0 && !editing) setEditing(true);

  if (load.kind === "failed" || follows.state.kind === "failed") return <Message text={LOAD_FAILED} />;
  if (!data || follows.state.kind === "loading") return <Skeleton />;
  const tabs = tabsFor(shown);
  const open = pickTab(tabs, remembered);
  const choosing = editing || shown.length === 0;
  const keywords = keywordsIn(mine);
  const onOpen = (tab: Tab) => {
    setSeen((s) => markSeen(markSeen(s, trends.turns, open), trends.turns, tab));
    setRemembered(tab);
  };
  const onToggleSave = (row: HourRow) => void saves.toggle(row.item.key, row.boardId);
  const unfollow = (id: BoardId) => {
    const follow = mine.find((f) => f.kind === "board" && f.value === id);
    if (follow) void follows.remove(follow.id);
  };
  const allKeywords = [...keywords, ...SUGGESTED_KEYWORDS];

  return (
    <div className="bh-paper flex flex-1 flex-col font-bh text-bh-navy">
      <PosterHero weights={boardWeights(data, shown)} turns={trends.turns} connection={connection} now={now} />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
        {!choosing && (
          <BoardNav
            tabs={tabs}
            open={open}
            onOpen={onOpen}
            counts={unseen(trends.turns, seen, open)}
            boards={data.boards}
            follows={mine}
            shown={shown}
            keywordCounts={keywordCounts(data, shown, allKeywords)}
            onAdd={follows.add}
            onRemove={follows.remove}
          />
        )}
        {(follows.saveFailed || saves.saveFailed) && <p role="alert" className="border-2 border-bh-navy bg-bh-mustard px-3 py-2 font-bold">{SAVE_FAILED}</p>}
        {saves.state.kind === "failed" && <p role="alert" className="border-2 border-bh-navy bg-bh-mustard px-3 py-2 font-bold">{SAVES_LOAD_FAILED}</p>}
        {choosing ? (
          <section aria-labelledby="follow-heading">
            <LetterHeading id="follow-heading" label="Choose what to follow" lines={["FOLLOW"]}>
              <div className="flex flex-wrap items-center gap-4">
                <p className="max-w-xs font-bh-mono text-[11px] text-bh-off">Pick boards and keywords. Saved to your account, seen only by you.</p>
                {shown.length > 0 && (
                  <button type="button" onClick={() => setEditing(false)} className="bh-keycap min-h-11 border-2 border-bh-off bg-bh-mustard px-4 font-bold text-bh-navy">
                    Done · show my boards
                  </button>
                )}
              </div>
            </LetterHeading>
            <div className="border-2 border-t-0 border-bh-navy bg-bh-off p-5">
              <FollowEditor boards={data.boards} follows={mine} counts={keywordCounts(data, shown, allKeywords)} onAdd={follows.add} onRemove={follows.remove} />
            </div>
          </section>
        ) : (
          <div role="tabpanel" id={panelId(open)} aria-labelledby={tabId(open)}>
            {open === RISING_TAB ? (
              <RisingTab data={data} boards={shown} keywords={keywords} series={trends.series} now={now} saved={saved} onToggleSave={onToggleSave} />
            ) : open === SAVED_TAB ? (
              <SavedTab groups={savedByBoard(data, mySaves, trends.series)} keywords={keywords} now={now} saved={saved} onToggleSave={onToggleSave} />
            ) : (
              <OneBoard data={data} id={open} keywords={keywords} series={trends.series} now={now} saved={saved} onToggleSave={onToggleSave} onUnfollow={() => unfollow(open)} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

interface OneBoardProps {
  data: BoardData;
  id: BoardId;
  keywords: string[];
  series: Series;
  now: Date;
  saved: Set<string>;
  onToggleSave: (row: HourRow) => void;
  onUnfollow: () => void;
}

/** One board in its window: its ranking, each row with its own hour. */
function OneBoard({ data, id, keywords, series, now, saved, onToggleSave, onUnfollow }: OneBoardProps) {
  const board = data.boards[id];
  if (!board) return <p className="font-bh-mono text-sm">This board has not been checked yet.</p>;
  return (
    <BoardPanel
      board={board}
      state={freshness(board, now)}
      rows={rankedRows(data, id, series)}
      keywords={keywords}
      now={now}
      saved={saved}
      onToggleSave={onToggleSave}
      onUnfollow={onUnfollow}
    />
  );
}

function Skeleton() {
  return (
    <div aria-busy className="bh-paper flex flex-1 flex-col">
      <p className="sr-only">Loading the boards</p>
      <div className="h-72 animate-pulse bg-bh-cobalt" />
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="h-[28rem] animate-pulse border-2 border-bh-navy/20 bg-bh-off" />
      </div>
    </div>
  );
}

function Message({ text }: { text: string }) {
  return (
    <main className="bh-paper flex flex-1 flex-col px-4 py-8 font-bh">
      <p role="alert" className="mx-auto w-full max-w-6xl border-2 border-bh-navy bg-bh-mustard px-3 py-2 font-bold text-bh-navy">{text}</p>
    </main>
  );
}

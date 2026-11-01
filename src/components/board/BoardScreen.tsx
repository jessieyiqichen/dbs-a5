"use client";

import { useState } from "react";
import { LOAD_FAILED, SAVE_FAILED, SCORE_UNIT } from "@/lib/board/copy";
import { followedBoards, keywordsIn } from "@/lib/board/follows";
import { freshness } from "@/lib/board/freshness";
import { boardRows, risingNow, shownKeys } from "@/lib/board/live";
import { RISING_TAB, markSeen, pickTab, tabsFor, unseen, type Moves, type Tab } from "@/lib/board/tabs";
import { boardRises, boardWeights, pulse, type Series } from "@/lib/board/trends";
import type { BoardData, BoardId, Follow } from "@/lib/board/types";
import { VIEWS, type View } from "@/lib/board/views";
import { BoardPanel, VIEW_ROWS } from "./BoardPanel";
import { BoardTabs, panelId, tabId } from "./BoardTabs";
import { FollowEditor } from "./FollowEditor";
import { LetterHeading } from "./LetterHeading";
import { PosterHero } from "./PosterHero";
import { PulseScore } from "./PulseScore";
import { RisingTab, boardOfItems } from "./RisingTab";
import { useFollows } from "./useFollows";
import { useBoardDb, useBoardLive, useNow } from "./useBoardLive";
import { usePersisted } from "./usePersisted";
import { TREND_MINUTES, useTrends } from "./useTrends";

/** The most rows any view shows, so every view has its trend lines ready. */
const MOST_ROWS = Math.max(...Object.values(VIEW_ROWS));
const readView = (stored: string | null): View => VIEWS.find((v) => v === stored) ?? "race";

/** Builder's Board: a poster banner the data draws, then a tab per followed board and one for what is rising
 *  (user, 2026-10-31: the boards were at the bottom of a long page). */
export function BoardScreen() {
  const db = useBoardDb();
  const { load, connection } = useBoardLive(db);
  const follows = useFollows(db);
  const now = useNow();
  const [editing, setEditing] = useState(false);
  const [view, setView] = usePersisted<View>("bb-view-2", readView);
  const [remembered, setRemembered] = usePersisted<string>("bb-tab", (s) => s ?? "");
  const [seen, setSeen] = useState<Moves>({});

  const data = load.kind === "ready" ? load.data : null;
  const mine = follows.state.kind === "ready" ? follows.state.follows : [];
  const shown = followedBoards(mine);
  const trends = useTrends(db, data, data ? shownKeys(data, shown, MOST_ROWS) : [], shown);

  if (load.kind === "failed" || follows.state.kind === "failed") return <Message text={LOAD_FAILED} />;
  if (!data || follows.state.kind === "loading") return <Skeleton />;
  const tabs = tabsFor(shown);
  const open = pickTab(tabs, remembered);
  const choosing = editing || shown.length === 0;
  const onOpen = (tab: Tab) => {
    setSeen((s) => markSeen(markSeen(s, trends.turns, open), trends.turns, tab));
    setRemembered(tab);
  };

  return (
    <div className="bh-paper flex flex-1 flex-col font-bh text-bh-navy">
      <PosterHero weights={boardWeights(data, shown)} rises={riseLabels(data, shown)} turns={trends.turns} connection={connection} last={trends.last} now={now} />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {!choosing && <BoardTabs tabs={tabs} open={open} onOpen={onOpen} counts={unseen(trends.turns, seen, open)} />}
          {shown.length > 0 && (
            <button type="button" onClick={() => setEditing(!editing)} className="bh-keycap ml-auto min-h-11 border-2 border-bh-navy bg-bh-off px-4 font-bold">
              {editing ? "Done" : "Choose what to follow"}
            </button>
          )}
        </div>
        {follows.saveFailed && <p role="alert" className="border-2 border-bh-navy bg-bh-mustard px-3 py-2 font-bold">{SAVE_FAILED}</p>}
        {choosing ? (
          <section aria-labelledby="follow-heading">
            <LetterHeading id="follow-heading" label="Choose what to follow" lines={["CHOOSE", "WHAT TO", "FOLLOW"]}>
              <p className="max-w-xs font-bh-mono text-[11px] text-bh-off">Saved to your account. Only you see your choices.</p>
            </LetterHeading>
            <div className="border-2 border-t-0 border-bh-navy bg-bh-off p-5">
              <FollowEditor boards={data.boards} follows={mine} onAdd={follows.add} onRemove={follows.remove} />
            </div>
          </section>
        ) : (
          <div role="tabpanel" id={panelId(open)} aria-labelledby={tabId(open)}>
            {open === RISING_TAB ? (
              <RisingTab data={data} boards={shown} series={trends.series} now={now} />
            ) : (
              <OneBoard data={data} id={open} follows={mine} series={trends.series} now={now} view={view} onView={setView} />
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
  follows: Follow[];
  series: Series;
  now: Date;
  view: View;
  onView: (view: View) => void;
}

/** One board in its window, with its own pulse above its rows and its fastest riser starred. */
function OneBoard({ data, id, follows, series, now, view, onView }: OneBoardProps) {
  const board = data.boards[id];
  if (!board) return <p className="font-bh-mono text-sm">This board has not been checked yet.</p>;
  return (
    <BoardPanel
      board={board}
      state={freshness(board, now)}
      rows={boardRows(data, id, view === "tiles" ? "rising" : "rank", VIEW_ROWS[view])}
      keywords={keywordsIn(follows)}
      series={series}
      now={now}
      starKey={risingNow(data, [id])[0]?.item.key}
      view={view}
      onView={onView}
      pulse={<PulseScore marks={pulse(series, boardOfItems(data, [id]), now, TREND_MINUTES)} boards={[id]} />}
    />
  );
}

/** "+96 points" for each board that rose in the last hour, for the poster's legend. */
function riseLabels(data: BoardData, shown: BoardId[]): Partial<Record<BoardId, string>> {
  const totals = boardRises(data, shown);
  return Object.fromEntries(shown.flatMap((id, i) => (totals[i] > 0 ? [[id, `+${totals[i].toLocaleString("en-US")} ${SCORE_UNIT[id]}`]] : [])));
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

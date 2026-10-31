"use client";

import { useState } from "react";
import { CONNECTION_LABEL, LOAD_FAILED, ROWS_PER_BOARD, SAVE_FAILED } from "@/lib/board/copy";
import { followedBoards, keywordsIn } from "@/lib/board/follows";
import { freshness } from "@/lib/board/freshness";
import { boardRows, type SortOrder } from "@/lib/board/live";
import { BoardPanel } from "./BoardPanel";
import { FollowEditor } from "./FollowEditor";
import { useFollows } from "./useFollows";
import { useBoardDb, useBoardLive, useNow, type Connection } from "./useBoardLive";

const SORTS: { value: SortOrder; label: string }[] = [
  { value: "rank", label: "By rank" },
  { value: "rising", label: "Rising in the last hour" },
];

/** Builder's Board: the boards someone follows, updating as the worker writes. With nothing followed yet, the screen
 *  opens on choosing what to follow. */
export function BoardScreen() {
  const db = useBoardDb();
  const { load, connection } = useBoardLive(db);
  const follows = useFollows(db);
  const now = useNow();
  const [sort, setSort] = useState<SortOrder>("rank");
  const [editing, setEditing] = useState(false);

  if (load.kind === "failed" || follows.state.kind === "failed") return <Message text={LOAD_FAILED} />;
  if (load.kind === "loading" || follows.state.kind === "loading") return <Skeleton />;

  const data = load.data;
  const mine = follows.state.follows;
  const shown = followedBoards(mine);
  const keywords = keywordsIn(mine);
  const choosing = editing || shown.length === 0;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Builder&apos;s Board</h1>
          <ConnectionNote connection={connection} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!choosing && <SortPicker sort={sort} onChange={setSort} />}
          {shown.length > 0 && (
            <button
              type="button"
              onClick={() => setEditing(!editing)}
              className="min-h-11 rounded-xl border border-line bg-surface px-4 font-semibold text-ink hover:bg-wash"
            >
              {editing ? "Done" : "Choose what to follow"}
            </button>
          )}
        </div>
      </header>
      {follows.saveFailed && <p role="alert" className="mb-4 rounded-xl bg-danger-wash px-3 py-2 text-danger">{SAVE_FAILED}</p>}
      {choosing ? (
        <FollowEditor boards={data.boards} follows={mine} onAdd={follows.add} onRemove={follows.remove} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {shown.filter((id) => data.boards[id]).map((id) => (
            <BoardPanel
              key={id}
              board={data.boards[id]}
              state={freshness(data.boards[id], now)}
              rows={boardRows(data, id, sort, ROWS_PER_BOARD)}
              keywords={keywords}
              now={now}
            />
          ))}
        </div>
      )}
    </main>
  );
}

function ConnectionNote({ connection }: { connection: Connection }) {
  const dot = connection === "live" ? "bg-primary" : "bg-reward";
  return (
    <p className="mt-1 flex items-center gap-2 text-sm text-muted" aria-live="polite">
      <span aria-hidden className={`inline-block size-2 rounded-full ${dot}`} />
      {CONNECTION_LABEL[connection]}
    </p>
  );
}

function SortPicker({ sort, onChange }: { sort: SortOrder; onChange: (sort: SortOrder) => void }) {
  return (
    <div role="radiogroup" aria-label="Order" className="flex rounded-xl border border-line bg-surface p-1">
      {SORTS.map((s) => (
        <button
          key={s.value}
          type="button"
          role="radio"
          aria-checked={sort === s.value}
          onClick={() => onChange(s.value)}
          className={`min-h-9 rounded-lg px-3 text-sm font-semibold ${sort === s.value ? "bg-ink text-surface" : "text-ink hover:bg-wash"}`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

function Skeleton() {
  return (
    <main aria-busy className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 lg:grid-cols-2">
      <p className="sr-only">Loading the boards</p>
      {[0, 1].map((i) => (
        <div key={i} className="h-96 animate-pulse rounded-2xl bg-wash" />
      ))}
    </main>
  );
}

function Message({ text }: { text: string }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <p role="alert" className="rounded-xl bg-danger-wash px-3 py-2 text-danger">{text}</p>
    </main>
  );
}

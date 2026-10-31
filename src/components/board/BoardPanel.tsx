"use client";

import { SCORE_UNIT, STATE_LABEL, STATE_NOTE } from "@/lib/board/copy";
import { itemKeywords } from "@/lib/board/follows";
import { ageLabel, type Freshness } from "@/lib/board/freshness";
import type { BoardRow } from "@/lib/board/live";
import type { Board } from "@/lib/board/types";
import styles from "./board.module.css";

const STATE_DOT: Record<Freshness, string> = {
  loading: "bg-line",
  fresh: "bg-primary",
  stale: "bg-reward",
  down: "bg-danger",
};

const number = new Intl.NumberFormat("en-US");

interface Props {
  board: Board;
  state: Freshness;
  rows: BoardRow[];
  keywords: string[];
  now: Date;
}

/** One leaderboard: its state and when it was last checked, then its rows. */
export function BoardPanel({ board, state, rows, keywords, now }: Props) {
  const note = STATE_NOTE[state];
  return (
    <section aria-labelledby={`board-${board.id}`} className="rounded-2xl border border-hairline bg-surface p-4">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id={`board-${board.id}`} className="font-display text-lg font-semibold text-ink">{board.name}</h2>
        <p className="flex items-center gap-2 text-sm text-muted" aria-live="polite">
          <span aria-hidden className={`inline-block size-2 rounded-full ${STATE_DOT[state]}`} />
          <span>{STATE_LABEL[state]}</span>
          <span>· checked {ageLabel(board.lastCheckedAt, now)}</span>
        </p>
      </header>
      {note && (
        <p role="status" className="mb-3 rounded-xl bg-wash px-3 py-2 text-sm text-ink">
          {note}
          {state === "down" && board.lastError && <span className="block text-muted">{board.lastError}</span>}
        </p>
      )}
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{state === "loading" ? "Nothing yet." : "No rows on this board right now."}</p>
      ) : (
        <ol className="divide-y divide-hairline">
          {rows.map((row) => (
            <Row key={row.item.key} row={row} unit={SCORE_UNIT[board.id]} keywords={keywords} />
          ))}
        </ol>
      )}
    </section>
  );
}

function Row({ row, unit, keywords }: { row: BoardRow; unit: string; keywords: string[] }) {
  const { item } = row;
  const matched = itemKeywords(item, keywords);
  const detail = [item.subtitle, item.meta].filter(Boolean).join(" · ");
  return (
    <li className={`grid grid-cols-[2rem_1fr_auto] items-baseline gap-3 py-2 ${matched.length ? "bg-reward-soft" : ""}`}>
      <span className="text-right font-mono text-sm tabular-nums text-muted">{row.rank}</span>
      <div className="min-w-0">
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="break-words text-ink hover:underline">
          {item.title}
        </a>
        {(detail || matched.length > 0) && (
          <p className="truncate text-sm text-muted">
            {matched.length > 0 && <span className="font-semibold text-reward-deep">{matched.join(", ")} · </span>}
            {detail}
          </p>
        )}
      </div>
      <div className="text-right font-mono text-sm tabular-nums">
        {/* A new key on each new number restarts the flash, so a change is seen as it lands */}
        <span key={item.score} className={`block text-ink ${styles.flash}`}>
          {number.format(item.score)} <span className="text-muted">{unit}</span>
        </span>
        {item.rise > 0 && <span className="block text-lip">+{number.format(item.rise)} 1h</span>}
      </div>
    </li>
  );
}

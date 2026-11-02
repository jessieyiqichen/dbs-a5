"use client";

import type { HourRow } from "@/lib/board/changes";
import { SAVED_EMPTY } from "@/lib/board/copy";
import { HourRows } from "./HourRows";
import { LetterHeading } from "./LetterHeading";

interface Props {
  /** The saved items, newest save first (lib/board/saves.ts). */
  rows: HourRow[];
  keywords: string[];
  now: Date;
  saved: Set<string>;
  onToggleSave: (row: HourRow) => void;
}

/** The "Saved" tab: what this person kept, from any board, each row still drawing its own hour. */
export function SavedTab({ rows, keywords, now, saved, onToggleSave }: Props) {
  return (
    <section aria-labelledby="saved-heading">
      {/* No note beside the heading (user, 2026-11-01: "what is this for"); the empty state says what to do */}
      <LetterHeading id="saved-heading" label="Saved" lines={["SAVED"]} />
      <div className="border-2 border-t-0 border-bh-navy bg-bh-off">
        {rows.length === 0 ? (
          <p className="px-4 py-6 font-bh-mono text-sm">{SAVED_EMPTY}</p>
        ) : (
          <HourRows rows={rows} keywords={keywords} now={now} showBoard saved={saved} onToggleSave={onToggleSave} />
        )}
      </div>
    </section>
  );
}

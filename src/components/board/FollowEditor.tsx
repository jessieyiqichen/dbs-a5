"use client";

import { useState, type FormEvent } from "react";
import { BOARD_BLURB, KEYWORD_INVALID } from "@/lib/board/copy";
import { SUGGESTED_KEYWORDS, cleanKeyword } from "@/lib/board/follows";
import { BOARD_IDS, type BoardId, type Board, type Follow } from "@/lib/board/types";
import { BoardIcon } from "./art/BoardIcon";

interface Props {
  boards: Record<string, Board>;
  follows: Follow[];
  /** How many items on the followed boards each keyword (added or suggested) picks out right now. */
  counts: Record<string, number>;
  onAdd: (kind: Follow["kind"], value: string) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>;
}

/** Which boards to show, and which words to pick out on them, in the Tape & Tile look: each board is a keycap that
 *  stays pressed while it is followed; keywords show how many items they pick out right now. Each choice is saved to
 *  the person's own follows. */
export function FollowEditor({ boards, follows, counts, onAdd, onRemove }: Props) {
  const followOf = (kind: Follow["kind"], value: string) => follows.find((f) => f.kind === kind && f.value === value);
  const [busy, setBusy] = useState<string | null>(null);
  const followed = BOARD_IDS.filter((id) => followOf("board", id)).length;

  const toggle = async (id: BoardId) => {
    setBusy(id);
    const existing = followOf("board", id);
    await (existing ? onRemove(existing.id) : onAdd("board", id));
    setBusy(null);
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <section aria-labelledby="follow-boards">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h3 id="follow-boards" className="text-xl font-extrabold tracking-[-0.02em]">Boards</h3>
          <p className="font-bh-mono text-[11px]" aria-live="polite">{followed} of {BOARD_IDS.length} followed</p>
        </div>
        <ul className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          {BOARD_IDS.map((id) => (
            <li key={id}>
              <BoardKey id={id} name={boards[id]?.name ?? id} on={Boolean(followOf("board", id))} busy={busy === id} onToggle={() => void toggle(id)} />
            </li>
          ))}
        </ul>
      </section>
      <Keywords follows={follows.filter((f) => f.kind === "keyword")} counts={counts} onAdd={onAdd} onRemove={onRemove} />
    </div>
  );
}

/** One board as a keycap: pressed (mustard) while followed. Also the rows of the "Add a board" sheet (FollowControls). */
export function BoardKey({ id, name, on, busy, onToggle }: { id: BoardId; name: string; on: boolean; busy: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-busy={busy}
      onClick={onToggle}
      className={`bh-keycap flex h-full w-full items-start gap-3 border-2 border-bh-navy p-3 text-left focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-bh-navy ${on ? "bg-bh-mustard" : "bg-bh-off hover:bg-bh-page"} ${busy ? "opacity-70" : ""}`}
    >
      {/* An ink frame keeps the icon apart from the key, whose pressed mustard is some icons' own tile colour */}
      <BoardIcon board={id} size={44} className="block size-11 shrink-0 border-2 border-bh-navy" />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-extrabold leading-tight">{name}</span>
        <span className="text-sm leading-snug">{BOARD_BLURB[id]}</span>
      </span>
      <span aria-hidden className={`grid size-6 shrink-0 place-items-center border-2 border-bh-navy text-sm font-black ${on ? "bg-bh-navy text-bh-off" : "bg-bh-off"}`}>
        {on ? "✓" : ""}
      </span>
    </button>
  );
}

interface KeywordProps {
  follows: Follow[];
  counts: Record<string, number>;
  onAdd: Props["onAdd"];
  onRemove: Props["onRemove"];
  /** False inside the Keywords sheet, whose own title says it. */
  heading?: boolean;
}

/** The keywords to pick out, with how many items each finds now. Also the body of the Keywords sheet (FollowControls). */
export function Keywords({ follows, counts, onAdd, onRemove, heading = true }: KeywordProps) {
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);
  const have = new Set(follows.map((f) => f.value));
  const suggestions = SUGGESTED_KEYWORDS.filter((k) => !have.has(k));

  const add = async (raw: string) => {
    const keyword = cleanKeyword(raw);
    if (!keyword) return setInvalid(true);
    setInvalid(false);
    // Cleared at once, so a second word typed while the first saves starts in an empty box; put back if it didn't save
    setDraft("");
    if (have.has(keyword)) return;
    if (!(await onAdd("keyword", keyword))) setDraft(raw);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void add(draft);
  };

  return (
    <section aria-labelledby={heading ? "follow-keywords" : undefined}>
      {heading && <h3 id="follow-keywords" className="mb-1 text-xl font-extrabold tracking-[-0.02em]">Keywords</h3>}
      <p className="mb-4 font-bh-mono text-[11px] text-bh-muted">Items that mention one get a chip on every board. The number is how many it picks out now.</p>
      <form onSubmit={submit} noValidate>
        <label htmlFor="keyword" className="sr-only">A keyword to pick out</label>
        <div className="flex gap-3">
          <input
            id="keyword"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={60}
            placeholder="agent, rust, 大模型"
            aria-invalid={invalid}
            aria-describedby={invalid ? "keyword-error" : undefined}
            className="min-h-12 min-w-0 flex-1 border-2 border-bh-navy bg-bh-off px-3 text-base placeholder:text-bh-muted focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-bh-navy"
          />
          <button type="submit" className="bh-keycap min-h-12 border-2 border-bh-navy bg-bh-mustard px-5 font-bold focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-bh-navy">
            Add
          </button>
        </div>
        {invalid && <p id="keyword-error" role="alert" className="mt-2 border-2 border-bh-navy bg-bh-mustard px-2 py-1 text-sm font-bold">{KEYWORD_INVALID}</p>}
      </form>
      <KeywordChips follows={follows} counts={counts} onRemove={onRemove} />
      {suggestions.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 font-bh-mono text-[11px]">Try one</p>
          <ul className="flex flex-wrap gap-2">
            {suggestions.map((k) => (
              <li key={k}>
                <button type="button" onClick={() => void add(k)} className="min-h-9 border-2 border-dashed border-bh-navy bg-bh-off px-2 font-bh-mono text-sm hover:border-solid hover:bg-bh-mustard focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-bh-navy">
                  + {k} <span className="text-bh-muted">· {counts[k] ?? 0}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function KeywordChips({ follows, counts, onRemove }: { follows: Follow[]; counts: Record<string, number>; onRemove: Props["onRemove"] }) {
  if (follows.length === 0) return <p className="mt-4 font-bh-mono text-xs text-bh-muted">No keywords yet.</p>;
  return (
    <ul className="mt-4 flex flex-wrap gap-2">
      {follows.map((f) => (
        <li key={f.id} className="flex items-center border-2 border-bh-cobalt bg-bh-off font-bh-mono text-sm text-bh-cobalt">
          <span className="px-2">{f.value} · {counts[f.value] ?? 0}</span>
          <button
            type="button"
            onClick={() => void onRemove(f.id)}
            aria-label={`Stop picking out ${f.value}`}
            className="grid min-h-9 min-w-9 place-items-center border-l-2 border-bh-cobalt hover:bg-bh-cobalt hover:text-bh-off focus-visible:outline-3 focus-visible:outline-bh-navy"
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}

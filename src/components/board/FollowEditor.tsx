"use client";

import { useState, type FormEvent } from "react";
import { BOARD_BLURB, KEYWORD_INVALID } from "@/lib/board/copy";
import { cleanKeyword } from "@/lib/board/follows";
import { BOARD_DOMAIN, BOARD_LOOK, TILE_CLASS } from "@/lib/board/look";
import { BOARD_IDS, type BoardId, type Board, type Follow } from "@/lib/board/types";
import { Shape } from "./art/Shape";

interface Props {
  boards: Record<string, Board>;
  follows: Follow[];
  onAdd: (kind: Follow["kind"], value: string) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>;
}

/** Which boards to show, and which words to pick out on them, in the Tape & Tile look: each board is a keycap that
 *  stays pressed while it is followed. Each choice is saved to the person's own follows. */
export function FollowEditor({ boards, follows, onAdd, onRemove }: Props) {
  const followOf = (kind: Follow["kind"], value: string) => follows.find((f) => f.kind === kind && f.value === value);
  const [busy, setBusy] = useState<string | null>(null);

  const toggle = async (id: BoardId) => {
    setBusy(id);
    const existing = followOf("board", id);
    await (existing ? onRemove(existing.id) : onAdd("board", id));
    setBusy(null);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <section aria-labelledby="follow-boards">
        <h3 id="follow-boards" className="mb-1 text-xl font-extrabold tracking-[-0.02em]">Boards</h3>
        <p className="mb-4 font-bh-mono text-[11px] text-bh-muted">Press a board to follow it. Each gets its own tab.</p>
        <ul className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          {BOARD_IDS.map((id) => (
            <li key={id}>
              <BoardKey id={id} name={boards[id]?.name ?? id} on={Boolean(followOf("board", id))} busy={busy === id} onToggle={() => void toggle(id)} />
            </li>
          ))}
        </ul>
      </section>
      <Keywords follows={follows.filter((f) => f.kind === "keyword")} onAdd={onAdd} onRemove={onRemove} />
    </div>
  );
}

function BoardKey({ id, name, on, busy, onToggle }: { id: BoardId; name: string; on: boolean; busy: boolean; onToggle: () => void }) {
  const look = BOARD_LOOK[id];
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-busy={busy}
      onClick={onToggle}
      className={`bh-keycap flex h-full w-full items-start gap-3 border-2 border-bh-navy p-3 text-left focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-bh-navy ${on ? "bg-bh-mustard" : "bg-bh-off hover:bg-bh-page"} ${busy ? "opacity-70" : ""}`}
    >
      {/* An ink frame keeps the icon apart from the key, whose pressed mustard is some icons' own tile colour */}
      <span aria-hidden className={`block size-11 shrink-0 overflow-hidden border-2 border-bh-navy ${TILE_CLASS[look.tile]}`}>
        <Shape shape={look.shape} color={look.color} size={44} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-extrabold leading-tight">{name}</span>
        <span className="text-sm leading-snug">{BOARD_BLURB[id]}</span>
        <span aria-hidden className="mt-1 flex items-center justify-between gap-2 font-bh-mono text-[11px]">
          <span className="truncate">{BOARD_DOMAIN[id]}</span>
          <span className={`shrink-0 px-1.5 ${on ? "bg-bh-navy text-bh-off" : "border border-bh-navy"}`}>{on ? "✓ following" : "+ follow"}</span>
        </span>
      </span>
    </button>
  );
}

function Keywords({ follows, onAdd, onRemove }: { follows: Follow[] } & Pick<Props, "onAdd" | "onRemove">) {
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const keyword = cleanKeyword(draft);
    if (!keyword) return setInvalid(true);
    setInvalid(false);
    // Cleared at once, so a second word typed while the first saves starts in an empty box; put back if it didn't save
    setDraft("");
    if (follows.some((f) => f.value === keyword)) return;
    if (!(await onAdd("keyword", keyword))) setDraft(draft);
  };

  return (
    <section aria-labelledby="follow-keywords">
      <h3 id="follow-keywords" className="mb-1 text-xl font-extrabold tracking-[-0.02em]">Keywords</h3>
      <p className="mb-4 font-bh-mono text-[11px] text-bh-muted">Items that mention one get a chip, on every board.</p>
      <form onSubmit={(e) => void submit(e)} noValidate>
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
      {follows.length === 0 ? (
        <p className="mt-4 font-bh-mono text-xs text-bh-muted">No keywords yet.</p>
      ) : (
        <ul className="mt-4 flex flex-wrap gap-2">
          {follows.map((f) => (
            <li key={f.id} className="flex items-center border-2 border-bh-cobalt bg-bh-off font-bh-mono text-sm text-bh-cobalt">
              <span className="px-2">{f.value}</span>
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
      )}
    </section>
  );
}

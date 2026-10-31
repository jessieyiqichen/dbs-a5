"use client";

import { useState, type FormEvent } from "react";
import { BOARD_BLURB, KEYWORD_INVALID } from "@/lib/board/copy";
import { cleanKeyword } from "@/lib/board/follows";
import { BOARD_IDS, type Board, type Follow } from "@/lib/board/types";

interface Props {
  boards: Record<string, Board>;
  follows: Follow[];
  onAdd: (kind: Follow["kind"], value: string) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>;
}

/** Which boards to show, and which words to pick out on them. Each choice is saved to the person's own follows. */
export function FollowEditor({ boards, follows, onAdd, onRemove }: Props) {
  const followOf = (kind: Follow["kind"], value: string) => follows.find((f) => f.kind === kind && f.value === value);
  const [busy, setBusy] = useState<string | null>(null);

  const toggle = async (id: string) => {
    setBusy(id);
    const existing = followOf("board", id);
    await (existing ? onRemove(existing.id) : onAdd("board", id));
    setBusy(null);
  };

  return (
    <div className="grid gap-6 sm:grid-cols-[3fr_2fr]">
      <fieldset>
        <legend className="mb-2 font-display font-semibold text-ink">Boards you follow</legend>
        <ul className="grid gap-2">
          {BOARD_IDS.map((id) => (
            <li key={id}>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-hairline bg-surface p-3 hover:bg-wash">
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-lip"
                  checked={Boolean(followOf("board", id))}
                  disabled={busy === id}
                  onChange={() => void toggle(id)}
                />
                <span>
                  <span className="block font-semibold text-ink">{boards[id]?.name ?? id}</span>
                  <span className="block text-sm text-muted">{BOARD_BLURB[id]}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <Keywords follows={follows.filter((f) => f.kind === "keyword")} onAdd={onAdd} onRemove={onRemove} />
    </div>
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
    <div>
      <form onSubmit={(e) => void submit(e)}>
        <label htmlFor="keyword" className="mb-2 block font-display font-semibold text-ink">Keywords to pick out</label>
        <div className="flex gap-2">
          <input
            id="keyword"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={60}
            placeholder="agent, rust, 大模型"
            aria-invalid={invalid}
            aria-describedby={invalid ? "keyword-error" : undefined}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-ink"
          />
          <button type="submit" className="min-h-11 rounded-xl border border-line bg-surface px-4 font-semibold text-ink hover:bg-wash">
            Add
          </button>
        </div>
        {invalid && <p id="keyword-error" className="mt-1 text-sm text-danger">{KEYWORD_INVALID}</p>}
      </form>
      <ul className="mt-3 flex flex-wrap gap-2">
        {follows.map((f) => (
          <li key={f.id} className="flex items-center gap-1 rounded-full bg-reward-soft py-1 pr-1 pl-3 text-sm text-ink">
            {f.value}
            <button
              type="button"
              onClick={() => void onRemove(f.id)}
              aria-label={`Stop picking out ${f.value}`}
              className="grid size-6 place-items-center rounded-full hover:bg-surface"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

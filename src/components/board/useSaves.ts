"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { addSave, loadSaves, removeSave } from "@/lib/board/remote";
import type { BoardId, Save } from "@/lib/board/types";

export type SavesState = { kind: "loading" } | { kind: "failed" } | { kind: "ready"; saves: Save[] };

/** The signed-in person's saved items, as useFollows keeps their follows: each change is saved first and shown after,
 *  and `saveFailed` says when the database refused one. `toggle` saves an item or, if it is saved, removes it. */
export function useSaves(db: SupabaseClient | null) {
  const [state, setState] = useState<SavesState>({ kind: "loading" });
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    if (!db) return;
    let cancelled = false;
    loadSaves(db).then(
      (saves) => !cancelled && setState({ kind: "ready", saves }),
      (error: unknown) => {
        console.error("Builder's Board: reading saves failed", error);
        if (!cancelled) setState({ kind: "failed" });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [db]);

  const toggle = useCallback(
    async (key: string, boardId: BoardId): Promise<boolean> => {
      if (!db || state.kind !== "ready") return false;
      const existing = state.saves.find((s) => s.key === key);
      try {
        if (existing) {
          await removeSave(db, existing.id);
          setState((prev) => (prev.kind === "ready" ? { kind: "ready", saves: prev.saves.filter((s) => s.id !== existing.id) } : prev));
        } else {
          const save = await addSave(db, key, boardId);
          setState((prev) => (prev.kind === "ready" ? { kind: "ready", saves: [...prev.saves, save] } : prev));
        }
        setSaveFailed(false);
        return true;
      } catch (error) {
        console.error("Builder's Board: changing a save failed", { key, boardId, error });
        setSaveFailed(true);
        return false;
      }
    },
    [db, state],
  );

  return { state, saveFailed, toggle };
}

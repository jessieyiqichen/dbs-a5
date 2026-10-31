"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { addFollow, loadFollows, removeFollow } from "@/lib/board/remote";
import type { Follow } from "@/lib/board/types";

export type FollowsState = { kind: "loading" } | { kind: "failed" } | { kind: "ready"; follows: Follow[] };

/** The signed-in person's follows. Each change is saved first and shown after, so the screen never shows a choice the
 *  database refused; `saveFailed` is set when one was refused, for the screen to say so. `add` and `remove` answer
 *  whether the change was saved. */
export function useFollows(db: SupabaseClient | null) {
  const [state, setState] = useState<FollowsState>({ kind: "loading" });
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    if (!db) return;
    let cancelled = false;
    loadFollows(db).then(
      (follows) => !cancelled && setState({ kind: "ready", follows }),
      (error: unknown) => {
        console.error("Builder's Board: reading follows failed", error);
        if (!cancelled) setState({ kind: "failed" });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [db]);

  const add = useCallback(
    async (kind: Follow["kind"], value: string): Promise<boolean> => {
      if (!db) return false;
      try {
        const follow = await addFollow(db, kind, value);
        setSaveFailed(false);
        setState((prev) => (prev.kind === "ready" ? { kind: "ready", follows: [...prev.follows, follow] } : prev));
        return true;
      } catch (error) {
        console.error("Builder's Board: adding a follow failed", { kind, value, error });
        setSaveFailed(true);
        return false;
      }
    },
    [db],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      if (!db) return false;
      try {
        await removeFollow(db, id);
        setSaveFailed(false);
        setState((prev) => (prev.kind === "ready" ? { kind: "ready", follows: prev.follows.filter((f) => f.id !== id) } : prev));
        return true;
      } catch (error) {
        console.error("Builder's Board: removing a follow failed", { id, error });
        setSaveFailed(true);
        return false;
      }
    },
    [db],
  );

  return { state, saveFailed, add, remove };
}

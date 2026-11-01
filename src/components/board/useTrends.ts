"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import { loadHistory } from "@/lib/board/remote";
import { addPoints, latestChange, movedBoards, type Series } from "@/lib/board/trends";
import type { BoardData, BoardId } from "@/lib/board/types";

/** The window every trend on the page covers. */
export const TREND_MINUTES = 60;

export interface LastChange {
  title: string;
  delta: number;
  unit: string;
  at: string;
}

const scores = (data: BoardData) => Object.fromEntries(Object.entries(data.items).map(([key, item]) => [key, item.score]));

/** The last hour of each shown item's score, read once per set of items and then grown point by point as Realtime
 *  changes arrive; plus the latest change and how many times each board has moved, for the poster to react to. */
export function useTrends(db: SupabaseClient | null, data: BoardData | null, keys: string[], boards: BoardId[]) {
  const [series, setSeries] = useState<Series>({});
  const [last, setLast] = useState<LastChange | null>(null);
  const [turns, setTurns] = useState<Partial<Record<BoardId, number>>>({});
  const previous = useRef<BoardData | null>(null);
  // Read when data arrives, not a reason to recompute: the followed boards as they are at that moment
  const boardsRef = useRef(boards);
  useEffect(() => {
    boardsRef.current = boards;
  }, [boards]);
  const keyList = [...keys].sort().join(",");

  useEffect(() => {
    if (!db || !keyList) return;
    let cancelled = false;
    const since = new Date(Date.now() - TREND_MINUTES * 60_000).toISOString();
    loadHistory(db, keyList.split(","), since).then(
      (loaded) => !cancelled && setSeries(loaded),
      (error: unknown) => console.error("Builder's Board: reading score history failed", error),
    );
    return () => {
      cancelled = true;
    };
  }, [db, keyList]);

  useEffect(() => {
    const before = previous.current;
    previous.current = data;
    if (!before || !data || before === data) return;
    const at = new Date().toISOString();
    setSeries((s) => addPoints(s, scores(before), scores(data), at));
    const change = latestChange(before, data, boardsRef.current);
    if (change) setLast({ ...change, at });
    const moved = movedBoards(before, data);
    if (moved.length) setTurns((t) => ({ ...t, ...Object.fromEntries(moved.map((b) => [b, (t[b] ?? 0) + 1])) }));
  }, [data]);

  return { series, last, turns };
}

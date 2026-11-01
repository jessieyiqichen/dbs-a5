"use client";

import { useCallback, useEffect } from "react";
import { usePersisted } from "./usePersisted";

const isIsoDate = (s: string) => !Number.isNaN(new Date(s).getTime());

/** When the person last looked at a tab, kept in this browser per tab. The first open counts as a look (the user,
 *  2026-11-01: otherwise the whole hour came up as unseen); after that only "Mark all seen" moves it, so changes that
 *  arrive while they read, or while the tab is closed, stand out. The caller mounts a new hook per tab (a `key`),
 *  since the stored value is read once. */
export function useLookedAt(tab: string): [lookedAt: string | null, mark: () => void] {
  const [stored, set] = usePersisted<string>(`bb-looked-${tab}`, (s) => (s && isIsoDate(s) ? s : ""));
  const mark = useCallback(() => set(new Date().toISOString()), [set]);
  useEffect(() => {
    if (!stored) mark();
  }, [stored, mark]);
  return [stored || null, mark];
}

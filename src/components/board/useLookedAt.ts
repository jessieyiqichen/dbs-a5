"use client";

import { useCallback } from "react";
import { usePersisted } from "./usePersisted";

const isIsoDate = (s: string) => !Number.isNaN(new Date(s).getTime());

/** When the person last pressed "Mark all seen" on a tab, kept in this browser per tab (null until they do). The
 *  caller mounts a new hook per tab (a `key`), since the stored value is read once. */
export function useLookedAt(tab: string): [lookedAt: string | null, mark: () => void] {
  const [stored, set] = usePersisted<string>(`bb-looked-${tab}`, (s) => (s && isIsoDate(s) ? s : ""));
  const mark = useCallback(() => set(new Date().toISOString()), [set]);
  return [stored || null, mark];
}

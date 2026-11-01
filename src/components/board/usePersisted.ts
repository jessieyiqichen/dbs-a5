"use client";

import { useCallback, useState } from "react";

/** A per-viewer choice kept in this browser (which tab, which view). Storage can be missing or refuse (a private
 *  window, blocked site data): then the choice simply lasts until the page closes. `read` checks what comes back. */
export function usePersisted<T extends string>(key: string, read: (stored: string | null) => T): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      return read(typeof window === "undefined" ? null : window.localStorage.getItem(key));
    } catch {
      return read(null);
    }
  });
  const set = useCallback(
    (next: T) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // Not kept between visits: nothing else depends on it
      }
    },
    [key],
  );
  return [value, set];
}

"use client";

import { useEffect, useRef, useState } from "react";

/** A key that changes each time the value changes after the first render, so a flash replays on updates only. */
export function useChangeCount(value: number): number {
  const [count, setCount] = useState(0);
  const last = useRef(value);
  useEffect(() => {
    if (last.current === value) return;
    last.current = value;
    setCount((c) => c + 1);
  }, [value]);
  return count;
}

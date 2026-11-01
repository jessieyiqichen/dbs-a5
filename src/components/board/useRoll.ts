"use client";

import { useEffect, useRef, useState } from "react";

const DURATION_MS = 600;

/** A number that rolls from its last value to its new one when it changes, so a live update is seen to move. It shows
 *  the value at once on first render and for people who ask for less motion. */
export function useRoll(value: number): number {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    from.current = value;
    if (start === value) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const began = performance.now();
    const tick = (now: number) => {
      const t = still ? 1 : Math.min((now - began) / DURATION_MS, 1);
      setShown(Math.round(start + (value - start) * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return shown;
}

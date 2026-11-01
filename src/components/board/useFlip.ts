"use client";

import { useLayoutEffect, useRef } from "react";

const SLIDE_MS = 450;
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

/** Rows that change place slide from where they were to where they are (the user, 2026-11-01: a ranking that moves,
 *  "what rises goes up"). Each child of the list names itself with `data-key`; its last position is remembered and,
 *  after a reorder, it is animated from there. Nothing moves when the person prefers reduced motion. */
export function useFlip<T extends HTMLElement>(order: string): React.RefObject<T | null> {
  const ref = useRef<T>(null);
  const last = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const list = ref.current;
    if (!list) return;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const next = new Map<string, number>();
    for (const el of list.children) {
      if (el instanceof HTMLElement && el.dataset.key) next.set(el.dataset.key, el.getBoundingClientRect().top);
    }
    for (const el of list.children) {
      if (!(el instanceof HTMLElement) || !el.dataset.key || still) continue;
      const [was, now] = [last.current.get(el.dataset.key), next.get(el.dataset.key)];
      if (was === undefined || now === undefined || was === now) continue;
      el.animate([{ transform: `translateY(${was - now}px)` }, { transform: "translateY(0)" }], { duration: SLIDE_MS, easing: EASE_OUT });
    }
    last.current = next;
  }, [order]);
  return ref;
}

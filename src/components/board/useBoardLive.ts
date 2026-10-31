"use client";

import { useSession } from "@clerk/nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import { createBrowserDb } from "@/lib/db/client";
import { BoardFeed, type Connection } from "@/lib/board/feed";
import { missingItems } from "@/lib/board/live";
import { loadItems } from "@/lib/board/remote";
import { needsFreshToken } from "@/lib/board/token";
import type { BoardData } from "@/lib/board/types";

export type { Connection };
export type LoadState = { kind: "loading" } | { kind: "failed" } | { kind: "ready"; data: BoardData };

/** One Supabase client per signed-in person, carrying their current Clerk token on every request and on Realtime.
 *  The token is replaced before it runs out (lib/board/token.ts), or Supabase closes the Realtime channel. */
export function useBoardDb(): SupabaseClient | null {
  const { isLoaded, session } = useSession();
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  const userId = session?.user.id ?? null;
  const [db, setDb] = useState<SupabaseClient | null>(null);
  useEffect(() => {
    if (!isLoaded || !userId) return;
    const client = createBrowserDb(async () => {
      const current = sessionRef.current;
      if (!current) return null;
      const token = await current.getToken();
      return needsFreshToken(token, new Date()) ? current.getToken({ skipCache: true }) : token;
    });
    setDb(client);
    return () => {
      void client.removeAllChannels();
      setDb(null);
    };
  }, [isLoaded, userId]);
  return db;
}

/** The boards, kept up to date by Realtime (lib/board/feed.ts does the work; this hands its news to React). */
export function useBoardLive(db: SupabaseClient | null): { load: LoadState; connection: Connection } {
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [connection, setConnection] = useState<Connection>("connecting");

  useEffect(() => {
    if (!db) return;
    const feed = new BoardFeed(db, {
      onData: (data) => setLoad({ kind: "ready", data }),
      onFailed: () => setLoad({ kind: "failed" }),
      onConnection: setConnection,
    });
    feed.start();
    return () => feed.stop();
  }, [db]);

  useMissingItems(db, load, setLoad);
  return { load, connection };
}

/** Fetches items that are ranked on a board but not read yet (one that came back onto a board unchanged). */
function useMissingItems(db: SupabaseClient | null, load: LoadState, setLoad: (next: (prev: LoadState) => LoadState) => void) {
  const asked = useRef(new Set<string>());
  useEffect(() => {
    if (!db || load.kind !== "ready") return;
    const wanted = missingItems(load.data).filter((w) => !asked.current.has(`${w.source}:${w.externalId}`));
    if (wanted.length === 0) return;
    wanted.forEach((w) => asked.current.add(`${w.source}:${w.externalId}`));
    loadItems(db, wanted).then(
      (items) =>
        setLoad((prev) =>
          prev.kind === "ready"
            ? { kind: "ready", data: { ...prev.data, items: { ...prev.data.items, ...Object.fromEntries(items.map((i) => [i.key, i])) } } }
            : prev,
        ),
      (error: unknown) => console.error("Builder's Board: reading new items failed", error),
    );
  }, [db, load, setLoad]);
}

/** The time now, moved on every few seconds so "checked 12s ago" and the stale state keep up without any new data. */
export function useNow(everyMs = 5000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), everyMs);
    return () => clearInterval(timer);
  }, [everyMs]);
  return now;
}

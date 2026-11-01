"use client";

import { useSession } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { isBoardPath } from "@/lib/auth/routes";
import { createBrowserDb } from "@/lib/db/client";
import { connect, disconnect } from "@/lib/store";

/** Connects the goals to Supabase as whoever is signed in. Every request carries their Clerk session token, which is
 *  how the database's row-level security knows whose rows to answer with. Signing out empties the screen's copy.
 *  Not on Builder's Board, which has no goals: there it only sent requests, and errors when offline. */
export function DataSync() {
  const onBoard = isBoardPath(usePathname());
  const { isLoaded, session } = useSession();
  // The client asks for a token on each request, so it reads the current session rather than the one it started with
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (!isLoaded || onBoard) return;
    if (!userId) return disconnect();
    connect(userId, () => createBrowserDb(async () => (await sessionRef.current?.getToken()) ?? null));
  }, [isLoaded, userId, onBoard]);
  return null;
}

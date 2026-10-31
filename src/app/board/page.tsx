import type { Metadata } from "next";
import { BoardScreen } from "@/components/board/BoardScreen";

export const metadata: Metadata = {
  title: "Builder's Board",
  description: "The leaderboards builders check every day, side by side, updating live",
};

/** A standalone page, outside Nudge's tabs. Signing in is required (src/proxy.ts), since what you follow is your own. */
export default function BoardPage() {
  return <BoardScreen />;
}

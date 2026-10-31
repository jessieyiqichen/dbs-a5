// The boards as they change: one Realtime channel on the three published tables, plus a full read when it (re)joins.
// It subscribes first and reads second, holding any change that arrives during a read and applying it after, so nothing
// written in between is lost. Realtime does not replay what was missed while away, so every rejoin reads again.
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { applyChange, type Change } from "./live";
import { loadBoardData } from "./remote";
import type { BoardData } from "./types";

/** The tables the page listens to; each is in the supabase_realtime publication (migration 20261031200000). */
const LIVE_TABLES = ["boards", "items", "board_entries"] as const;

/** Realtime rejoins by itself after an error or a timeout, but not after Supabase closes the channel (an expired token
 *  does that), so the feed joins again itself after this long. */
export const REJOIN_AFTER_MS = 2000;

export type Connection = "connecting" | "live" | "reconnecting";

interface Listeners {
  onData: (data: BoardData) => void;
  /** The first read failed: there is nothing to show yet. A later failed read keeps the last good data on screen. */
  onFailed: () => void;
  onConnection: (connection: Connection) => void;
}

export class BoardFeed {
  private data: BoardData | null = null;
  private held: Change[] = [];
  private reading = false;
  private needsRead = true;
  private stopped = false;
  private channel: RealtimeChannel | null = null;
  private rejoin: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly db: SupabaseClient, private readonly listeners: Listeners) {}

  start(): void {
    this.join();
  }

  stop(): void {
    this.stopped = true;
    clearTimeout(this.rejoin);
    if (this.channel) void this.db.removeChannel(this.channel);
  }

  private join(): void {
    const channel = this.db.channel("builders-board");
    for (const table of LIVE_TABLES) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, (payload) =>
        this.receive({ table, eventType: payload.eventType, new: payload.new, old: payload.old }),
      );
    }
    this.channel = channel.subscribe((status, error) => this.status(status, error?.message));
  }

  private status(status: string, reason?: string): void {
    if (this.stopped) return;
    if (status === "SUBSCRIBED") {
      this.listeners.onConnection("live");
      if (this.needsRead) void this.read();
      return;
    }
    console.error(`Builder's Board: Realtime ${status}`, reason ?? "no reason given");
    this.needsRead = true;
    this.listeners.onConnection("reconnecting");
    if (status === "CLOSED") this.rejoin = setTimeout(() => this.joinAgain(), REJOIN_AFTER_MS);
  }

  private joinAgain(): void {
    if (this.stopped) return;
    if (this.channel) void this.db.removeChannel(this.channel);
    this.join();
  }

  private receive(change: Change): void {
    if (this.data && !this.reading) this.show(applyChange(this.data, change));
    else this.held = [...this.held, change];
  }

  private async read(): Promise<void> {
    this.reading = true;
    this.needsRead = false;
    try {
      const fresh = await loadBoardData(this.db);
      const pending = this.held;
      this.held = [];
      this.reading = false;
      this.show(pending.reduce(applyChange, fresh));
    } catch (error) {
      this.reading = false;
      this.needsRead = true;
      console.error("Builder's Board: reading the boards failed", error);
      if (!this.data && !this.stopped) this.listeners.onFailed();
    }
  }

  private show(data: BoardData): void {
    this.data = data;
    if (!this.stopped) this.listeners.onData(data);
  }
}

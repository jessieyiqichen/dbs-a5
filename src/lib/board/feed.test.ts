import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BoardFeed, REJOIN_AFTER_MS } from "./feed";
import type { BoardData } from "./types";

const boardRow = {
  id: "hn_front", name: "Hacker News", interval_seconds: 60, last_checked_at: "2026-10-31T20:00:00+00:00",
  last_ok_at: "2026-10-31T20:00:00+00:00", last_status: "ok", last_error: null,
};
const entryRow = (score: number) => ({
  board_id: "hn_front", source: "hn", external_id: "1", rank: 1,
  items: { title: "First", url: "https://example.com", subtitle: null, meta: null, score, comments: 1, rise_1h: 0 },
});
const itemChange = (score: number) => ({
  table: "items", eventType: "UPDATE",
  new: { source: "hn", external_id: "1", title: "First", url: "https://example.com", subtitle: null, meta: null, score, comments: 1, rise_1h: 0 },
  old: {},
});

/** A stand-in for Supabase: reads answer when the test says so, and the test plays Realtime's part by hand. */
function fakeDb() {
  let score = 100;
  const reads: (() => void)[] = [];
  const channels: { status: (s: string) => void; push: (payload: unknown) => void }[] = [];
  const auth = { calls: 0 };
  const db = {
    realtime: { setAuth: async () => void (auth.calls += 1) },
    from: (table: string) => ({
      select: () =>
        new Promise((resolve) => {
          const rows = table === "boards" ? [boardRow] : [entryRow(score)];
          reads.push(() => resolve({ data: rows, error: null }));
        }),
    }),
    channel: () => {
      const handlers: ((payload: unknown) => void)[] = [];
      const record = { status: (() => {}) as (s: string) => void, push: (p: unknown) => handlers.forEach((h) => h(p)) };
      channels.push(record);
      const channel = {
        on: (_type: string, _filter: unknown, handler: (payload: unknown) => void) => (handlers.push(handler), channel),
        subscribe: (callback: (s: string) => void) => ((record.status = callback), channel),
      };
      return channel;
    },
    removeChannel: async () => "ok",
  };
  return {
    db: db as unknown as SupabaseClient,
    auth,
    channels,
    setScore: (n: number) => void (score = n),
    /** Lets every read in flight answer, then waits for the feed to handle it. */
    answerReads: async () => {
      reads.splice(0).forEach((answer) => answer());
      await settle();
    },
  };
}

/** Lets promises that are already answered run their callbacks (setTimeout is faked in these tests). */
const settle = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

const scoreOf = (data: BoardData | null) => data?.items["hn:1"]?.score;

describe("BoardFeed", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] }));
  afterEach(() => vi.useRealTimers());

  it("reads once subscribed, then applies each change as it comes", async () => {
    const fake = fakeDb();
    let shown: BoardData | null = null;
    const feed = new BoardFeed(fake.db, { onData: (d) => (shown = d), onFailed: () => {}, onConnection: () => {} });
    feed.start();
    fake.channels[0].status("SUBSCRIBED");
    await fake.answerReads();
    expect(scoreOf(shown)).toBe(100);
    fake.channels[0].push(itemChange(120));
    expect(scoreOf(shown)).toBe(120);
  });

  it("keeps a change that arrives during the read, and applies it after", async () => {
    const fake = fakeDb();
    let shown: BoardData | null = null;
    const feed = new BoardFeed(fake.db, { onData: (d) => (shown = d), onFailed: () => {}, onConnection: () => {} });
    feed.start();
    fake.channels[0].status("SUBSCRIBED");
    fake.channels[0].push(itemChange(130)); // the read has not answered yet
    await fake.answerReads();
    expect(scoreOf(shown)).toBe(130);
  });

  it("joins again after Supabase closes the channel, and reads again to catch up", async () => {
    const fake = fakeDb();
    let shown: BoardData | null = null;
    const states: string[] = [];
    const feed = new BoardFeed(fake.db, { onData: (d) => (shown = d), onFailed: () => {}, onConnection: (c) => states.push(c) });
    feed.start();
    fake.channels[0].status("SUBSCRIBED");
    await fake.answerReads();

    fake.channels[0].status("CLOSED");
    fake.setScore(150); // written while the page was not listening
    vi.advanceTimersByTime(REJOIN_AFTER_MS);
    expect(fake.channels).toHaveLength(2);
    fake.channels[1].status("SUBSCRIBED");
    await fake.answerReads();

    expect(scoreOf(shown)).toBe(150);
    expect(states).toEqual(["live", "reconnecting", "live"]);
  });

  it("shows the boards even when Realtime cannot join", async () => {
    const fake = fakeDb();
    let shown: BoardData | null = null;
    new BoardFeed(fake.db, { onData: (d) => (shown = d), onFailed: () => {}, onConnection: () => {} }).start();
    await fake.answerReads();
    expect(scoreOf(shown)).toBe(100);
  });

  it("asks for a fresh token when the channel fails, so its retry is not refused for the same expired one", () => {
    const fake = fakeDb();
    vi.spyOn(console, "error").mockImplementation(() => {});
    new BoardFeed(fake.db, { onData: () => {}, onFailed: () => {}, onConnection: () => {} }).start();
    fake.channels[0].status("CHANNEL_ERROR");
    expect(fake.auth.calls).toBe(1);
  });

  it("stops listening and never rejoins once stopped", () => {
    const fake = fakeDb();
    const feed = new BoardFeed(fake.db, { onData: () => {}, onFailed: () => {}, onConnection: () => {} });
    feed.start();
    fake.channels[0].status("CLOSED");
    feed.stop();
    vi.advanceTimersByTime(REJOIN_AFTER_MS);
    expect(fake.channels).toHaveLength(1);
  });

  it("says the first read failed, so the page can show it", async () => {
    const fake = fakeDb();
    let failed = false;
    const broken = { ...fake.db, from: () => ({ select: async () => ({ data: null, error: { message: "JWT expired" } }) }) };
    const feed = new BoardFeed(broken as unknown as SupabaseClient, { onData: () => {}, onFailed: () => (failed = true), onConnection: () => {} });
    vi.spyOn(console, "error").mockImplementation(() => {});
    feed.start();
    fake.channels[0].status("SUBSCRIBED");
    await settle();
    expect(failed).toBe(true);
  });
});

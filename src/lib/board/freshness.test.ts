import { describe, expect, it } from "vitest";
import { ageLabel, freshness } from "./freshness";
import type { Board } from "./types";

const now = new Date("2026-10-31T20:00:00Z");
const board = (over: Partial<Board>): Board => ({
  id: "hn_front", name: "Hacker News", intervalSeconds: 60, lastCheckedAt: "2026-10-31T19:59:30Z",
  lastOkAt: "2026-10-31T19:59:30Z", lastStatus: "ok", lastError: null, ...over,
});

describe("freshness", () => {
  it("is loading before the board's first check", () => {
    expect(freshness(board({ lastCheckedAt: null, lastStatus: null }), now)).toBe("loading");
  });

  it("is fresh while checks keep coming, even a little late", () => {
    expect(freshness(board({}), now)).toBe("fresh");
    expect(freshness(board({ lastCheckedAt: "2026-10-31T19:57:30Z" }), now)).toBe("fresh"); // 2.5 intervals
  });

  it("is stale after three missed checks, whatever the last one said", () => {
    expect(freshness(board({ lastCheckedAt: "2026-10-31T19:56:59Z" }), now)).toBe("stale");
    expect(freshness(board({ lastCheckedAt: "2026-10-31T19:50:00Z", lastStatus: "failed" }), now)).toBe("stale");
  });

  it("is down when the last check failed and checks are still coming", () => {
    expect(freshness(board({ lastStatus: "failed", lastError: "github.com answered HTTP 503" }), now)).toBe("down");
  });
});

describe("ageLabel", () => {
  it("says how long ago, in the largest whole unit", () => {
    expect(ageLabel("2026-10-31T19:59:58Z", now)).toBe("just now");
    expect(ageLabel("2026-10-31T19:59:18Z", now)).toBe("42s ago");
    expect(ageLabel("2026-10-31T19:55:00Z", now)).toBe("5m ago");
    expect(ageLabel("2026-10-31T17:00:00Z", now)).toBe("3h ago");
    expect(ageLabel("2026-10-29T20:00:00Z", now)).toBe("2d ago");
  });

  it("says never for a board not yet checked", () => {
    expect(ageLabel(null, now)).toBe("never");
  });
});

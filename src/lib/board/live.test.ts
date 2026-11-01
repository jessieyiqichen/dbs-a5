import { describe, expect, it } from "vitest";
import { applyChange, boardRows, missingItems, risingNow, shownKeys } from "./live";
import { readSnapshot } from "./rows";

const boardRow = {
  id: "hn_front", name: "Hacker News", interval_seconds: 60, last_checked_at: "2026-10-31T19:59:30+00:00",
  last_ok_at: "2026-10-31T19:59:30+00:00", last_status: "ok", last_error: null,
};
const itemFields = (title: string, score: number, rise = 0) => ({
  title, url: `https://example.com/${score}`, subtitle: "by pg", meta: null, score, comments: 12, rise_1h: rise,
});
const entryRow = (id: string, rank: number, title: string, score: number, rise = 0) => ({
  board_id: "hn_front", source: "hn", external_id: id, rank, items: itemFields(title, score, rise),
});

const snapshot = () =>
  readSnapshot([boardRow], [entryRow("1", 1, "First", 300, 5), entryRow("2", 2, "Second", 200, 40), entryRow("3", 3, "Third", 100, 0)]);

describe("readSnapshot", () => {
  it("reads boards, items and ranks from the first load", () => {
    const data = snapshot();
    expect(data.boards.hn_front.intervalSeconds).toBe(60);
    expect(data.items["hn:2"]).toMatchObject({ title: "Second", score: 200, rise: 40 });
    expect(Object.keys(data.entries)).toHaveLength(3);
  });

  it("drops rows with the wrong shape instead of trusting them", () => {
    const data = readSnapshot(
      [{ ...boardRow, id: "reddit" }],
      [entryRow("1", 1, "Fine", 10), { ...entryRow("2", 2, "Bad link", 10), items: { ...itemFields("x", 1), url: "javascript:alert(1)" } }],
    );
    expect(data.boards).toEqual({});
    expect(Object.keys(data.items)).toEqual(["hn:1"]);
    expect(Object.keys(data.entries)).toHaveLength(1);
  });
});

describe("applyChange", () => {
  it("updates an item's score and rise, and leaves the old copy as it was", () => {
    const before = snapshot();
    const after = applyChange(before, {
      table: "items", eventType: "UPDATE",
      new: { source: "hn", external_id: "3", ...itemFields("Third", 160, 60) }, old: {},
    });
    expect(after.items["hn:3"]).toMatchObject({ score: 160, rise: 60 });
    expect(before.items["hn:3"].score).toBe(100);
  });

  it("moves, adds and removes ranks", () => {
    let data = snapshot();
    data = applyChange(data, { table: "board_entries", eventType: "UPDATE", new: { board_id: "hn_front", source: "hn", external_id: "3", rank: 1 }, old: {} });
    data = applyChange(data, { table: "board_entries", eventType: "DELETE", new: {}, old: { board_id: "hn_front", source: "hn", external_id: "1" } });
    data = applyChange(data, { table: "board_entries", eventType: "INSERT", new: { board_id: "hn_front", source: "hn", external_id: "9", rank: 30 }, old: {} });
    expect(Object.values(data.entries).map((e) => [e.key, e.rank]).sort()).toEqual([["hn:2", 2], ["hn:3", 1], ["hn:9", 30]]);
  });

  it("records a board's latest check, so its state can change", () => {
    const data = applyChange(snapshot(), {
      table: "boards", eventType: "UPDATE", new: { ...boardRow, last_status: "failed", last_error: "HTTP 503" }, old: {},
    });
    expect(data.boards.hn_front).toMatchObject({ lastStatus: "failed", lastError: "HTTP 503" });
  });

  it("ignores a change it cannot read", () => {
    const before = snapshot();
    expect(applyChange(before, { table: "items", eventType: "UPDATE", new: { source: "hn" }, old: {} })).toBe(before);
  });
});

describe("boardRows", () => {
  it("lists a board by rank, or by what rose most in the last hour", () => {
    const data = snapshot();
    expect(boardRows(data, "hn_front", "rank", 10).map((r) => r.item.title)).toEqual(["First", "Second", "Third"]);
    expect(boardRows(data, "hn_front", "rising", 10).map((r) => r.item.title)).toEqual(["Second", "First", "Third"]);
  });

  it("shows at most the limit", () => {
    expect(boardRows(snapshot(), "hn_front", "rank", 2)).toHaveLength(2);
  });

  it("waits for an item it has not read yet, and says which ones to fetch", () => {
    const data = applyChange(snapshot(), {
      table: "board_entries", eventType: "INSERT", new: { board_id: "hn_front", source: "hn", external_id: "9", rank: 4 }, old: {},
    });
    expect(boardRows(data, "hn_front", "rank", 10)).toHaveLength(3);
    expect(missingItems(data)).toEqual([{ source: "hn", externalId: "9" }]);
  });
});

describe("risingNow", () => {
  it("picks the item that gained most in the last hour on each board, in the boards' order", () => {
    expect(risingNow(snapshot(), ["hn_front"]).map((r) => [r.boardId, r.item.title, r.rank])).toEqual([["hn_front", "Second", 2]]);
  });

  it("skips a board where nothing rose", () => {
    const flat = readSnapshot([boardRow], [entryRow("1", 1, "Still", 10, 0)]);
    expect(risingNow(flat, ["hn_front"])).toEqual([]);
  });
});

describe("shownKeys", () => {
  it("lists the items a board shows by rank or by rise, once each", () => {
    expect(shownKeys(snapshot(), ["hn_front"], 1).sort()).toEqual(["hn:1", "hn:2"]);
  });
});

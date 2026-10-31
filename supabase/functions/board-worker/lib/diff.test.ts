import { describe, expect, it } from "vitest";
import { diffBoard } from "./diff";
import type { BoardItem, StoredItem } from "./types";

const item = (id: string, rank: number, score: number, extra: Partial<BoardItem> = {}): BoardItem => ({
  source: "hn",
  externalId: id,
  title: `Story ${id}`,
  url: `https://example.com/${id}`,
  subtitle: null,
  meta: null,
  score,
  comments: 0,
  rank,
  ...extra,
});
const stored = (i: BoardItem): StoredItem => ({
  title: i.title, url: i.url, subtitle: i.subtitle, meta: i.meta, score: i.score, comments: i.comments,
});

describe("diffBoard", () => {
  const a = item("1", 1, 100);
  const b = item("2", 2, 50);
  const storedItems = new Map([["hn:1", stored(a)], ["hn:2", stored(b)]]);
  const storedRanks = new Map([["hn:1", 1], ["hn:2", 2]]);

  it("writes nothing when nothing changed", () => {
    const d = diffBoard([a, b], storedItems, storedRanks);
    expect(d).toEqual({ items: [], ranks: [], removed: [], scores: [] });
  });

  it("writes only the item whose score changed, and records the new score", () => {
    const d = diffBoard([item("1", 1, 108), b], storedItems, storedRanks);
    expect(d.items.map((i) => i.externalId)).toEqual(["1"]);
    expect(d.ranks).toEqual([]);
    expect(d.scores).toEqual([{ key: "hn:1", score: 108 }]);
  });

  it("writes a rank change without touching the items or their history", () => {
    const d = diffBoard([item("2", 1, 50), item("1", 2, 100)], storedItems, storedRanks);
    expect(d.items).toEqual([]);
    expect(d.scores).toEqual([]);
    expect(d.ranks.map((r) => [r.externalId, r.rank])).toEqual([["2", 1], ["1", 2]]);
  });

  it("writes a comment-count change but adds no history row (history follows the score)", () => {
    const d = diffBoard([item("1", 1, 100, { comments: 9 }), b], storedItems, storedRanks);
    expect(d.items.map((i) => i.externalId)).toEqual(["1"]);
    expect(d.scores).toEqual([]);
  });

  it("adds a new item with its rank and its first score", () => {
    const c = item("3", 3, 7);
    const d = diffBoard([a, b, c], storedItems, storedRanks);
    expect(d.items).toEqual([c]);
    expect(d.ranks).toEqual([c]);
    expect(d.scores).toEqual([{ key: "hn:3", score: 7 }]);
  });

  it("lists an item that left the board, so its place is removed but the item and its history stay", () => {
    const d = diffBoard([a], storedItems, storedRanks);
    expect(d.removed).toEqual(["hn:2"]);
    expect(d.items).toEqual([]);
  });

  it("knows an item already stored for another board, writing only its rank here", () => {
    const d = diffBoard([a], storedItems, new Map());
    expect(d.items).toEqual([]);
    expect(d.ranks).toEqual([a]);
    expect(d.scores).toEqual([]);
  });
});

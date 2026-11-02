import { describe, expect, it } from "vitest";
import { readSnapshot } from "./rows";
import { OFF_BOARD_RANK, missingSaved, savedByBoard, savedKeys, savedRows } from "./saves";
import type { Save } from "./types";

const board = (id: string) => ({ id, name: id, interval_seconds: 60, last_checked_at: null, last_ok_at: null, last_status: "ok", last_error: null });
const item = (title: string, score: number) => ({ title, url: "https://example.com/" + title, subtitle: null, meta: null, score, comments: 3, rise_1h: 0 });
const entry = (board_id: string, source: string, external_id: string, rank: number, title: string, score: number) =>
  ({ board_id, source, external_id, rank, items: item(title, score) });

const data = readSnapshot(
  [board("hn_front"), board("producthunt")],
  [entry("hn_front", "hn", "1", 1, "Top story", 870), entry("hn_front", "hn", "2", 2, "Second", 400), entry("producthunt", "producthunt", "9", 1, "Launch", 265)],
);

const saves: Save[] = [
  { id: "a", key: "hn:2", boardId: "hn_front", savedAt: "2026-11-01T10:00:00Z" },
  { id: "b", key: "producthunt:9", boardId: "producthunt", savedAt: "2026-11-01T12:00:00Z" },
  // Saved yesterday from the front page, no longer on it, and not read yet
  { id: "c", key: "hn:7", boardId: "hn_front", savedAt: "2026-10-31T09:00:00Z" },
];

describe("savedKeys", () => {
  it("is the set of saved items' keys", () => {
    expect(savedKeys(saves)).toEqual(new Set(["hn:2", "producthunt:9", "hn:7"]));
  });
});

describe("savedRows", () => {
  it("lists saved items newest first, each on the board it was saved from with its current rank", () => {
    const rows = savedRows(data, saves, {});
    expect(rows.map((r) => [r.item.key, r.boardId, r.rank])).toEqual([
      ["producthunt:9", "producthunt", 1],
      ["hn:2", "hn_front", 2],
    ]);
  });

  it("leaves out a saved item that has not been read yet, rather than showing an empty row", () => {
    expect(savedRows(data, saves, {}).some((r) => r.item.key === "hn:7")).toBe(false);
  });

  it("keeps an item that left its board, with no rank", () => {
    const withOld = { ...data, items: { ...data.items, "hn:7": { ...data.items["hn:2"], key: "hn:7", title: "Old story" } } };
    const old = savedRows(withOld, saves, {}).find((r) => r.item.key === "hn:7");
    expect(old?.rank).toBe(OFF_BOARD_RANK);
    expect(old?.boardId).toBe("hn_front");
  });

  it("carries each item's hour from the series", () => {
    const series = { "hn:2": [{ at: "2026-11-01T12:30:00Z", score: 390 }, { at: "2026-11-01T12:40:00Z", score: 400 }] };
    const row = savedRows(data, saves, series).find((r) => r.item.key === "hn:2");
    expect(row?.points).toHaveLength(2);
    expect(row?.at).toBe("2026-11-01T12:40:00Z");
  });
});

describe("savedByBoard", () => {
  it("groups saved items by the board they were saved from, boards in the page's order, newest save first in each", () => {
    const more: Save[] = [...saves, { id: "d", key: "hn:1", boardId: "hn_front", savedAt: "2026-11-01T14:00:00Z" }];
    const groups = savedByBoard(data, more, {});
    expect(groups.map((g) => g.boardId)).toEqual(["hn_front", "producthunt"]);
    expect(groups[0].rows.map((r) => r.item.key)).toEqual(["hn:1", "hn:2"]);
    expect(groups[1].rows.map((r) => r.item.key)).toEqual(["producthunt:9"]);
  });

  it("leaves out a board with nothing saved, or whose saved items are not read yet", () => {
    expect(savedByBoard(data, saves.slice(1), {}).map((g) => g.boardId)).toEqual(["producthunt"]);
  });
});

describe("missingSaved", () => {
  it("names the saved items the page has not read, by source and id", () => {
    expect(missingSaved(data, saves)).toEqual([{ source: "hn", externalId: "7" }]);
  });

  it("is empty when every saved item is loaded", () => {
    expect(missingSaved(data, saves.slice(0, 2))).toEqual([]);
  });
});

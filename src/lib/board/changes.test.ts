import { describe, expect, it } from "vitest";
import { changeRows, rankedRows } from "./changes";
import { readSnapshot } from "./rows";
import type { Series } from "./trends";

const now = new Date("2026-11-01T04:00:00Z");
const at = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60_000).toISOString();
const entry = (board: string, source: string, id: string, rank: number, score: number, rise: number) => ({
  board_id: board, source, external_id: id, rank,
  items: { title: `item ${id}`, url: `https://x.test/${id}`, subtitle: null, meta: null, score, comments: null, rise_1h: rise },
});
const data = readSnapshot([], [
  entry("hn_show", "hn", "a", 1, 235, 1),
  entry("hn_show", "hn", "b", 2, 69, 11),
  entry("hn_show", "hn", "c", 3, 51, 0),
  entry("hn_show", "hn", "d", 4, 203, -7),
  entry("hn_front", "hn", "b", 9, 69, 11),
  entry("producthunt", "producthunt", "p", 1, 131, 0),
]);
const series: Series = {
  "hn:a": [{ at: at(41), score: 235 }],
  "hn:b": [{ at: at(20), score: 61 }, { at: at(1), score: 69 }],
  "hn:d": [{ at: at(52), score: 203 }],
  "producthunt:p": [{ at: at(3), score: 131 }],
};

describe("rankedRows", () => {
  it("keeps the board's rank order and every row, moved or not, each with its own hour", () => {
    const rows = rankedRows(data, "hn_show", series);
    expect(rows.map((r) => [r.rank, r.item.key, r.at])).toEqual([[1, "hn:a", at(41)], [2, "hn:b", at(1)], [3, "hn:c", null], [4, "hn:d", at(52)]]);
    expect(rows[1].points).toHaveLength(2);
  });
});

describe("changeRows", () => {
  it("puts what changed first, latest change on top, and folds the rest away in rank order", () => {
    const { changed, quiet } = changeRows(data, ["hn_show"], series);
    expect(changed.map((r) => r.item.key)).toEqual(["hn:b", "hn:a", "hn:d"]);
    expect(quiet.map((r) => r.item.key)).toEqual(["hn:c"]);
  });

  it("counts a rise with no history yet as a change, after the ones with a time", () => {
    const { changed } = changeRows(data, ["hn_show"], {});
    expect(changed.map((r) => r.item.key)).toEqual(["hn:b", "hn:d", "hn:a"]);
    expect(changed[0].at).toBeNull();
  });

  it("shows an item once across boards, on the first board that has it, with the boards in the given order", () => {
    const { changed } = changeRows(data, ["producthunt", "hn_show", "hn_front"], series);
    expect(changed.map((r) => `${r.boardId}:${r.item.key}`)).toEqual(["hn_show:hn:b", "producthunt:producthunt:p", "hn_show:hn:a", "hn_show:hn:d"]);
  });
});

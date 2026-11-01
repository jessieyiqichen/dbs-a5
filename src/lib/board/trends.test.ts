import { describe, expect, it } from "vitest";
import { addPoints, boardRises, boardWeights, latestChange, movedBoards, pulse, lastStep, sparkPath, stepLine, type Series } from "./trends";
import { readSnapshot } from "./rows";

const now = new Date("2026-10-31T20:35:00Z");
const at = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60_000).toISOString();

describe("pulse", () => {
  it("counts changes per minute over the last hour, oldest first, by board colour", () => {
    const series: Series = { "hn:1": [{ at: at(59.5), score: 5 }, { at: at(0.5), score: 9 }, { at: at(0.2), score: 10 }] };
    const marks = pulse(series, { "hn:1": "hn_front" }, now, 60);
    expect(marks).toHaveLength(60);
    expect(marks[0]).toEqual({ hn_front: 1 });
    expect(marks[59]).toEqual({ hn_front: 2 });
    expect(marks[30]).toEqual({});
  });

  it("leaves out points older than the window and items on no shown board", () => {
    const series: Series = { "hn:1": [{ at: at(61), score: 5 }], "gh:x": [{ at: at(1.5), score: 1 }] };
    expect(pulse(series, { "hn:1": "hn_front" }, now, 60).every((m) => Object.keys(m).length === 0)).toBe(true);
  });
});

describe("addPoints", () => {
  it("adds a point where the score moved, and keeps the old series as it was", () => {
    const before: Series = { "hn:1": [{ at: at(5), score: 5 }] };
    const after = addPoints(before, { "hn:1": 5, "hn:2": 3 }, { "hn:1": 8, "hn:2": 3 }, now.toISOString());
    expect(after["hn:1"]).toEqual([{ at: at(5), score: 5 }, { at: now.toISOString(), score: 8 }]);
    expect(after["hn:2"]).toBeUndefined();
    expect(before["hn:1"]).toHaveLength(1);
  });

  it("returns the same object when nothing moved, so nothing re-renders", () => {
    const before: Series = {};
    expect(addPoints(before, { "hn:1": 5 }, { "hn:1": 5 }, now.toISOString())).toBe(before);
  });
});

describe("sparkPath", () => {
  it("draws the series across the box, lowest score at the bottom", () => {
    const path = sparkPath([{ at: at(10), score: 0 }, { at: at(0), score: 10 }], 100, 20);
    expect(path).toBe("M0.0 18.0 L100.0 2.0");
  });

  it("draws a flat line for one point or an unchanged score", () => {
    expect(sparkPath([{ at: at(1), score: 7 }], 100, 20)).toBe("M0.0 10.0 L100.0 10.0");
    expect(sparkPath([], 100, 20)).toBe("");
  });
});

const boardRow = (id: string) => ({
  id, name: id, interval_seconds: 60, last_checked_at: null, last_ok_at: null, last_status: null, last_error: null,
});
const entry = (board: string, source: string, id: string, title: string, score: number, rise: number) => ({
  board_id: board, source, external_id: id, rank: 1,
  items: { title, url: "https://example.com", subtitle: null, meta: null, score, comments: null, rise_1h: rise },
});

describe("latestChange", () => {
  it("names the item whose score moved most since the last data, with its unit", () => {
    const before = readSnapshot([boardRow("github_trending")], [entry("github_trending", "github", "a/b", "a/b", 100, 0), entry("github_trending", "github", "c/d", "c/d", 50, 0)]);
    const after = readSnapshot([boardRow("github_trending")], [entry("github_trending", "github", "a/b", "a/b", 104, 4), entry("github_trending", "github", "c/d", "c/d", 62, 12)]);
    expect(latestChange(before, after, ["github_trending"])).toEqual({ title: "c/d", delta: 12, unit: "stars" });
  });

  it("only looks at the boards the person follows", () => {
    const before = readSnapshot([], [entry("producthunt", "producthunt", "9", "not followed", 10, 0), entry("hn_front", "hn", "1", "a story", 50, 0)]);
    const after = readSnapshot([], [entry("producthunt", "producthunt", "9", "not followed", 30, 20), entry("hn_front", "hn", "1", "a story", 52, 2)]);
    expect(latestChange(before, after, ["hn_front"])).toEqual({ title: "a story", delta: 2, unit: "points" });
    expect(latestChange(before, after, [])).toBeNull();
  });

  it("is null when no score moved", () => {
    const same = readSnapshot([], [entry("hn_front", "hn", "1", "x", 5, 0)]);
    expect(latestChange(same, same, ["hn_front"])).toBeNull();
  });
});

describe("boardWeights", () => {
  it("weighs each board by how much its items rose in the hour, as a share of the biggest", () => {
    const data = readSnapshot(
      [boardRow("hn_front"), boardRow("producthunt")],
      [entry("hn_front", "hn", "1", "a", 80, 60), entry("hn_front", "hn", "2", "b", 30, 20), entry("producthunt", "producthunt", "p", "c", 170, 20)],
    );
    expect(boardWeights(data, ["hn_front", "producthunt"])).toEqual([
      { boardId: "hn_front", weight: 1 },
      { boardId: "producthunt", weight: 0.25 },
    ]);
  });

  it("adds up each board's rises, counting falls as nothing", () => {
    const data = readSnapshot([boardRow("hn_front")], [entry("hn_front", "hn", "1", "a", 80, 60), entry("hn_front", "hn", "2", "b", 30, -4)]);
    expect(boardRises(data, ["hn_front"])).toEqual([60]);
  });

  it("gives every board a small weight when nothing rose, so the poster is never empty", () => {
    const quiet = readSnapshot([boardRow("hn_front")], [entry("hn_front", "hn", "1", "a", 5, 0)]);
    expect(boardWeights(quiet, ["hn_front"])).toEqual([{ boardId: "hn_front", weight: 0.15 }]);
  });
});

describe("movedBoards", () => {
  it("lists the boards with an item whose score moved, once each", () => {
    const before = readSnapshot([], [entry("hn_front", "hn", "1", "a", 5, 0), entry("hn_show", "hn", "1", "a", 5, 0), entry("producthunt", "producthunt", "p", "c", 9, 0)]);
    const after = readSnapshot([], [entry("hn_front", "hn", "1", "a", 7, 2), entry("hn_show", "hn", "1", "a", 7, 2), entry("producthunt", "producthunt", "p", "c", 9, 0)]);
    expect(movedBoards(before, after).sort()).toEqual(["hn_front", "hn_show"]);
  });
});

describe("stepLine", () => {
  const now = new Date("2026-10-31T20:35:00Z").getTime();
  const at2 = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString();
  const [from, to] = [now - 60 * 60_000, now];

  it("holds each level from its time to the next, on the item's own scale: lowest at the bottom, highest at the top", () => {
    const line = stepLine([{ at: at2(60), score: 100 }, { at: at2(30), score: 110 }, { at: at2(15), score: 120 }], 100, 20, from, to);
    expect(line).toBe("M0.0 20.0H50.0V10.0H75.0V0.0H100.0");
  });

  it("is a level line through the middle when every reading is the same, and nothing when there are none", () => {
    expect(stepLine([{ at: at2(30), score: 7 }], 100, 20, from, to)).toBe("M0.0 10.0H100.0");
    expect(stepLine([], 100, 20, from, to)).toBe("");
  });

  it("keeps a point older than the hour at the left edge", () => {
    expect(stepLine([{ at: at2(90), score: 105 }, { at: at2(30), score: 200 }], 100, 20, from, to)).toBe("M0.0 20.0H50.0V0.0H100.0");
  });
});

describe("lastStep", () => {
  const now = new Date("2026-10-31T20:35:00Z").getTime();
  const at2 = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString();
  const [from, to] = [now - 60 * 60_000, now];

  it("is the step from the point before the last to the right edge, on the whole line's scale, ending where the line ends", () => {
    const points = [{ at: at2(60), score: 100 }, { at: at2(30), score: 110 }, { at: at2(15), score: 120 }];
    expect(lastStep(points, 100, 20, from, to)).toEqual({ d: "M50.0 10.0H75.0V0.0H100.0", endY: 0 });
  });

  it("is no step for a single point, just its level", () => {
    expect(lastStep([{ at: at2(30), score: 7 }], 100, 20, from, to)).toEqual({ d: "", endY: 10 });
  });
});

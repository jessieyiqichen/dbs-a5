import { describe, expect, it } from "vitest";
import { mosaic } from "./mosaic";
import type { BoardId } from "./types";

const COLS = 8;
const ROWS = 3;
const STAGE = { col: 0, row: 0, w: 3, h: 3 };
const weights = (pairs: [BoardId, number][]) => pairs.map(([boardId, weight]) => ({ boardId, weight }));

/** Every cell a tile covers, as "col,row". */
const cellsOf = (t: { col: number; row: number; w: number; h: number }) =>
  Array.from({ length: t.w * t.h }, (_, i) => `${t.col + (i % t.w)},${t.row + Math.floor(i / t.w)}`);

describe("mosaic", () => {
  const poster = mosaic(weights([["hn_front", 1], ["github_trending", 0.5], ["producthunt", 0.15]]), {}, COLS, ROWS, STAGE);

  it("covers every cell outside the stage exactly once, and none inside it", () => {
    const cells = poster.tiles.flatMap(cellsOf);
    expect(new Set(cells).size).toBe(cells.length);
    expect(cells).toHaveLength(COLS * ROWS - STAGE.w * STAGE.h);
    expect(cells.some((c) => cellsOf(STAGE).includes(c))).toBe(false);
  });

  it("fills every cell when there is no stage, and still names the board that rose most (the stamp)", () => {
    const flat = mosaic(weights([["hn_front", 1], ["github_trending", 0.5]]), {}, COLS, ROWS, { col: 0, row: 0, w: 0, h: 0 });
    expect(flat.tiles.flatMap(cellsOf)).toHaveLength(COLS * ROWS);
    expect(flat.star?.boardId).toBe("hn_front");
  });

  it("puts the board that rose most on the stage, and every other board in at least one tile, more as it rose more", () => {
    expect(poster.star?.boardId).toBe("hn_front");
    const of = (id: BoardId) => poster.tiles.filter((t) => t.boardId === id);
    expect(of("hn_front")).toHaveLength(0);
    expect(of("producthunt").length).toBeGreaterThanOrEqual(1);
    expect(of("github_trending").length).toBeGreaterThan(of("producthunt").length);
  });

  it("lays out the same data the same way every time", () => {
    expect(mosaic(weights([["hn_front", 1], ["github_trending", 0.5], ["producthunt", 0.15]]), {}, COLS, ROWS, STAGE)).toEqual(poster);
  });

  it("turns a board's shapes a quarter for each time it moved", () => {
    const turned = mosaic(weights([["hn_front", 1]]), { hn_front: 2 }, COLS, ROWS, STAGE);
    const still = mosaic(weights([["hn_front", 1]]), {}, COLS, ROWS, STAGE);
    expect(turned.star!.rotate - still.star!.rotate).toBe(180);
  });

  it("still fills the grid, with no star, when nothing is followed", () => {
    const empty = mosaic([], {}, COLS, ROWS, STAGE);
    expect(empty.star).toBeNull();
    expect(empty.tiles.flatMap(cellsOf)).toHaveLength(COLS * ROWS - STAGE.w * STAGE.h);
  });
});

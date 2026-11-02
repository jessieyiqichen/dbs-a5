// The poster across the top of the board: a mosaic of square tiles that touch edge to edge (after Stripe's Dublin
// Hackathon posters), and the board that rose most in the last hour as the star, drawn by the page as a stamp over the
// title (until 2026-11-01 it had a stage of its own, with the title woven around it). The data decides both: every
// other board takes tiles in proportion to its rise, and plain tiles fill what is left. See docs/references.md.
import { BOARD_LOOK, type BlockColor, type Shape } from "./look";
import type { BoardId } from "./types";

export interface Tile {
  key: string;
  col: number;
  row: number;
  w: number;
  h: number;
  kind: "board" | "filler";
  boardId?: BoardId;
  shape: Shape | null;
  /** The shape's colour, and the tile's own. */
  color: BlockColor;
  tile: BlockColor;
  rotate: number;
}

export interface Star {
  boardId: BoardId;
  shape: Shape;
  color: BlockColor;
  tile: BlockColor;
  rotate: number;
}

export interface Area {
  col: number;
  row: number;
  w: number;
  h: number;
}

/** How many tiles a board gets at full weight. */
const MOST_TILES = 3;

const FILLER_TILES: BlockColor[] = ["mustard", "navy", "off", "cobalt", "green", "mustard", "red"];
const FILLER_SHAPES: (Shape | null)[] = [null, "half", null, "circle", "quarter", null, "triangle"];

/** The same weights and turns always give the same poster. */
export function mosaic(
  weights: { boardId: BoardId; weight: number }[],
  turns: Partial<Record<BoardId, number>>,
  cols: number,
  rows: number,
  stage: Area,
): { star: Star | null; tiles: Tile[] } {
  const [top, ...rest] = [...weights].sort((a, b) => b.weight - a.weight);
  const onStage = new Set(cellsIn(stage));
  const free = scatter(cols, rows).filter((cell) => !onStage.has(cell));
  const tiles: Tile[] = [];
  for (const { boardId, weight } of rest) {
    const count = Math.max(1, Math.round(weight * MOST_TILES));
    for (const cell of free.splice(0, count)) tiles.push(boardTile(boardId, cell, turns));
  }
  for (const cell of free) tiles.push(fillerTile(cell));
  return { star: top ? star(top.boardId, turns) : null, tiles };
}

function star(boardId: BoardId, turns: Partial<Record<BoardId, number>>): Star {
  const look = BOARD_LOOK[boardId];
  return { boardId, shape: look.shape, color: look.color, tile: look.tile, rotate: (turns[boardId] ?? 0) * 90 };
}

function boardTile(boardId: BoardId, cell: string, turns: Partial<Record<BoardId, number>>): Tile {
  const [col, row] = cell.split(",").map(Number);
  const look = BOARD_LOOK[boardId];
  return {
    key: `${boardId}@${cell}`, col, row, w: 1, h: 1, kind: "board", boardId,
    shape: look.shape, color: look.color, tile: look.tile, rotate: baseTurn(col, row) + (turns[boardId] ?? 0) * 90,
  };
}

function fillerTile(cell: string): Tile {
  const [col, row] = cell.split(",").map(Number);
  const tile = FILLER_TILES[(col + row * 2) % FILLER_TILES.length];
  return {
    key: `filler@${cell}`, col, row, w: 1, h: 1, kind: "filler",
    shape: FILLER_SHAPES[(col * 3 + row) % FILLER_SHAPES.length], color: tile === "off" ? "navy" : "off", tile, rotate: baseTurn(col, row),
  };
}

/** Each tile's own starting angle, so the same shape never sits the same way twice in a row. */
const baseTurn = (col: number, row: number) => ((col * 3 + row) % 4) * 90;

const cellsIn = (a: Area) => Array.from({ length: a.w * a.h }, (_, i) => `${a.col + (i % a.w)},${a.row + Math.floor(i / a.w)}`);

/** Every cell, in a fixed order that spreads a board's tiles over the poster rather than bunching them in a row. */
function scatter(cols: number, rows: number): string[] {
  const cells = Array.from({ length: cols * rows }, (_, i) => ({ cell: `${i % cols},${Math.floor(i / cols)}`, order: (i * 7) % (cols * rows + 1) }));
  return cells.sort((a, b) => a.order - b.order).map((c) => c.cell);
}

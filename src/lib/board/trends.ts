// Trends drawn from item_history: each item's score over the last hour (the sparklines), how many changes landed in
// each minute (the pulse), and how much each board rose (the size of its shape on the poster).
import { SOURCE_UNIT } from "./look";
import { SOURCES, type BoardData, type BoardId, type Source } from "./types";

export interface Point {
  at: string;
  score: number;
}

/** Each item's points, oldest first, keyed like items ("hn:123"). */
export type Series = Record<string, Point[]>;

/** One minute of the pulse: how many changes each board had in it. */
export type PulseMark = Partial<Record<BoardId, number>>;

const MINUTE = 60_000;

/** The last `minutes` minutes, oldest first. `boardOf` says which shown board each item belongs to; others are left out. */
export function pulse(series: Series, boardOf: Record<string, BoardId>, now: Date, minutes: number): PulseMark[] {
  const marks: PulseMark[] = Array.from({ length: minutes }, () => ({}));
  for (const [key, points] of Object.entries(series)) {
    const board = boardOf[key];
    if (!board) continue;
    for (const point of points) {
      const ago = Math.floor((now.getTime() - new Date(point.at).getTime()) / MINUTE);
      if (ago < 0 || ago >= minutes) continue;
      const mark = marks[minutes - 1 - ago];
      mark[board] = (mark[board] ?? 0) + 1;
    }
  }
  return marks;
}

/** A new point for every item whose score moved between two reads; the same object back when none did. */
export function addPoints(series: Series, before: Record<string, number>, after: Record<string, number>, at: string): Series {
  const moved = Object.keys(after).filter((key) => key in before && before[key] !== after[key]);
  if (moved.length === 0) return series;
  const next = { ...series };
  for (const key of moved) next[key] = [...(series[key] ?? [{ at, score: before[key] }]), { at, score: after[key] }];
  return next;
}

/** An SVG path for the points in a w×h box: time across, score up. One point, or a flat score, is a level line. */
export function sparkPath(points: Point[], w: number, h: number): string {
  if (points.length === 0) return "";
  const times = points.map((p) => new Date(p.at).getTime());
  const scores = points.map((p) => p.score);
  const [t0, t1] = [Math.min(...times), Math.max(...times)];
  const [s0, s1] = [Math.min(...scores), Math.max(...scores)];
  if (points.length === 1 || s0 === s1) return `M0.0 ${(h / 2).toFixed(1)} L${w.toFixed(1)} ${(h / 2).toFixed(1)}`;
  const x = (t: number) => (t1 === t0 ? 0 : ((t - t0) / (t1 - t0)) * w);
  const y = (s: number) => h - 2 - ((s - s0) / (s1 - s0)) * (h - 4);
  return points.map((p, i) => `${i ? "L" : "M"}${x(times[i]).toFixed(1)} ${y(p.score).toFixed(1)}`).join(" ");
}

/** An item's last hour as a line that holds each score until it changes, then steps: no diagonals (the user found
 *  sloped lines ugly, 2026-10-31). `from`..`to` is the hour across; up is the item's own range, lowest score at the
 *  bottom and highest at the top (the user wants each item's own change, not a comparison, 2026-11-01). The line
 *  starts at the first point's level and runs to the right edge. No points: an empty path. */
export function stepLine(points: Point[], w: number, h: number, from: number, to: number): string {
  if (points.length === 0) return "";
  const { x, y } = stepScales(points, w, h, from, to);
  let d = `M0.0 ${y(points[0].score)}`;
  let [lastX, lastY] = ["0.0", y(points[0].score)];
  // A point at the same level adds nothing: the line already runs on to the next step
  for (const point of points) {
    const [px, py] = [x(point.at), y(point.score)];
    if (py === lastY) continue;
    d += `H${px}V${py}`;
    [lastX, lastY] = [px, py];
  }
  if (lastX !== w.toFixed(1)) d += `H${w.toFixed(1)}`;
  return d;
}

/** The latest step of the same line (from the point before the last to the right edge), to draw over it in another
 *  colour, and where the line ends. Fewer than two points: no step, the line's level. */
export function lastStep(points: Point[], w: number, h: number, from: number, to: number): { d: string; endY: number } {
  if (points.length === 0) return { d: "", endY: h / 2 };
  const { x, y } = stepScales(points, w, h, from, to);
  const [prev, last] = [points[points.length - 2], points[points.length - 1]];
  const endY = Number(y(last.score));
  if (!prev) return { d: "", endY };
  return { d: `M${x(prev.at)} ${y(prev.score)}H${x(last.at)}V${y(last.score)}H${w.toFixed(1)}`, endY };
}

/** Time across the hour and score up the item's own range, both to a tenth. */
function stepScales(points: Point[], w: number, h: number, from: number, to: number) {
  const scores = points.map((p) => p.score);
  const [low, high] = [Math.min(...scores), Math.max(...scores)];
  const clamp = (v: number) => Math.min(Math.max(v, 0), 1);
  return {
    x: (at: string) => (clamp((new Date(at).getTime() - from) / Math.max(to - from, 1)) * w).toFixed(1),
    y: (score: number) => (high === low ? h / 2 : h - ((score - low) / (high - low)) * h).toFixed(1),
  };
}

const sourceOf = (key: string) => key.slice(0, key.indexOf(":")) as Source;

/** The item on a followed board whose score moved most between two reads, for the "last change" line. The worker
 *  checks every board, so items from boards the person does not follow are left out. */
export function latestChange(before: BoardData, after: BoardData, boards: BoardId[]): { title: string; delta: number; unit: string } | null {
  const followed = new Set(Object.values(after.entries).filter((e) => boards.includes(e.boardId)).map((e) => e.key));
  let best: { title: string; delta: number; unit: string } | null = null;
  for (const [key, item] of Object.entries(after.items)) {
    if (!followed.has(key)) continue;
    const old = before.items[key];
    const delta = old ? item.score - old.score : 0;
    if (delta > 0 && (!best || delta > best.delta)) {
      const source = sourceOf(key);
      best = { title: item.title, delta, unit: (SOURCES as readonly string[]).includes(source) ? SOURCE_UNIT[source] : "" };
    }
  }
  return best;
}

/** The smallest share a board gets on the poster, so a quiet board is a dot rather than nothing. */
export const QUIET_WEIGHT = 0.15;

/** Each board's rise in the last hour: its items' rises added up (falls count as nothing). */
export function boardRises(data: BoardData, boards: BoardId[]): number[] {
  return boards.map((boardId) =>
    Object.values(data.entries)
      .filter((e) => e.boardId === boardId)
      .reduce((sum, e) => sum + Math.max(0, data.items[e.key]?.rise ?? 0), 0),
  );
}

/** Each board's rise in the last hour, as a share of the board that rose most. */
export function boardWeights(data: BoardData, boards: BoardId[]): { boardId: BoardId; weight: number }[] {
  const totals = boardRises(data, boards);
  const most = Math.max(0, ...totals);
  return boards.map((boardId, i) => ({
    boardId,
    weight: most === 0 ? QUIET_WEIGHT : Math.max(QUIET_WEIGHT, Math.round((totals[i] / most) * 100) / 100),
  }));
}

/** Boards with at least one item whose score moved between two reads: their shapes turn on the poster. */
export function movedBoards(before: BoardData, after: BoardData): BoardId[] {
  const moved = new Set<BoardId>();
  for (const entry of Object.values(after.entries)) {
    const [was, now] = [before.items[entry.key], after.items[entry.key]];
    if (was && now && was.score !== now.score) moved.add(entry.boardId);
  }
  return [...moved];
}

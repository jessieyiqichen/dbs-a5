import { describe, expect, it } from "vitest";
import { itemImage, raceLanes, tileSpans } from "./views";
import type { BoardRow } from "./live";

const row = (key: string, rank: number, rise: number, score = 100): BoardRow => ({
  rank,
  item: { key, title: key, url: "https://example.com", subtitle: null, meta: null, score, comments: null, rise },
});

describe("itemImage", () => {
  it("uses GitHub's social card for a repository and Hugging Face's thumbnail for a paper", () => {
    expect(itemImage("github:pingdotgg/t3code")).toBe("https://opengraph.githubassets.com/1/pingdotgg/t3code");
    expect(itemImage("hf_paper:2610.38293")).toBe("https://cdn-thumbnails.huggingface.co/social-thumbnails/papers/2610.38293.png");
  });

  it("has none for sources without pictures, or an id that is not a plain path", () => {
    expect(itemImage("hn:123")).toBeNull();
    expect(itemImage("github:../../evil")).toBeNull();
    expect(itemImage("hf_paper:2610.38293?x=1")).toBeNull();
  });
});

describe("tileSpans", () => {
  it("makes the items that took most of the board's rise bigger", () => {
    const rows = [row("a", 1, 60), row("b", 2, 25), row("c", 3, 10), row("d", 4, 5)];
    expect(tileSpans(rows)).toEqual({ a: [2, 2], b: [2, 1], c: [1, 1], d: [1, 1] });
  });

  it("sizes by score when nothing rose, so a quiet board still has a shape", () => {
    const rows = [row("a", 1, 0, 300), row("b", 2, 0, 50), row("c", 3, 0, 50)];
    expect(tileSpans(rows)).toEqual({ a: [2, 2], b: [1, 1], c: [1, 1] });
  });
});

describe("raceLanes", () => {
  it("orders by score, highest first, ties by the board's own rank", () => {
    const rows = [row("a", 1, 5, 100), row("b", 2, 0, 300), row("c", 3, 9, 100)];
    expect(raceLanes(rows).map((l) => l.row.item.key)).toEqual(["b", "a", "c"]);
  });

  it("splits each bar into the score an hour ago and the rise since, as shares of the leader", () => {
    const [lead, next] = raceLanes([row("a", 1, 50, 200), row("b", 2, 0, 100)]);
    expect([lead.before, lead.rise]).toEqual([0.75, 0.25]);
    expect([next.before, next.rise]).toEqual([0.5, 0]);
  });

  it("never draws a rise larger than the score", () => {
    const [only] = raceLanes([row("a", 1, 80, 30)]);
    expect([only.before, only.rise]).toEqual([0, 1]);
  });
});

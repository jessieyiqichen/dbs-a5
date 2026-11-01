import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  parseGithubTrending,
  parseHfModels,
  parseHfPapers,
  parseHn,
  parseProductHunt,
} from "./parse";

// Saved real responses from 2026-10-31 (Product Hunt is a hand-built sample, see its _note)
const fixture = (name: string) => readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8");
const json = (name: string) => JSON.parse(fixture(name));

describe("parseHn", () => {
  const front = json("hn-front.json");

  it("keeps the front page order as the rank", () => {
    const items = parseHn(front.ids, front.items);
    expect(items).toHaveLength(30);
    expect(items.map((i) => i.rank)).toEqual(Array.from({ length: 30 }, (_, n) => n + 1));
    expect(items[0].externalId).toBe(String(front.ids[0]));
  });

  it("reads points as the score and descendants as comments", () => {
    const [first] = parseHn(front.ids, front.items);
    expect(first).toMatchObject({ source: "hn", score: front.items[0].score, comments: front.items[0].descendants });
  });

  it("links a story with no url (Ask HN) to its discussion", () => {
    const items = parseHn(front.ids, front.items);
    const noUrl = front.items.find((i: { url?: string }) => !i.url);
    const parsed = items.find((i) => i.externalId === String(noUrl.id));
    expect(parsed?.url).toBe(`https://news.ycombinator.com/item?id=${noUrl.id}`);
  });

  it("skips deleted, dead and missing stories and ranks the rest without gaps", () => {
    const items = parseHn([1, 2, 3], [
      { id: 1, type: "story", title: "Kept", score: 5, descendants: 0, url: "https://a.example" },
      null,
      { id: 3, type: "story", title: "Gone", dead: true, score: 1 },
    ]);
    expect(items.map((i) => [i.externalId, i.rank])).toEqual([["1", 1]]);
  });
});

describe("parseGithubTrending", () => {
  it("reads the 15 repositories on the page in order", () => {
    const items = parseGithubTrending(fixture("github-trending.html"));
    expect(items).toHaveLength(15);
    expect(items[0]).toMatchObject({
      source: "github",
      externalId: "thedotmack/claude-mem",
      url: "https://github.com/thedotmack/claude-mem",
      rank: 1,
      score: 106611,
      meta: "+1,140 stars today",
    });
    expect(items[0].subtitle).toMatch(/^Persistent Context Across Sessions/);
  });

  it("finds nothing on a page whose layout changed, so the run can be marked failed", () => {
    expect(parseGithubTrending("<html><body>New layout</body></html>")).toEqual([]);
  });
});

describe("parseHfModels", () => {
  it("keeps the trending order and reads likes as the score", () => {
    const raw = json("hf-models.json");
    const items = parseHfModels(raw);
    expect(items).toHaveLength(30);
    expect(items[0]).toMatchObject({
      source: "hf_model",
      externalId: raw[0].id,
      url: `https://huggingface.co/${raw[0].id}`,
      score: raw[0].likes,
      rank: 1,
    });
  });
});

describe("parseHfPapers", () => {
  it("ranks papers by upvotes, most first", () => {
    const items = parseHfPapers(json("hf-papers.json"));
    expect(items.length).toBeGreaterThan(0);
    const scores = items.map((i) => i.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(items[0].url).toMatch(/^https:\/\/huggingface\.co\/papers\//);
  });
});

describe("parseProductHunt", () => {
  it("reads votes and comments and skips a post with no name", () => {
    const items = parseProductHunt(json("producthunt-sample.json"));
    expect(items.map((i) => [i.title, i.score, i.comments, i.rank])).toEqual([
      ["Example product A", 412, 37, 1],
      ["Example product B", 268, 19, 2],
    ]);
  });

  it("finds nothing in an error response", () => {
    expect(parseProductHunt({ errors: [{ error: "invalid_oauth_token" }] })).toEqual([]);
  });
});

describe("every parser", () => {
  it("drops rows whose link is not https", () => {
    const post = { id: "1", name: "Plain http", url: "http://example.com", votesCount: 3, commentsCount: 0 };
    const items = parseProductHunt({ data: { posts: { edges: [{ node: post }] } } });
    expect(items).toEqual([]);
  });
});

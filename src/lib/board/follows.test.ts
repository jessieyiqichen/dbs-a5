import { describe, expect, it } from "vitest";
import { cleanKeyword, followedBoards, itemKeywords, keywordCounts, keywordsIn, matchedKeywords } from "./follows";
import { readSnapshot } from "./rows";
import type { Follow } from "./types";

const follows: Follow[] = [
  { id: "1", kind: "board", value: "hn_front" },
  { id: "2", kind: "keyword", value: "agent" },
  { id: "3", kind: "board", value: "producthunt" },
  { id: "4", kind: "keyword", value: "ai" },
  { id: "5", kind: "keyword", value: "大模型" },
];

describe("cleanKeyword", () => {
  it("trims, lowercases and squeezes spaces", () => {
    expect(cleanKeyword("  Open   Source ")).toBe("open source");
  });

  it("refuses an empty keyword or one longer than 40 characters", () => {
    expect(cleanKeyword("   ")).toBeNull();
    expect(cleanKeyword("x".repeat(41))).toBeNull();
    expect(cleanKeyword("x".repeat(40))).toBe("x".repeat(40));
  });
});

describe("followed boards and keywords", () => {
  it("keeps the boards in the order the page lists them, and only known ones", () => {
    const withUnknown = [...follows, { id: "6", kind: "board" as const, value: "reddit" }];
    expect(followedBoards(withUnknown)).toEqual(["hn_front", "producthunt"]);
  });

  it("lists the keywords", () => {
    expect(keywordsIn(follows)).toEqual(["agent", "ai", "大模型"]);
  });
});

describe("matchedKeywords", () => {
  const keywords = ["agent", "ai", "大模型"];

  it("matches whole words and their plurals, ignoring case", () => {
    expect(matchedKeywords("Show HN: An AI agent for code review", keywords)).toEqual(["agent", "ai"]);
    expect(matchedKeywords("Agents.md is everywhere", keywords)).toEqual(["agent"]);
  });

  it("does not match a keyword inside a longer word", () => {
    expect(matchedKeywords("Said the paint was dry", keywords)).toEqual([]);
  });

  it("matches Chinese keywords anywhere in the title, since Chinese has no spaces", () => {
    expect(matchedKeywords("国产大模型价格战", keywords)).toEqual(["大模型"]);
  });
});

describe("itemKeywords", () => {
  it("looks in the description too, since a repo's title is only its name", () => {
    const repo = { title: "thedotmack/claude-mem", subtitle: "Persistent Context Across Sessions for Every Agent" };
    expect(itemKeywords(repo, ["agent", "rust"])).toEqual(["agent"]);
  });

  it("works for an item with no description", () => {
    expect(itemKeywords({ title: "An AI agent", subtitle: null }, ["agent"])).toEqual(["agent"]);
  });
});

describe("keywordCounts", () => {
  it("counts the items on the followed boards that mention each keyword, each item once", () => {
    const data = readSnapshot([], [
      { board_id: "hn_front", source: "hn", external_id: "1", rank: 1, items: { title: "An AI agent", url: "https://a.com", subtitle: null, meta: null, score: 1, comments: 0, rise_1h: 0 } },
      { board_id: "hn_show", source: "hn", external_id: "1", rank: 2, items: { title: "An AI agent", url: "https://a.com", subtitle: null, meta: null, score: 1, comments: 0, rise_1h: 0 } },
      { board_id: "producthunt", source: "producthunt", external_id: "p", rank: 1, items: { title: "Agents for teams", url: "https://b.com", subtitle: null, meta: null, score: 1, comments: 0, rise_1h: 0 } },
    ]);
    expect(keywordCounts(data, ["hn_front", "hn_show"], ["agent", "rust"])).toEqual({ agent: 1, rust: 0 });
    expect(keywordCounts(data, ["hn_front", "producthunt"], ["agent"])).toEqual({ agent: 2 });
  });
});

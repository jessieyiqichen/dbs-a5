import { describe, expect, it } from "vitest";
import { RISING_TAB, SAVED_TAB, markSeen, pickTab, tabsFor, unseen } from "./tabs";

describe("tabsFor", () => {
  it("lists the followed boards in the page's own order, then the rising tab, then saved", () => {
    expect(tabsFor(["producthunt", "hn_front"])).toEqual(["hn_front", "producthunt", RISING_TAB, SAVED_TAB]);
  });

  it("is the rising and saved tabs when nothing is followed", () => {
    expect(tabsFor([])).toEqual([RISING_TAB, SAVED_TAB]);
  });
});

describe("pickTab", () => {
  const tabs = tabsFor(["hn_front", "github_trending"]);

  it("keeps a remembered tab that is still there", () => {
    expect(pickTab(tabs, "github_trending")).toBe("github_trending");
    expect(pickTab(tabs, RISING_TAB)).toBe(RISING_TAB);
  });

  it("falls back to the first board when the remembered one is gone or unreadable", () => {
    expect(pickTab(tabs, "producthunt")).toBe("hn_front");
    expect(pickTab(tabs, null)).toBe("hn_front");
    expect(pickTab(tabs, "<script>")).toBe("hn_front");
  });
});

describe("unseen", () => {
  it("counts each board's moves since it was last looked at, and none for the open one", () => {
    const counts = unseen({ hn_front: 5, github_trending: 2 }, { hn_front: 1 }, "hn_front");
    expect(counts).toEqual({ hn_front: 0, github_trending: 2 });
  });

  it("never goes below zero", () => {
    expect(unseen({ hn_front: 1 }, { hn_front: 4 }, RISING_TAB)).toEqual({ hn_front: 0 });
  });
});

describe("markSeen", () => {
  it("records a board's moves so far when it is opened, and leaves the old record as it was", () => {
    const before = { hn_front: 1 };
    const after = markSeen(before, { hn_front: 5, github_trending: 2 }, "github_trending");
    expect(after).toEqual({ hn_front: 1, github_trending: 2 });
    expect(before).toEqual({ hn_front: 1 });
  });

  it("changes nothing for the rising or saved tab", () => {
    const before = { hn_front: 1 };
    expect(markSeen(before, { hn_front: 5 }, RISING_TAB)).toBe(before);
    expect(markSeen(before, { hn_front: 5 }, SAVED_TAB)).toBe(before);
  });
});

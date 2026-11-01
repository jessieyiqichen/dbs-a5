import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fetchBoard, productHuntDayStart } from "./fetch";
import { runBoard, type Store } from "./run";
import { type BoardItem, itemKey, type StoredItem } from "./types";

const fixture = (name: string) => readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8");

/** A fake fetch that answers Hacker News from the saved front page; `bump` adds points to the first story. */
function hnFetch(bump = 0): typeof fetch {
  const saved = JSON.parse(fixture("hn-front.json"));
  const byId = new Map(saved.items.map((i: { id: number }) => [i.id, i]));
  return (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith("/topstories.json")) return Response.json(saved.ids);
    const id = Number(url.match(/item\/(\d+)\.json$/)?.[1]);
    const item = byId.get(id) as { score: number } | undefined;
    const first = id === saved.ids[0];
    return Response.json(item && first ? { ...item, score: item.score + bump } : item);
  }) as typeof fetch;
}

/** The database in memory, with a log of every write so a test can see exactly what a run saved. */
function memoryStore() {
  const items = new Map<string, StoredItem>();
  const ranks = new Map<string, number>();
  const history: { key: string; score: number }[] = [];
  const rises = new Map<string, number>();
  const store: Store = {
    loadItems: async (keys) => new Map(keys.filter((k) => items.has(k)).map((k) => [k, items.get(k)!])),
    loadRanks: async () => new Map(ranks),
    upsertItems: async (rows: BoardItem[]) => rows.forEach((r) => items.set(itemKey(r), { ...r })),
    upsertRanks: async (_b, rows) => rows.forEach((r) => ranks.set(itemKey(r), r.rank)),
    deleteRanks: async (_b, keys) => keys.forEach((k) => ranks.delete(k)),
    insertHistory: async (rows) => void history.push(...rows),
    refreshRise: async () => {
      let changed = 0;
      for (const key of ranks.keys()) {
        const first = history.find((h) => h.key === key)?.score ?? 0;
        const rise = (items.get(key)?.score ?? 0) - first;
        if ((rises.get(key) ?? 0) !== rise) changed += 1;
        rises.set(key, rise);
      }
      return changed;
    },
  };
  return { store, items, ranks, history, rises };
}

describe("runBoard on the saved Hacker News front page", () => {
  it("saves all 30 stories, their ranks and a first score each on the first run", async () => {
    const db = memoryStore();
    const result = await runBoard("hn_front", () => fetchBoard("hn_front", { fetch: hnFetch() }), db.store);
    expect(result).toEqual({ fetched: 30, changed: 60 });
    expect(db.items.size).toBe(30);
    expect(db.history).toHaveLength(30);
  });

  it("writes nothing when the board has not changed since the last run", async () => {
    const db = memoryStore();
    await runBoard("hn_front", () => fetchBoard("hn_front", { fetch: hnFetch() }), db.store);
    const again = await runBoard("hn_front", () => fetchBoard("hn_front", { fetch: hnFetch() }), db.store);
    expect(again.changed).toBe(0);
    expect(db.history).toHaveLength(30);
  });

  it("writes only the story whose points went up, with one history row and its new rise", async () => {
    const db = memoryStore();
    await runBoard("hn_front", () => fetchBoard("hn_front", { fetch: hnFetch() }), db.store);
    const later = await runBoard("hn_front", () => fetchBoard("hn_front", { fetch: hnFetch(8) }), db.store);
    expect(later.changed).toBe(2); // the item, and its rise
    expect(db.history).toHaveLength(31);
    const firstKey = [...db.ranks.entries()].find(([, rank]) => rank === 1)![0];
    expect(db.rises.get(firstKey)).toBe(8);
  });

  it("fails and writes nothing when the site answers with no rows", async () => {
    const db = memoryStore();
    await expect(runBoard("hn_front", async () => [], db.store)).rejects.toThrow(/found no rows/);
    expect(db.items.size).toBe(0);
  });
});

describe("fetchBoard", () => {
  it("fails with the site's status when it refuses", async () => {
    const refuse = (async () => new Response("busy", { status: 503 })) as typeof fetch;
    await expect(fetchBoard("hf_models", { fetch: refuse })).rejects.toThrow("huggingface.co answered HTTP 503");
  });

  it("does not call Product Hunt without a token", async () => {
    let called = false;
    const spy = (async () => ((called = true), Response.json({}))) as typeof fetch;
    await expect(fetchBoard("producthunt", { fetch: spy })).rejects.toThrow(/PRODUCTHUNT_TOKEN/);
    expect(called).toBe(false);
  });

  it("starts Product Hunt's day at midnight in Los Angeles, in summer and winter time", () => {
    expect(productHuntDayStart(new Date("2026-10-31T06:00:00Z"))).toBe("2026-10-30T00:00:00-07:00");
    expect(productHuntDayStart(new Date("2026-11-03T20:00:00Z"))).toBe("2026-11-03T00:00:00-08:00");
  });
});

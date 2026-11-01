// Fetches one board from its site and parses it. Uses only the global fetch, so tests can pass a fake one.

import { parseGithubTrending, parseHfModels, parseHfPapers, parseHn, parseProductHunt } from "./parse.ts";
import type { BoardId, BoardItem } from "./types.ts";

const TIMEOUT_MS = 10_000;
const HN_TOP = 30;
const USER_AGENT = "BuildersBoard/1.0 (class project; https://github.com/jessieyiqichen/dbs-a5)";
const HN = "https://hacker-news.firebaseio.com/v0";
const PRODUCT_HUNT_QUERY =
  "query($after: DateTime!) { posts(order: RANKING, first: 30, postedAfter: $after) " +
  "{ edges { node { id name tagline url votesCount commentsCount } } } }";

export interface FetchOptions {
  fetch?: typeof fetch;
  productHuntToken?: string;
  now?: Date;
}

async function get(f: typeof fetch, url: string, init: RequestInit = {}): Promise<Response> {
  const res = await f(url, {
    ...init,
    headers: { "User-Agent": USER_AGENT, ...init.headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`${new URL(url).host} answered HTTP ${res.status}`);
  return res;
}

async function hn(f: typeof fetch, list: "topstories" | "showstories"): Promise<BoardItem[]> {
  const ids: unknown = await (await get(f, `${HN}/${list}.json`)).json();
  if (!Array.isArray(ids)) return [];
  const top = ids.slice(0, HN_TOP).filter((id): id is number => Number.isInteger(id));
  const items = await Promise.all(top.map(async (id) => (await get(f, `${HN}/item/${id}.json`)).json()));
  return parseHn(top, items);
}

/** Midnight in Los Angeles today, when Product Hunt's day starts, as an ISO time with its offset. */
export function productHuntDayStart(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit", timeZoneName: "longOffset",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const offset = part("timeZoneName").replace("GMT", "") || "+00:00";
  return `${part("year")}-${part("month")}-${part("day")}T00:00:00${offset}`;
}

async function productHunt(f: typeof fetch, token: string | undefined, now: Date): Promise<BoardItem[]> {
  if (!token) throw new Error("PRODUCTHUNT_TOKEN is not set in the Edge Function secrets");
  const res = await get(f, "https://api.producthunt.com/v2/api/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query: PRODUCT_HUNT_QUERY, variables: { after: productHuntDayStart(now) } }),
  });
  return parseProductHunt(await res.json());
}

export async function fetchBoard(board: BoardId, options: FetchOptions = {}): Promise<BoardItem[]> {
  const f = options.fetch ?? fetch;
  switch (board) {
    case "hn_front":
      return hn(f, "topstories");
    case "hn_show":
      return hn(f, "showstories");
    case "github_trending":
      return parseGithubTrending(await (await get(f, "https://github.com/trending")).text());
    case "hf_models":
      return parseHfModels(await (await get(f, "https://huggingface.co/api/models?sort=trendingScore&limit=30")).json());
    case "hf_papers":
      return parseHfPapers(await (await get(f, "https://huggingface.co/api/daily_papers?limit=50")).json());
    case "producthunt":
      return productHunt(f, options.productHuntToken, options.now ?? new Date());
  }
}

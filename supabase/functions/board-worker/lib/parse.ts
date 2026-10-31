// Turns each site's raw answer into BoardItems. Every value from outside is checked before use: a row with no id,
// no title or a link that is not https is dropped, and ranks are given after dropping, so they have no gaps.
// A parser that finds nothing returns [], and the worker treats that as a failed run (the site likely changed).

import type { BoardItem, Source } from "./types.ts";

const MAX_ITEMS = 50;
const MAX_TITLE = 300;
const MAX_SUBTITLE = 500;

type Row = Omit<BoardItem, "rank" | "source">;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const count = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null);
const httpsUrl = (v: unknown) => (typeof v === "string" && v.startsWith("https://") && v.length <= 2000 ? v : null);
const orNull = (s: string) => (s === "" ? null : s);

/** Keeps valid rows in order, at most MAX_ITEMS, one per id, and ranks them from 1. */
function ranked(source: Source, rows: (Row | null)[]): BoardItem[] {
  const seen = new Set<string>();
  const kept = rows.filter((r): r is Row => {
    if (r === null || r.externalId === "" || r.title === "" || seen.has(r.externalId)) return false;
    seen.add(r.externalId);
    return true;
  });
  return kept.slice(0, MAX_ITEMS).map((r, i) => ({ ...r, source, rank: i + 1 }));
}

/** Hacker News: `ids` is the board's order, `items` the stories fetched for those ids, in the same order. */
export function parseHn(ids: unknown, items: unknown[]): BoardItem[] {
  if (!Array.isArray(ids)) return [];
  const rows = items.map((raw): Row | null => {
    if (!isObject(raw) || raw.type !== "story" || raw.deleted || raw.dead) return null;
    const id = count(raw.id);
    if (id === null) return null;
    return {
      externalId: String(id),
      title: text(raw.title, MAX_TITLE),
      url: httpsUrl(raw.url) ?? `https://news.ycombinator.com/item?id=${id}`,
      subtitle: null,
      meta: null,
      score: count(raw.score) ?? 0,
      comments: count(raw.descendants) ?? 0,
    };
  });
  return ranked("hn", rows);
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", "#x27": "'", nbsp: " " };
const decode = (s: string) => s.replace(/&(amp|lt|gt|quot|#39|#x27|nbsp);/g, (_, e: string) => ENTITIES[e]);
const plain = (html: string) => decode(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
const toInt = (s: string | undefined) => (s === undefined ? null : Number.parseInt(s.replace(/,/g, ""), 10));

/** GitHub trending has no API: this reads the repositories out of the github.com/trending page. */
export function parseGithubTrending(html: string): BoardItem[] {
  const rows = html.split('<article class="Box-row">').slice(1).map((chunk): Row | null => {
    const repo = chunk.match(/<h2[^>]*>\s*<a[^>]*href="\/([\w.-]+\/[\w.-]+)"/)?.[1];
    if (repo === undefined) return null;
    const stars = toInt(chunk.match(new RegExp(`href="/${repo.replace(/[.]/g, "\\.")}/stargazers"[\\s\\S]*?([\\d,]+)\\s*</a>`))?.[1]);
    const today = chunk.match(/([\d,]+) stars (today|this week|this month)/);
    const description = chunk.match(/<p class="col-9[^"]*">([\s\S]*?)<\/p>/)?.[1];
    return {
      externalId: repo,
      title: repo,
      url: `https://github.com/${repo}`,
      subtitle: orNull(text(description === undefined ? "" : plain(description), MAX_SUBTITLE)),
      meta: today ? `+${today[1]} stars ${today[2]}` : null,
      score: stars ?? 0,
      comments: null,
    };
  });
  return ranked("github", rows);
}

/** Hugging Face trending models, already in trending order. Likes is the number that rises. */
export function parseHfModels(raw: unknown): BoardItem[] {
  if (!Array.isArray(raw)) return [];
  const rows = raw.map((m): Row | null => {
    if (!isObject(m) || typeof m.id !== "string" || !/^[\w.-]+\/[\w.-]+$/.test(m.id)) return null;
    return {
      externalId: m.id,
      title: text(m.id, MAX_TITLE),
      url: `https://huggingface.co/${m.id}`,
      subtitle: orNull(text(m.pipeline_tag, MAX_SUBTITLE)),
      meta: null,
      score: count(m.likes) ?? 0,
      comments: null,
    };
  });
  return ranked("hf_model", rows);
}

/** Hugging Face Daily Papers, ranked by upvotes as on the papers page (ties keep the API's order). */
export function parseHfPapers(raw: unknown): BoardItem[] {
  if (!Array.isArray(raw)) return [];
  const rows = raw.map((x): Row | null => {
    if (!isObject(x) || !isObject(x.paper)) return null;
    const id = typeof x.paper.id === "string" && /^[\w.-]+$/.test(x.paper.id) ? x.paper.id : "";
    const org = isObject(x.organization) ? x.organization.fullname : null;
    return {
      externalId: id,
      title: text(x.title ?? x.paper.title, MAX_TITLE),
      url: `https://huggingface.co/papers/${id}`,
      subtitle: orNull(text(org, MAX_SUBTITLE)),
      meta: null,
      score: count(x.paper.upvotes) ?? 0,
      comments: count(x.numComments),
    };
  });
  const sorted = rows.filter((r): r is Row => r !== null).sort((a, b) => b.score - a.score);
  return ranked("hf_paper", sorted);
}

/** V2EX hot topics. Replies is the number that rises. */
export function parseV2ex(raw: unknown): BoardItem[] {
  if (!Array.isArray(raw)) return [];
  const rows = raw.map((t): Row | null => {
    if (!isObject(t)) return null;
    const id = count(t.id);
    const url = httpsUrl(t.url);
    if (id === null || url === null) return null;
    return {
      externalId: String(id),
      title: text(t.title, MAX_TITLE),
      url,
      subtitle: isObject(t.node) ? orNull(text(t.node.title, MAX_SUBTITLE)) : null,
      meta: null,
      score: count(t.replies) ?? 0,
      comments: null,
    };
  });
  return ranked("v2ex", rows);
}

/** Product Hunt GraphQL answer to the posts query (RANKING order). An error answer has no data, so gives []. */
export function parseProductHunt(raw: unknown): BoardItem[] {
  const posts = isObject(raw) && isObject(raw.data) && isObject(raw.data.posts) ? raw.data.posts.edges : null;
  if (!Array.isArray(posts)) return [];
  const rows = posts.map((edge): Row | null => {
    const node = isObject(edge) && isObject(edge.node) ? edge.node : null;
    const url = node === null ? null : httpsUrl(node.url);
    if (node === null || url === null) return null;
    return {
      externalId: text(node.id, 50),
      title: text(node.name, MAX_TITLE),
      url,
      subtitle: orNull(text(node.tagline, MAX_SUBTITLE)),
      meta: null,
      score: count(node.votesCount) ?? 0,
      comments: count(node.commentsCount),
    };
  });
  return ranked("producthunt", rows);
}

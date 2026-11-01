import { BOARD_IDS, type BoardData, type BoardId, type Follow } from "./types";

/** The follows table allows 1 to 40 characters (its check constraint); the page tidies a keyword before sending it. */
export const KEYWORD_MAX = 40;

export function cleanKeyword(input: string): string | null {
  const keyword = input.trim().replace(/\s+/g, " ").toLowerCase();
  return keyword.length >= 1 && keyword.length <= KEYWORD_MAX ? keyword : null;
}

/** The boards someone follows, in the page's own order, skipping any id the page does not know. */
export function followedBoards(follows: Follow[]): BoardId[] {
  const chosen = new Set(follows.filter((f) => f.kind === "board").map((f) => f.value));
  return BOARD_IDS.filter((id) => chosen.has(id));
}

export function keywordsIn(follows: Follow[]): string[] {
  return follows.filter((f) => f.kind === "keyword").map((f) => f.value);
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hasLatin = (text: string) => /[a-z0-9]/i.test(text);

/** Which keywords a title mentions. A Latin keyword matches a whole word or its plural ("agent" finds "Agents" but "ai"
 *  never finds "said"); a Chinese one matches anywhere, as Chinese titles have no spaces between words. */
export function matchedKeywords(title: string, keywords: string[]): string[] {
  const lower = title.toLowerCase();
  return keywords.filter((keyword) =>
    hasLatin(keyword)
      ? new RegExp(`(^|[^\\p{L}\\p{N}])${escape(keyword)}(e?s)?($|[^\\p{L}\\p{N}])`, "u").test(lower)
      : lower.includes(keyword),
  );
}

/** Keywords an item mentions, in its title or its description: a GitHub or Hugging Face title is only a name. */
export function itemKeywords(item: { title: string; subtitle: string | null }, keywords: string[]): string[] {
  return matchedKeywords(item.subtitle ? `${item.title} ${item.subtitle}` : item.title, keywords);
}

/** How many items on the followed boards mention each keyword right now (an item on two boards counts once), so the
 *  follow screen can show what a keyword would pick out. */
export function keywordCounts(data: BoardData, boards: BoardId[], keywords: string[]): Record<string, number> {
  const keys = new Set(Object.values(data.entries).filter((e) => boards.includes(e.boardId)).map((e) => e.key));
  const items = [...keys].map((k) => data.items[k]).filter((item) => item !== undefined);
  return Object.fromEntries(keywords.map((k) => [k, items.filter((item) => itemKeywords(item, [k]).length > 0).length]));
}

/** Keywords offered with one press on the follow screen. */
export const SUGGESTED_KEYWORDS = ["agent", "llm", "open source", "rust", "design", "security"] as const;

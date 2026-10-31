// Realtime keeps one connection open for as long as the page is, but a Clerk session token lives only 60 seconds, and
// Supabase closes the channel the moment the token it holds expires ("Token has expired 0 seconds ago", 2026-10-31).
// Realtime passes a new token on at each heartbeat, every 25 seconds, but Clerk hands back the same token until it is
// almost expired, so the last heartbeat before expiry still sent the old one. The page asks Clerk for a new token
// itself once less than a heartbeat and a margin is left, so every token is replaced before it runs out.

/** More than Realtime's 25-second heartbeat, so the last heartbeat before a token expires always replaces it. */
export const REFRESH_WHEN_SECONDS_LEFT = 30;

/** Seconds until the token's `exp`; 0 for anything that is not a readable token. The signature is not checked here:
 *  Supabase checks it. This only decides when to ask for a new one. */
export function secondsLeft(token: string, now: Date): number {
  const payload = token.split(".")[1];
  if (!payload) return 0;
  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const exp: unknown = JSON.parse(json).exp;
    return typeof exp === "number" ? Math.round(exp - now.getTime() / 1000) : 0;
  } catch {
    // Not base64 or not JSON: treat it as expired, so a new one is fetched
    return 0;
  }
}

export function needsFreshToken(token: string | null, now: Date): boolean {
  return !token || secondsLeft(token, now) < REFRESH_WHEN_SECONDS_LEFT;
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** The browser's Supabase client. It holds only the publishable key, which is safe in a web page: what anyone can read
 *  or write is decided by row-level security from the Clerk session token sent with every request (`accessToken`).
 *  Realtime gets the same token through the same callback, and asks again on each heartbeat as Clerk tokens expire. */
export function createBrowserDb(getToken: () => Promise<string | null>): SupabaseClient {
  // Written out in full so Next.js can put the values into the page at build time
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Nudge: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local");
  }
  return createClient(url, key, { accessToken: getToken });
}

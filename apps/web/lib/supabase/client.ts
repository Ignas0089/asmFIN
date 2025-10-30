import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "../types";
import { browserEnv } from "../env";

function createBrowserClient() {
  return createClientComponentClient<Database>({
    supabaseUrl: browserEnv.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: browserEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    isSingleton: true,
  });
}

type BrowserClient = ReturnType<typeof createBrowserClient>;

let cachedClient: BrowserClient | null = null;

export function getSupabaseBrowserClient(): BrowserClient {
  if (!cachedClient) {
    cachedClient = createBrowserClient();
  }

  return cachedClient;
}

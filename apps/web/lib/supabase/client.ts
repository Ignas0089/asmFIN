import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";
import { browserEnv } from "../env";

let client: SupabaseClient<Database> | undefined;

export function getSupabaseBrowserClient() {
  if (!client) {
    client = createBrowserClient<Database>(
      browserEnv.NEXT_PUBLIC_SUPABASE_URL,
      browserEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }

  return client;
}

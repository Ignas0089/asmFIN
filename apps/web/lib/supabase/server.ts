import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { serverEnv } from "../env";
import type { Database } from "../types";

let cachedClient: SupabaseClient<Database> | null = null;

export function getSupabaseServerClient() {
  if (!cachedClient) {
    const supabaseKey =
      serverEnv.SUPABASE_SERVICE_ROLE_KEY ??
      serverEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    cachedClient = createClient<Database>(
      serverEnv.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }

  return cachedClient;
}

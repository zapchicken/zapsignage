"use client";

import { createClient } from "@supabase/supabase-js";
import type { SupabaseSchema } from "@/lib/supabase-types";

let client: ReturnType<typeof createClient<SupabaseSchema>> | null = null;

export function getSupabaseBrowserClient() {
  if (!client) {
    client = createClient<SupabaseSchema>(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    );
  }
  return client;
}

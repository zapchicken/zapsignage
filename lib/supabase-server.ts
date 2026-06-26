import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { SupabaseSchema } from "@/lib/supabase-types";

export function getSupabaseServerClient() {
  return createClient<SupabaseSchema>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

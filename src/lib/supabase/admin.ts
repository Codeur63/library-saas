import { createClient } from "@supabase/supabase-js";
import "server-only";

import { env } from "@/lib/env";

export const supabaseAdmin = createClient(env.supabaseUrl, env.serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
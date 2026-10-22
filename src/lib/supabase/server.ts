import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import "server-only";

import { publicEnv } from "@/lib/env-public";

export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // En Server Component, la mutation de cookies est impossible :
          // le rafraîchissement de session est géré par le middleware.
        }
      },
    },
  });
}
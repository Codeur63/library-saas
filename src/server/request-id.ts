import "server-only";

import { headers } from "next/headers";

import { REQUEST_ID_HEADER } from "@/lib/request-id";

export { REQUEST_ID_HEADER };

/**
 * Identifiant de corrélation posé par `middleware.ts` sur chaque requête.
 * Disponible dans les Route Handlers et les Server Actions. Retourne
 * `undefined` hors contexte de requête (scripts, tests, cron).
 */
export async function getRequestId(): Promise<string | undefined> {
  try {
    const store = await headers();
    return store.get(REQUEST_ID_HEADER) ?? undefined;
  } catch {
    return undefined;
  }
}

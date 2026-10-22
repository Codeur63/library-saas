import "server-only";

import { unstable_cache, revalidateTag } from "next/cache";

import {
  DASHBOARD_STATS_TAG,
  LIBRARY_OVERVIEW_TAG,
  REFERENCE_CATALOG_TAG,
} from "@/server/cache-tags";

/**
 * Enveloppe `unstable_cache` tolérante au contexte.
 *
 * Hors runtime Next (scripts de vérification exécutés via vite-node), le store
 * incrémental n'existe pas et l'appel lève « incrementalCache missing ». On
 * retombe alors sur l'exécution directe de la fonction, sans mémoïsation.
 */
export function cached<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>,
  keyParts: string[],
  options: { revalidate?: number; tags?: string[] }
): (...args: Args) => Promise<Result> {
  const cachedFn = unstable_cache(fn, keyParts, options);
  return async (...args: Args): Promise<Result> => {
    try {
      return await cachedFn(...args);
    } catch (error) {
      if (error instanceof Error && error.message.includes("incrementalCache missing")) {
        return fn(...args);
      }
      throw error;
    }
  };
}

/**
 * Invalidation best-effort des caches Next.js.
 *
 * `revalidateTag` n'a de sens que dans un contexte de requête Next (Server
 * Action / Route Handler). Les scripts de vérification appellent les services
 * hors de ce contexte : on neutralise alors l'appel plutôt que de faire échouer
 * l'écriture métier.
 */
function safeRevalidate(tag: string): void {
  try {
    revalidateTag(tag, "max");
  } catch {
    // Hors contexte Next (scripts) : aucune conséquence fonctionnelle.
  }
}

export function invalidateLibraryOverview(): void {
  safeRevalidate(LIBRARY_OVERVIEW_TAG);
}

export function invalidateDashboardStats(): void {
  safeRevalidate(DASHBOARD_STATS_TAG);
}

export function invalidateReferenceCatalog(): void {
  safeRevalidate(REFERENCE_CATALOG_TAG);
}

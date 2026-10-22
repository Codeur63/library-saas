/**
 * Étiquettes de cache Next.js partagées.
 *
 * Centralisées pour que les écritures (services) et les lectures mémoïsées
 * (`unstable_cache`) référencent exactement la même chaîne, et que l'invalidation
 * (`revalidateTag`) ne puisse pas se désynchroniser d'une faute de frappe.
 */
export const LIBRARY_OVERVIEW_TAG = "library-overview";
export const REFERENCE_CATALOG_TAG = "reference-catalog";
export const DASHBOARD_STATS_TAG = "dashboard-stats";

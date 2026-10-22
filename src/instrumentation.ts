/**
 * Exécuté une fois au démarrage du serveur Next (runtime Node.js).
 * Effectue les contrôles de configuration bloquants avant d'accepter du trafic.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { assertProductionConfig } = await import("@/lib/env");
  assertProductionConfig();
}

import "server-only";

import { prisma } from "@/lib/prisma";
import { logger } from "@/server/logger";

/**
 * Trace des opérations administratives sensibles.
 * Écriture uniquement via le serveur (service_role) ; aucune policy RLS
 * n'expose cette table aux clients.
 */
export async function logAdminAction(params: {
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.adminActionLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        details: params.details ? (params.details as object) : undefined,
      },
    });
  } catch (error) {
    logger.warn("Échec d'écriture du log admin", { action: params.action, targetId: params.targetId }, error);
  }
}
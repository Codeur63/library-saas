import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reportError } from "@/server/logger";
import { getRequestId } from "@/server/request-id";

export const dynamic = "force-dynamic";

/**
 * GET /api/health
 * Vérifie la connectivité de la base (Prisma). Aucune donnée sensible,
 * aucun secret dans la réponse.
 */
export async function GET(): Promise<Response> {
  const startedAt = Date.now();
  const requestId = await getRequestId();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      {
        status: "ok",
        db: "up",
        uptimeMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
        requestId,
      },
      { status: 200 }
    );
  } catch (error) {
    reportError(error, { scope: "health", requestId });
    return NextResponse.json(
      {
        status: "degraded",
        db: "down",
        uptimeMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
        requestId,
      },
      { status: 503 }
    );
  }
}
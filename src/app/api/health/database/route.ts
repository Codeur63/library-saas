import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Ne pas exposer publiquement les diagnostics de la base.
  const expectedToken = process.env.HEALTHCHECK_TOKEN;
  const providedToken = request.headers.get("x-healthcheck-token");

  if (!expectedToken || providedToken !== expectedToken) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      database: "connected",
    });
  } catch (error) {
    console.error("DATABASE_CONNECTION_FAILURE", error);

    return NextResponse.json(
      { database: "unavailable" },
      { status: 503 }
    );
  }
}
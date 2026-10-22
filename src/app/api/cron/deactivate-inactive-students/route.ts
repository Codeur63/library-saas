import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AppError } from "@/server/errors";
import { errorResponse } from "@/server/http";
import { logger } from "@/server/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Passivation quotidienne des étudiants inactifs (dernière activité >
 * INACTIVITY_MONTHS).
 *
 * Double d'un planificateur externe (cron système, GitHub Actions, Vercel Cron)
 * pour fonctionner même lorsque l'extension `pg_cron` de Supabase n'est pas
 * disponible.
 *
 * Sécurité : fail-closed. Sans `CRON_SECRET` configuré, la route répond 503.
 * Sinon, un jeton `Authorization: Bearer <secret>` ou `x-cron-secret: <secret>`
 * est exigé.
 */
function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}

function authorize(request: Request): void {
  const secret = env.cronSecret;
  if (!secret) {
    throw new AppError("FORBIDDEN", "Tâche planifiée non configurée.", 503);
  }

  const authorization = request.headers.get("authorization");
  const bearer = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  const provided = bearer ?? request.headers.get("x-cron-secret");

  if (!provided || !safeEqual(provided, secret)) {
    throw new AppError("UNAUTHORIZED", "Non autorisé.", 401);
  }
}

async function run(request: Request): Promise<Response> {
  try {
    authorize(request);

    const { data, error } = await supabaseAdmin.rpc("deactivate_inactive_students", {
      p_inactivity_months: env.inactivityMonths,
    });
    if (error) {
      throw new AppError("UNKNOWN", "Échec de la passivation des étudiants inactifs.", 500);
    }

    logger.info("Passivation des étudiants inactifs exécutée", {
      deactivated: data,
      inactivityMonths: env.inactivityMonths,
    });

    return NextResponse.json({ ok: true, deactivated: data, inactivityMonths: env.inactivityMonths });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: Request): Promise<Response> {
  return run(request);
}

export async function POST(request: Request): Promise<Response> {
  return run(request);
}

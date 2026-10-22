import { NextResponse } from "next/server";

import { errorResponse } from "@/server/http";
import { clientIp, enforceRateLimit, RATE_LIMITS, rateLimitKey } from "@/server/rate-limit";
import { downloadDocument } from "@/server/services/documents.service";

/**
 * GET /api/documents/[id]/download
 * Vérifie l'authentification, la visibilité et incrémente le compteur de
 * téléchargements, puis redirige vers une URL Storage signée à durée courte.
 *
 * Le fichier est ainsi diffusé directement par Storage : aucune donnée lourde
 * n'est chargée en mémoire par l'application. Le contrôle d'accès reste
 * centralisé dans `downloadDocument` (source unique de vérité partagée avec les
 * pages et les autres routes). Un quota par IP s'ajoute au quota par utilisateur.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    await enforceRateLimit({ key: rateLimitKey("download:ip", clientIp(request.headers)), ...RATE_LIMITS.downloadByIp });

    const { id } = await params;
    const { signedUrl } = await downloadDocument(id);

    return NextResponse.redirect(signedUrl, {
      status: 302,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

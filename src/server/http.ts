import { NextResponse } from "next/server";

import { isAppError, RateLimitError } from "@/server/errors";
import { reportError } from "@/server/logger";
import { getRequestId, REQUEST_ID_HEADER } from "@/server/request-id";

/**
 * Convertit une erreur serveur en réponse JSON HTTP.
 * Les `AppError` exposent leur code et leur statut ; les erreurs de débit
 * renvoient en plus `Retry-After` ; tout le reste est journalisé et ramené à
 * une erreur générique (aucun détail interne ne fuit).
 *
 * `requestId` est renvoyé dans le corps ET dans l'en-tête `x-request-id` pour
 * permettre la corrélation avec les logs serveur.
 */
export async function errorResponse(error: unknown): Promise<NextResponse> {
  const requestId = await getRequestId();
  const headers: Record<string, string> = {};
  if (requestId) headers[REQUEST_ID_HEADER] = requestId;

  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { error: error.message, code: error.code, requestId },
      { status: 429, headers: { ...headers, "Retry-After": String(error.retryAfterSec) } }
    );
  }

  if (isAppError(error)) {
    return NextResponse.json(
      { error: error.message, code: error.code, requestId },
      { status: error.status, headers }
    );
  }

  reportError(error, { scope: "api", requestId });
  return NextResponse.json(
    {
      error: "Une erreur inattendue est survenue.",
      code: "UNKNOWN",
      requestId,
    },
    { status: 500, headers }
  );
}

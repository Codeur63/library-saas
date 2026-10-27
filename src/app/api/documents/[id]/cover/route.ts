import { NextResponse } from "next/server";

import {
  getOrCreateDocumentThumbnail,
  isRenderablePdf,
  type ThumbnailSource,
} from "@/server/documents-thumbnail.service";
import { errorResponse } from "@/server/http";
import { getViewableDocument } from "@/server/services/documents.service";

export const runtime = "nodejs";

/**
 * GET /api/documents/[id]/cover
 * Renvoie la première page du document (PDF) sous forme de PNG, pour l'affichage
 * des cartes de la bibliothèque. Les documents publiés GLOBAL sont visibles
 * publiquement ; les autres conservent le contrôle d'accès authentifié
 * (délégué à `getViewableDocument`) ; la miniature est générée une fois puis
 * mise en cache dans Storage.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;
    const document = await getViewableDocument(id);

    if (!isRenderablePdf(document.mimeType, document.fileExtension)) {
      return NextResponse.json({ error: "Aucun aperçu disponible pour ce format." }, { status: 404 });
    }

    const source: ThumbnailSource = {
      id: document.id,
      storagePath: document.storagePath,
      storageBucket: document.storageBucket,
      mimeType: document.mimeType,
      fileExtension: document.fileExtension,
    };

    const png = await getOrCreateDocumentThumbnail(source);
    if (!png) {
      return NextResponse.json({ error: "Aperçu indisponible." }, { status: 404 });
    }

    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(png.length),
        // Dérivé immuable d'un document immuable. Cache partagé uniquement
        // pour les documents GLOBAL publiés (visibles sans connexion).
        "Cache-Control":
          document.isPublished && document.visibility === "GLOBAL"
            ? "public, max-age=2592000, immutable"
            : "private, max-age=2592000, immutable",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

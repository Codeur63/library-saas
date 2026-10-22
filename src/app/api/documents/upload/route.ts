import { NextResponse } from "next/server";

import { errorResponse } from "@/server/http";
import { clientIp, enforceRateLimit, RATE_LIMITS, rateLimitKey } from "@/server/rate-limit";
import { CreateDocumentInputSchema, type CreateDocumentInput } from "@/server/dto";
import { uploadDocument } from "@/server/services/documents.service";

export const runtime = "nodejs";

/**
 * POST /api/documents/upload
 * Multipart/form-data : champ "file" + champs métadonnées du document.
 *
 * Authentification, contrôle admin, validation du fichier et persistance sont
 * délégués à `uploadDocument` (source unique de vérité, partagée avec les
 * Server Actions). Un quota par IP s'ajoute au quota par administrateur.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    await enforceRateLimit({ key: rateLimitKey("upload:ip", clientIp(request.headers)), ...RATE_LIMITS.uploadByIp });

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Aucun fichier fourni." }, { status: 400 });
    }

    // Métadonnées transmises au format JSON pour un typage sûr.
    const raw = form.get("metadata");
    if (!raw || typeof raw !== "string") {
      return NextResponse.json({ error: "Métadonnées manquantes." }, { status: 400 });
    }

    let parsed: CreateDocumentInput;
    try {
      parsed = CreateDocumentInputSchema.parse(JSON.parse(raw));
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Métadonnées invalides." },
        { status: 422 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const document = await uploadDocument({ name: file.name, size: file.size, buffer }, parsed);

    return NextResponse.json(
      { ok: true, data: { id: document.id, title: document.title, createdAt: document.createdAt } },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}

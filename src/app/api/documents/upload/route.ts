import { NextResponse } from "next/server";
import {
  saveDocumentThumbnail,
  type ThumbnailSource,
} from "@/server/documents-thumbnail.service";

import { logger } from "@/server/logger";
import { storageService } from "@/server/storage.service";
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

    const thumbnailValue = form.get("thumbnail");
    
    let thumbnailBuffer: Buffer | null = null;
    
    try {
      thumbnailBuffer = await readValidatedThumbnail(
        thumbnailValue
      );
    } catch {
      return NextResponse.json(
        { error: "La miniature fournie est invalide." },
        { status: 422 }
      );
    }
    
    const document = await uploadDocument(
      { name: file.name, size: file.size, buffer },
      parsed
    );
    
    if (
      thumbnailBuffer &&
      storageService.resolveMimeType(file.name) === "application/pdf"
    ) {
      const stored = await storageService
        .downloadIfExists(
          `thumbnails/${document.id}.png`
        )
        .catch(() => null);
    
      if (!stored) {
        const record = await (
          await import("@/lib/prisma")
        ).prisma.document.findUnique({
          where: { id: document.id },
          select: {
            id: true,
            storagePath: true,
            storageBucket: true,
            mimeType: true,
            fileExtension: true,
          },
        });
    
        if (record) {
          const source: ThumbnailSource = record;
    
          await saveDocumentThumbnail(
            source,
            thumbnailBuffer
          ).catch((error) => {
            logger.warn(
              "Impossible de stocker la miniature",
              { documentId: document.id },
              error
            );
          });
        }
      }
    }
    

    return NextResponse.json(
      { ok: true, data: { id: document.id, title: document.title, createdAt: document.createdAt } },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}

const MAX_THUMBNAIL_BYTES = 1024 * 1024;
const MAX_THUMBNAIL_DIMENSION = 2048;

async function readValidatedThumbnail(
  value: FormDataEntryValue | null
): Promise<Buffer | null> {
  if (value === null) return null;

  if (!(value instanceof File)) {
    throw new Error("Miniature invalide.");
  }

  if (
    value.size === 0 ||
    value.size > MAX_THUMBNAIL_BYTES ||
    value.type !== "image/png"
  ) {
    throw new Error("Miniature PNG invalide ou trop volumineuse.");
  }

  const buffer = Buffer.from(await value.arrayBuffer());

  if (buffer.length < 24) {
    throw new Error("Miniature PNG invalide.");
  }

  const signature = Buffer.from([
    137, 80, 78, 71, 13, 10, 26, 10,
  ]);

  if (!buffer.subarray(0, 8).equals(signature)) {
    throw new Error("Signature PNG invalide.");
  }

  if (buffer.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error("Structure PNG invalide.");
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);

  if (
    width === 0 ||
    height === 0 ||
    width > MAX_THUMBNAIL_DIMENSION ||
    height > MAX_THUMBNAIL_DIMENSION
  ) {
    throw new Error("Dimensions PNG invalides.");
  }

  return buffer;
}
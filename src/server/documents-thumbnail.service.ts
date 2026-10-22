import "server-only";

import path from "node:path";

import { storageService } from "@/server/storage.service";
import { logger } from "@/server/logger";

const THUMBNAIL_DIRECTORY = "thumbnails";
const THUMBNAIL_WIDTH = 480;
const THUMBNAIL_CONTENT_TYPE = "image/png";

/** Petit fichier décrivant ce qu'il faut pour produire/lire une miniature. */
export interface ThumbnailSource {
  id: string;
  storagePath: string;
  storageBucket: string;
  mimeType: string;
  fileExtension: string;
}

/** Chemin Storage déterministe : un dérivé par document, immuable. */
export function thumbnailStoragePath(documentId: string): string {
  return `${THUMBNAIL_DIRECTORY}/${documentId}.png`;
}

/** Seuls les PDF sont rasterisables (les autres formats gardent la couverture SVG). */
export function isRenderablePdf(mimeType: string, fileExtension: string): boolean {
  return mimeType === "application/pdf" || fileExtension.toLowerCase() === "pdf";
}

/**
 * Dossier des polices standard livrées par pdfjs-dist. En Node, pdfjs lit ces
 * fichiers via `fs` : il faut donc un chemin de système de fichiers, pas une URL.
 */
function standardFontsDirectory(): string {
  return path.join(process.cwd(), "node_modules", "pdfjs-dist", "standard_fonts") + path.sep;
}

/**
 * Rasterise la première page d'un PDF en PNG. Ne lève jamais : renvoie `null`
 * pour tout PDF illisible (fichier corrompu, page manquante, etc.).
 */
export async function renderPdfFirstPagePng(buffer: Buffer, width = THUMBNAIL_WIDTH): Promise<Buffer | null> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const { createCanvas } = await import("@napi-rs/canvas");

    const pdf = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      standardFontDataUrl: standardFontsDirectory(),
      isEvalSupported: false,
      verbosity: 0,
    }).promise;

    try {
      const page = await pdf.getPage(1);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: width / base.width });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const context = canvas.getContext("2d");

      // Fond blanc : beaucoup de PDF n'ont pas de fond opaque.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: context as unknown as CanvasRenderingContext2D,
        viewport,
      }).promise;
      return Buffer.from(canvas.toBuffer("image/png"));
    } finally {
      await pdf.destroy();
    }
  } catch (error) {
    logger.warn("Échec du rendu de la première page PDF", undefined, error);
    return null;
  }
}

/**
 * Renvoie la miniature du document : depuis le cache Storage si elle existe,
 * sinon générée depuis le fichier source puis persistée pour les appels suivants.
 * `null` si le document n'est pas un PDF exploitable.
 */
export async function getOrCreateDocumentThumbnail(source: ThumbnailSource): Promise<Buffer | null> {
  if (!isRenderablePdf(source.mimeType, source.fileExtension)) {
    return null;
  }

  const thumbPath = thumbnailStoragePath(source.id);

  const cached = await storageService.downloadIfExists(thumbPath, source.storageBucket).catch(() => null);
  if (cached) {
    return cached;
  }

  const pdf = await storageService.download(source.storagePath, source.storageBucket).catch(() => null);
  if (!pdf) {
    return null;
  }

  const png = await renderPdfFirstPagePng(pdf);
  if (!png) {
    return null;
  }

  // Persiste le dérivé (best-effort : un échec de cache ne doit pas priver
  // l'utilisateur de l'image).
  await storageService.put(thumbPath, png, THUMBNAIL_CONTENT_TYPE, true, source.storageBucket).catch(() => undefined);

  return png;
}

/**
 * Génère et met en cache la miniature d'un PDF fraîchement importé, afin que
 * la bibliothèque l'affiche immédiatement. Best-effort : n'interrompt jamais
 * l'import (les autres formats sont ignorés).
 */
export async function warmDocumentThumbnail(source: ThumbnailSource, pdfBuffer: Buffer): Promise<void> {
  if (!isRenderablePdf(source.mimeType, source.fileExtension)) {
    return;
  }
  try {
    const png = await renderPdfFirstPagePng(pdfBuffer);
    if (!png) return;
    await storageService.put(thumbnailStoragePath(source.id), png, THUMBNAIL_CONTENT_TYPE, true, source.storageBucket);
  } catch (error) {
    logger.warn("Échec de la génération de la vignette à l'import", { documentId: source.id }, error);
  }
}

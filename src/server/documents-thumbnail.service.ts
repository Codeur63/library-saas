import "server-only";

import { storageService } from "@/server/storage.service";

const THUMBNAIL_DIRECTORY = "thumbnails";
const THUMBNAIL_CONTENT_TYPE = "image/png";

export interface ThumbnailSource {
  id: string;
  storagePath: string;
  storageBucket: string;
  mimeType: string;
  fileExtension: string;
}

export function thumbnailStoragePath(
  documentId: string
): string {
  return `${THUMBNAIL_DIRECTORY}/${documentId}.png`;
}

export function isRenderablePdf(
  mimeType: string,
  fileExtension: string
): boolean {
  return (
    mimeType === "application/pdf" ||
    fileExtension.toLowerCase() === "pdf"
  );
}

export async function getOrCreateDocumentThumbnail(
  source: ThumbnailSource
): Promise<Buffer | null> {
  if (!isRenderablePdf(
    source.mimeType,
    source.fileExtension
  )) {
    return null;
  }

  return storageService.downloadIfExists(
    thumbnailStoragePath(source.id),
    source.storageBucket
  );
}

export async function saveDocumentThumbnail(
  source: ThumbnailSource,
  png: Buffer
): Promise<void> {
  if (!isRenderablePdf(
    source.mimeType,
    source.fileExtension
  )) {
    return;
  }

  await storageService.put(
    thumbnailStoragePath(source.id),
    png,
    THUMBNAIL_CONTENT_TYPE,
    true,
    source.storageBucket
  );
}
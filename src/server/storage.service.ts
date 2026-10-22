import "server-only";

import { env } from "@/lib/env";
import { AppError } from "@/server/errors";
import { isSignatureValid } from "@/server/file-signature";

export const ALLOWED_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "zip",
] as const;

export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

export const ALLOWED_MIME: Record<AllowedExtension, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  zip: "application/zip",
};

export interface StoredFile {
  storageBucket: string;
  storagePath: string;
  originalFileName: string;
  mimeType: string;
  fileExtension: string;
  fileSize: number;
}

/**
 * Abstrait Supabase Storage (bucket privé).
 * Le bucket "university-documents" est PRIVATE : aucun accès public, seul le
 * service_role peut lire/écrire. Les clients reçoivent des URLs signées courtes.
 */
export const storageService = {
  maxUploadBytes(): number {
    return env.maxUploadSizeMb * 1024 * 1024;
  },

  /**
   * Valide l'extension, la taille et la signature binaire (« magic bytes »).
   * Le MIME déclaré (form-data) et l'extension sont falsifiables : le contenu
   * doit correspondre au format annoncé.
   */
  validateFile(originalName: string, size: number, buffer: Uint8Array): void {
    const extension = (originalName.split(".").pop() ?? "").toLowerCase();
    if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(extension)) {
      throw new AppError("INVALID_FILE", "Format de fichier non autorisé.", 415);
    }
    if (size <= 0) {
      throw new AppError("INVALID_FILE", "Le fichier est vide.", 415);
    }
    if (size > this.maxUploadBytes()) {
      throw new AppError("INVALID_FILE", `Fichier trop volumineux (max ${env.maxUploadSizeMb} Mo).`, 413);
    }
    if (!isSignatureValid(extension, buffer)) {
      throw new AppError(
        "INVALID_FILE",
        "Le contenu du fichier ne correspond pas à son extension.",
        415
      );
    }
  },

  /**
   * Type MIME canonique déduit de l'extension (jamais du MIME déclaré par le
   * client, qui est falsifiable).
   */
  resolveMimeType(originalName: string): string {
    const extension = (originalName.split(".").pop() ?? "").toLowerCase() as AllowedExtension;
    return ALLOWED_MIME[extension] ?? "application/octet-stream";
  },

  /** Chemin de stockage : bucket/répertoire date/uuidextension. */
  buildStoragePath(originalName: string): string {
    const extension = (originalName.split(".").pop() ?? "").toLowerCase();
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    return `documents/${year}/${month}/${globalThis.crypto.randomUUID()}.${extension}`;
  },

  async upload(buffer: Buffer, originalName: string): Promise<StoredFile> {
    const extension = (originalName.split(".").pop() ?? "").toLowerCase();
    const mimeType = this.resolveMimeType(originalName);
    const storagePath = this.buildStoragePath(originalName);

    const { supabaseAdmin } = await import("@/lib/supabase/admin");
    const { error } = await supabaseAdmin.storage
      .from(env.documentStorageBucket)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      throw new AppError("STORAGE_ERROR", error.message, 500);
    }

    return {
      storageBucket: env.documentStorageBucket,
      storagePath,
      originalFileName: originalName,
      mimeType,
      fileExtension: extension,
      fileSize: buffer.length,
    };
  },

  /**
   * Écrit un objet à un chemin explicite (ex. miniature dérivée).
   * `upsert` permet de régénérer un dérivé déjà présent.
   */
  async put(
    storagePath: string,
    buffer: Buffer,
    contentType: string,
    upsert = true,
    storageBucket: string = env.documentStorageBucket
  ): Promise<void> {
    const { supabaseAdmin } = await import("@/lib/supabase/admin");
    const { error } = await supabaseAdmin.storage
      .from(storageBucket)
      .upload(storagePath, buffer, { contentType, upsert });
    if (error) {
      throw new AppError("STORAGE_ERROR", error.message, 500);
    }
  },

  async remove(storagePath: string, storageBucket: string = env.documentStorageBucket): Promise<void> {
    const { supabaseAdmin } = await import("@/lib/supabase/admin");
    const { error } = await supabaseAdmin.storage.from(storageBucket).remove([storagePath]);
    // Une absence de fichier n'est pas une erreur bloquante.
    if (error && !error.message.includes("not found")) {
      throw new AppError("STORAGE_ERROR", error.message, 500);
    }
  },

  async download(storagePath: string, storageBucket: string = env.documentStorageBucket): Promise<Buffer> {
    const { supabaseAdmin } = await import("@/lib/supabase/admin");
    const { data, error } = await supabaseAdmin.storage.from(storageBucket).download(storagePath);
    if (error || !data) {
      throw new AppError("DOCUMENT_NOT_FOUND", "Le fichier est introuvable.", 404);
    }
    return Buffer.from(await data.arrayBuffer());
  },

  /** Télécharge un objet s'il existe, sinon `null` (pas d'exception). */
  async downloadIfExists(
    storagePath: string,
    storageBucket: string = env.documentStorageBucket
  ): Promise<Buffer | null> {
    const { supabaseAdmin } = await import("@/lib/supabase/admin");
    const { data, error } = await supabaseAdmin.storage.from(storageBucket).download(storagePath);
    if (error || !data) {
      return null;
    }
    return Buffer.from(await data.arrayBuffer());
  },

  /** URL signée à durée courte (aperçu/navigation), jamais permanente. */
  async createSignedUrl(storagePath: string, seconds = 300, storageBucket: string = env.documentStorageBucket): Promise<string> {
    const { supabaseAdmin } = await import("@/lib/supabase/admin");
    const { data, error } = await supabaseAdmin.storage.from(storageBucket).createSignedUrl(storagePath, seconds);
    if (error || !data) {
      throw new AppError("DOCUMENT_NOT_FOUND", "Le fichier est introuvable.", 404);
    }
    return data.signedUrl;
  },

  /**
   * URL signée forçant le téléchargement (Content-Disposition: attachment).
   * Permet de diffuser le fichier directement depuis Storage, sans le charger
   * en mémoire côté serveur applicatif.
   */
  async createSignedDownloadUrl(
    storagePath: string,
    fileName: string,
    seconds = 60,
    storageBucket: string = env.documentStorageBucket
  ): Promise<string> {
    const { supabaseAdmin } = await import("@/lib/supabase/admin");
    const { data, error } = await supabaseAdmin.storage
      .from(storageBucket)
      .createSignedUrl(storagePath, seconds, { download: fileName });
    if (error || !data) {
      throw new AppError("DOCUMENT_NOT_FOUND", "Le fichier est introuvable.", 404);
    }
    return data.signedUrl;
  },
};
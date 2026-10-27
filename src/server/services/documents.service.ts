import "server-only";

import { prisma } from "@/lib/prisma";
import {
  thumbnailStoragePath,
} from "@/server/documents-thumbnail.service";
import { createServerSupabase } from "@/lib/supabase/server";
import { AppError } from "@/server/errors";
import { buildDocumentsWhere, canAccessDocument, PUBLIC_VIEWER } from "@/server/access-control";
import { assertAdmin, assertCanUseLibrary, getCurrentUser, requireCurrentUser } from "@/server/current-user";
import { storageService } from "@/server/storage.service";
import {
  type CreateDocumentInput,
  type UpdateDocumentInput,
  type DocumentQueryInput,
} from "@/server/dto";
import { logAdminAction } from "@/server/services/admin-log.service";
import { invalidateDashboardStats, invalidateLibraryOverview } from "@/server/cache";
import { requestCache } from "@/server/request-cache";
import { enforceRateLimit, RATE_LIMITS, rateLimitKey } from "@/server/rate-limit";
import { logger } from "@/server/logger";
import type { LibraryDocument, Paginated } from "@/types/library";

export interface UploadedFileLike {
  name: string;
  size: number;
  buffer: Buffer;
}

export const DOCUMENT_SELECT = {
  id: true,
  title: true,
  description: true,
  fileExtension: true,
  mimeType: true,
  fileSize: true,
  originalFileName: true,
  storagePath: true,
  storageBucket: true,
  downloadCount: true,
  isPublished: true,
  visibility: true,
  semester: true,
  createdAt: true,
  updatedAt: true,
  subject: {
    select: {
      id: true,
      name: true,
      programId: true,
      program: { select: { id: true, name: true } },
      level: { select: { id: true, code: true } },
    },
  },
  category: { select: { id: true, name: true, code: true } },
  academicYear: { select: { id: true, label: true } },
  accessProgram: { select: { id: true, name: true } },
  uploadedBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

type DocumentWithRelations = NonNullable<Awaited<ReturnType<typeof getDocumentById>>>;

export function serializeDocument(document: DocumentWithRelations): LibraryDocument {
  return {
    id: document.id,
    title: document.title,
    description: document.description,
    fileExtension: document.fileExtension,
    mimeType: document.mimeType,
    fileSize: Number(document.fileSize),
    originalFileName: document.originalFileName,
    downloadCount: document.downloadCount,
    isPublished: document.isPublished,
    visibility: document.visibility,
    semester: document.semester,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    subject: document.subject,
    category: document.category,
    academicYear: document.academicYear,
    accessProgram: document.accessProgram,
    uploadedBy: document.uploadedBy,
  };
}

export async function getDocumentById(id: string) {
  return prisma.document.findUnique({
    where: { id },
    select: DOCUMENT_SELECT,
  });
}

/**
 * Contrôle d'accès complet : session valide, compte utilisable de la
 * bibliothèque, document existant et lisible selon les règles RLS.
 *
 * Source unique de vérité partagée par les services ET les routes API —
 * évite de dupliquer la logique de visibilité à plusieurs endroits.
 */
export async function requireAccessibleDocument(
  id: string,
  currentUser = requireCurrentUser
): Promise<DocumentWithRelations> {
  const user = await currentUser();
  if (!user) throw new AppError("UNAUTHORIZED", "Vous devez être connecté.", 401);
  assertCanUseLibrary(user);

  const document = await getDocumentById(id);
  if (!document) throw new AppError("DOCUMENT_NOT_FOUND", "Document introuvable.", 404);

  if (!canAccessDocument(user, document)) {
    throw new AppError("PROGRAM_ACCESS_DENIED", "Accès refusé à ce document.", 403);
  }

  return document;
}

/**
 * Variante publique : un visiteur non authentifié peut consulter les documents
 * publiés GLOBAL. Les utilisateurs connectés conservent leurs règles d'accès.
 */
export async function getViewableDocument(
  id: string,
  currentUser = getCurrentUser
): Promise<DocumentWithRelations> {
  const user = await currentUser();
  if (user) assertCanUseLibrary(user);

  const document = await getDocumentById(id);
  if (!document) throw new AppError("DOCUMENT_NOT_FOUND", "Document introuvable.", 404);

  const viewer = user ?? PUBLIC_VIEWER;
  if (!canAccessDocument(viewer, document)) {
    if (!user) throw new AppError("DOCUMENT_NOT_FOUND", "Document introuvable.", 404);
    throw new AppError("PROGRAM_ACCESS_DENIED", "Accès refusé à ce document.", 403);
  }

  return document;
}

export async function listDocuments(
  query: DocumentQueryInput,
  currentUser = getCurrentUser
): Promise<Paginated<LibraryDocument>> {
  const user = await currentUser();
  if (user) assertCanUseLibrary(user);

  const page = query.page;
  const pageSize = query.pageSize;
  const where = buildDocumentsWhere(query, user ?? PUBLIC_VIEWER);

  const orderBy = (() => {
    switch (query.sort) {
      case "oldest": return { createdAt: "asc" as const };
      case "title-asc": return { title: "asc" as const };
      case "title-desc": return { title: "desc" as const };
      case "most-downloaded": return { downloadCount: "desc" as const };
      default: return { createdAt: "desc" as const };
    }
  })();

  const [items, total] = await Promise.all([
    prisma.document.findMany({
      where,
      select: DOCUMENT_SELECT,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.document.count({ where }),
  ]);

  return {
    items: items.map(serializeDocument),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Documents publiés par l'utilisateur connecté (ses propres publications).
 * Réservé aux administrateurs, puisqu'eux seuls peuvent publier.
 */
export async function listMyDocuments(
  query: DocumentQueryInput,
  currentUser = requireCurrentUser
): Promise<Paginated<LibraryDocument>> {
  const user = await currentUser();
  if (!user) throw new AppError("UNAUTHORIZED", "Vous devez être connecté.", 401);
  assertAdmin(user);

  const page = query.page;
  const pageSize = query.pageSize;

  const [items, total] = await Promise.all([
    prisma.document.findMany({
      where: { uploadedById: user.id },
      select: DOCUMENT_SELECT,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.document.count({ where: { uploadedById: user.id } }),
  ]);

  return {
    items: items.map(serializeDocument),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export const getDocument = requestCache(async (id: string, currentUser = getCurrentUser) => {
  const document = await getViewableDocument(id, currentUser);
  return serializeDocument(document);
});

/**
 * Téléchargement : vérifie les accès, incrémente le compteur (atomique, RPC
 * PostgreSQL) puis renvoie le fichier à diffuser.
 */
export async function downloadDocument(id: string, currentUser = requireCurrentUser) {
  const user = await currentUser();
  if (!user) throw new AppError("UNAUTHORIZED", "Vous devez être connecté.", 401);

  // Quota par utilisateur (anti-scraping côté compte).
  await enforceRateLimit({ key: rateLimitKey("download:user", user.id), ...RATE_LIMITS.downloadByUser });

  const document = await requireAccessibleDocument(id, async () => user);

  // Compteur incrémenté via la RPC PostgreSQL avec la session utilisateur
  // (auth.uid() requis par private.can_access_document) — jamais côté frontend.
  const { error: rpcError } = await (await createServerSupabase()).rpc("increment_download_count", {
    p_document_id: document.id,
  });
  if (rpcError) {
    throw new AppError("UNKNOWN", "Impossible de comptabiliser le téléchargement.", 500);
  }

  const fileName = document.originalFileName.replace(/["\\]/g, "") || "document";
  const signedUrl = await storageService.createSignedDownloadUrl(
    document.storagePath,
    fileName,
    60,
    document.storageBucket
  );

  return { fileName, signedUrl };
}

export async function uploadDocument(
  file: UploadedFileLike,
  input: CreateDocumentInput,
  currentUser = requireCurrentUser
) {
  const user = await currentUser();
  if (!user) throw new AppError("UNAUTHORIZED", "Vous devez être connecté.", 401);
  assertAdmin(user);
  if (user.status !== "ACTIVE") {
    throw new AppError("FORBIDDEN", "Ce compte est inactif ou suspendu.", 403);
  }

  // Quota d'import par administrateur (anti-abus disque/bande passante).
  await enforceRateLimit({ key: rateLimitKey("upload:user", user.id), ...RATE_LIMITS.uploadByUser });

  // Validation fichier côté serveur (jamais uniquement côté frontend).
  storageService.validateFile(file.name, file.size, file.buffer);

  // Vérifications de référentiel, exécutées en parallèle (un seul aller-retour).
  const [subject, category, year, program] = await Promise.all([
    prisma.subject.findFirst({
      where: { id: input.subjectId, isActive: true },
      select: { id: true },
    }),
    prisma.documentCategory.findFirst({
      where: { id: input.categoryId, isActive: true },
      select: { id: true },
    }),
    input.academicYearId
      ? prisma.academicYear.findFirst({ where: { id: input.academicYearId }, select: { id: true } })
      : Promise.resolve(null),
    input.visibility === "PROGRAM"
      ? prisma.program.findFirst({ where: { id: input.accessProgramId! }, select: { id: true } })
      : Promise.resolve(null),
  ]);

  if (!subject) throw new AppError("INVALID_INPUT", "Matière invalide ou inactive.", 422);
  if (!category) throw new AppError("INVALID_INPUT", "Catégorie invalide ou inactive.", 422);
  if (input.academicYearId && !year) throw new AppError("INVALID_INPUT", "Année académique invalide.", 422);
  if (input.visibility === "PROGRAM" && !program) throw new AppError("INVALID_INPUT", "Filière cible invalide.", 422);

  // Envoi du fichier vers Storage (bucket privé).
  const stored = await storageService.upload(file.buffer, file.name);

  // Insertion des métadonnées. En cas d'échec, on supprime l'objet Storage
  // pour ne jamais laisser de fichier orphelin (compensation).
  let document;
  try {
    document = await prisma.document.create({
      data: {
        title: input.title,
        description: input.description || null,
        subjectId: input.subjectId,
        categoryId: input.categoryId,
        academicYearId: input.academicYearId ?? null,
        semester: input.semester ?? null,
        visibility: input.visibility,
        accessProgramId: input.visibility === "PROGRAM" ? input.accessProgramId : null,
        storageBucket: stored.storageBucket,
        storagePath: stored.storagePath,
        originalFileName: stored.originalFileName,
        mimeType: stored.mimeType,
        fileExtension: stored.fileExtension,
        fileSize: BigInt(stored.fileSize),
        uploadedById: user.id,
        downloadCount: 0,
        isPublished: true,
      },
      select: { id: true, title: true, createdAt: true },
    });
  } catch (error) {
    await storageService.remove(stored.storagePath, stored.storageBucket);
    throw error;
  }

  await logAdminAction({
    actorId: user.id,
    action: "document.uploaded",
    targetType: "document",
    targetId: document.id,
    details: { title: document.title, size: stored.fileSize, extension: stored.fileExtension },
  });

  // Couverture (première page) générée en tâche de fond : ne bloque pas la
  // réponse d'import. Si elle échoue, la route /cover la régénère à la demande.

  invalidateLibraryOverview();
  invalidateDashboardStats();

  return document;
}

export async function updateDocument(
  id: string,
  input: UpdateDocumentInput,
  currentUser = requireCurrentUser
) {
  const user = await currentUser();
  if (!user) throw new AppError("UNAUTHORIZED", "Vous devez être connecté.", 401);
  assertAdmin(user);

  const existing = await prisma.document.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!existing) throw new AppError("DOCUMENT_NOT_FOUND", "Document introuvable.", 404);

  const data: Record<string, unknown> = {
    title: input.title,
    description: input.description ?? undefined,
    subjectId: input.subjectId,
    categoryId: input.categoryId,
    academicYearId: input.academicYearId ?? undefined,
    semester: input.semester ?? undefined,
    visibility: input.visibility,
    accessProgramId: input.visibility === "PROGRAM" ? input.accessProgramId : null,
    isPublished: input.isPublished,
  };

  const updated = await prisma.document.update({
    where: { id },
    data,
    select: { id: true, title: true },
  });

  await logAdminAction({
    actorId: user.id,
    action: "document.updated",
    targetType: "document",
    targetId: updated.id,
    details: { title: updated.title },
  });

  invalidateLibraryOverview();
  invalidateDashboardStats();

  return updated;
}

export async function deleteDocument(id: string, currentUser = requireCurrentUser) {
  const user = await currentUser();
  if (!user) throw new AppError("UNAUTHORIZED", "Vous devez être connecté.", 401);
  assertAdmin(user);

  const document = await prisma.document.findUnique({
    where: { id },
    select: { id: true, title: true, storagePath: true, storageBucket: true },
  });
  if (!document) throw new AppError("DOCUMENT_NOT_FOUND", "Document introuvable.", 404);

  // Suppression du fichier physique d'abord, puis des métadonnées. L'objet
  // Storage est retiré en premier car une telle suppression est irréversible,
  // alors qu'une ligne Prisma peut être retentée ultérieurement.
  await prisma.document.delete({ where: { id } });
  thumbnailStoragePath(document.id)
  
  await logAdminAction({
    actorId: user.id,
    action: "document.deleted",
    targetType: "document",
    targetId: document.id,
    details: { title: document.title },
  });

  invalidateLibraryOverview();
  invalidateDashboardStats();

  return { id: document.id };
}

export async function getDocumentSignedUrl(id: string, currentUser = requireCurrentUser) {
  const document = await requireAccessibleDocument(id, currentUser);
  const url = await storageService.createSignedUrl(document.storagePath, 300, document.storageBucket);
  return { id: document.id, signedUrl: url };
}
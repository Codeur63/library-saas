import "server-only";

import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { assertCanUseLibrary, requireLibraryUser } from "@/server/current-user";
import type { FavoriteQueryInput } from "@/server/dto";
import { canAccessDocument } from "@/server/access-control";
import { invalidateDashboardStats } from "@/server/cache";
import {
  getDocumentById,
  DOCUMENT_SELECT,
  serializeDocument,
} from "@/server/services/documents.service";
import type { FavoriteListItem, Paginated } from "@/types/library";

export async function listFavorites(
  query: FavoriteQueryInput,
  currentUser = requireLibraryUser
): Promise<Paginated<FavoriteListItem>> {
  const user = await currentUser();
  if (!user) throw new AppError("UNAUTHORIZED", "Vous devez être connecté.", 401);
  assertCanUseLibrary(user);

  const page = query.page;
  const pageSize = query.pageSize;

  const [items, total] = await Promise.all([
    prisma.favorite.findMany({
      where: { userId: user.id },
      select: {
        createdAt: true,
        document: { select: DOCUMENT_SELECT },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.favorite.count({ where: { userId: user.id } }),
  ]);

  return {
    items: items.map((item) => ({
      addedAt: item.createdAt,
      document: serializeDocument(item.document),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function addFavorite(documentId: string, currentUser = requireLibraryUser) {
  const user = await currentUser();
  if (!user) throw new AppError("UNAUTHORIZED", "Vous devez être connecté.", 401);
  assertCanUseLibrary(user);

  const document = await getDocumentById(documentId);
  if (!document) throw new AppError("DOCUMENT_NOT_FOUND", "Document introuvable.", 404);

  if (!canAccessDocument(user, document)) {
    throw new AppError("PROGRAM_ACCESS_DENIED", "Ce document ne fait pas partie de votre accès.", 403);
  }

  await prisma.favorite.upsert({
    where: { userId_documentId: { userId: user.id, documentId } },
    create: { userId: user.id, documentId },
    update: {},
  });

  invalidateDashboardStats();

  return { documentId };
}

export async function removeFavorite(documentId: string, currentUser = requireLibraryUser) {
  const user = await currentUser();
  if (!user) throw new AppError("UNAUTHORIZED", "Vous devez être connecté.", 401);
  assertCanUseLibrary(user);

  await prisma.favorite.deleteMany({
    where: { userId: user.id, documentId },
  });

  invalidateDashboardStats();

  return { documentId };
}

export async function getFavoriteIds(currentUser = requireLibraryUser): Promise<string[]> {
  const user = await currentUser();
  if (!user) throw new AppError("UNAUTHORIZED", "Vous devez être connecté.", 401);
  assertCanUseLibrary(user);

  const rows = await prisma.favorite.findMany({
    where: { userId: user.id },
    select: { documentId: true },
  });
  return rows.map((row) => row.documentId);
}
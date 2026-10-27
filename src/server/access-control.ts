import type { Prisma } from "@generated/prisma/client";

import type { DocumentQueryInput } from "@/server/dto";
import type { DocumentVisibility } from "@/types/library";

/**
 * Règles de visibilité des documents, partagées par tous les services.
 *
 * Cette logique est le miroir TypeScript de la fonction SQL
 * `private.can_access_document` (RLS). Un test de parité
 * (`access-control.test.ts`) garantit que les deux implémentations restent
 * alignées.
 *
 * Seule exception assumée : ADMIN / SUPERADMIN bénéficient d'un accès élevé
 * (brouillons et documents d'autres filières) pour la gestion, alors que la
 * RLS n'accorde rien de plus à un administrateur.
 */

export type DocumentRole = "STUDENT" | "ADMIN" | "SUPERADMIN";
export type DocumentAccountStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface DocumentViewer {
  role: DocumentRole;
  programId: string | null;
  status: DocumentAccountStatus;
  mustChangePassword: boolean;
}

export interface DocumentAccessInfo {
  isPublished: boolean;
  visibility: DocumentVisibility;
  accessProgram: { id: string } | null;
}

/**
 * Visiteur non authentifié : compte actif fictif sans filière.
 * Il ne peut lire que les documents publiés en visibilité GLOBAL.
 */
export const PUBLIC_VIEWER: DocumentViewer = {
  role: "STUDENT",
  programId: null,
  status: "ACTIVE",
  mustChangePassword: false,
};

function isAdmin(viewer: Pick<DocumentViewer, "role">): boolean {
  return viewer.role === "ADMIN" || viewer.role === "SUPERADMIN";
}

/**
 * Un utilisateur peut-il lire ce document ?
 * Reprend la logique de `private.can_access_document` (compte actif, mot de
 * passe changé, document publié, GLOBAL ou de sa filière), avec l'accès élevé
 * des administrateurs.
 */
export function canAccessDocument(
  viewer: DocumentViewer,
  document: DocumentAccessInfo
): boolean {
  if (viewer.status !== "ACTIVE" || viewer.mustChangePassword) return false;
  if (!document.isPublished) return isAdmin(viewer);
  if (document.visibility === "GLOBAL") return true;
  if (viewer.programId === null) return isAdmin(viewer);
  return isAdmin(viewer) || document.accessProgram?.id === viewer.programId;
}

export type DocumentWhereFilters = Pick<
  DocumentQueryInput,
  "q" | "programId" | "levelId" | "subjectId" | "categoryId" | "academicYearId"
>;

/**
 * Source unique de vérité pour les filtres ET les restrictions de visibilité
 * d'un document (mêmes règles que la RLS). Utilisé par listDocuments et par les
 * agrégats de la vue d'ensemble — évite toute divergence de sécurité.
 */
export function buildDocumentsWhere(
  query: DocumentWhereFilters,
  viewer: Pick<DocumentViewer, "role" | "programId">
): Prisma.DocumentWhereInput {
  const admin = isAdmin(viewer);
  const searchTerm = query.q?.trim();

  const conditions: Prisma.DocumentWhereInput[] = [];

  // Un visiteur non authentifié (ou un étudiant sans filière) ne voit que les
  // documents publiés GLOBAL ; un étudiant voit en plus ceux de sa filière.
  if (!admin) {
    const visibilityConditions: Prisma.DocumentWhereInput[] = [{ visibility: "GLOBAL" }];
    if (viewer.programId !== null) {
      visibilityConditions.push({
        AND: [{ visibility: "PROGRAM" }, { accessProgramId: viewer.programId }],
      });
    }
    conditions.push({ isPublished: true });
    conditions.push({ OR: visibilityConditions });
  }

  // Recherche (titre, description, matière, nom de fichier).
  if (searchTerm) {
    conditions.push({
      OR: [
        { title: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
        { subject: { name: { contains: searchTerm, mode: "insensitive" } } },
        { originalFileName: { contains: searchTerm, mode: "insensitive" } },
      ],
    });
  }

  const where: Prisma.DocumentWhereInput = {
    ...(conditions.length ? { AND: conditions } : {}),
    ...(query.subjectId ? { subjectId: query.subjectId } : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.academicYearId ? { academicYearId: query.academicYearId } : {}),
  };

  if (query.programId || query.levelId) {
    where.subject = {
      is: {
        ...(query.programId ? { programId: query.programId } : {}),
        ...(query.levelId ? { levelId: query.levelId } : {}),
      },
    };
  }

  return where;
}

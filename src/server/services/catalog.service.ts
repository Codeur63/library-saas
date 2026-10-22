import "server-only";

import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { assertCanUseLibrary, requireLibraryUser } from "@/server/current-user";
import { REFERENCE_CATALOG_TAG } from "@/server/cache-tags";
import { cached } from "@/server/cache";

/**
 * Lecture de la donnée de référence (globale, identique pour tous les
 * utilisateurs). Mise en cache Next (1 h) : les filtres/formulaires ne
 * refrappent plus la base à chaque requête.
 */
async function readCatalog() {
  const [faculties, programs, levels, subjects, categories, academicYears] = await Promise.all([
    prisma.faculty.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true }, orderBy: { name: "asc" } }),
    prisma.program.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true, facultyId: true }, orderBy: { name: "asc" } }),
    prisma.academicLevel.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true }, orderBy: { sortOrder: "asc" } }),
    prisma.subject.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true, programId: true, levelId: true, optionId: true },
      orderBy: { name: "asc" },
    }),
    prisma.documentCategory.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.academicYear.findMany({ select: { id: true, label: true, isCurrent: true }, orderBy: { startDate: "desc" } }),
  ]);

  return {
    faculties,
    programs,
    levels,
    subjects,
    categories,
    academicYears,
  };
}

const getCachedCatalog = cached(readCatalog, ["reference-catalog"], {
  revalidate: 3600,
  tags: [REFERENCE_CATALOG_TAG],
});

/**
 * Données de référence pour les filtres et formulaires.
 * Lecture seule, disponible pour tout utilisateur de la bibliothèque (RLS).
 */
export async function getCatalog(currentUser = requireLibraryUser) {
  const user = await currentUser();
  if (!user) throw new AppError("UNAUTHORIZED", "Vous devez être connecté.", 401);
  assertCanUseLibrary(user);

  return getCachedCatalog();
}

export async function getStudentCatalog(currentUser = requireLibraryUser) {
  const user = await currentUser();
  if (!user) throw new AppError("UNAUTHORIZED", "Vous devez être connecté.", 401);
  assertCanUseLibrary(user);

  const [faculties, programs, levels, options] = await Promise.all([
    prisma.faculty.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true }, orderBy: { name: "asc" } }),
    prisma.program.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true, facultyId: true }, orderBy: { name: "asc" } }),
    prisma.academicLevel.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true }, orderBy: { sortOrder: "asc" } }),
    prisma.programOption.findMany({
      where: { isActive: true },
      select: { id: true, name: true, programId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { faculties, programs, levels, options };
}
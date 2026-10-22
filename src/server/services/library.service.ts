import "server-only";

import { prisma } from "@/lib/prisma";
import { assertCanUseLibrary, requireCurrentUser } from "@/server/current-user";
import { buildDocumentsWhere } from "@/server/access-control";
import { LIBRARY_OVERVIEW_TAG } from "@/server/cache-tags";
import { cached } from "@/server/cache";
import { listDocuments } from "@/server/services/documents.service";
import { getCatalog } from "@/server/services/catalog.service";
import type { CurrentUser } from "@/server/current-user";
import type { LibraryOverview, LibraryOverviewProgram } from "@/types/library";

/**
 * Agrégats de répartition (catégorie/matière) partagés par tous les
 * utilisateurs ayant la même visibilité (rôle + filière). Mis en cache 5 min :
 * indépendants du chargement des documents.
 */
const loadOverviewAggregates = cached(
  async (role: CurrentUser["role"], programId: string | null) => {
    const where = buildDocumentsWhere({}, { role, programId });
    const [categoryGroups, subjectGroups] = await Promise.all([
      prisma.document.groupBy({ by: ["categoryId"], where, _count: { _all: true } }),
      prisma.document.groupBy({ by: ["subjectId"], where, _count: { _all: true } }),
    ]);
    return { categoryGroups, subjectGroups };
  },
  ["library-overview-aggregates"],
  { revalidate: 300, tags: [LIBRARY_OVERVIEW_TAG] }
);

/**
 * Vue d'ensemble publique de la bibliothèque (documents accessibles à
 * l'utilisateur connecté) : totaux, derniers ajouts, répartition par
 * catégorie/matière/filière.
 *
 * Les compteurs sont calculés par agrégats SQL (groupBy, mémoïsés) et non en
 * chargeant tous les documents en mémoire.
 */
export async function getLibraryOverview(
  currentUser = requireCurrentUser
): Promise<LibraryOverview> {
  const user = await currentUser();
  assertCanUseLibrary(user);

  const asUser = () => Promise.resolve(user);

  const [recentPage, catalog, { categoryGroups, subjectGroups }] = await Promise.all([
    listDocuments({ page: 1, pageSize: 5, sort: "newest" }, asUser),
    getCatalog(asUser),
    loadOverviewAggregates(user.role, user.programId),
  ]);

  const categoryCounts = new Map(categoryGroups.map((group) => [group.categoryId, group._count._all]));
  const subjectCounts = new Map(subjectGroups.map((group) => [group.subjectId, group._count._all]));
  const subjectById = new Map(catalog.subjects.map((subject) => [subject.id, subject]));

  const programCounts = new Map<string, number>();
  const programSubjects = new Map<string, Set<string>>();

  for (const [subjectId, count] of Array.from(subjectCounts.entries())) {
    const subject = subjectById.get(subjectId);
    if (!subject) continue;
    programCounts.set(subject.programId, (programCounts.get(subject.programId) ?? 0) + count);
    const names = programSubjects.get(subject.programId) ?? new Set<string>();
    names.add(subject.name);
    programSubjects.set(subject.programId, names);
  }

  const categories = catalog.categories
    .map((category) => ({
      id: category.id,
      name: category.name,
      code: category.code,
      count: categoryCounts.get(category.id) ?? 0,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "fr"));

  const topSubjects = Array.from(subjectCounts.entries())
    .map(([id, count]) => ({ id, name: subjectById.get(id)?.name ?? "Matière", count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "fr"));

  const programs: LibraryOverviewProgram[] = catalog.programs
    .map((program) => ({
      id: program.id,
      name: program.name,
      code: program.code,
      description: null,
      count: programCounts.get(program.id) ?? 0,
      subjectNames: Array.from(programSubjects.get(program.id) ?? []).sort((a, b) =>
        a.localeCompare(b, "fr")
      ),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "fr"));

  return {
    totals: {
      documents: recentPage.total,
      programs: programs.filter((program) => program.count > 0).length,
      subjects: subjectCounts.size,
      categories: categories.filter((category) => category.count > 0).length,
    },
    recentDocuments: recentPage.items,
    categories,
    topSubjects,
    programs,
  };
}

import "server-only";

import { prisma } from "@/lib/prisma";
import { assertAdmin, requireCurrentUser, type CurrentUser } from "@/server/current-user";
import { DASHBOARD_STATS_TAG } from "@/server/cache-tags";
import { cached } from "@/server/cache";

export interface LabeledCount {
  label: string;
  count: number;
}

export interface DashboardStats {
  documents: {
    total: number;
    published: number;
    drafts: number;
    downloads: number;
  };
  students: {
    total: number;
    active: number;
    suspended: number;
    inactive: number;
  };
  favorites: number;
  catalog: {
    faculties: number;
    programs: number;
    subjects: number;
    categories: number;
  };
  documentsByCategory: LabeledCount[];
  documentsByProgram: LabeledCount[];
  topDocuments: { id: string; title: string; downloadCount: number }[];
  recentDocuments: {
    id: string;
    title: string;
    categoryName: string | null;
    createdAt: string;
  }[];
  recentStudents: {
    id: string;
    fullName: string;
    matricule: string;
    programName: string | null;
    createdAt: string;
  }[];
  recentActivity: {
    id: string;
    action: string;
    targetType: string | null;
    actorName: string;
    createdAt: string;
  }[];
}

/**
 * Agrégats consolidés du tableau de bord, mémoïsés 60 s.
 *
 * Les statistiques sont globales (indépendantes de l'identité) : le cache ne
 * contient donc aucune donnée personnelle. L'autorisation reste vérifiée à
 * chaque appel, AVANT de lire le cache. Les dates sont sérialisées en ISO car
 * `unstable_cache` passe par une sérialisation JSON.
 */
const loadDashboardStats = cached(
  async (): Promise<DashboardStats> => {
    const [
      documentTotal,
      documentPublished,
      downloadAggregate,
      favoriteTotal,
      facultyTotal,
      programTotal,
      subjectTotal,
      categoryTotal,
      statusGroups,
      categories,
      categoryGroups,
      documentsByProgram,
      topDocuments,
      recentDocuments,
      recentStudents,
      recentActivity,
    ] = await Promise.all([
      prisma.document.count(),
      prisma.document.count({ where: { isPublished: true } }),
      prisma.document.aggregate({ _sum: { downloadCount: true } }),
      prisma.favorite.count(),
      prisma.faculty.count(),
      prisma.program.count(),
      prisma.subject.count(),
      prisma.documentCategory.count(),
      prisma.profile.groupBy({
        by: ["status"],
        where: { role: "STUDENT" },
        _count: { _all: true },
      }),
      prisma.documentCategory.findMany({ select: { id: true, name: true } }),
      prisma.document.groupBy({ by: ["categoryId"], _count: { _all: true } }),
      prisma.$queryRaw<{ label: string; count: number }[]>`
        SELECT p.name AS label, COUNT(d.id)::int AS count
        FROM public.documents d
        JOIN public.subjects s ON s.id = d.subject_id
        JOIN public.programs p ON p.id = s.program_id
        GROUP BY p.name
        ORDER BY count DESC, p.name ASC
        LIMIT 8
      `,
      prisma.document.findMany({
        orderBy: { downloadCount: "desc" },
        take: 5,
        select: { id: true, title: true, downloadCount: true },
      }),
      prisma.document.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          title: true,
          createdAt: true,
          category: { select: { name: true } },
        },
      }),
      prisma.profile.findMany({
        where: { role: "STUDENT" },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          matricule: true,
          createdAt: true,
          program: { select: { name: true } },
        },
      }),
      prisma.adminActionLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          action: true,
          targetType: true,
          createdAt: true,
          actor: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    const categoryName = new Map(categories.map((category) => [category.id, category.name]));
    const documentsByCategory = categoryGroups
      .map((group) => ({
        label: categoryName.get(group.categoryId) ?? "Non classé",
        count: group._count._all,
      }))
      .sort((a, b) => b.count - a.count);

    const statusCount = new Map(statusGroups.map((group) => [group.status, group._count._all]));
    const active = statusCount.get("ACTIVE") ?? 0;
    const suspended = statusCount.get("SUSPENDED") ?? 0;
    const inactive = statusCount.get("INACTIVE") ?? 0;

    return {
      documents: {
        total: documentTotal,
        published: documentPublished,
        drafts: documentTotal - documentPublished,
        downloads: downloadAggregate._sum.downloadCount ?? 0,
      },
      students: {
        total: active + suspended + inactive,
        active,
        suspended,
        inactive,
      },
      favorites: favoriteTotal,
      catalog: {
        faculties: facultyTotal,
        programs: programTotal,
        subjects: subjectTotal,
        categories: categoryTotal,
      },
      documentsByCategory,
      documentsByProgram: documentsByProgram.map((row) => ({
        label: row.label,
        count: Number(row.count),
      })),
      topDocuments,
      recentDocuments: recentDocuments.map((document) => ({
        id: document.id,
        title: document.title,
        categoryName: document.category?.name ?? null,
        createdAt: document.createdAt.toISOString(),
      })),
      recentStudents: recentStudents.map((student) => ({
        id: student.id,
        fullName: `${student.firstName} ${student.lastName}`,
        matricule: student.matricule,
        programName: student.program?.name ?? null,
        createdAt: student.createdAt.toISOString(),
      })),
      recentActivity: recentActivity.map((entry) => ({
        id: entry.id,
        action: entry.action,
        targetType: entry.targetType,
        actorName: `${entry.actor.firstName} ${entry.actor.lastName}`,
        createdAt: entry.createdAt.toISOString(),
      })),
    };
  },
  ["dashboard-stats"],
  { revalidate: 60, tags: [DASHBOARD_STATS_TAG] }
);

/**
 * Agrégats consolidés pour le tableau de bord administrateur.
 * Réservé aux ADMIN / SUPERADMIN.
 */
export async function getDashboardStats(
  currentUser: () => Promise<CurrentUser> = requireCurrentUser
): Promise<DashboardStats> {
  const actor = await currentUser();
  assertAdmin(actor);

  return loadDashboardStats();
}

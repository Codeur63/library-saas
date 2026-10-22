import type { MetadataRoute } from "next";

import { ROUTES } from "@/constants/routes";
import { SITE_URL } from "@/constants/site";
import { documentRoute } from "@/constants/routes";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}${ROUTES.home}`, changeFrequency: "weekly" },
    { url: `${SITE_URL}${ROUTES.bibliotheque}`, changeFrequency: "weekly" },
    { url: `${SITE_URL}${ROUTES.filieres}`, changeFrequency: "weekly" },
  ];

  try {
    const documents = await prisma.document.findMany({
      where: { isPublished: true, visibility: "GLOBAL" },
      select: { id: true, updatedAt: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return [
      ...staticRoutes,
      ...documents.map((document) => ({
        url: `${SITE_URL}${documentRoute(document.id)}`,
        lastModified: document.updatedAt,
        changeFrequency: "monthly" as const,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}

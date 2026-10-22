import { redirect } from "next/navigation";
import type { Metadata } from "next";

import Breadcrumb from "@/components/layout/breadcrumb";
import { ROUTES } from "@/constants/routes";
import { LIBRARY_PAGE_SIZE } from "@/constants/library";
import Library from "@/features/library/components/library";
import { buildFilterOptions } from "@/features/library/lib/options";
import { parseLibrarySearchParams } from "@/features/library/lib/url";
import { getCurrentUser } from "@/server/current-user";
import { getCatalog } from "@/server/services/catalog.service";
import { listDocuments } from "@/server/services/documents.service";
import type { DocumentQueryInput } from "@/server/dto";

interface BibliothequePageProps {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}

export const metadata: Metadata = {
  title: "Bibliothèque — Upac Library",
  description:
    "Recherchez, filtrez et téléchargez les documents académiques (cours, TD, examens, mémoires) de toutes les filières de l'UPAC.",
};

export default async function BibliothequePage({ searchParams }: BibliothequePageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`${ROUTES.login}?next=${encodeURIComponent(ROUTES.bibliotheque)}`);
  }

  const initial = parseLibrarySearchParams(await searchParams);
  const query: DocumentQueryInput = {
    q: initial.query || undefined,
    programId: initial.filters.programId || undefined,
    levelId: initial.filters.levelId || undefined,
    subjectId: initial.filters.subjectId || undefined,
    categoryId: initial.filters.categoryId || undefined,
    sort: initial.sort,
    page: initial.page,
    pageSize: LIBRARY_PAGE_SIZE,
  };

  const [page, catalog] = await Promise.all([listDocuments(query), getCatalog()]);

  return (
    <div className="pb-8">
      <div className="mx-auto w-full max-w-[1280px] px-4 pt-8 sm:px-6">
        <Breadcrumb
          items={[{ label: "Accueil", href: ROUTES.home }, { label: "Bibliothèque" }]}
        />
      </div>
      <Library
        results={page.items}
        total={page.total}
        page={page.page}
        totalPages={page.totalPages}
        options={buildFilterOptions(catalog)}
        initial={initial}
      />
    </div>
  );
}

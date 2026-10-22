"use client";

import { LayoutGrid, List } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import EmptyState from "@/components/feedback/empty-state";
import DocumentCard from "@/features/documents/components/document-card";
import DocumentRow from "@/features/documents/components/document-row";
import UploadsList from "@/features/uploads/components/uploads-list";
import FilterBar from "@/features/library/components/filter-bar";
import Pagination from "@/features/library/components/pagination";
import SearchBar from "@/features/library/components/search-bar";
import SortSelect from "@/features/library/components/sort-select";
import { useUpdateLibraryParams } from "@/features/library/hooks/use-update-library-params";
import { buildLibraryQuery, type ParsedLibraryParams } from "@/features/library/lib/url";
import { cn } from "@/lib/utils";
import type { FilterState, LibraryFilterKey } from "@/features/library/types";
import type { LibraryDocument, LibraryFilterOptions } from "@/types/library";

const QUERY_DEBOUNCE_MS = 300;
const VIEW_MODE_KEY = "upac:view-mode";
type ViewMode = "list" | "grid";

interface LibraryProps {
  results: LibraryDocument[];
  total: number;
  page: number;
  totalPages: number;
  options: LibraryFilterOptions;
  initial: ParsedLibraryParams;
}

export default function Library({
  results,
  total,
  page,
  totalPages,
  options,
  initial,
}: LibraryProps) {
  const router = useRouter();
  const updateParams = useUpdateLibraryParams();

  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "list";
    try {
      return window.localStorage.getItem(VIEW_MODE_KEY) === "grid" ? "grid" : "list";
    } catch {
      return "list";
    }
  });
  const [draftQuery, setDraftQuery] = useState(initial.query);
  const pendingQueryRef = useRef<string | null>(null);
  const queryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (pendingQueryRef.current !== null) return;
    if (initial.query !== draftQuery) {
      setDraftQuery(initial.query);
    }
  }, [initial.query]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (queryTimerRef.current) clearTimeout(queryTimerRef.current);
    };
  }, []);

  const subjectOptions = useMemo(
    () =>
      options.subjects.filter(
        (subject) =>
          (!initial.filters.programId || subject.programId === initial.filters.programId) &&
          (!initial.filters.levelId || subject.levelId === initial.filters.levelId)
      ),
    [options.subjects, initial.filters.programId, initial.filters.levelId]
  );

  const handleQueryChange = (value: string) => {
    setDraftQuery(value);
    pendingQueryRef.current = value;
    if (queryTimerRef.current) clearTimeout(queryTimerRef.current);
    queryTimerRef.current = setTimeout(() => {
      const next = pendingQueryRef.current;
      pendingQueryRef.current = null;
      if (next !== null) {
        updateParams({ q: next || undefined, page: undefined });
      }
    }, QUERY_DEBOUNCE_MS);
  };

  const handleFilterChange = (next: FilterState) => {
    const updates: Record<string, string | undefined> = { page: undefined };
    (Object.keys(next) as LibraryFilterKey[]).forEach((key) => {
      updates[key] = next[key] || undefined;
    });
    updateParams(updates);
  };

  const handleSortChange = (value: LibraryProps["initial"]["sort"]) => {
    updateParams({ sort: value === "newest" ? undefined : value, page: undefined });
  };

  const handleViewChange = (next: ViewMode) => {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_MODE_KEY, next);
    } catch {
      // stockage indisponible : préférence non persistée
    }
  };

  // Stable : évite de recalculer (et donc de re-rendre) la liste des documents
  // à chaque frappe dans le champ de recherche.
  const resetAll = useCallback(() => {
    if (queryTimerRef.current) clearTimeout(queryTimerRef.current);
    pendingQueryRef.current = null;
    setDraftQuery("");
    router.replace(ROUTES.bibliotheque, { scroll: false });
  }, [router]);

  // Mémoïsé sur `results`/`view` uniquement : les frappes de recherche ne
  // re-rendent que le haut du composant, pas les dizaines de lignes/cartes.
  const resultsList = useMemo(() => {
    if (results.length === 0) return <EmptyState onReset={resetAll} />;
    if (view === "grid") {
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
          ))}
        </div>
      );
    }
    return (
      <div>
        {results.map((doc) => (
          <DocumentRow key={doc.id} document={doc} />
        ))}
      </div>
    );
  }, [results, view, resetAll]);

  const hasActivity = Boolean(initial.query || Object.values(initial.filters).some(Boolean));
  const countLabel = `${total} ${total > 1 ? "documents" : "document"}`;
  const hrefFor = (targetPage: number) =>
    `${ROUTES.bibliotheque}${buildLibraryQuery({ ...initial, page: targetPage })}`;

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6">
      <section className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Bibliothèque</h1>
          <p className="max-w-[65ch] text-base text-text-secondary">
            Accédez aux cours, travaux dirigés, examens et mémoires publiés par les filières de
            l’Université Protestante d’Afrique Centrale.
          </p>
        </header>

        <FilterBar
          filters={initial.filters}
          onChange={handleFilterChange}
          options={{ ...options, subjects: subjectOptions }}
          leading={<SearchBar value={draftQuery} onChange={handleQueryChange} />}
        />

        <UploadsList />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-baseline gap-4">
            <p className="text-sm text-text-muted" role="status" aria-live="polite">
              {hasActivity ? `${countLabel} trouvé${total > 1 ? "s" : ""}` : countLabel}
            </p>
            {hasActivity && (
              <button
                type="button"
                onClick={resetAll}
                className="text-xs font-medium text-text-muted underline-offset-4 hover:text-foreground hover:underline"
              >
                Tout réinitialiser
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center rounded-md border border-border bg-white p-0.5"
              role="group"
              aria-label="Mode d'affichage"
            >
              <button
                type="button"
                onClick={() => handleViewChange("list")}
                aria-pressed={view === "list"}
                title="Vue liste"
                className={cn(
                  "inline-flex h-8 w-9 items-center justify-center rounded-md text-text-muted transition-colors",
                  view === "list" ? "bg-surface text-foreground" : "hover:bg-surface hover:text-foreground"
                )}
              >
                <List size={16} aria-hidden />
                <span className="sr-only">Vue liste</span>
              </button>
              <button
                type="button"
                onClick={() => handleViewChange("grid")}
                aria-pressed={view === "grid"}
                title="Vue grille"
                className={cn(
                  "inline-flex h-8 w-9 items-center justify-center rounded-md text-text-muted transition-colors",
                  view === "grid" ? "bg-surface text-foreground" : "hover:bg-surface hover:text-foreground"
                )}
              >
                <LayoutGrid size={16} aria-hidden />
                <span className="sr-only">Vue grille</span>
              </button>
            </div>
            <SortSelect value={initial.sort} onChange={handleSortChange} />
          </div>
        </div>

        {resultsList}

        <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
      </section>
    </div>
  );
}

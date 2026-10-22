import { isSortValue, type SortValue } from "@/constants/library";
import type { FilterState } from "@/features/library/types";

export interface ParsedLibraryParams {
  query: string;
  filters: FilterState;
  sort: SortValue;
  page: number;
}

type RawParams = {
  [key: string]: string | string[] | undefined;
};

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export function parseLibrarySearchParams(params: RawParams): ParsedLibraryParams {
  const page = Math.max(1, Number.parseInt(firstValue(params.page), 10) || 1);
  const sortRaw = firstValue(params.sort);

  return {
    query: firstValue(params.q).trim(),
    filters: {
      programId: firstValue(params.programId),
      levelId: firstValue(params.levelId),
      subjectId: firstValue(params.subjectId),
      categoryId: firstValue(params.categoryId),
    },
    sort: isSortValue(sortRaw) ? sortRaw : "newest",
    page,
  };
}

interface LibraryUrlValues {
  query: string;
  filters: FilterState;
  sort: SortValue;
  page: number;
}

export function buildLibraryQuery(values: LibraryUrlValues): string {
  const filters = values.filters;
  const params: Record<string, string | undefined> = {
    q: values.query || undefined,
    programId: filters.programId || undefined,
    levelId: filters.levelId || undefined,
    subjectId: filters.subjectId || undefined,
    categoryId: filters.categoryId || undefined,
    sort: values.sort === "newest" ? undefined : values.sort,
    page: values.page > 1 ? String(values.page) : undefined,
  };
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

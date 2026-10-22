import type { LibraryFilterOptions } from "@/types/library";

interface CatalogLike {
  programs: { id: string; name: string }[];
  levels: { id: string; code: string; name?: string }[];
  subjects: { id: string; name: string; programId: string; levelId: string }[];
  categories: { id: string; name: string }[];
}

export function buildFilterOptions(catalog: CatalogLike): LibraryFilterOptions {
  return {
    programs: catalog.programs.map((program) => ({ value: program.id, label: program.name })),
    levels: catalog.levels.map((level) => ({ value: level.id, label: level.code })),
    subjects: catalog.subjects.map((subject) => ({
      value: subject.id,
      label: subject.name,
      programId: subject.programId,
      levelId: subject.levelId,
    })),
    categories: catalog.categories.map((category) => ({ value: category.id, label: category.name })),
  };
}

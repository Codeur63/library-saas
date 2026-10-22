export interface FilterState {
  programId: string;
  levelId: string;
  subjectId: string;
  categoryId: string;
}

export type LibraryFilterKey = keyof FilterState;

export const EMPTY_FILTERS: FilterState = {
  programId: "",
  levelId: "",
  subjectId: "",
  categoryId: "",
};

export const FILTER_LABELS: Record<LibraryFilterKey, string> = {
  programId: "Filière",
  levelId: "Niveau",
  subjectId: "Matière",
  categoryId: "Type",
};

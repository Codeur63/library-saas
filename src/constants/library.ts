export const LIBRARY_PAGE_SIZE = 12;

export type SortValue =
  | "newest"
  | "oldest"
  | "title-asc"
  | "title-desc"
  | "most-downloaded";

export const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: "newest", label: "Plus récents" },
  { value: "oldest", label: "Plus anciens" },
  { value: "title-asc", label: "Titre A → Z" },
  { value: "title-desc", label: "Titre Z → A" },
  { value: "most-downloaded", label: "Plus téléchargés" },
];

export const DEFAULT_SORT: SortValue = "newest";

export function isSortValue(value: string): value is SortValue {
  return SORT_OPTIONS.some((option) => option.value === value);
}

"use client";

import { RotateCcw } from "lucide-react";

import { SelectFilter } from "@/features/library/components/select-filter";
import { EMPTY_FILTERS, FILTER_LABELS, type FilterState, type LibraryFilterKey } from "@/features/library/types";
import type { LibraryFilterOptions } from "@/types/library";

interface FilterBarProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  leading?: React.ReactNode;
  options: LibraryFilterOptions;
}

export default function FilterBar({ filters, onChange, leading, options }: FilterBarProps) {
  const hasActiveFilters = Object.values(filters).some(Boolean);

  const update = (key: LibraryFilterKey, value: string) => {
    const next: FilterState = { ...filters, [key]: value };
    if (key === "programId" || key === "levelId") next.subjectId = "";
    onChange(next);
  };

  const labelFor = (key: LibraryFilterKey, value: string): string => {
    const list =
      key === "programId"
        ? options.programs
        : key === "levelId"
          ? options.levels
          : key === "subjectId"
            ? options.subjects
            : options.categories;
    return list.find((option) => option.value === value)?.label ?? value;
  };

  const activeFilters = (Object.entries(filters) as [LibraryFilterKey, string][]).filter(
    ([, value]) => value
  );

  return (
    <form id="filtres" className="space-y-4" onSubmit={(event) => event.preventDefault()}>
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1.6fr_repeat(4,1fr)]">
        {leading}
        <SelectFilter
          label="Filière"
          value={filters.programId}
          options={options.programs}
          allLabel="Toutes"
          onChange={(value) => update("programId", value)}
        />
        <SelectFilter
          label="Niveau"
          value={filters.levelId}
          options={options.levels}
          onChange={(value) => update("levelId", value)}
        />
        <SelectFilter
          label="Matière"
          value={filters.subjectId}
          options={options.subjects}
          onChange={(value) => update("subjectId", value)}
        />
        <SelectFilter
          label="Type"
          value={filters.categoryId}
          options={options.categories}
          onChange={(value) => update("categoryId", value)}
        />
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-xs text-text-muted" role="status" aria-live="polite">
            Filtres actifs :{" "}
            {activeFilters
              .map(([key, value]) => `${FILTER_LABELS[key]} : ${labelFor(key, value)}`)
              .join(" · ")}
          </p>
          <button
            type="button"
            onClick={() => onChange({ ...EMPTY_FILTERS })}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground underline-offset-4 hover:underline"
          >
            <RotateCcw size={13} aria-hidden />
            Réinitialiser
          </button>
        </div>
      )}
    </form>
  );
}

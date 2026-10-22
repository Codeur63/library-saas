"use client";

import { ChevronDown } from "lucide-react";
import { useId } from "react";

import type { LibraryOption } from "@/types/library";

interface SelectFilterProps {
  label: string;
  value: string;
  options: LibraryOption[];
  allLabel?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export function SelectFilter({
  label,
  value,
  options,
  allLabel = "Tous",
  disabled = false,
  onChange,
}: SelectFilterProps) {
  const autoId = useId();

  return (
    <div className="w-full">
      <label
        htmlFor={`${autoId}-${label}`}
        className="mb-1 block text-xs font-medium text-text-secondary"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={`${autoId}-${label}`}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full appearance-none rounded-md border border-border-strong bg-white pr-9 pl-3 text-sm text-foreground transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:bg-surface disabled:text-text-muted"
        >
          <option value="">{allLabel}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
        />
      </div>
    </div>
  );
}

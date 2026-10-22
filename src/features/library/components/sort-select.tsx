"use client";

import { ChevronDown } from "lucide-react";
import { useId } from "react";

import { SORT_OPTIONS, type SortValue } from "@/constants/library";

interface SortSelectProps {
  value: SortValue;
  onChange: (value: SortValue) => void;
}

export default function SortSelect({ value, onChange }: SortSelectProps) {
  const autoId = useId();

  return (
    <div className="w-full sm:w-52">
      <label
        htmlFor={`${autoId}-sort`}
        className="mb-1 block text-xs font-medium text-text-secondary"
      >
        Trier
      </label>
      <div className="relative">
        <select
          id={`${autoId}-sort`}
          value={value}
          onChange={(event) => onChange(event.target.value as SortValue)}
          className="h-10 w-full appearance-none rounded-md border border-border-strong bg-white pr-9 pl-3 text-sm text-foreground transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {SORT_OPTIONS.map((option) => (
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
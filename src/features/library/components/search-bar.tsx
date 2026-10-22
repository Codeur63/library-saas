"use client";

import { Search } from "lucide-react";
import { useId } from "react";

import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = "Cours, TD, examen, mémoire…",
  label = "Recherche",
  className,
}: SearchBarProps) {
  const autoId = useId();

  return (
    <div className={cn("w-full", className)}>
      <label
        htmlFor={`${autoId}-search`}
        className="mb-1 block text-xs font-medium text-text-secondary"
      >
        {label}
      </label>
      <div className="relative">
        <Search
          size={16}
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <input
          id={`${autoId}-search`}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-10 w-full appearance-none rounded-md border border-border-strong bg-white pr-9 pl-9 text-sm text-foreground transition-colors placeholder:text-muted-foreground/60 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        />
      </div>
    </div>
  );
}
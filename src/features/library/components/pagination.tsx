import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}

function PageLink({
  href,
  label,
  disabled,
  children,
}: {
  href: string;
  label: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-text-muted sm:w-auto sm:gap-1.5 sm:px-4"
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-md border border-border-strong bg-white text-foreground transition-colors hover:bg-surface sm:w-auto sm:gap-1.5 sm:px-4"
      )}
    >
      {children}
    </Link>
  );
}

export default function Pagination({ page, totalPages, hrefFor }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-between gap-4">
      <PageLink href={hrefFor(page - 1)} label="Page précédente" disabled={page <= 1}>
        <ChevronLeft size={16} aria-hidden />
        <span className="hidden sm:inline">Précédent</span>
      </PageLink>
      <p className="text-sm text-text-muted" role="status" aria-live="polite">
        Page {page} sur {totalPages}
      </p>
      <PageLink href={hrefFor(page + 1)} label="Page suivante" disabled={page >= totalPages}>
        <span className="hidden sm:inline">Suivant</span>
        <ChevronRight size={16} aria-hidden />
      </PageLink>
    </nav>
  );
}
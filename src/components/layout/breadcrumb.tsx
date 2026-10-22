import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Fil d’Ariane">
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {isLast || !item.href ? (
                <span
                  aria-current={item.href ? undefined : "page"}
                  className="font-medium text-foreground"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-text-muted transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              )}
              {!isLast && (
                <ChevronRight size={14} aria-hidden className="text-text-muted" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
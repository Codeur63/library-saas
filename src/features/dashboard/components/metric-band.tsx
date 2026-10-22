import type { ReactNode } from "react";

export interface MetricItem {
  label: string;
  value: string | number;
  hint?: string;
}

interface MetricBandProps {
  items: MetricItem[];
  columns?: 2 | 3 | 4;
}

export default function MetricBand({ items, columns = 4 }: MetricBandProps) {
  const columnClass =
    columns === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : columns === 3
        ? "grid-cols-1 sm:grid-cols-3"
        : "grid-cols-2 md:grid-cols-4";

  return (
    <dl className={`grid gap-px overflow-hidden rounded-lg border border-border bg-border ${columnClass}`}>
      {items.map((item) => (
        <div key={item.label} className="bg-white p-5">
          <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">
            {item.label}
          </dt>
          <dd className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {item.value}
            </span>
            {item.hint && <span className="text-xs text-text-muted">{item.hint}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function StatIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-foreground">
      {children}
    </span>
  );
}

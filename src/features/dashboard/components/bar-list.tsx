export interface BarListItem {
  label: string;
  count: number;
}

export default function BarList({
  items,
  emptyLabel = "Aucune donnée disponible.",
}: {
  items: BarListItem[];
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-text-muted">{emptyLabel}</p>;
  }

  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <ul className="space-y-3.5">
      {items.map((item) => {
        const width = item.count > 0 ? Math.max((item.count / max) * 100, 6) : 0;
        return (
          <li key={item.label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-text-secondary" title={item.label}>
                {item.label}
              </span>
              <span className="font-medium tabular-nums text-foreground">{item.count}</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${width}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

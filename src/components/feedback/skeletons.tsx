export function DocumentRowSkeleton() {
  return (
    <div
      className="flex flex-col gap-3 border-b border-border py-5 sm:flex-row sm:items-center sm:gap-6"
      aria-hidden
    >
      <div className="h-12 w-12 shrink-0 animate-pulse rounded-md bg-surface-hover" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/2 animate-pulse rounded bg-surface-hover" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-surface-hover" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-surface-hover" />
      </div>
      <div className="h-8 w-full animate-pulse rounded-md bg-surface-hover sm:w-28" />
    </div>
  );
}

export function DocumentListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy="true" role="status" aria-label="Chargement des documents">
      {Array.from({ length: rows }).map((_, index) => (
        <DocumentRowSkeleton key={index} />
      ))}
    </div>
  );
}

export function AuthCardSkeleton() {
  return (
    <div
      className="w-full max-w-md rounded-lg border border-border bg-white p-6 sm:p-8"
      aria-hidden
    >
      <div className="h-6 w-1/2 animate-pulse rounded bg-surface-hover" />
      <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-surface-hover" />
      <div className="mt-6 space-y-4">
        <div className="h-10 w-full animate-pulse rounded-md bg-surface-hover" />
        <div className="h-10 w-full animate-pulse rounded-md bg-surface-hover" />
        <div className="h-10 w-full animate-pulse rounded-md bg-primary/10" />
      </div>
    </div>
  );
}

export function PanelSkeleton({ hasHeader = true, height = "h-48" }: { hasHeader?: boolean; height?: string }) {
  return (
    <div className="rounded-lg border border-border bg-white" aria-hidden>
      {hasHeader && (
        <div className="border-b border-border px-5 py-4">
          <div className="h-4 w-1/2 animate-pulse rounded bg-surface-hover" />
          <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-surface-hover" />
        </div>
      )}
      <div className={`p-5 ${height}`}>
        <div className="h-full w-full animate-pulse rounded-md bg-surface-hover" />
      </div>
    </div>
  );
}

export function MetricBandSkeleton({ items = 4 }: { items?: number }) {
  return (
    <dl
      className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4"
      aria-hidden
    >
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="bg-white p-5">
          <dt className="h-3 w-1/2 animate-pulse rounded bg-surface-hover" />
          <dd className="mt-2 h-8 w-2/3 animate-pulse rounded bg-surface-hover" />
        </div>
      ))}
    </dl>
  );
}

export function BarListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3.5" aria-hidden>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index}>
          <div className="flex items-baseline justify-between gap-3">
            <div className="h-3 w-1/2 animate-pulse rounded bg-surface-hover" />
            <div className="h-3 w-8 animate-pulse rounded bg-surface-hover" />
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-surface-hover" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" role="status" aria-label="Chargement des statistiques">
      <MetricBandSkeleton items={4} />
      <div className="grid gap-6 lg:grid-cols-2">
        <PanelSkeleton hasHeader height="h-64" />
        <PanelSkeleton hasHeader height="h-64" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <PanelSkeleton hasHeader height="h-64" />
        <PanelSkeleton hasHeader height="h-64" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <PanelSkeleton hasHeader height="h-64" />
        <PanelSkeleton hasHeader height="h-64" />
      </div>
      <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 bg-white p-5">
            <div className="h-9 w-9 animate-pulse rounded-md bg-surface-hover" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/2 animate-pulse rounded bg-surface-hover" />
              <div className="h-5 w-1/3 animate-pulse rounded bg-surface-hover" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div
      className="w-full min-h-[30vh] flex items-center justify-center"
      aria-busy="true"
      role="status"
      aria-label="Chargement des données"
    >
      <div className="w-full overflow-x-auto md:overflow-x-visible rounded-lg border border-border bg-white">
        <table className="w-full min-w-0">
          <thead className="hidden md:table-header-group bg-surface">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                <div className="h-3 w-20 animate-pulse rounded bg-surface-hover" />
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                <div className="h-3 w-16 animate-pulse rounded bg-surface-hover" />
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                <div className="h-3 w-24 animate-pulse rounded bg-surface-hover" />
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                <div className="h-3 w-16 animate-pulse rounded bg-surface-hover" />
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-text-muted">
                <div className="ml-auto h-3 w-16 animate-pulse rounded bg-surface-hover" />
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, index) => (
              <tr
                key={index}
                className="block border-b border-border last:border-0 md:table-row md:border-0"
                aria-hidden
              >
                <td
                  data-label="Étudiant"
                  className="flex justify-between gap-3 px-4 py-3 text-sm md:table-cell md:px-5 md:py-4 md:align-middle before:content-[attr(data-label)] before:text-xs before:font-medium before:text-text-muted md:before:hidden"
                >
                  <div className="flex-1 space-y-2 md:space-y-1">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-surface-hover" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-surface-hover md:hidden" />
                  </div>
                </td>
                <td
                  data-label="Matricule"
                  className="flex justify-between gap-3 px-4 py-3 text-sm md:table-cell md:px-5 md:py-4 md:align-middle before:content-[attr(data-label)] before:text-xs before:font-medium before:text-text-muted md:before:hidden"
                >
                  <div className="h-4 w-20 animate-pulse rounded bg-surface-hover" />
                </td>
                <td
                  data-label="Filière/Niveau"
                  className="flex justify-between gap-3 px-4 py-3 text-sm md:table-cell md:px-5 md:py-4 md:align-middle before:content-[attr(data-label)] before:text-xs before:font-medium before:text-text-muted md:before:hidden"
                >
                  <div className="h-4 w-2/3 animate-pulse rounded bg-surface-hover" />
                </td>
                <td
                  data-label="Statut"
                  className="flex justify-between gap-3 px-4 py-3 text-sm md:table-cell md:px-5 md:py-4 md:align-middle before:content-[attr(data-label)] before:text-xs before:font-medium before:text-text-muted md:before:hidden"
                >
                  <div className="h-5 w-16 animate-pulse rounded-full bg-surface-hover" />
                </td>
                <td
                  data-label="Actions"
                  className="flex justify-between gap-3 px-4 py-3 text-sm md:table-cell md:px-5 md:py-4 md:align-middle md:text-right before:content-[attr(data-label)] before:text-xs before:font-medium before:text-text-muted md:before:hidden"
                >
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <div className="h-8 w-20 animate-pulse rounded-md bg-surface-hover" />
                    <div className="h-8 w-16 animate-pulse rounded-md bg-surface-hover" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function FormCardSkeleton() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center" aria-busy="true" role="status">
      <div className="w-full max-w-2xl rounded-lg border border-border bg-white p-6 sm:p-8">
        <div className="space-y-3">
          <div className="h-6 w-1/2 animate-pulse rounded bg-surface-hover" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-surface-hover" />
        </div>
        <div className="mt-6 space-y-4">
          <div className="h-10 w-full animate-pulse rounded-md bg-surface-hover" />
          <div className="h-10 w-full animate-pulse rounded-md bg-surface-hover" />
          <div className="h-10 w-full animate-pulse rounded-md bg-surface-hover" />
          <div className="h-10 w-full animate-pulse rounded-md bg-surface-hover" />
          <div className="mt-6 h-10 w-full animate-pulse rounded-md bg-primary/10" />
        </div>
      </div>
    </div>
  );
}

export function LibraryOverviewSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-[1280px] space-y-8 px-4 py-8 sm:px-6"
      aria-busy="true"
      role="status"
    >
      <MetricBandSkeleton items={4} />
      <div className="grid gap-6 lg:grid-cols-2">
        <PanelSkeleton hasHeader height="h-64" />
        <PanelSkeleton hasHeader height="h-64" />
      </div>
      <PanelSkeleton hasHeader height="h-64" />
    </div>
  );
}

export function FormFieldsSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2"
      aria-busy="true"
      role="status"
      aria-label="Chargement des références"
    >
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="w-full space-y-1.5" aria-hidden>
          <div className="h-3.5 w-24 animate-pulse rounded bg-surface-hover" />
          <div className="h-10 w-full animate-pulse rounded-md bg-surface-hover" />
        </div>
      ))}
    </div>
  );
}

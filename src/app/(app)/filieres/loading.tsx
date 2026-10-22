export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6">
      <div className="h-5 w-48 animate-pulse rounded bg-surface-hover" aria-hidden />
      <div className="mt-6 space-y-3">
        <div className="h-9 w-56 animate-pulse rounded bg-surface-hover" aria-hidden />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-surface-hover" aria-hidden />
      </div>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-border bg-white p-6" aria-hidden>
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 shrink-0 animate-pulse rounded-md bg-surface-hover" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 animate-pulse rounded bg-surface-hover" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-surface-hover" />
              </div>
            </div>
            <div className="mt-4 h-10 w-full animate-pulse rounded bg-surface-hover" />
            <div className="mt-4 h-4 w-1/2 animate-pulse rounded bg-surface-hover" />
          </div>
        ))}
      </div>
    </div>
  );
}

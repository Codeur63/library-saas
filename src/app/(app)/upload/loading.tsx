export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6">
      <div className="h-5 w-48 animate-pulse rounded bg-surface-hover" aria-hidden />
      <div className="mt-6 space-y-4">
        <div className="h-9 w-72 max-w-full animate-pulse rounded bg-surface-hover" aria-hidden />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-surface-hover" aria-hidden />
      </div>
      <div className="mt-8 max-w-3xl space-y-5" aria-busy="true">
        <div className="h-11 w-full animate-pulse rounded-md bg-surface-hover" aria-hidden />
        <div className="h-28 w-full animate-pulse rounded-md bg-surface-hover" aria-hidden />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="h-11 animate-pulse rounded-md bg-surface-hover" aria-hidden />
          <div className="h-11 animate-pulse rounded-md bg-surface-hover" aria-hidden />
        </div>
        <div className="h-11 w-48 animate-pulse rounded-md bg-surface-hover" aria-hidden />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="h-48 w-36 shrink-0 animate-pulse rounded-lg bg-surface-hover sm:w-40" aria-hidden />
        <div className="flex-1 space-y-4">
          <div className="h-6 w-40 animate-pulse rounded bg-surface-hover" aria-hidden />
          <div className="h-10 w-full max-w-xl animate-pulse rounded bg-surface-hover" aria-hidden />
          <div className="h-4 w-48 animate-pulse rounded bg-surface-hover" aria-hidden />
          <div className="h-10 w-36 animate-pulse rounded-md bg-surface-hover" aria-hidden />
        </div>
      </div>
      <div className="mt-6 h-[70vh] w-full animate-pulse rounded-lg border border-border-strong bg-surface-hover" aria-hidden />
      <div className="mt-16 space-y-4">
        <div className="h-8 w-72 max-w-full animate-pulse rounded bg-surface-hover" aria-hidden />
        <div className="h-16 w-full animate-pulse rounded bg-surface-hover" aria-hidden />
        <div className="h-24 w-full animate-pulse rounded-lg bg-surface-hover" aria-hidden />
      </div>
    </div>
  );
}

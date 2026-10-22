import { DocumentListSkeleton } from "@/components/feedback/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6">
      <div className="h-10 w-40 animate-pulse rounded bg-surface-hover" aria-hidden />
      <div className="mt-8 h-8 w-64 animate-pulse rounded bg-surface-hover" aria-hidden />
      <div className="mt-2 h-4 w-96 max-w-full animate-pulse rounded bg-surface-hover" aria-hidden />
      <div className="mt-8 h-11 w-full animate-pulse rounded-md bg-surface-hover" aria-hidden />
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="h-10 animate-pulse rounded-md bg-surface-hover" aria-hidden />
        <div className="h-10 animate-pulse rounded-md bg-surface-hover" aria-hidden />
        <div className="hidden h-10 animate-pulse rounded-md bg-surface-hover lg:block" aria-hidden />
        <div className="hidden h-10 animate-pulse rounded-md bg-surface-hover lg:block" aria-hidden />
      </div>
      <div className="mt-8">
        <DocumentListSkeleton rows={6} />
      </div>
    </div>
  );
}
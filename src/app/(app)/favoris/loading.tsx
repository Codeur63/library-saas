import { DocumentListSkeleton } from "@/components/feedback/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6">
      <div className="h-5 w-48 animate-pulse rounded bg-surface-hover" aria-hidden />
      <div className="mt-6 space-y-3">
        <div className="h-9 w-56 animate-pulse rounded bg-surface-hover" aria-hidden />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-surface-hover" aria-hidden />
      </div>
      <div className="mt-8">
        <DocumentListSkeleton rows={5} />
      </div>
    </div>
  );
}

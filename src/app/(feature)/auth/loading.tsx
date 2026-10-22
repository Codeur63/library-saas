import { AuthCardSkeleton } from "@/components/feedback/skeletons";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <AuthCardSkeleton />
    </div>
  );
}
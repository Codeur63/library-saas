import { FormCardSkeleton } from "@/components/feedback/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6">
      <FormCardSkeleton />
    </div>
  );
}

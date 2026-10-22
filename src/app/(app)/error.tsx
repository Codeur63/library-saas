"use client";

import RouteError from "@/components/feedback/route-error";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Impossible de charger cette section"
      description="La bibliothèque rencontre un problème temporaire. Vos données ne sont pas affectées : réessayez dans un instant."
    />
  );
}

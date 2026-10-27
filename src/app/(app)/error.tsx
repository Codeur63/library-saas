"use client";

import RouteError from "@/components/feedback/route-error";

export default function AppError({ reset }: { reset: () => void }) {
  return (
    <RouteError
      reset={reset}
      title="Impossible de charger cette section"
      description="La bibliothèque rencontre un problème temporaire. Vos données ne sont pas affectées : réessayez dans un instant."
    />
  );
}

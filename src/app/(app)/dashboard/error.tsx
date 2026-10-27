"use client";

import RouteError from "@/components/feedback/route-error";

export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <RouteError
      reset={reset}
      title="Tableau de bord indisponible"
      description="Les statistiques n’ont pas pu être chargées. Réessayez dans quelques instants."
    />
  );
}

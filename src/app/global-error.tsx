"use client";

import RouteError from "@/components/feedback/route-error";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body>
        <RouteError
          error={error}
          reset={reset}
          title="Application momentanément indisponible"
          description="Une erreur critique est survenue. Rechargez la page ou réessayez dans un instant."
        />
      </body>
    </html>
  );
}

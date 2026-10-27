"use client";

import RouteError from "@/components/feedback/route-error";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <RouteError
          reset={reset}
          className="min-h-screen"
          title="Application momentanément indisponible"
          description="Une erreur inattendue est survenue. Rechargez la page ou réessayez dans un instant."
        />
      </body>
    </html>
  );
}

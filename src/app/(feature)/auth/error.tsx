"use client";

import RouteError from "@/components/feedback/route-error";

export default function AuthError({ reset }: { reset: () => void }) {
  return (
    <RouteError
      reset={reset}
      title="Connexion momentanément indisponible"
      description="Le service d’authentification ne répond pas. Vérifiez votre connexion puis réessayez."
    />
  );
}

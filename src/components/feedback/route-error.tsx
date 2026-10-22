"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Vue d'erreur commune aux `error.tsx` de segment.
 * `error.digest` est la référence technique renvoyée par Next ; elle est
 * corrélée aux logs serveur (voir `reportError`).
 */
export default function RouteError({
  error,
  reset,
  title = "Une erreur est survenue",
  description = "Impossible d’afficher cette page pour le moment. Réessayez dans un instant.",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4" role="alert">
      <div className="text-center">
        <AlertTriangle size={32} aria-hidden className="mx-auto text-warning" />
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-[50ch] text-base text-text-secondary">{description}</p>
        <Button variant="outline" className="mt-6" onClick={reset}>
          Réessayer
        </Button>
        {error.digest && (
          <p className="mt-4 text-xs text-text-muted">
            Référence technique : <code className="select-all">{error.digest}</code>
          </p>
        )}
      </div>
    </div>
  );
}

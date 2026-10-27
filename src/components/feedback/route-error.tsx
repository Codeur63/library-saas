"use client";

import Link from "next/link";
import { AlertTriangle, Home } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

/**
 * Vue d'erreur commune aux `error.tsx` de segment.
 * Aucune référence technique n'est affichée : les détails restent dans les
 * logs serveur et l'observabilité.
 */
export default function RouteError({
  reset,
  title = "Une erreur est survenue",
  description = "Impossible d’afficher cette page pour le moment. Réessayez dans un instant.",
  className,
}: {
  reset: () => void;
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("flex min-h-[70vh] items-center justify-center px-4 py-16", className)}
      role="alert"
    >
      <div className="w-full max-w-lg rounded-2xl border border-border bg-white p-8 text-center shadow-sm sm:p-10">
        <span
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface text-warning"
          aria-hidden
        >
          <AlertTriangle size={26} />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-[52ch] text-base leading-relaxed text-text-secondary">
          {description}
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button size="lg" onClick={reset}>
            Réessayer
          </Button>
          <Link
            href={ROUTES.home}
            className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "gap-2")}
          >
            <Home size={16} aria-hidden />
            Retour à l’accueil
          </Link>
        </div>
        <p className="mt-6 text-xs leading-relaxed text-text-muted">
          Si le problème persiste, réessayez plus tard ou contactez le secrétariat
          de votre filière.
        </p>
      </div>
    </div>
  );
}

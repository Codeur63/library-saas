import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
          404
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          Cette page n’existe pas
        </h1>
        <p className="mx-auto mt-3 max-w-[50ch] text-base text-text-secondary">
          Le document ou la page recherchée n’est pas disponible. Vérifiez
          l’adresse ou explorez la bibliothèque.
        </p>
        <Link
          href={ROUTES.bibliotheque}
          className={cn(buttonVariants({ variant: "secondary" }), "mt-6")}
        >
          Aller à la bibliothèque
        </Link>
      </div>
    </div>
  );
}
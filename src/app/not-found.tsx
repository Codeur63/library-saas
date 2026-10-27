import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import NotFoundView from "@/components/feedback/not-found-view";
import { ROUTES } from "@/constants/routes";

export const metadata: Metadata = {
  title: "Page introuvable — Upac Library",
  description:
    "La page demandée est introuvable. Explorez la bibliothèque numérique de l’Université Protestante d’Afrique Centrale.",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between px-4 sm:px-6">
          <Link
            href={ROUTES.home}
            className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Upac Library — accueil"
          >
            <Image
              src="/logo-Upac.png"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
              priority
            />
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-foreground">
                University UPAC
              </span>
              <span className="text-xs text-text-muted">
                Bibliothèque numérique
              </span>
            </span>
          </Link>
          <Link
            href={ROUTES.bibliotheque}
            className="rounded-md text-sm font-medium text-text-secondary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Bibliothèque
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <NotFoundView />
      </main>

      <footer className="border-t border-border">
        <p className="mx-auto w-full max-w-[1280px] px-4 py-6 text-xs text-text-muted sm:px-6">
          Université Protestante d’Afrique Centrale — Bibliothèque numérique
        </p>
      </footer>
    </div>
  );
}

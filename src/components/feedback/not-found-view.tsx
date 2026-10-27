import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Compass,
  Home,
  LibraryBig,
  Search,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

const QUICK_LINKS = [
  {
    label: "Parcourir la bibliothèque",
    description: "Cours, TD, examens et mémoires",
    href: ROUTES.bibliotheque,
    icon: LibraryBig,
  },
  {
    label: "Explorer par filière",
    description: "Retrouvez les ressources de votre programme",
    href: ROUTES.filieres,
    icon: Compass,
  },
];

export default function NotFoundView() {
  return (
    <section className="mx-auto flex w-full max-w-[1080px] flex-col items-center gap-12 px-4 py-16 sm:px-6 lg:flex-row lg:gap-20 lg:py-24">
      <div className="max-w-xl flex-1 text-center lg:text-left">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
          Page introuvable
        </p>
        <h1 className="mt-4 text-[2rem] font-semibold leading-[1.15] tracking-tight text-foreground sm:text-[2.5rem]">
          Cette page s’est égarée entre les rayons.
        </h1>
        <p className="mx-auto mt-4 max-w-[58ch] text-base leading-relaxed text-text-secondary lg:mx-0">
          Le lien est peut-être incomplet ou la page a été déplacée. Pas
          d’inquiétude : tout le reste de la bibliothèque reste à portée de main.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
          <Link
            href={ROUTES.bibliotheque}
            className={cn(buttonVariants({ variant: "primary", size: "lg" }), "gap-2")}
          >
            Explorer la bibliothèque
            <ArrowRight size={16} aria-hidden />
          </Link>
          <Link
            href={ROUTES.home}
            className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "gap-2")}
          >
            <Home size={16} aria-hidden />
            Retour à l’accueil
          </Link>
        </div>

        <div className="mt-10 grid gap-3 text-left sm:grid-cols-2">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-start gap-3 rounded-xl border border-border bg-white p-4 transition-colors hover:border-border-strong hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface text-text-secondary transition-colors group-hover:bg-white"
                  aria-hidden
                >
                  <Icon size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">
                    {link.label}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-text-muted">
                    {link.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="relative mx-auto aspect-square w-full max-w-[380px] shrink-0" aria-hidden>
        <div className="absolute inset-6 rounded-[2.5rem] border border-border bg-surface" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="flex h-44 w-44 items-center justify-center rounded-full border border-border bg-white shadow-sm">
              <LibraryBig size={72} strokeWidth={1.2} className="text-foreground/80" />
            </div>
            <span className="absolute -right-5 top-1 flex h-16 w-16 rotate-6 items-center justify-center rounded-2xl border border-border bg-white shadow-sm">
              <Search size={26} className="text-text-muted" />
            </span>
            <span className="absolute -left-6 bottom-2 flex h-14 w-14 -rotate-6 items-center justify-center rounded-2xl border border-border bg-white shadow-sm">
              <BookOpen size={22} className="text-text-muted" />
            </span>
          </div>
        </div>
        <div className="absolute inset-x-14 bottom-10 h-px bg-border" />
        <div className="absolute inset-x-16 bottom-10 flex items-end justify-center gap-2">
          <span className="h-12 w-4 rounded-t-sm bg-primary/70" />
          <span className="h-20 w-5 rounded-t-sm bg-primary/50" />
          <span className="h-9 w-3 rounded-t-sm bg-primary/25" />
          <span className="h-16 w-4 rounded-t-sm bg-primary/40" />
          <span className="h-14 w-3 rounded-t-sm bg-primary/30" />
        </div>
      </div>
    </section>
  );
}

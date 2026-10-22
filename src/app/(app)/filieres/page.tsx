import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Binary, Layers } from "lucide-react";

import Breadcrumb from "@/components/layout/breadcrumb";
import { FILIERE_DESCRIPTIONS, FILIERE_ICONS } from "@/constants/filieres";
import { ROUTES } from "@/constants/routes";
import { getLibraryOverview } from "@/server/services/library.service";

export const metadata: Metadata = {
  title: "Filières — Upac Library",
  description:
    "Découvrez les filières de l'Université Protestante d'Afrique Centrale et leurs documents : Médecine, Génie informatique, Traduction, Théologie, Télécoms et plus.",
};

export default async function FilieresPage() {
  const overview = await getLibraryOverview();
  const programs = overview.programs;

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6">
      <Breadcrumb items={[{ label: "Accueil", href: ROUTES.home }, { label: "Filières" }]} />

      <section className="mt-6 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Filières</h1>
          <p className="max-w-[65ch] text-base text-text-secondary">
            Explorez les documents publiés par chaque filière de l’Université Protestante d’Afrique
            Centrale.
          </p>
        </header>

        {programs.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface px-4 py-6 text-sm text-text-secondary">
            Aucune filière disponible pour le moment.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((program) => {
              const Icon = FILIERE_ICONS[program.name] ?? Binary;
              const description =
                program.description ??
                FILIERE_DESCRIPTIONS[program.name] ??
                "Cours, travaux dirigés, examens et mémoires de la filière.";

              return (
                <li key={program.id}>
                  <article className="flex h-full flex-col gap-4 rounded-lg border border-border bg-white p-6">
                    <div className="flex items-start gap-3">
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-foreground"
                        aria-hidden
                      >
                        <Icon size={20} />
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-base font-semibold text-foreground">{program.name}</h2>
                        <p className="text-xs text-text-muted">
                          {program.count} {program.count > 1 ? "documents" : "document"}
                        </p>
                      </div>
                    </div>

                    <p className="min-h-[2.6em] text-sm leading-relaxed text-text-secondary">
                      {description}
                    </p>

                    {program.subjectNames.length > 0 && (
                      <ul className="flex flex-wrap items-center gap-1.5">
                        {program.subjectNames.slice(0, 4).map((subject) => (
                          <li key={subject}>
                            <Link
                              href={`${ROUTES.bibliotheque}?programId=${program.id}&q=${encodeURIComponent(subject)}`}
                              className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-text-secondary transition-colors hover:border-border-strong hover:text-foreground"
                            >
                              <Layers size={11} aria-hidden />
                              {subject}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}

                    <Link
                      href={`${ROUTES.bibliotheque}?programId=${program.id}`}
                      className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      Explorer {program.count > 1 ? "les documents" : "le document"}
                      <ArrowRight
                        size={15}
                        aria-hidden
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </Link>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

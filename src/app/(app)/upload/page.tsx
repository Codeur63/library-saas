import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";

import Breadcrumb from "@/components/layout/breadcrumb";
import { ROUTES } from "@/constants/routes";
import { env } from "@/lib/env";
import { getCurrentUser } from "@/server/current-user";
import { getCatalog } from "@/server/services/catalog.service";
import UploadForm from "@/features/uploads/components/upload-form";

export const metadata: Metadata = {
  title: "Publier un document — Upac Library",
  description:
    "Publiez un cours, un TD, un examen ou un mémoire dans la bibliothèque numérique de l'UPAC.",
};

export default async function UploadPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`${ROUTES.login}?next=${encodeURIComponent(ROUTES.upload)}`);
  }

  const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6">
      <Breadcrumb
        items={[{ label: "Accueil", href: ROUTES.home }, { label: "Publier un document" }]}
      />

      <section className="mt-6 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Publier un document</h1>
          <p className="max-w-[65ch] text-base text-text-secondary">
            Ajoutez un cours, un TD, un examen ou un mémoire pour le partager avec les étudiants de
            votre filière.
          </p>
        </header>

        <div className="mx-auto w-full max-w-2xl">
          {isAdmin ? (
            <UploadForm
              maxUploadMb={env.maxUploadSizeMb}
              options={await buildUploadOptions()}
            />
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-white p-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldAlert size={22} aria-hidden />
              </span>
              <h2 className="text-lg font-semibold text-foreground">Accès restreint</h2>
              <p className="max-w-[55ch] text-sm text-text-secondary">
                La publication de documents est réservée aux administrateurs de la bibliothèque.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

async function buildUploadOptions() {
  const catalog = await getCatalog();
  return {
    programs: catalog.programs.map((program) => ({ value: program.id, label: program.name })),
    levels: catalog.levels.map((level) => ({ value: level.id, label: level.code })),
    subjects: catalog.subjects.map((subject) => ({
      value: subject.id,
      label: subject.name,
      programId: subject.programId,
      levelId: subject.levelId,
    })),
    categories: catalog.categories.map((category) => ({ value: category.id, label: category.name })),
    academicYears: catalog.academicYears.map((year) => ({
      value: year.id,
      label: year.label,
    })),
  };
}

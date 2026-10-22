import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ROUTES } from "@/constants/routes";
import CreateStudentForm from "@/features/dashboard/components/create-student-form";

export const metadata: Metadata = {
  title: "Nouveau compte étudiant — Upac Library",
  description: "Créez un nouveau compte étudiant pour la bibliothèque numérique de l’UPAC.",
};

export default function DashboardNewStudentPage() {
  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6">
      <div className="space-y-3">
        <Link
          href={ROUTES.dashboardEtudiants}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} aria-hidden />
          Retour aux comptes étudiants
        </Link>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Créer un compte étudiant
          </h1>
          <p className="max-w-[65ch] text-sm text-text-secondary">
            Le compte donne accès à la bibliothèque numérique. Un mot de passe temporaire sera
            affiché une seule fois après la création.
          </p>
        </div>
      </div>

      <CreateStudentForm />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ROUTES } from "@/constants/routes";
import DashboardGuard from "@/features/dashboard/components/dashboard-guard";
import CreateStaffForm from "@/features/dashboard/components/create-staff-form";

export const metadata: Metadata = {
  title: "Nouvel administrateur — Upac Library",
  description: "Créez un compte administrateur pour la bibliothèque numérique de l’UPAC.",
};

export default function DashboardNewAdministratorPage() {
  return (
    <DashboardGuard require="superadmin">
      <div className="mx-auto w-full max-w-[1100px] space-y-6">
        <div className="space-y-3">
          <Link
            href={ROUTES.dashboardAdministrateurs}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-foreground"
          >
            <ArrowLeft size={16} aria-hidden />
            Retour aux administrateurs
          </Link>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Créer un compte administrateur
            </h1>
            <p className="max-w-[65ch] text-sm text-text-secondary">
              Un administrateur peut gérer les comptes étudiants. Un super-admin dispose en plus de
              la gestion des administrateurs.
            </p>
          </div>
        </div>

        <CreateStaffForm />
      </div>
    </DashboardGuard>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Info, Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import DashboardGuard from "@/features/dashboard/components/dashboard-guard";
import PageHeader from "@/features/dashboard/components/page-header";
import StaffManager from "@/features/dashboard/components/staff-manager";

export const metadata: Metadata = {
  title: "Administrateurs — Upac Library",
  description:
    "Gérez les comptes administrateurs de la bibliothèque numérique de l’UPAC (super-admin uniquement).",
};

export default function DashboardAdministratorsPage() {
  return (
    <DashboardGuard require="superadmin">
      <div className="mx-auto w-full max-w-[1100px] space-y-6">
        <PageHeader
          title="Administrateurs"
          description="Créez et gérez les comptes administratifs ayant accès au tableau de bord."
          action={
            <Link
              href={ROUTES.dashboardNouvelAdministrateur}
              className={buttonVariants({ variant: "primary" })}
            >
              <Plus size={16} aria-hidden />
              Nouvel administrateur
            </Link>
          }
        />

        <div className="flex items-start gap-2 rounded-md border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
          <Info size={16} aria-hidden className="mt-0.5 shrink-0 text-text-muted" />
          <p>
            Un compte super-admin ne peut pas être supprimé ni suspendu depuis cette interface : sa
            gestion se fait directement dans la base de données.
          </p>
        </div>

        <StaffManager />
      </div>
    </DashboardGuard>
  );
}

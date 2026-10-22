import type { Metadata } from "next";

import Breadcrumb from "@/components/layout/breadcrumb";
import { ROUTES } from "@/constants/routes";
import DashboardGuard from "@/features/dashboard/components/dashboard-guard";
import DashboardSidebar from "@/features/dashboard/components/dashboard-sidebar";

export const metadata: Metadata = {
  title: "Tableau de bord — Upac Library",
  description:
    "Pilotage de la bibliothèque numérique de l’UPAC : statistiques et gestion des comptes.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1280px] overflow-x-clip px-3 py-6 sm:px-4 sm:py-8 md:px-6">
      <Breadcrumb
        items={[
          { label: "Accueil", href: ROUTES.home },
          { label: "Tableau de bord" },
        ]}
      />

      <DashboardGuard>
        <div className="mt-6 sm:grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <DashboardSidebar />
          <main className="min-w-0">{children}</main>
        </div>
      </DashboardGuard>
    </div>
  );
}

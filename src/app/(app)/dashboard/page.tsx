import type { Metadata } from "next";

import PageHeader from "@/features/dashboard/components/page-header";
import StatsOverview from "@/features/dashboard/components/stats-overview";

export const metadata: Metadata = {
  title: "Statistiques — Upac Library",
  description: "Vue d’ensemble des documents, téléchargements et comptes de la bibliothèque.",
};

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6">
      <PageHeader
        title="Statistiques"
        description="Vue d’ensemble de la bibliothèque numérique : documents, téléchargements et comptes."
      />
      <StatsOverview />
    </div>
  );
}

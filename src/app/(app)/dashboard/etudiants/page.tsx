import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import PageHeader from "@/features/dashboard/components/page-header";
import StudentsManager from "@/features/dashboard/components/students-manager";

export const metadata: Metadata = {
  title: "Comptes étudiants — Upac Library",
  description:
    "Créez, recherchez et gérez les comptes étudiants de la bibliothèque numérique de l’UPAC.",
};

export default function DashboardStudentsPage() {
  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6">
      <PageHeader
        title="Comptes étudiants"
        description="Créez, recherchez et gérez les comptes étudiants de la bibliothèque."
        action={
          <Link href={ROUTES.dashboardNouvelEtudiant} className={buttonVariants({ variant: "primary" })}>
            <Plus size={16} aria-hidden />
            Nouveau compte
          </Link>
        }
      />
      <StudentsManager />
    </div>
  );
}

"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { useSession } from "@/features/auth/components/session-provider";

const ADMIN_ROLES = ["ADMIN", "SUPERADMIN"];

export default function DashboardGuard({
  require = "admin",
  children,
}: {
  require?: "admin" | "superadmin";
  children: React.ReactNode;
}) {
  const { profile, initialized } = useSession();

  if (!initialized) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center" aria-busy="true" role="status">
        <div className="h-6 w-6 animate-pulse rounded-full bg-surface-hover" aria-hidden />
        <span className="sr-only">Chargement…</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-white p-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldAlert size={22} aria-hidden />
        </span>
        <h2 className="text-lg font-semibold">Connexion requise</h2>
        <p className="max-w-[55ch] text-sm text-text-secondary">
          Le tableau de bord est réservé aux administrateurs de la bibliothèque.
        </p>
        <Link
          href={`${ROUTES.login}?next=${encodeURIComponent(ROUTES.dashboard)}`}
          className={buttonVariants({ variant: "primary" })}
        >
          Se connecter
        </Link>
      </div>
    );
  }

  const allowed = require === "superadmin" ? profile.role === "SUPERADMIN" : ADMIN_ROLES.includes(profile.role);

  if (!allowed) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-white p-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert size={22} aria-hidden />
        </span>
        <h2 className="text-lg font-semibold">Accès refusé</h2>
        <p className="max-w-[55ch] text-sm text-text-secondary">
          {require === "superadmin"
            ? "Cette section est réservée aux super-administrateurs."
            : "Cette section est réservée aux administrateurs et super-administrateurs."}
        </p>
        <Link href={ROUTES.dashboard} className={buttonVariants({ variant: "secondary" })}>
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}

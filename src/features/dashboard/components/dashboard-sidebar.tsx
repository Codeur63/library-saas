"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { BarChart3, ShieldCheck, Users } from "lucide-react";

import { ROUTES } from "@/constants/routes";
import { useSession } from "@/features/auth/components/session-provider";
import { cn } from "@/lib/utils";

interface DashboardNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  superadminOnly?: boolean;
}

const ITEMS: DashboardNavItem[] = [
  { label: "Statistiques", href: ROUTES.dashboard, icon: BarChart3, exact: true },
  { label: "Comptes étudiants", href: ROUTES.dashboardEtudiants, icon: Users },
  { label: "Administrateurs", href: ROUTES.dashboardAdministrateurs, icon: ShieldCheck, superadminOnly: true },
];

function isActive(pathname: string, item: DashboardNavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { profile } = useSession();
  const isSuperadmin = profile?.role === "SUPERADMIN";
  const items = ITEMS.filter((item) => !item.superadminOnly || isSuperadmin);

  return (
    <div className="lg:sticky lg:top-24 lg:self-start">
      {/* Desktop : navigation verticale */}
      <nav aria-label="Navigation du tableau de bord" className="hidden lg:block">
        <p className="px-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Pilotage
        </p>
        <ul className="mt-3 space-y-1">
          {items.map((item) => {
            const active = isActive(pathname, item);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-surface text-foreground"
                      : "text-text-secondary hover:bg-surface hover:text-foreground"
                  )}
                >
                  <Icon size={18} aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Mobile : navigation horizontale */}
      <nav aria-label="Navigation du tableau de bord" className="lg:hidden">
        <ul className="no-scrollbar -mx-4 flex items-center gap-1 overflow-x-auto border-b border-border px-4 scroll-px-4">
          {items.map((item) => {
            const active = isActive(pathname, item);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                    active
                      ? "border-primary text-foreground"
                      : "border-transparent text-text-secondary hover:text-foreground"
                  )}
                >
                  <Icon size={16} aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li aria-hidden className="w-3 shrink-0" />
        </ul>
      </nav>
    </div>
  );
}

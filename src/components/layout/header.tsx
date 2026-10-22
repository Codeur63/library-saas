"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { KeyRound, Menu, Upload, X } from "lucide-react";
import { useState } from "react";

import { ROUTES } from "@/constants/routes";
import { useSession } from "@/features/auth/components/session-provider";
import ProfileAvatar, { roleLabelOf } from "@/features/auth/components/profile-avatar";
import ProfileMenu from "@/components/layout/profile-menu";
import type { CurrentUser } from "@/server/current-user";
import { cn } from "@/lib/utils";

const BASE_NAV_ITEMS = [
  { label: "Accueil", href: ROUTES.home },
  { label: "Bibliothèque", href: ROUTES.bibliotheque },
  { label: "Filières", href: ROUTES.filieres },
];

function isActive(pathname: string, href: string): boolean {
  if (href === ROUTES.home) return pathname === ROUTES.home;
  return pathname === href || pathname.startsWith(`${href}/`);
}

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default function Header({ initialProfile = null }: { initialProfile?: CurrentUser | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { profile: sessionProfile, initialized, signOut } = useSession();
  // Avant l'hydratation cliente, on affiche le profil fourni par le serveur :
  // le nom/avatar sont visibles dès le premier rendu, sans « flash » ni
  // dépendance au chargement des chunks clients. Une fois initialisé, l'état
  // client fait autorité (déconnexion, changement de compte, etc.).
  const profile = initialized ? sessionProfile : initialProfile ?? sessionProfile;
  const isConnected = profile !== null;
  const isAdmin = profile?.role === "ADMIN" || profile?.role === "SUPERADMIN";

  const navItems = [
    ...BASE_NAV_ITEMS,
    ...(isConnected ? [{ label: "Favoris", href: ROUTES.favoris }] : []),
    ...(isAdmin ? [{ label: "Tableau de bord", href: ROUTES.dashboard }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center gap-4 px-4 sm:px-6">
        <Link
          href={ROUTES.home}
          className={cn("flex shrink-0 items-center gap-3 rounded-md", FOCUS_RING)}
          aria-label="Upac Library — accueil"
        >
          <Image
            src="/logo-Upac.png"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 object-contain"
            priority
          />
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="text-sm font-semibold text-foreground">University UPAC</span>
            <span className="text-xs text-text-muted">Bibliothèque numérique</span>
          </span>
        </Link>

        <nav aria-label="Navigation principale" className="hidden h-16 md:block">
          <ul className="flex h-full items-center gap-1">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href} className="h-full">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex h-full items-center border-b-2 px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40",
                      active
                        ? "border-primary text-foreground"
                        : "border-transparent text-text-secondary hover:border-border-strong hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {isConnected && profile ? (
            <>
              {isAdmin && (
                <Link
                  href={ROUTES.upload}
                  title="Publier un document"
                  className={cn(
                    "hidden h-9 items-center gap-2 rounded-md border border-border-strong px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface md:inline-flex",
                    FOCUS_RING
                  )}
                >
                  <Upload size={16} aria-hidden />
                  Publier
                </Link>
              )}
              <div className="hidden md:block">
                <ProfileMenu profile={profile} />
              </div>
            </>
          ) : (
            <Link
              href={ROUTES.login}
              className={cn(
                "hidden h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:inline-flex",
                FOCUS_RING
              )}
            >
              Se connecter
            </Link>
          )}

          <button
            type="button"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            aria-controls="menu-mobile"
            onClick={() => setOpen((value) => !value)}
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-surface md:hidden",
              FOCUS_RING
            )}
          >
            {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="menu-mobile"
          aria-label="Navigation mobile"
          className="border-t border-border bg-background md:hidden"
        >
          <ul className="mx-auto flex w-full max-w-[1280px] flex-col gap-0.5 px-4 py-3 sm:px-6">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-md px-3 py-2.5 text-base transition-colors",
                      active
                        ? "bg-surface font-semibold text-foreground"
                        : "font-medium text-text-secondary hover:bg-surface hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}

            <li className="mt-2 border-t border-border pt-3">
              {isConnected && profile ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 px-3">
                    <ProfileAvatar profile={profile} className="h-10 w-10 text-sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {profile.firstName} {profile.lastName}
                      </p>
                      <p className="truncate text-xs text-text-muted">
                        {roleLabelOf(profile.role)} · {profile.matricule}
                      </p>
                    </div>
                  </div>
                  {isAdmin && (
                    <Link
                      href={ROUTES.upload}
                      onClick={() => setOpen(false)}
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border-strong px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface"
                    >
                      <Upload size={16} aria-hidden />
                      Publier un document
                    </Link>
                  )}
                  <Link
                    href={ROUTES.changePassword}
                    onClick={() => setOpen(false)}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border-strong px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface"
                  >
                    <KeyRound size={16} aria-hidden />
                    Changer mon mot de passe
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      void signOut();
                    }}
                    className="flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Se déconnecter
                  </button>
                </div>
              ) : (
                <Link
                  href={ROUTES.login}
                  onClick={() => setOpen(false)}
                  className="flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Se connecter
                </Link>
              )}
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

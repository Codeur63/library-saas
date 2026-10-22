"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, KeyRound, LogOut } from "lucide-react";

import { ROUTES } from "@/constants/routes";
import ProfileAvatar, { roleLabelOf } from "@/features/auth/components/profile-avatar";
import { useSession } from "@/features/auth/components/session-provider";
import type { CurrentUser } from "@/server/current-user";
import { cn } from "@/lib/utils";

export default function ProfileMenu({ profile }: { profile: CurrentUser }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const { signOut } = useSession();

  // Referme le menu à chaque changement de page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const name = `${profile.firstName} ${profile.lastName}`;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2 rounded-md py-1 pl-1 pr-1.5 transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          open && "bg-surface"
        )}
      >
        <ProfileAvatar profile={profile} />
        <span className="hidden max-w-[10rem] flex-col text-left leading-tight lg:flex">
          <span className="truncate text-sm font-medium text-foreground">{name}</span>
          <span className="truncate text-xs text-text-muted">{roleLabelOf(profile.role)}</span>
        </span>
        <ChevronDown
          size={16}
          aria-hidden
          className={cn("shrink-0 text-text-muted transition-transform duration-150", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Menu du compte"
          className="absolute right-0 top-[calc(100%+0.5rem)] w-64 rounded-lg border border-border bg-background p-1.5 shadow-sm"
        >
          <div className="flex items-center gap-3 rounded-md px-3 py-2.5">
            <ProfileAvatar profile={profile} className="h-10 w-10 text-sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{name}</p>
              <p className="truncate text-xs text-text-muted">
                {roleLabelOf(profile.role)} · {profile.matricule}
              </p>
            </div>
          </div>

          <div role="separator" className="my-1.5 h-px bg-border" />

          <Link
            href={ROUTES.changePassword}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
          >
            <KeyRound size={16} aria-hidden className="text-text-muted" />
            Changer mon mot de passe
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
          >
            <LogOut size={16} aria-hidden className="text-text-muted" />
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}

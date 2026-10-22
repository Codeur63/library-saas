"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { useSession } from "@/features/auth/components/session-provider";
import { useFavorites } from "@/features/documents/components/favorites-provider";

export default function FavoriteButton({
  documentId,
  className,
}: {
  documentId: string;
  className?: string;
}) {
  const { profile, initialized } = useSession();
  const { isFavorite, toggle, ensureLoaded } = useFavorites();
  const [pending, setPending] = useState(false);

  // Déclenche le chargement paresseux des favoris (une seule fois par session).
  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  if (!initialized || !profile) return null;

  const active = isFavorite(documentId);

  const handleToggle = async () => {
    if (pending) return;
    setPending(true);
    await toggle(documentId);
    setPending(false);
  };

  return (
    <button
      type="button"
      onClick={() => void handleToggle()}
      aria-pressed={active}
      title={active ? "Retirer des favoris" : "Ajouter aux favoris"}
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border transition-colors",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-white text-text-muted hover:border-border-strong hover:text-foreground",
        className
      )}
    >
      <Heart size={17} aria-hidden className={cn(active && "fill-current")} />
      <span className="sr-only">{active ? "Retirer des favoris" : "Ajouter aux favoris"}</span>
    </button>
  );
}

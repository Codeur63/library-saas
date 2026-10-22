"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

import { useSession } from "@/features/auth/components/session-provider";
import { addFavoriteAction, getFavoriteIdsAction, removeFavoriteAction } from "@/server/actions/favorites.actions";

interface FavoritesContextValue {
  ready: boolean;
  isFavorite: (documentId: string) => boolean;
  toggle: (documentId: string) => Promise<boolean>;
  /** Charge les favoris à la demande (au premier composant qui en a besoin). */
  ensureLoaded: () => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useSession();
  const profileId = profile?.id ?? null;

  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const loadingRef = useRef<string | null>(null);

  // Chargement paresseux : aucune requête tant qu'aucun bouton favori n'est
  // monté. Évite un aller-retour serveur sur les pages sans favoris.
  const ensureLoaded = useCallback(() => {
    if (!profileId) return;
    if (loadedFor === profileId || loadingRef.current === profileId) return;
    const requested = profileId;
    loadingRef.current = requested;
    void getFavoriteIdsAction().then((result) => {
      if (loadingRef.current !== requested) return;
      setIds(new Set(result.ok ? result.data : []));
      setLoadedFor(requested);
    });
  }, [profileId, loadedFor]);

  const ready = profileId !== null && loadedFor === profileId;

  const isFavorite = useCallback(
    (documentId: string) => ready && ids.has(documentId),
    [ready, ids]
  );

  const toggle = useCallback(
    async (documentId: string) => {
      const wasFavorite = ready && ids.has(documentId);
      setIds((current) => {
        const next = new Set(current);
        if (wasFavorite) next.delete(documentId);
        else next.add(documentId);
        return next;
      });

      const result = wasFavorite
        ? await removeFavoriteAction(documentId)
        : await addFavoriteAction(documentId);

      if (!result.ok) {
        setIds((current) => {
          const next = new Set(current);
          if (wasFavorite) next.add(documentId);
          else next.delete(documentId);
          return next;
        });
        return wasFavorite;
      }
      return !wasFavorite;
    },
    [ready, ids]
  );

  const value = useMemo(
    () => ({ ready, isFavorite, toggle, ensureLoaded }),
    [ready, isFavorite, toggle, ensureLoaded]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites doit être utilisé dans <FavoritesProvider>.");
  }
  return context;
}

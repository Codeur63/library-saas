"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Session as SupabaseSession } from "@supabase/supabase-js";

import { getProfileAction, loginAction } from "@/server/actions/auth.actions";
import type { ActionResult } from "@/server/errors";
import type { CurrentUser } from "@/server/current-user";
import { createClient } from "@/lib/supabase/browser";

export interface LoginResult {
  matricule: string;
  role: CurrentUser["role"];
  mustChangePassword: boolean;
  next: string;
}

export interface SessionContextValue {
  session: SupabaseSession | null;
  profile: CurrentUser | null;
  initialized: boolean;
  signIn: (matricule: string, password: string, requestedNext?: string) => Promise<ActionResult<LoginResult>>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({
  children,
  initialProfile = null,
}: {
  children: React.ReactNode;
  initialProfile?: CurrentUser | null;
}) {
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [profile, setProfile] = useState<CurrentUser | null>(initialProfile);
  const [initialized, setInitialized] = useState(initialProfile !== undefined && initialProfile !== null);
  const supabaseRef = useRef(createClient());

  const refresh = useCallback(async () => {
    const {
      data: { session: current },
    } = await supabaseRef.current.auth.getSession();
    setSession(current);

    if (current) {
      const result = await getProfileAction();
      setProfile(result.ok ? result.data : null);
    } else {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const init = async () => {
      const {
        data: { session: current },
      } = await supabaseRef.current.auth.getSession();
      if (!active) return;
      setSession(current);
      if (current) {
        const result = await getProfileAction();
        if (!active) return;
        setProfile(result.ok ? result.data : null);
      }
      setInitialized(true);
    };

    const {
      data: { subscription },
    } = supabaseRef.current.auth.onAuthStateChange((event) => {
      // L'événement initial est déjà traité par init() ci-dessous : on évite un
      // second getProfileAction (aller-retour serveur) au chargement.
      if (event === "INITIAL_SESSION") return;
      void refresh();
    });

    void init();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [refresh]);

  const signIn = useCallback(
    async (matricule: string, password: string, requestedNext?: string) => {
      const result = await loginAction(matricule, password, requestedNext);
      if (result.ok) {
        await refresh();
      }
      return result;
    },
    [refresh]
  );

  const signOut = useCallback(async () => {
    await supabaseRef.current.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  return (
    <SessionContext.Provider value={{ session, profile, initialized, signIn, signOut, refresh }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession doit être utilisé dans <SessionProvider>.");
  }
  return context;
}
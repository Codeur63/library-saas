import "server-only";

import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { createServerSupabase } from "@/lib/supabase/server";
import { requestCache } from "@/server/request-cache";

export interface CurrentUser {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  role: "STUDENT" | "ADMIN" | "SUPERADMIN";
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  mustChangePassword: boolean;
  programId: string | null;
  levelId: string | null;
  programName: string | null;
  levelCode: string | null;
}

async function profileToCurrentUser(profileId: string): Promise<CurrentUser> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: {
      id: true,
      matricule: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      mustChangePassword: true,
      programId: true,
      levelId: true,
      program: { select: { name: true } },
      level: { select: { code: true } },
    },
  });

  if (!profile) {
    throw new AppError("UNAUTHORIZED", "Profil introuvable, contactez l’administration.", 401);
  }

  return {
    id: profile.id,
    matricule: profile.matricule,
    firstName: profile.firstName,
    lastName: profile.lastName,
    role: profile.role,
    status: profile.status,
    mustChangePassword: profile.mustChangePassword,
    programId: profile.programId,
    levelId: profile.levelId,
    programName: profile.program?.name ?? null,
    levelCode: profile.level?.code ?? null,
  };
}

/**
 * Profil de l'utilisateur connecté (ou null).
 *
 * Mémoïsé par requête via React `cache()` : un même rendu (page + services +
 * catalogue) n'exécute plus qu'UN appel `supabase.auth.getUser()` et UNE
 * requête Prisma au lieu de plusieurs. `requireCurrentUser` en hérite.
 */
export const getCurrentUser = requestCache(async (): Promise<CurrentUser | null> => {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  try {
    return await profileToCurrentUser(user.id);
  } catch (error) {
    if (error instanceof AppError) return null;
    throw error;
  }
});

/** Retourne le profil connecté ou lève une erreur UNAUTHORIZED. */
export async function requireCurrentUser(): Promise<CurrentUser> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new AppError("UNAUTHORIZED", "Vous devez être connecté pour effectuer cette action.", 401);
  }
  return currentUser;
}

/** Retourne un utilisateur connecté autorisé à utiliser la bibliothèque. */
export async function requireLibraryUser(): Promise<CurrentUser> {
  const currentUser = await requireCurrentUser();
  assertCanUseLibrary(currentUser);
  return currentUser;
}

/** Vérifie qu'un compte actif, en règle, peut accéder à la bibliothèque. */
export function assertCanUseLibrary(currentUser: CurrentUser): void {
  if (currentUser.status !== "ACTIVE") {
    throw new AppError("FORBIDDEN", "Ce compte est inactif ou suspendu.", 403);
  }
  if (currentUser.mustChangePassword) {
    throw new AppError("MUST_CHANGE_PASSWORD", "Veuillez définir votre mot de passe avant de continuer.", 403);
  }
}

export function assertAdmin(currentUser: CurrentUser): void {
  if (currentUser.role !== "ADMIN" && currentUser.role !== "SUPERADMIN") {
    throw new AppError("FORBIDDEN", "Action réservée aux administrateurs.", 403);
  }
}

export function assertSuperadmin(currentUser: CurrentUser): void {
  if (currentUser.role !== "SUPERADMIN") {
    throw new AppError("FORBIDDEN", "Action réservée aux super-administrateurs.", 403);
  }
}
import "server-only";

import { normalizeMatricule } from "@/features/auth/lib/matricule";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/server/errors";
import { requireCurrentUser, type CurrentUser } from "@/server/current-user";
import { enforceRateLimit, RATE_LIMITS, rateLimitKey, resetRateLimit } from "@/server/rate-limit";

const MIN_PASSWORD_LENGTH = 8;

export interface LoginSuccess {
  matricule: string;
  role: CurrentUser["role"];
  mustChangePassword: boolean;
}

export function validateNewPassword(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new AppError("INVALID_INPUT", "Le mot de passe doit contenir au moins 8 caractères.");
  }
}

/**
 * Login par matricule.
 *
 * L'utilisateur ne tape jamais d'email : on résout l'identité technique Supabase
 * (email forfaitaire) via le profil, puis on signe la session serveur.
 */
export async function loginWithMatricule(
  matriculeInput: string,
  password: string,
  clientIpValue?: string
): Promise<LoginSuccess> {
  const matricule = normalizeMatricule(matriculeInput);

  // Anti brute-force : quota par matricule visé, puis par adresse IP.
  // Seules les tentatives ÉCHOUÉES s'accumulent (un succès réinitialise).
  const matriculeLimitKey = rateLimitKey("login:matricule", matricule);
  const ipLimitKey = clientIpValue ? rateLimitKey("login:ip", clientIpValue) : null;
  await enforceRateLimit({ key: matriculeLimitKey, ...RATE_LIMITS.loginByMatricule });
  if (ipLimitKey) {
    await enforceRateLimit({ key: ipLimitKey, ...RATE_LIMITS.loginByIp });
  }

  if (!password) {
    throw new AppError("INVALID_INPUT", "Le mot de passe est requis.");
  }

  const profile = await prisma.profile.findUnique({
    where: { matricule },
    select: { id: true, matricule: true, role: true, status: true, mustChangePassword: true },
  });

  if (!profile) {
    throw new AppError("INVALID_CREDENTIALS", "Matricule ou mot de passe incorrect.");
  }

  if (profile.status !== "ACTIVE") {
    throw new AppError("FORBIDDEN", "Ce compte est inactif ou suspendu. Contactez l’administration.", 403);
  }

  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(profile.id);
  if (authError || !authUser.user?.email) {
    throw new AppError("INVALID_CREDENTIALS", "Matricule ou mot de passe incorrect.");
  }

  const supabase = await createServerSupabase();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: authUser.user.email,
    password,
  });

  if (signInError) {
    throw new AppError("INVALID_CREDENTIALS", "Matricule ou mot de passe incorrect.", 401);
  }

  // Connexion réussie : on solde les compteurs de tentatives.
  await resetRateLimit(matriculeLimitKey);
  if (ipLimitKey) await resetRateLimit(ipLimitKey);

  await touchActivity(profile.id);

  return {
    matricule: profile.matricule,
    role: profile.role,
    mustChangePassword: profile.mustChangePassword,
  };
}

/** Redirige : d'abord vers le changement de mot de passe, sinon la destination. */
export function resolvePostLoginPath(mustChangePassword: boolean, requestedNext?: string): string {
  if (mustChangePassword) return "/auth/change-password";
  if (requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")) {
    return requestedNext;
  }
  return "/";
}

/**
 * Changement de mot de passe.
 * Exige la session + le mot de passe actuel, puis invalide le drapeau
 * `mustChangePassword` côté serveur (jamais modifiable par le client).
 */
export async function changePassword(currentPassword: string, newPassword: string, confirmPassword?: string): Promise<void> {
  const currentUser = await requireCurrentUser();
  validateNewPassword(newPassword);
  if (confirmPassword !== undefined && confirmPassword !== newPassword) {
    throw new AppError("INVALID_INPUT", "Les deux mots de passe ne correspondent pas.");
  }
  if (!currentPassword) {
    throw new AppError("INVALID_INPUT", "Le mot de passe actuel est requis.");
  }

  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(currentUser.id);
  const email = authUser?.user?.email;
  if (!email) {
    throw new AppError("UNAUTHORIZED", "Impossible de retrouver ce compte.", 401);
  }

  const supabase = await createServerSupabase();

  // Vérifier le mot de passe actuel (obligatoire, même en première connexion).
  const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (verifyError) {
    throw new AppError("INVALID_CREDENTIALS", "Le mot de passe actuel est incorrect.", 401);
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) {
    throw new AppError("INVALID_INPUT", "Impossible de modifier le mot de passe. Réessayez.");
  }

  await prisma.profile.update({
    where: { id: currentUser.id },
    data: { mustChangePassword: false },
  });

  await touchActivity(currentUser.id);
}

/** Déconnexion : invalide la session serveur (cookies Supabase). */
export async function logout(): Promise<void> {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
}

/**
 * Met à jour lastActivityAt à raison d'1 écriture maximum par jour
 * (évite un UPDATE à chaque clic).
 */
async function touchActivity(userId: string): Promise<void> {
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { lastActivityAt: true } });
  const lastActivity = profile?.lastActivityAt;

  if (!lastActivity || lastActivity.getTime() < Date.now() - 12 * 60 * 60 * 1000) {
    await prisma.profile.update({
      where: { id: userId },
      data: { lastActivityAt: new Date() },
    });
  }
}
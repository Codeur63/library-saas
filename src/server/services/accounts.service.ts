import "server-only";

import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AppError } from "@/server/errors";

const TEMP_PASSWORD_LENGTH = 12;

/** Génère un mot de passe temporaire robuste (jamais persisté en clair). */
export function generateTemporaryPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
  const bytes = crypto.getRandomValues(new Uint8Array(TEMP_PASSWORD_LENGTH));
  let password = "";
  for (let i = 0; i < TEMP_PASSWORD_LENGTH; i++) {
    password += alphabet[bytes[i] % alphabet.length];
  }
  return password;
}

export type ProvisionRole = "STUDENT" | "ADMIN" | "SUPERADMIN";

export interface ProvisionAccountInput {
  matricule: string;
  email: string;
  firstName: string;
  lastName: string;
  role: ProvisionRole;
  programId?: string | null;
  levelId?: string | null;
  optionId?: string | null;
}

/**
 * Provisionne un compte complet : auth.users (Supabase) → profiles (Prisma),
 * avec compensation si la création du profil échoue.
 * Ne loggue jamais l'action : la responsabilité revient au service appelant.
 */
export async function provisionAccount(
  input: ProvisionAccountInput
): Promise<{ id: string; temporaryPassword: string }> {
  const temporaryPassword = generateTemporaryPassword();

  const { data: authUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
    email: input.email.toLowerCase(),
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { matricule: input.matricule },
    app_metadata: {},
  });

  if (createAuthError || !authUser.user) {
    throw new AppError("INVALID_INPUT", "Impossible de créer le compte (e-mail peut-être déjà utilisé).", 409);
  }

  try {
    await prisma.profile.create({
      data: {
        id: authUser.user.id,
        matricule: input.matricule,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        status: "ACTIVE",
        mustChangePassword: true,
        programId: input.programId ?? null,
        levelId: input.levelId ?? null,
        optionId: input.optionId ?? null,
      },
    });
  } catch (error) {
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
    throw error;
  }

  return { id: authUser.user.id, temporaryPassword };
}

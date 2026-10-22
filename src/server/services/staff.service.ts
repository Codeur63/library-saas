import "server-only";

import { Prisma } from "@generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AppError } from "@/server/errors";
import { assertSuperadmin, requireCurrentUser } from "@/server/current-user";
import {
  type CreateStaffInput,
  type SetStudentStatusInput,
} from "@/server/dto";
import { logAdminAction } from "@/server/services/admin-log.service";
import { generateTemporaryPassword, provisionAccount } from "@/server/services/accounts.service";

/**
 * Récupère un compte ADMIN (jamais un SUPERADMIN).
 * La règle métier est volontaire : un super-admin ne se gère
 * que directement dans la base de données.
 */
async function findManagedAdmin(matricule: string) {
  return prisma.profile.findFirst({
    where: { matricule, role: "ADMIN" },
    select: { id: true, matricule: true, status: true },
  });
}

export interface StaffListItem {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "SUPERADMIN";
  status: string;
  lastActivityAt: Date | null;
  createdAt: Date;
}

/**
 * Crée un compte administratif (ADMIN ou SUPERADMIN).
 * Strictement réservé aux SUPERADMIN.
 */
export async function createStaff(input: CreateStaffInput, currentUser = requireCurrentUser) {
  const actor = await currentUser();
  assertSuperadmin(actor);

  const existing = await prisma.profile.findUnique({
    where: { matricule: input.matricule },
    select: { id: true },
  });
  if (existing) {
    throw new AppError("MATRICULE_ALREADY_EXISTS", "Ce matricule est déjà utilisé.");
  }

  const { id, temporaryPassword } = await provisionAccount({
    matricule: input.matricule,
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    role: input.role,
  });

  await logAdminAction({
    actorId: actor.id,
    action: "staff.created",
    targetType: "staff",
    targetId: id,
    details: { matricule: input.matricule, role: input.role },
  });

  return {
    id,
    matricule: input.matricule,
    role: input.role,
    temporaryPassword,
    mustChangePassword: true,
  };
}

/** Liste paginée des personnels administratifs (SUPERADMIN uniquement). */
export async function listStaff(
  params: { page?: number; pageSize?: number; q?: string; role?: string },
  currentUser = requireCurrentUser
): Promise<{ items: StaffListItem[]; total: number; page: number; pageSize: number }> {
  const actor = await currentUser();
  assertSuperadmin(actor);

  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 24));
  const roleFilter: "ADMIN" | "SUPERADMIN" | undefined =
    params.role === "ADMIN" || params.role === "SUPERADMIN" ? params.role : undefined;

  const where: Prisma.ProfileWhereInput = {
    role: roleFilter ?? { in: ["ADMIN", "SUPERADMIN"] },
    ...(params.q
      ? {
          OR: [
            { matricule: { contains: params.q, mode: "insensitive" } },
            { firstName: { contains: params.q, mode: "insensitive" } },
            { lastName: { contains: params.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.profile.findMany({
      where,
      select: {
        id: true,
        matricule: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        lastActivityAt: true,
        createdAt: true,
      },
      orderBy: [{ role: "desc" }, { createdAt: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.profile.count({ where }),
  ]);

  return {
    items: items.map((item) => ({
      id: item.id,
      matricule: item.matricule,
      firstName: item.firstName,
      lastName: item.lastName,
      role: item.role === "SUPERADMIN" ? "SUPERADMIN" : "ADMIN",
      status: item.status,
      lastActivityAt: item.lastActivityAt,
      createdAt: item.createdAt,
    })),
    total,
    page,
    pageSize,
  };
}

/** Active / suspend / désactive un ADMIN (SUPERADMIN uniquement). */
export async function setStaffStatus(input: SetStudentStatusInput, currentUser = requireCurrentUser) {
  const actor = await currentUser();
  assertSuperadmin(actor);

  const profile = await findManagedAdmin(input.matricule);
  if (!profile) {
    throw new AppError("FORBIDDEN", "Seuls les comptes administrateurs peuvent être modifiés ici.", 403);
  }

  if (profile.status === input.status) {
    return { id: profile.id, matricule: profile.matricule, status: profile.status };
  }

  await prisma.profile.update({
    where: { id: profile.id },
    data: { status: input.status },
  });

  await logAdminAction({
    actorId: actor.id,
    action: "staff.status_changed",
    targetType: "staff",
    targetId: profile.id,
    details: { matricule: profile.matricule, from: profile.status, to: input.status },
  });

  return { id: profile.id, matricule: profile.matricule, status: input.status };
}

/** Réinitialise le mot de passe d'un ADMIN (SUPERADMIN uniquement). */
export async function resetStaffPassword(matricule: string, currentUser = requireCurrentUser) {
  const actor = await currentUser();
  assertSuperadmin(actor);

  const profile = await findManagedAdmin(matricule);
  if (!profile) {
    throw new AppError("FORBIDDEN", "Seuls les comptes administrateurs peuvent être modifiés ici.", 403);
  }

  const temporaryPassword = generateTemporaryPassword();
  const { error } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
    password: temporaryPassword,
  });
  if (error) throw new AppError("INVALID_INPUT", "Impossible de réinitialiser ce compte.", 500);

  await prisma.profile.update({
    where: { id: profile.id },
    data: { mustChangePassword: true },
  });

  await logAdminAction({
    actorId: actor.id,
    action: "staff.password_reset",
    targetType: "staff",
    targetId: profile.id,
    details: { matricule: profile.matricule },
  });

  return { id: profile.id, matricule: profile.matricule, temporaryPassword, mustChangePassword: true };
}

import "server-only";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AppError } from "@/server/errors";
import { assertAdmin, requireCurrentUser } from "@/server/current-user";
import {
  StudentStatusSchema,
  type CreateStudentInput,
  type SetStudentStatusInput,
  type UpdateStudentInput,
} from "@/server/dto";
import { logAdminAction } from "@/server/services/admin-log.service";
import { invalidateDashboardStats } from "@/server/cache";
import { generateTemporaryPassword, provisionAccount } from "@/server/services/accounts.service";

type StudentStatusUnion = z.infer<typeof StudentStatusSchema>;

async function ensureProgramAndLevel(programId: string, levelId: string, optionId?: string | null): Promise<void> {
  const [program, level, option] = await Promise.all([
    prisma.program.findFirst({
      where: { id: programId, isActive: true },
      select: { id: true },
    }),
    prisma.academicLevel.findFirst({
      where: { id: levelId, isActive: true },
      select: { id: true },
    }),
    optionId
      ? prisma.programOption.findFirst({
          where: { id: optionId, programId, isActive: true },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (!program) throw new AppError("INVALID_INPUT", "Filière invalide ou inactive.", 422);
  if (!level) throw new AppError("INVALID_INPUT", "Niveau invalide ou inactif.", 422);
  if (optionId && !option) throw new AppError("INVALID_INPUT", "Option invalide pour cette filière.", 422);
}

/**
 * Recherche un profil étudiant par matricule.
 * Les comptes ADMIN/SUPERADMIN ne sont jamais exposés ici :
 * ils se gèrent via le service dédié (staff.service).
 */
async function findStudent(matricule: string) {
  return prisma.profile.findFirst({
    where: { matricule, role: "STUDENT" },
    select: { id: true, matricule: true, status: true, programId: true, levelId: true },
  });
}

/**
 * Crée un étudiant (ADMIN/SUPERADMIN uniquement) :
 * auth.user (Supabase) → profiles (Prisma), avec rollback si la 2e étape échoue.
 */
export async function createStudent(input: CreateStudentInput, currentUser = requireCurrentUser) {
  const actor = await currentUser();
  assertAdmin(actor);

  const existing = await prisma.profile.findUnique({ where: { matricule: input.matricule }, select: { id: true } });
  if (existing) {
    throw new AppError("MATRICULE_ALREADY_EXISTS", "Ce matricule est déjà utilisé.");
  }

  await ensureProgramAndLevel(input.programId, input.levelId, input.optionId ?? null);

  const { id, temporaryPassword } = await provisionAccount({
    matricule: input.matricule,
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    role: "STUDENT",
    programId: input.programId,
    levelId: input.levelId,
    optionId: input.optionId ?? null,
  });

  invalidateDashboardStats();

  await logAdminAction({
    actorId: actor.id,
    action: "student.created",
    targetType: "student",
    targetId: id,
    details: { matricule: input.matricule, programId: input.programId, levelId: input.levelId },
  });

  return {
    id,
    matricule: input.matricule,
    temporaryPassword,
    mustChangePassword: true,
  };
}

/**
 * Réinitialise le mot de passe d'un étudiant (ADMIN/SUPERADMIN) :
 * nouveau secret temporaire + must_change_password = true.
 * Ne retourne JAMAIS un hash existant.
 */
export async function resetStudentPassword(matricule: string, currentUser = requireCurrentUser) {
  const actor = await currentUser();
  assertAdmin(actor);

  const profile = await findStudent(matricule);
  if (!profile) throw new AppError("STUDENT_NOT_FOUND", "Étudiant introuvable.", 404);

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
    action: "student.password_reset",
    targetType: "student",
    targetId: profile.id,
    details: { matricule: profile.matricule },
  });

  return { id: profile.id, matricule: profile.matricule, temporaryPassword, mustChangePassword: true };
}

/** Active / désactive / suspend un compte (ADMIN/SUPERADMIN). */
export async function setStudentStatus(input: SetStudentStatusInput, currentUser = requireCurrentUser) {
  const actor = await currentUser();
  assertAdmin(actor);

  const profile = await findStudent(input.matricule);
  if (!profile) throw new AppError("STUDENT_NOT_FOUND", "Étudiant introuvable.", 404);

  if (profile.status === input.status) {
    return { id: profile.id, matricule: profile.matricule, status: profile.status };
  }

  await prisma.profile.update({
    where: { id: profile.id },
    data: { status: input.status as StudentStatusUnion },
  });

  invalidateDashboardStats();

  await logAdminAction({
    actorId: actor.id,
    action: "student.status_changed",
    targetType: "student",
    targetId: profile.id,
    details: { matricule: profile.matricule, from: profile.status, to: input.status },
  });

  return { id: profile.id, matricule: profile.matricule, status: input.status };
}

/**
 * Met à jour l'identité ou l'affectation académique d'un étudiant
 * (ADMIN/SUPERADMIN). L'e-mail, propriété de Supabase Auth, est
 * synchronisé séparément via le client admin.
 */
export async function updateStudent(
  matricule: string,
  input: UpdateStudentInput,
  currentUser = requireCurrentUser
) {
  const actor = await currentUser();
  assertAdmin(actor);

  const profile = await findStudent(matricule);
  if (!profile) throw new AppError("STUDENT_NOT_FOUND", "Étudiant introuvable.", 404);

  if (input.matricule && input.matricule !== profile.matricule) {
    const conflict = await prisma.profile.findUnique({
      where: { matricule: input.matricule },
      select: { id: true },
    });
    if (conflict) throw new AppError("MATRICULE_ALREADY_EXISTS", "Ce matricule est déjà utilisé.");
  }

  const programId = input.programId ?? profile.programId;
  const levelId = input.levelId ?? profile.levelId;

  if (programId && levelId && (input.programId || input.levelId || input.optionId !== undefined)) {
    await ensureProgramAndLevel(programId, levelId, input.optionId ?? null);
  }

  if (input.email) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
      email: input.email.toLowerCase(),
    });
    if (error) throw new AppError("INVALID_INPUT", "Impossible de mettre à jour l’e-mail.", 409);
  }

  const updated = await prisma.profile.update({
    where: { id: profile.id },
    data: {
      ...(input.matricule ? { matricule: input.matricule } : {}),
      ...(input.firstName ? { firstName: input.firstName } : {}),
      ...(input.lastName ? { lastName: input.lastName } : {}),
      ...(input.programId ? { programId: input.programId } : {}),
      ...(input.levelId ? { levelId: input.levelId } : {}),
      ...(input.optionId !== undefined ? { optionId: input.optionId } : {}),
    },
    select: { id: true, matricule: true, firstName: true, lastName: true },
  });

  invalidateDashboardStats();

  await logAdminAction({
    actorId: actor.id,
    action: "student.updated",
    targetType: "student",
    targetId: profile.id,
    details: { matricule: profile.matricule, changes: Object.keys(input) },
  });

  return updated;
}

export interface StudentListItem {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  email?: string;
  role: string;
  status: string;
  programName: string | null;
  levelCode: string | null;
  createdAt: Date;
}

/** Liste paginée des étudiants (ADMIN/SUPERADMIN). */
export async function listStudents(
  params: { page?: number; pageSize?: number; q?: string; status?: string },
  currentUser = requireCurrentUser
): Promise<{ items: StudentListItem[]; total: number; page: number; pageSize: number }> {
  const actor = await currentUser();
  assertAdmin(actor);

  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 24));
  const where = {
    role: "STUDENT" as const,
    ...(params.q
      ? {
          OR: [
            { matricule: { contains: params.q, mode: "insensitive" as const } },
            { firstName: { contains: params.q, mode: "insensitive" as const } },
            { lastName: { contains: params.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(params.status ? { status: params.status as StudentStatusUnion } : {}),
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
        programId: true,
        program: { select: { name: true } },
        level: { select: { code: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
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
      role: item.role,
      status: item.status,
      programName: item.program?.name ?? null,
      levelCode: item.level?.code ?? null,
      createdAt: item.createdAt,
    })),
    total,
    page,
    pageSize,
  };
}

export type StudentStatus = StudentStatusUnion;
import { z } from "zod";

// ============================================================================
// DTOs serveur — validation runtime de tous les inputs métier.
// Le frontend ne décide jamais seul : chaque entrée est revérifiée ici,
// côté serveur, avant d'atteindre un service.
// ============================================================================

export const matriculaId = z
  .string()
  .trim()
  .min(1, "Le matricule est requis.")
  .regex(/^[A-Z0-9-]{3,20}$/, "Matricule invalide.")
  .transform((value) => value.toUpperCase());

export const uuid = z.string().trim().uuid("Identifiant invalide.");

export const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
  .max(128, "Le mot de passe est trop long.");

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Le nom est requis.")
  .max(100, "Le nom est trop long.");

export const emailSchema = z
  .string()
  .trim()
  .email("Adresse e-mail invalide.");

const roleSchema = z.enum(["STUDENT", "ADMIN", "SUPERADMIN"]);

// ----------------------------------------------------------------------------
// Étudiants
// ----------------------------------------------------------------------------

export const CreateStudentInputSchema = z.object({
  matricule: matriculaId,
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  programId: uuid,
  levelId: uuid,
  optionId: uuid.nullable().optional(),
});

export type CreateStudentInput = z.infer<typeof CreateStudentInputSchema>;

export const UpdateStudentInputSchema = z
  .object({
    matricule: matriculaId.optional(),
    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
    email: emailSchema.optional(),
    programId: uuid.optional(),
    levelId: uuid.optional(),
    optionId: uuid.nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "Aucune modification fournie.");

export type UpdateStudentInput = z.infer<typeof UpdateStudentInputSchema>;

export const StudentStatusSchema = z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]);

export const SetStudentStatusSchema = z.object({
  matricule: matriculaId,
  status: StudentStatusSchema,
});

export type SetStudentStatusInput = z.infer<typeof SetStudentStatusSchema>;

// ----------------------------------------------------------------------------
// Personnels administratifs (ADMIN / SUPERADMIN)
// ----------------------------------------------------------------------------

export const staffRoleSchema = z.enum(["ADMIN", "SUPERADMIN"]);

export const CreateStaffInputSchema = z.object({
  matricule: matriculaId,
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  role: staffRoleSchema,
});

export type CreateStaffInput = z.infer<typeof CreateStaffInputSchema>;

export const SetStaffStatusSchema = z.object({
  matricule: matriculaId,
  status: StudentStatusSchema,
});

export type SetStaffStatusInput = z.infer<typeof SetStaffStatusSchema>;

// ----------------------------------------------------------------------------
// Documents
// ----------------------------------------------------------------------------

export const visibilitySchema = z.enum(["GLOBAL", "PROGRAM"]);

export const semesterSchema = z.enum(["S1", "S2", "ANNUAL"]).nullable().optional();

export const CreateDocumentInputSchema = z
  .object({
    title: z.string().trim().min(1, "Le titre est requis.").max(255, "Le titre est trop long."),
    description: z.string().trim().max(4000, "La description est trop longue.").optional().or(z.literal("")),
    subjectId: uuid,
    categoryId: uuid,
    academicYearId: uuid.nullable().optional(),
    semester: semesterSchema,
    visibility: visibilitySchema.default("GLOBAL"),
    accessProgramId: uuid.nullable().optional(),
  })
  .refine(
    (data) => !(data.visibility === "GLOBAL" && data.accessProgramId),
    "Un document GLOBAL ne peut pas cibler une filière spécifique."
  )
  .refine(
    (data) => !(data.visibility === "PROGRAM" && !data.accessProgramId),
    "Un document PROGRAM doit cibler une filière."
  );

export type CreateDocumentInput = z.infer<typeof CreateDocumentInputSchema>;

export const UpdateDocumentInputSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().max(4000).optional(),
    subjectId: uuid.optional(),
    categoryId: uuid.optional(),
    academicYearId: uuid.nullable().optional(),
    semester: semesterSchema,
    visibility: visibilitySchema.optional(),
    accessProgramId: uuid.nullable().optional(),
    isPublished: z.boolean().optional(),
  })
  .refine(
    (data) => !(data.visibility === "GLOBAL" && data.accessProgramId),
    "Un document GLOBAL ne peut pas cibler une filière spécifique."
  )
  .refine(
    (data) => !(data.visibility === "PROGRAM" && !data.accessProgramId),
    "Un document PROGRAM doit cibler une filière."
  );

export type UpdateDocumentInput = z.infer<typeof UpdateDocumentInputSchema>;

// ----------------------------------------------------------------------------
// Recherche / filtres / pagination des documents
// ----------------------------------------------------------------------------

export const documentQuerySchema = z.object({
  q: z.string().trim().max(200).optional().or(z.literal("")),
  programId: uuid.optional(),
  levelId: uuid.optional(),
  subjectId: uuid.optional(),
  categoryId: uuid.optional(),
  academicYearId: uuid.optional(),
  sort: z.enum(["newest", "oldest", "title-asc", "title-desc", "most-downloaded"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
});

export type DocumentQueryInput = z.infer<typeof documentQuerySchema>;

// ----------------------------------------------------------------------------
// Favoris
// ----------------------------------------------------------------------------

export const FavoriteInputSchema = z.object({
  documentId: uuid,
});

export type FavoriteInput = z.infer<typeof FavoriteInputSchema>;

export const favoriteQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
});

export type FavoriteQueryInput = z.infer<typeof favoriteQuerySchema>;

// ----------------------------------------------------------------------------
// Mot de passe (admin)
// ----------------------------------------------------------------------------

export const ResetStudentPasswordSchema = z.object({
  matricule: matriculaId,
});

export type ResetStudentPasswordInput = z.infer<typeof ResetStudentPasswordSchema>;
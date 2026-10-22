export const ACCEPTED_MIME = ["application/pdf"];
export const MAX_TITLE_LENGTH = 255;
export const MAX_DESCRIPTION_LENGTH = 4000;

export type UploadSemester = "" | "S1" | "S2" | "ANNUAL";
export type UploadVisibility = "GLOBAL" | "PROGRAM";

export interface UploadFormValues {
  title: string;
  description: string;
  programId: string;
  levelId: string;
  subjectId: string;
  categoryId: string;
  academicYearId: string;
  semester: UploadSemester;
  visibility: UploadVisibility;
  accessProgramId: string;
}

export interface UploadErrors {
  title?: string;
  description?: string;
  subjectId?: string;
  categoryId?: string;
  accessProgramId?: string;
  file?: string;
}

export function validateUpload(values: UploadFormValues, hasFile: boolean): UploadErrors {
  const errors: UploadErrors = {};

  if (!values.title.trim()) errors.title = "Le titre est requis.";
  else if (values.title.trim().length > MAX_TITLE_LENGTH)
    errors.title = `Le titre ne peut pas dépasser ${MAX_TITLE_LENGTH} caractères.`;

  if (values.description.trim().length > MAX_DESCRIPTION_LENGTH)
    errors.description = `La description ne peut pas dépasser ${MAX_DESCRIPTION_LENGTH} caractères.`;

  if (!values.subjectId) errors.subjectId = "Sélectionnez une matière.";
  if (!values.categoryId) errors.categoryId = "Sélectionnez un type de document.";
  if (values.visibility === "PROGRAM" && !values.accessProgramId)
    errors.accessProgramId = "Sélectionnez la filière ciblée.";

  if (!hasFile) errors.file = "Le fichier PDF est requis.";

  return errors;
}

export function validateFile(file: File, maxMb = 50): string | undefined {
  if (!ACCEPTED_MIME.includes(file.type)) {
    return "Seuls les fichiers PDF sont acceptés.";
  }
  if (file.size === 0) {
    return "Le fichier est vide.";
  }
  if (file.size > maxMb * 1024 * 1024) {
    return `Fichier trop volumineux (${maxMb} Mo maximum).`;
  }
  return undefined;
}

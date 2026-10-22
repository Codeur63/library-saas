import { describe, expect, it } from "vitest";

import {
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  validateFile,
  validateUpload,
} from "@/features/uploads/validation";

const VALID_VALUES = {
  title: "Algorithmique — TD 4",
  description: "Récursivité et tris.",
  programId: "prog-1",
  levelId: "lvl-1",
  subjectId: "subj-1",
  categoryId: "cat-1",
  academicYearId: "",
  semester: "" as const,
  visibility: "GLOBAL" as const,
  accessProgramId: "",
};

function createFile({ type, size }: { type: string; size: number }): File {
  return new File([new Uint8Array(size)], "td4.pdf", { type });
}

describe("validateUpload", () => {
  it("signale les champs obligatoires", () => {
    const errors = validateUpload(
      { ...VALID_VALUES, title: "  ", subjectId: "", categoryId: "" },
      false
    );
    expect(errors.title).toBeTruthy();
    expect(errors.subjectId).toBeTruthy();
    expect(errors.categoryId).toBeTruthy();
    expect(errors.file).toBeTruthy();
  });

  it("valide un formulaire correct avec fichier", () => {
    expect(validateUpload(VALID_VALUES, true)).toEqual({});
  });

  it("exige une filière ciblée en visibilité PROGRAM", () => {
    const errors = validateUpload(
      { ...VALID_VALUES, visibility: "PROGRAM", accessProgramId: "" },
      true
    );
    expect(errors.accessProgramId).toBeTruthy();
  });

  it("rejette un titre trop long", () => {
    const errors = validateUpload({ ...VALID_VALUES, title: "a".repeat(MAX_TITLE_LENGTH + 1) }, true);
    expect(errors.title).toBeTruthy();
  });

  it("rejette une description trop longue", () => {
    const errors = validateUpload(
      { ...VALID_VALUES, description: "a".repeat(MAX_DESCRIPTION_LENGTH + 1) },
      true
    );
    expect(errors.description).toBeTruthy();
  });
});

describe("validateFile", () => {
  it("accepte un PDF", () => {
    expect(validateFile(createFile({ type: "application/pdf", size: 100 }))).toBeUndefined();
  });

  it("rejette un fichier non PDF", () => {
    expect(validateFile(createFile({ type: "text/plain", size: 100 }))).toBeTruthy();
  });

  it("rejette un fichier vide", () => {
    expect(validateFile(createFile({ type: "application/pdf", size: 0 }))).toBeTruthy();
  });

  it("rejette un fichier trop volumineux", () => {
    const file = createFile({ type: "application/pdf", size: 2 * 1024 * 1024 });
    expect(validateFile(file, 1)).toBeTruthy();
  });
});

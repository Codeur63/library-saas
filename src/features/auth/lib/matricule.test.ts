import { describe, expect, it } from "vitest";

import { isValidMatricule, normalizeMatricule } from "@/features/auth/lib/matricule";

describe("matricule", () => {
  it("normalise en majuscules sans espace", () => {
    expect(normalizeMatricule("  m2025-00123 ")).toBe("M2025-00123");
  });

  it("valide les formats acceptés", () => {
    expect(isValidMatricule("M2025-00123")).toBe(true);
    expect(isValidMatricule("123456")).toBe(true);
    expect(isValidMatricule("m2025-00123")).toBe(true);
  });

  it("rejette les formats invalides", () => {
    expect(isValidMatricule("")).toBe(false);
    expect(isValidMatricule("ABC")).toBe(false);
    expect(isValidMatricule("TROPLONG-1234567890-ABC")).toBe(false);
    expect(isValidMatricule("M2025 00123")).toBe(false);
  });
});
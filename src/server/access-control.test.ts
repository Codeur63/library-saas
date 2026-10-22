import { describe, expect, it } from "vitest";

import {
  canAccessDocument,
  type DocumentAccessInfo,
  type DocumentViewer,
} from "@/server/access-control";

/**
 * Miroir exact de `private.can_access_document` (SQL/RLS) : un compte ACTIVE,
 * dont le mot de passe a été changé, sur un document publié GLOBAL ou de sa
 * filière. Aucun rôle n'élève les droits.
 */
function rlsCanAccessDocument(viewer: DocumentViewer, document: DocumentAccessInfo): boolean {
  return (
    viewer.status === "ACTIVE" &&
    !viewer.mustChangePassword &&
    document.isPublished &&
    (document.visibility === "GLOBAL" || document.accessProgram?.id === viewer.programId)
  );
}

const ROLES: DocumentViewer["role"][] = ["STUDENT", "ADMIN", "SUPERADMIN"];
const STATUSES: DocumentViewer["status"][] = ["ACTIVE", "INACTIVE", "SUSPENDED"];
const PUBLISHED = [true, false];
const VISIBILITIES: DocumentAccessInfo["visibility"][] = ["GLOBAL", "PROGRAM"];
const PROGRAM_MATCH = [true, false];
const PROGRAM_ID = "program-1";

function makeViewer(
  role: DocumentViewer["role"],
  status: DocumentViewer["status"],
  mustChangePassword: boolean,
  programId: string | null
): DocumentViewer {
  return { role, status, mustChangePassword, programId };
}

function makeDocument(
  isPublished: boolean,
  visibility: DocumentAccessInfo["visibility"],
  programMatch: boolean
): DocumentAccessInfo {
  return {
    isPublished,
    visibility,
    accessProgram:
      visibility === "PROGRAM" ? { id: programMatch ? PROGRAM_ID : "program-2" } : null,
  };
}

describe("parité canAccessDocument (TS) ↔ can_access_document (RLS)", () => {
  it("un étudiant suit exactement la règle RLS, sur toute la matrice", () => {
    for (const status of STATUSES) {
      for (const mustChangePassword of [false, true]) {
        for (const isPublished of PUBLISHED) {
          for (const visibility of VISIBILITIES) {
            for (const programMatch of PROGRAM_MATCH) {
              const viewer = makeViewer("STUDENT", status, mustChangePassword, PROGRAM_ID);
              const document = makeDocument(isPublished, visibility, programMatch);
              expect(
                canAccessDocument(viewer, document),
                `student status=${status} mustChange=${mustChangePassword} published=${isPublished} visibility=${visibility} match=${programMatch}`
              ).toBe(rlsCanAccessDocument(viewer, document));
            }
          }
        }
      }
    }
  });

  it("un admin n'a jamais MOINS de droits que la RLS", () => {
    for (const role of ["ADMIN", "SUPERADMIN"] as const) {
      for (const status of STATUSES) {
        for (const mustChangePassword of [false, true]) {
          for (const isPublished of PUBLISHED) {
            for (const visibility of VISIBILITIES) {
              for (const programMatch of PROGRAM_MATCH) {
                const viewer = makeViewer(role, status, mustChangePassword, PROGRAM_ID);
                const document = makeDocument(isPublished, visibility, programMatch);
                const expectedAtLeast = rlsCanAccessDocument(viewer, document);
                expect(
                  canAccessDocument(viewer, document) || !expectedAtLeast,
                  `${role} status=${status} published=${isPublished} visibility=${visibility}`
                ).toBe(true);
              }
            }
          }
        }
      }
    }
  });

  it("un admin voit en plus les brouillons et les documents hors filière", () => {
    const admin = makeViewer("ADMIN", "ACTIVE", false, PROGRAM_ID);
    expect(canAccessDocument(admin, makeDocument(false, "GLOBAL", true))).toBe(true);
    expect(canAccessDocument(admin, makeDocument(true, "PROGRAM", false))).toBe(true);
  });

  it("un compte inactif ou n'ayant pas changé son mot de passe est toujours refusé", () => {
    for (const role of ROLES) {
      for (const status of ["INACTIVE", "SUSPENDED"] as const) {
        const viewer = makeViewer(role, status, false, PROGRAM_ID);
        expect(canAccessDocument(viewer, makeDocument(true, "GLOBAL", true))).toBe(false);
      }
      const pending = makeViewer(role, "ACTIVE", true, PROGRAM_ID);
      expect(canAccessDocument(pending, makeDocument(true, "GLOBAL", true))).toBe(false);
    }
  });

  it("un étudiant ne voit pas les documents PROGRAM d'une autre filière", () => {
    const student = makeViewer("STUDENT", "ACTIVE", false, PROGRAM_ID);
    expect(canAccessDocument(student, makeDocument(true, "PROGRAM", true))).toBe(true);
    expect(canAccessDocument(student, makeDocument(true, "PROGRAM", false))).toBe(false);
    expect(canAccessDocument(student, makeDocument(true, "GLOBAL", false))).toBe(true);
    expect(canAccessDocument(student, makeDocument(false, "GLOBAL", true))).toBe(false);
  });
});

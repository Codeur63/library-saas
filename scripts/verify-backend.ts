// Vérification d'intégration des services backend (students + favorites).
// Exécution :
//   node --env-file=.env ./node_modules/vite-node/vite-node.mjs \
//     --config scripts/verify-backend.vite.config.ts scripts/verify-backend.ts

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { CurrentUser } from "@/server/current-user";
import { createStudent, listStudents, resetStudentPassword, setStudentStatus, updateStudent } from "@/server/services/students.service";
import { addFavorite, getFavoriteIds, listFavorites, removeFavorite } from "@/server/services/favorites.service";
import { getDashboardStats } from "@/server/services/stats.service";
import { createStaff, listStaff, setStaffStatus } from "@/server/services/staff.service";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
};

async function main(): Promise<void> {
  const admin = await prisma.profile.findFirst({ where: { role: "SUPERADMIN" }, select: { id: true, matricule: true } });
  if (!admin) {
    console.error("Aucun SUPERADMIN en base — abandon.");
    process.exit(1);
  }
  const adminUser: CurrentUser = {
    id: admin.id,
    matricule: admin.matricule,
    firstName: "Smoke",
    lastName: "Admin",
    role: "SUPERADMIN",
    status: "ACTIVE",
    mustChangePassword: false,
    programId: null,
    levelId: null,
    programName: null,
    levelCode: null,
  };
  const asAdmin = async () => adminUser;

  const program = await prisma.program.findFirst({ where: { isActive: true }, select: { id: true } });
  const level = await prisma.academicLevel.findFirst({ where: { isActive: true }, select: { id: true } });
  if (!program || !level) {
    console.error("Référentiel incomplet (program/level) — abandon.");
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // 1) Étudiant : création / reset / statut
  // -------------------------------------------------------------------------
  const suffix = randomUUID().slice(0, 6).toUpperCase();
  const matricule = `TST${suffix}`;
  const email = `test.${suffix.toLowerCase()}@upac.local`;
  let createdAuthId: string | null = null;

  try {
    const created = await createStudent(
      {
        matricule,
        firstName: "Test",
        lastName: "Backend",
        email,
        programId: program.id,
        levelId: level.id,
        optionId: null,
      },
      asAdmin
    );
    createdAuthId = created.id;
    check("createStudent : id + mot de passe temporaire", !!created.id && created.temporaryPassword.length >= 8);
    check("createStudent : must_change_password", created.mustChangePassword === true);

    const profile = await prisma.profile.findUnique({
      where: { matricule },
      select: { id: true, role: true, status: true, mustChangePassword: true },
    });
    check("createStudent : profil créé (STUDENT/ACTIVE)", profile?.role === "STUDENT" && profile?.status === "ACTIVE", JSON.stringify(profile));
    check("createStudent : id profil == id auth", profile?.id === created.id);

    const reset = await resetStudentPassword(matricule, asAdmin);
    check("resetStudentPassword : nouveau mot de passe", reset.temporaryPassword.length >= 8 && reset.temporaryPassword !== created.temporaryPassword);

    const suspended = await setStudentStatus({ matricule, status: "SUSPENDED" }, asAdmin);
    check("setStudentStatus : SUSPENDED", suspended.status === "SUSPENDED");
    const reactivated = await setStudentStatus({ matricule, status: "ACTIVE" }, asAdmin);
    check("setStudentStatus : ACTIVE", reactivated.status === "ACTIVE");

    const updated = await updateStudent(matricule, { firstName: "Testé" }, asAdmin);
    check("updateStudent : prénom mis à jour", updated.firstName === "Testé");
  } catch (error) {
    check("flux étudiant sans exception", false, error instanceof Error ? error.message : String(error));
  } finally {
    if (createdAuthId) {
      await prisma.profile.deleteMany({ where: { id: createdAuthId } });
      await supabaseAdmin.auth.admin.deleteUser(createdAuthId);
      check("nettoyage étudiant", true);
    }
  }

  // -------------------------------------------------------------------------
  // 2) Favoris : ajout / liste / suppression
  // -------------------------------------------------------------------------
  const subject = await prisma.subject.findFirst({ select: { id: true } });
  const category = await prisma.documentCategory.findFirst({ select: { id: true } });
  let docId: string | null = null;
  if (subject && category) {
    const doc = await prisma.document.create({
      data: {
        title: "Doc test favoris",
        subjectId: subject.id,
        categoryId: category.id,
        storageBucket: "university-documents",
        storagePath: `documents/test/${randomUUID()}.pdf`,
        originalFileName: "test.pdf",
        mimeType: "application/pdf",
        fileExtension: "pdf",
        fileSize: BigInt(10),
        uploadedById: admin.id,
        visibility: "GLOBAL",
        isPublished: true,
      },
      select: { id: true },
    });
    docId = doc.id;

    try {
      await addFavorite(docId, asAdmin);
      const ids = await getFavoriteIds(asAdmin);
      check("addFavorite : présent dans getFavoriteIds", ids.includes(docId));
      const listed = await listFavorites({ page: 1, pageSize: 24 }, asAdmin);
      check("listFavorites : contient le document", listed.items.some((i) => i.document.id === docId) && listed.total >= 1);
      await removeFavorite(docId, asAdmin);
      const after = await getFavoriteIds(asAdmin);
      check("removeFavorite : retiré", !after.includes(docId));
    } catch (error) {
      check("flux favoris sans exception", false, error instanceof Error ? error.message : String(error));
    } finally {
      await prisma.favorite.deleteMany({ where: { documentId: docId } });
      await prisma.document.delete({ where: { id: docId } });
    }
  } else {
    check("référentiel document disponible pour favoris", false, "subject/category manquant");
  }

  // -------------------------------------------------------------------------
  // 3) Personnels : création / liste / statut / garde-fous
  // -------------------------------------------------------------------------
  const staffSuffix = randomUUID().slice(0, 6).toUpperCase();
  const staffMatricule = `STA${staffSuffix}`;
  const staffEmail = `staff.${staffSuffix.toLowerCase()}@upac.local`;
  let staffAuthId: string | null = null;

  try {
    const created = await createStaff(
      { matricule: staffMatricule, firstName: "Staff", lastName: "Test", email: staffEmail, role: "ADMIN" },
      asAdmin
    );
    staffAuthId = created.id;
    check("createStaff : rôle ADMIN + mot de passe temporaire", created.role === "ADMIN" && created.temporaryPassword.length >= 8);

    const listed = await listStaff({ page: 1, pageSize: 24 }, asAdmin);
    check("listStaff : contient le nouvel admin", listed.items.some((i) => i.matricule === staffMatricule && i.role === "ADMIN"));

    const suspended = await setStaffStatus({ matricule: staffMatricule, status: "SUSPENDED" }, asAdmin);
    check("setStaffStatus : SUSPENDED", suspended.status === "SUSPENDED");

    let rejectedSuperadmin = false;
    try {
      await setStaffStatus({ matricule: admin.matricule, status: "SUSPENDED" }, asAdmin);
    } catch {
      rejectedSuperadmin = true;
    }
    check("setStaffStatus : refuse de modifier un SUPERADMIN", rejectedSuperadmin);

    const students = await listStudents({ page: 1, pageSize: 100 }, asAdmin);
    check("listStudents : exclut les comptes admin", !students.items.some((i) => i.matricule === staffMatricule));
  } catch (error) {
    check("flux staff sans exception", false, error instanceof Error ? error.message : String(error));
  } finally {
    if (staffAuthId) {
      await prisma.profile.deleteMany({ where: { id: staffAuthId } });
      await supabaseAdmin.auth.admin.deleteUser(staffAuthId);
      check("nettoyage staff", true);
    }
  }

  // -------------------------------------------------------------------------
  // 4) Tableau de bord : agrégats
  // -------------------------------------------------------------------------
  try {
    const stats = await getDashboardStats(asAdmin);
    const coherent =
      stats.documents.total >= 0 &&
      stats.documents.published <= stats.documents.total &&
      stats.students.total === stats.students.active + stats.students.suspended + stats.students.inactive &&
      stats.catalog.programs >= 1 &&
      Array.isArray(stats.documentsByCategory) &&
      Array.isArray(stats.recentActivity);
    check(
      "getDashboardStats : agrégats cohérents",
      coherent,
      JSON.stringify({ documents: stats.documents.total, students: stats.students.total, programs: stats.catalog.programs })
    );
  } catch (error) {
    check("getDashboardStats sans exception", false, error instanceof Error ? error.message : String(error));
  }

  await prisma.$disconnect();
  console.log(failures === 0 ? "\n=== BACKEND INTEGRATION OK ===" : `\n=== ${failures} ÉCHEC(S) ===`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
// Seed de la bibliothèque UPAC (données de référence + comptes de bootstrap).
// Exécution :  node --env-file=.env scripts/seed.mjs
// Utilise le service_role (les écritures passent côté serveur, jamais par l'UI).

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_STUDENT_PASSWORD = process.env.DEFAULT_STUDENT_PASSWORD;

if (!URL || !SERVICE_KEY) {
  console.error("Variables NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquantes.");
  process.exit(1);
}
if (!DEFAULT_STUDENT_PASSWORD) {
  console.error("Variable DEFAULT_STUDENT_PASSWORD manquante.");
  process.exit(1);
}

const sb = createClient(URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const slugify = (input) =>
  input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// ----------------------------------------------------------------------------
// Référentiels
// ----------------------------------------------------------------------------
const LEVELS = [
  { code: "L1", name: "Licence 1", sort_order: 1 },
  { code: "L2", name: "Licence 2", sort_order: 2 },
  { code: "L3", name: "Licence 3", sort_order: 3 },
  { code: "M1", name: "Master 1", sort_order: 4 },
  { code: "M2", name: "Master 2", sort_order: 5 },
  { code: "DR", name: "Doctorat", sort_order: 6 },
];

const CATEGORIES = [
  { code: "COURSE", name: "Cours", sort_order: 1 },
  { code: "TD", name: "TD", sort_order: 2 },
  { code: "TP", name: "TP", sort_order: 3 },
  { code: "EXAM", name: "Examen", sort_order: 4 },
  { code: "CORRECTION", name: "Correction", sort_order: 5 },
  { code: "PROJECT", name: "Projet", sort_order: 6 },
  { code: "REFERENCE", name: "Référence", sort_order: 7 },
  { code: "THESIS", name: "Mémoire", sort_order: 8 },
];

const YEARS = [
  {
    label: "2025-2026",
    start_date: "2025-10-01",
    end_date: "2026-09-30",
    is_current: false,
  },
  {
    label: "2026-2027",
    start_date: "2026-10-01",
    end_date: "2027-09-30",
    is_current: true,
  },
];

const FACULTIES_PROGRAMS = [
  {
    faculty: { code: "FST", name: "Faculté des Sciences et Technologies", slug: "sciences-technologies" },
    programs: [
      { code: "GI", name: "Génie informatique", subjects: [["Algorithmique et Programmation", "L1"], ["Bases de données", "L2"], ["Intelligence artificielle", "M1"]] },
      { code: "ELEC", name: "Électronique", subjects: [["Circuits électroniques", "L1"], ["Systèmes embarqués", "L2"]] },
      { code: "TEL", name: "Télécoms", subjects: [["Réseaux informatiques", "L2"], ["Transmission numérique", "L3"]] },
      { code: "GC", name: "Génie civil", subjects: [["Résistance des matériaux", "L2"], ["Topographie", "L3"]] },
    ],
  },
  {
    faculty: { code: "MED", name: "Faculté de Médecine", slug: "medecine" },
    programs: [
      { code: "MED", name: "Médecine", subjects: [["Anatomie", "L1"], ["Pharmacologie", "L2"]] },
    ],
  },
  {
    faculty: { code: "THEO", name: "Faculté de Théologie", slug: "theologie" },
    programs: [
      { code: "THEO", name: "Théologie", subjects: [["Théologie systématique", "L1"], ["Éthique chrétienne", "L2"]] },
    ],
  },
  {
    faculty: { code: "LSH", name: "Faculté des Lettres et Sciences Humaines", slug: "lettres-sciences-humaines" },
    programs: [
      { code: "SS", name: "Sciences sociales", subjects: [["Introduction au droit", "L1"], ["Économie politique", "L2"]] },
      { code: "TRAD", name: "Traduction", subjects: [["Traduction littéraire", "L1"], ["Interprétation", "M1"]] },
      { code: "GES", name: "Gestion", subjects: [["Comptabilité générale", "L1"], ["Management", "L2"]] },
    ],
  },
];

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
async function upsertMany(table, rows, onConflict) {
  if (rows.length === 0) return;
  const { error } = await sb.from(table).upsert(rows.map(normalizeRow), { onConflict });
  if (error) throw new Error(`${table}.upsert -> ${error.message}`);
  console.log(`✓ ${table} : ${rows.length} ligne(s) upsertée(s)`);
}

function normalizeRow(row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === undefined) continue;
    out[key] = value;
  }
  if (!("updated_at" in out)) out.updated_at = new Date().toISOString();
  return out;
}

async function ensureAuthUser({ email, password, matricule }) {
  const { data: list, error: listError } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw new Error(`listUsers -> ${listError.message}`);
  const existing = list?.users?.find((u) => u.email === email);
  if (existing) return { user: existing, created: false };

  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { matricule },
  });
  if (error) throw new Error(`createUser(${email}) -> ${error.message}`);
  console.log(`✓ auth.users : ${email} créé`);
  return { user: data.user, created: true };
}

async function ensureProfile(userId, fields) {
  const { error } = await sb.from("profiles").upsert(
    { id: userId, ...normalizeRow(fields) },
    { onConflict: "id" }
  );
  if (error) throw new Error(`profiles.upsert -> ${error.message}`);
}

// ----------------------------------------------------------------------------
// Exécution
// ----------------------------------------------------------------------------
console.log("== Seed bibliothèque UPAC ==");

await upsertMany("academic_levels", LEVELS, "code");
await upsertMany("document_categories", CATEGORIES, "code");
await upsertMany("academic_years", YEARS, "label");

const { data: levelRows } = await sb.from("academic_levels").select("id, code");
const levelIdByCode = Object.fromEntries((levelRows ?? []).map((l) => [l.code, l.id]));

for (const { faculty, programs } of FACULTIES_PROGRAMS) {
  const { data: facultyRow, error: ferr } = await sb
    .from("faculties")
    .upsert(normalizeRow(faculty), { onConflict: "code" })
    .select("id")
    .single();
  if (ferr) throw new Error(`faculties.upsert -> ${ferr.message}`);

  for (const program of programs) {
    const { subjects: programSubjects = [], ...programFields } = program;
    const { data: programRow, error: perr } = await sb
      .from("programs")
      .upsert(normalizeRow({ ...programFields, faculty_id: facultyRow.id, slug: slugify(programFields.name) }), { onConflict: "code" })
      .select("id")
      .single();
    if (perr) throw new Error(`programs.upsert -> ${perr.message}`);

    const { data: existingSubjects } = await sb
      .from("subjects")
      .select("slug")
      .eq("program_id", programRow.id);

    const existingSlugs = new Set((existingSubjects ?? []).map((s) => s.slug));
    const subjectRows = (programSubjects ?? [])
      .map(([name, levelCode]) => ({
        program_id: programRow.id,
        level_id: levelIdByCode[levelCode],
        name,
        slug: slugify(name),
      }))
      .filter((s) => !existingSlugs.has(s.slug));

    if (subjectRows.length > 0) {
      const { error: serr } = await sb.from("subjects").insert(subjectRows.map(normalizeRow));
      if (serr) throw new Error(`subjects.insert -> ${serr.message}`);
    }
  }
}
console.log(`✓ facultés / filières / matières : ${FACULTIES_PROGRAMS.length} faculté(s)`);

// ---- Compte SUPERADMIN (bootstrap) ------------------------------------------
const adminEmail = "superadmin@upac.local";
const adminMatricule = "SUPER0001";
const adminPassword = Array.from({ length: 12 }, () =>
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"[Math.floor(Math.random() * 57)]
).join("");

const adminResult = await ensureAuthUser({ email: adminEmail, password: adminPassword, matricule: adminMatricule });
const adminUser = adminResult.user;
await ensureProfile(adminUser.id, {
  matricule: adminMatricule,
  first_name: "Super",
  last_name: "Administrateur",
  role: "SUPERADMIN",
  status: "ACTIVE",
  must_change_password: true,
});
if (adminResult.created) {
  console.warn("┌────────────────────────────────────────────────────────────┐");
  console.warn("│ SUPERADMIN bootstrap (mot de passe temporaire, à changer) │");
  console.warn(`│ matricule : ${adminMatricule}                                │`);
  console.warn(`│ email    : ${adminEmail}                                     │`);
  console.warn(`│ mot de passe : ${adminPassword}                               │`);
  console.warn("└────────────────────────────────────────────────────────────┘");
} else {
  console.warn(`✓ SUPERADMIN existant (${adminMatricule}) — mot de passe inchangé.`);
}

// ---- Compte étudiant test (désactivable en production) ----------------------
if (process.env.SEED_DEMO_STUDENT === "false") {
  console.log("✓ Étudiant de démonstration ignoré (SEED_DEMO_STUDENT=false)");
} else {
const studentMatricule = "STU2026001";
const studentEmail = "stu2026001@upac.local";
const { data: giProgram } = await sb.from("programs").select("id").eq("code", "GI").single();
const { data: l2 } = await sb.from("academic_levels").select("id").eq("code", "L2").single();

const studentResult = await ensureAuthUser({ email: studentEmail, password: DEFAULT_STUDENT_PASSWORD, matricule: studentMatricule });
const studentUser = studentResult.user;
await ensureProfile(studentUser.id, {
  matricule: studentMatricule,
  first_name: "Étudiant",
  last_name: "Démo",
  role: "STUDENT",
  status: "ACTIVE",
  must_change_password: true,
  program_id: giProgram.id,
  level_id: l2.id,
});
console.log(
  studentResult.created
    ? `✓ Étudiant test : ${studentMatricule} (${studentEmail}) — mot de passe initial défini par DEFAULT_STUDENT_PASSWORD`
    : `✓ Étudiant test existant (${studentMatricule}) — mot de passe inchangé`
);
}

// ---- Résumé -----------------------------------------------------------------
for (const table of ["faculties", "programs", "subjects", "academic_levels", "academic_years", "document_categories", "profiles"]) {
  const { count, error } = await sb.from(table).select("id", { count: "exact", head: true });
  if (error) throw new Error(`${table}.count -> ${error.message}`);
  console.log(`  ${table.padEnd(20)} ${count}`);
}

console.log("Seed terminé ✔");
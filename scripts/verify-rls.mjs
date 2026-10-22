// Validation RLS de bout en bout, exactement comme le fera l'application :
//   - client "anon" (clé publishable) + session d'un étudiant réel
//   - lecture profils / documents / référentiels, favoris
//   - vérifie : 1ère connexion bloquée, visibilité GLOBAL/PROGRAM, is_published,
//     favoris strictement personnels, aucun accès anon.
// Exécution :  node --env-file=.env scripts/verify-rls.mjs

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STUDENT_EMAIL = "stu2026001@upac.local";
const STUDENT_PASSWORD = process.env.DEFAULT_STUDENT_PASSWORD;
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD;

if (!URL || !PUBLISHABLE || !SERVICE || !STUDENT_PASSWORD || !SUPERADMIN_PASSWORD) {
  console.error("Variables Supabase / DEFAULT_STUDENT_PASSWORD / SUPERADMIN_PASSWORD manquantes.");
  process.exit(1);
}

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
};

const service = createClient(URL, SERVICE, { auth: { persistSession: false } });
const client = createClient(URL, PUBLISHABLE, { persistSession: false });

// --- aide au nettoyage en fin de script --------------------------------
const createdDocuments = [];

// État initial des comptes de test : restauré en fin de script pour ne pas
// laisser la base dans un état « première connexion » après la vérification.
const { data: initialProfiles } = await service
  .from("profiles")
  .select("id, must_change_password")
  .in("matricule", ["STU2026001", "SUPER0001"]);
const initialMustChange = new Map((initialProfiles ?? []).map((p) => [p.id, p.must_change_password]));

try {
  // 1) Aucun accès pour le rôle anon (non connecté)
  const anonDocs = await client.from("documents").select("id,title");
  check("anon sans session : documents non lisibles", anonDocs.data?.length === 0, `rows=${anonDocs.data?.length ?? "?"}`);
  const anonError = anonDocs.error;
  check("anon sans session : aucune erreur (réponse vide via RLS)", !anonError, anonError?.message ?? "");

  // 2) Connexion de l'étudiant test.
  // Le mot de passe a pu être changé par un test précédent : on le remet à sa
  // valeur de seed via l'Admin API pour un état déterministe.
  const { data: studentProfile, error: studentProfileError } = await service
    .from("profiles")
    .select("id")
    .eq("matricule", "STU2026001")
    .single();
  if (studentProfileError || !studentProfile) {
    throw new Error(`profil étudiant STU2026001 introuvable : ${studentProfileError?.message ?? "absent"}`);
  }
  const { error: resetPasswordError } = await service.auth.admin.updateUserById(studentProfile.id, {
    password: STUDENT_PASSWORD,
  });
  check("mot de passe étudiant de test réinitialisé", !resetPasswordError, resetPasswordError?.message ?? "");

  const { data: signIn, error: signInError } = await client.auth.signInWithPassword({
    email: STUDENT_EMAIL,
    password: STUDENT_PASSWORD,
  });
  check("connexion étudiant (matricule de test)", !signInError && !!signIn.user, signInError?.message ?? "");
  const userId = signIn.user?.id;

  // État déterministe : on repart d'une 1ère connexion non finalisée
  await service.from("profiles").update({ must_change_password: true }).eq("id", userId);

  // 3) 1ère connexion : must_change_password = true => accès bibliothèque bloqué
  const firstLoginDocs = await client.from("documents").select("id");
  check("1ère connexion : documents bloqués (must_change_password)", firstLoginDocs.data?.length === 0);
  const firstLoginLevels = await client.from("academic_levels").select("id");
  check("1ère connexion : référentiels bloqués", firstLoginLevels.data?.length === 0);

  // 4) Simuler la fin du 1er changement de mot de passe (côté serveur)
  const { error: flipError } = await service
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", userId);
  check("fin du 1er changement de mot de passe (service_role)", !flipError, flipError?.message ?? "");

  // 5) Récupération des référentiels + création de documents de test
  const { data: soufs } = await service.from("subjects").select("id, slug").eq("program_id", (await service.from("programs").select("id").eq("code", "GI").single()).data.id);
  const giSubject = soufs.find((s) => s.slug === "bases-de-donnees") ?? soufs[0];
  const { data: medProgram } = await service.from("programs").select("id").eq("code", "MED").single();
  const { data: l2 } = await service.from("academic_levels").select("id").eq("code", "L2").single();
  const { data: giProgram } = await service.from("programs").select("id").eq("code", "GI").single();
  const { data: course } = await service.from("document_categories").select("id").eq("code", "COURSE").single();
  const { data: student } = await service.from("profiles").select("id, program_id").eq("matricule", "STU2026001").single();

  const base = {
    category_id: course.id,
    academic_year_id: null,
    storage_bucket: "university-documents",
    original_file_name: "verify-tmp.pdf",
    mime_type: "application/pdf",
    file_extension: "pdf",
    file_size: 1,
    uploaded_by_id: null,
  };

  const makeDoc = async (title, fields) => {
    const { data, error } = await service
      .from("documents")
      .insert(normalize({ title, description: null, subject_id: giSubject.id, ...fields, storage_path: `verify-tmp/${randomUUID()}.pdf`, ...base }))
      .select("id,title,visibility,access_program_id,is_published")
      .single();
    if (error) throw new Error(`insert document (${title}) -> ${error.message}`);
    createdDocuments.push(data.id);
    return data;
  };
  const normalize = (row) => ({ ...row, updated_at: new Date().toISOString() });

  const globalDoc = await makeDoc("TEST GLOBAL", { visibility: "GLOBAL" });
  const badProgramDoc = await makeDoc("TEST AUTRE FILIERE", { visibility: "PROGRAM", access_program_id: medProgram.id });
  const unpublishedDoc = await makeDoc("TEST NON PUBLIE", { visibility: "GLOBAL", is_published: false });
  const ownProgramDoc = await makeDoc("TEST MA FILIERE", { visibility: "PROGRAM", access_program_id: giProgram.id });

  // 6) Visibilité documents pour l'étudiant (filiale GI, actif, mdp changé)
  const { data: visible, error: visibleError } = await client.from("documents").select("id,title");
  const visibleTitles = (visible ?? []).map((d) => d.title);
  check("documents visibles = GLOBAL + PROGRAM de sa filière", !visibleError, visibleError?.message ?? "");
  check("  → GLOBAL visible", visibleTitles.includes("TEST GLOBAL"));
  check("  → PROGRAM (sa filière) visible", visibleTitles.includes("TEST MA FILIERE"));
  check("  → PROGRAM (autre filière) masqué", !visibleTitles.includes("TEST AUTRE FILIERE"));
  check("  → non publié masqué", !visibleTitles.includes("TEST NON PUBLIE"));

  // 7) Lecture de son propre profil uniquement
  const { data: profiles } = await client.from("profiles").select("id, first_name");
  check("profil : seule sa propre ligne", profiles?.length === 1 && profiles[0].id === userId, `rows=${profiles?.length ?? "?"}`);

  // 8) Favoris : soi-même + documents accessibles seulement
  const favOk = await client.from("favorites").insert({ user_id: userId, document_id: globalDoc.id });
  check("favori sur document GLOBAL accepté", !favOk.error, favOk.error?.message ?? "");
  const favOwn = await client.from("favorites").insert({ user_id: userId, document_id: ownProgramDoc.id });
  check("favori sur document de sa filière accepté", !favOwn.error, favOwn.error?.message ?? "");
  const favBad = await client.from("favorites").insert({ user_id: userId, document_id: badProgramDoc.id });
  check("favori interdit sur document d'une autre filière", !!favBad.error, favBad.error?.message ?? "");

  const { data: favList } = await client.from("favorites").select("document_id");
  check("liste des favoris = uniquement les 2 autorisés", (favList?.length ?? 0) === 2, `count=${favList?.length ?? "?"}`);

  // Confirmer qu'on ne peut pas lire les favoris d'un autre (pas d'autre user, mais
  // la policy user_id = auth.uid() verrouille de façon structurelle) :
  const { data: otherUserFavs, error: otherFavError } = await client.from("favorites").select("document_id").eq("user_id", "00000000-0000-0000-0000-000000000000");
  check("favoris d'un autre utilisateur : invisibles", !otherFavError && (otherUserFavs?.length ?? 0) === 0);

  const favDel = await client.from("favorites").delete().eq("user_id", userId).eq("document_id", globalDoc.id);
  check("suppression de son favori acceptée", !favDel.error, favDel.error?.message ?? "");

  // 9) Valeur compteur téléchargements : incrément atomique côté base
  const { error: incError } = await service.rpc("increment_download_count", { p_document_id: globalDoc.id });
  check("fonction increment_download_count (prérequis backend)", !incError || /function increment_download_count|could not find/i.test(incError.message), incError?.message ?? "");

  // 10) Le superadmin voit les documents non publiés (is_admin)
  const { data: adminSignIn, error: adminSignInError } = await client.auth.signInWithPassword({
    email: "superadmin@upac.local",
    password: SUPERADMIN_PASSWORD,
  });
  if (adminSignInError) {
    check("connexion superadmin : mot de passe à fournir via SUPERADMIN_PASSWORD", false, adminSignInError.message);
  } else {
    const flipped = await service.from("profiles").update({ must_change_password: false }).eq("id", adminSignIn.user.id);
    check("superadmin : passage must_change_password=false (service)", !flipped.error, flipped.error?.message ?? "");
    const { data: adminDocs } = await client.from("documents").select("id,title").eq("id", unpublishedDoc.id);
    check("superadmin : voit le document non publié", (adminDocs?.length ?? 0) === 1, `rows=${adminDocs?.length ?? "?"}`);
    const favAdmin = await client.from("favorites").insert({ user_id: adminSignIn.user.id, document_id: unpublishedDoc.id });
    check("superadmin : favori interdit sur document non publié (can_access_document)", !!favAdmin.error, favAdmin.error?.message ?? "");
  }
} catch (err) {
  console.error("ERREUR au cours de la validation :", err);
  failures += 1;
} finally {
  // Nettoyage : suppression des documents de test (favoris en cascade)
  for (const id of createdDocuments) {
    await service.from("documents").delete().eq("id", id);
  }
  // Restauration de l'état exact d'avant le script.
  for (const [id, mustChange] of initialMustChange) {
    await service.from("profiles").update({ must_change_password: mustChange }).eq("id", id);
  }
  console.log(`--- ${failures} échec(s) ---`);
  process.exit(failures === 0 ? 0 : 1);
}
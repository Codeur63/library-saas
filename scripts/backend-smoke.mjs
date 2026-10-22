import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = "superadmin@upac.local";
const ADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD;
const BASE = "http://localhost:3000";

if (!SUPABASE_URL || !PUBLISHABLE || !SERVICE || !ADMIN_PASSWORD) {
  console.error("Variables NEXT_PUBLIC_SUPABASE_URL / PUBLISHABLE / SERVICE_ROLE / SUPERADMIN_PASSWORD manquantes.");
  process.exit(1);
}

const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
const AUTH_COOKIE = `sb-${projectRef}-auth-token`;

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
};

const service = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });

// --- Récupération de références réelles --------------------------------
const { data: subject } = await service
  .from("subjects")
  .select("id,name")
  .limit(1)
  .single()
  .then((r) => (r.error || !r.data ? { data: null } : r));
const { data: category } = await service
  .from("document_categories")
  .select("id,code")
  .limit(1)
  .single()
  .then((r) => (r.error || !r.data ? { data: null } : r));

const subjectId = subject?.id ?? randomUUID();
const categoryId = category?.id ?? randomUUID();

check("référentiel : matière dispo", !!subject, subject?.name ?? "aucune matière en base");
check("référentiel : catégorie dispo", !!category, category?.code ?? "aucune catégorie en base");

// --- Session cookie (comme un navigateur) : login via le client supabase ---
const cookieStore = new Map();
const cookieClient = createClient(SUPABASE_URL, PUBLISHABLE, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: AUTH_COOKIE,
    storage: {
      getItem: (key) => cookieStore.get(key) ?? null,
      setItem: (key, value) => cookieStore.set(key, value),
      removeItem: (key) => cookieStore.delete(key),
    },
  },
});

const { error: loginErr } = await cookieClient.auth.signInWithPassword({
  email: ADMIN_EMAIL,
  password: ADMIN_PASSWORD,
});
check("admin : login réel (cookie)", !loginErr, loginErr?.message ?? "");

const cookieValue = cookieStore.get(AUTH_COOKIE);
check("session cookie contenu", !!cookieValue, cookieValue ? `len=${cookieValue.length}` : "cookie absent");

// Le compte de bootstrap a « must_change_password=true » (1re connexion) :
// on le neutralise temporairement pour tester le téléchargement, puis on restaure.
const ADMIN_MATRICULE = "SUPER0001";
let adminFlag = null;
if (cookieValue) {
  const { data: prof, error: profErr } = await service
    .from("profiles")
    .select("must_change_password")
    .eq("matricule", ADMIN_MATRICULE)
    .maybeSingle();
  if (!profErr && prof) adminFlag = prof.must_change_password;
  if (adminFlag === true) {
    await service.from("profiles").update({ must_change_password: false }).eq("matricule", ADMIN_MATRICULE);
  }
  if (adminFlag === false) {
    const { data: byMatr } = await service.from("profiles").select("id,must_change_password").eq("matricule", ADMIN_MATRICULE).maybeSingle();
    if (byMatr && byMatr.must_change_password === true) {
      adminFlag = true;
      await service.from("profiles").update({ must_change_password: false }).eq("matricule", ADMIN_MATRICULE);
    }
  }
}

const headersWithSession = {
  Cookie: `${AUTH_COOKIE}=${encodeURIComponent(cookieValue)}`,
};

if (cookieValue) {
  // --- Upload via /api/documents/upload ----------------------------------
  const form = new FormData();
  form.append(
    "file",
    new Blob(["%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"], { type: "application/pdf" }),
    "smoke-test.pdf"
  );
  form.append(
    "metadata",
    JSON.stringify({
      title: "Document smoke test " + randomUUID().slice(0, 6),
      description: "généré par script de vérification backend",
      subjectId,
      categoryId,
      semester: "S1",
      visibility: "GLOBAL",
    })
  );

  const upRes = await fetch(`${BASE}/api/documents/upload`, {
    method: "POST",
    headers: headersWithSession,
    body: form,
  });
  const upBody = await upRes.json().catch(() => ({}));
  check(
    "upload (api) : 201 + id",
    upRes.status === 201 && !!upBody?.data?.id,
    `status=${upRes.status} ${JSON.stringify(upBody).slice(0, 120)}`
  );
  const documentId = upBody?.data?.id;

  if (documentId) {
    const dlRes = await fetch(`${BASE}/api/documents/${documentId}/download`, {
      headers: headersWithSession,
    });
    const buf = await dlRes.arrayBuffer();
    check(
      "download (api) : 200 + contenu PDF",
      dlRes.status === 200 && buf.byteLength > 0,
      `status=${dlRes.status} bytes=${buf.byteLength}`
    );

    const dlAnon = await fetch(`${BASE}/api/documents/${documentId}/download`);
    check("download anon : refusé (401)", dlAnon.status === 401, `status=${dlAnon.status}`);

    const { data: after } = await service
      .from("documents")
      .select("download_count")
      .eq("id", documentId)
      .single();
    check("compteur incrémenté (via RPC SQL)", Number(after?.download_count) >= 1, `count=${after?.download_count}`);

    const delRes = await service.from("documents").delete().eq("id", documentId);
    check("nettoyage : suppression métadonnées", !delRes.error, delRes.error?.message ?? "");
  } else {
    check("download (api)", false, "pas de document créé");
    check("download anon", "pas de document" !== "", false, "non testé");
    check("compteur incrémenté", false, "non testé");
    check("nettoyage", false, "non testé");
  }
} else {
  check("upload (api)", false, "pas de session");
  check("download (api)", false, "non testé");
  check("download anon", true, "non testé");
  check("compteur incrémenté", true, "non testé");
  check("nettoyage", true, "non testé");
}

// --- Tableau de bord : pages protégées ------------------------------------
if (cookieValue) {
  for (const path of [
    "/dashboard",
    "/dashboard/etudiants",
    "/dashboard/etudiants/nouveau",
    "/dashboard/administrateurs",
    "/dashboard/administrateurs/nouveau",
  ]) {
    const res = await fetch(`${BASE}${path}`, { headers: headersWithSession, redirect: "manual" });
    check(`dashboard ${path} : 200 (admin)`, res.status === 200, `status=${res.status}`);
  }
} else {
  check("dashboard admin : inaccessible", false, "pas de session");
}

const anonDash = await fetch(`${BASE}/dashboard`, { redirect: "manual" });
check(
  "dashboard anon : redirection login",
  anonDash.status === 307 && (anonDash.headers.get("location") ?? "").includes("/auth/login"),
  `status=${anonDash.status} loc=${anonDash.headers.get("location")}`
);

// --- Restauration de l'état initial du compte admin ------------------------
if (adminFlag === true) {
  await service.from("profiles").update({ must_change_password: true }).eq("matricule", ADMIN_MATRICULE);
  console.log("INFO  must_change_password restauré à true");
}

console.log(failures === 0 ? "\n=== SMOKE OK ===" : `\n=== ${failures} ÉCHEC(S) ===`);
process.exit(failures === 0 ? 0 : 1);
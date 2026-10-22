-- ============================================================================
-- Migration corrective : RLS opérationnel + durcissement des privilèges + Storage
--
-- Contexte (audit) :
--   * La migration "enable_rls" a bien activé ROW LEVEL SECURITY mais aucun de
--     ses objets (schéma private, fonctions, policies) n'existe en base.
--   * Aucune policy ne couvre les tables documents / favorites : l'application
--     serait verrouillée côté client.
--   * Le bucket Storage "university-documents" n'existe pas.
--   * anon/authenticated disposent par défaut de droits INSERT/UPDATE/DELETE sur
--     toutes les tables (dont storage.objects et _prisma_migrations).
--
-- Cette migration est idempotente et versionnée : elle ne modifie pas
-- l'historique des migrations précédentes.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Schéma privé pour les helpers RLS (inaccessible aux clients)
-- ----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

-- ----------------------------------------------------------------------------
-- 2) Fonctions helpers RLS (SECURITY DEFINER = exécutées en tant que postgres,
--    propriétaire des tables => lecture de profiles sans récursion RLS)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.is_active_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND status::text = 'ACTIVE'
    );
$$;

CREATE OR REPLACE FUNCTION private.can_use_library()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND status::text = 'ACTIVE'
          AND must_change_password = false
    );
$$;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND status::text = 'ACTIVE'
          AND must_change_password = false
          AND role::text IN ('ADMIN', 'SUPERADMIN')
    );
$$;

-- Un document est accessible au visiteur courant s'il est publié et soit
-- GLOBAL, soit PROGRAM ciblant exactement sa filière.
CREATE OR REPLACE FUNCTION private.can_access_document(p_document_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.documents d
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE d.id = p_document_id
          AND d.is_published = true
          AND p.status::text = 'ACTIVE'
          AND p.must_change_password = false
          AND (
              d.visibility::text = 'GLOBAL'
              OR (d.visibility::text = 'PROGRAM' AND d.access_program_id = p.program_id)
          )
    );
$$;

GRANT EXECUTE ON FUNCTION private.is_active_user() TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_use_library() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_access_document(uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- 3) Policies RLS
-- ----------------------------------------------------------------------------

-- profiles : chacun lit son profil ; les admins peuvent les lister.
DROP POLICY IF EXISTS "user_read_own_profile" ON public.profiles;
CREATE POLICY "user_read_own_profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS "admin_read_profiles" ON public.profiles;
CREATE POLICY "admin_read_profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (private.is_admin());

-- tables de référence : lecture pour les utilisateurs actifs de la bibliothèque
DROP POLICY IF EXISTS "read_faculties" ON public.faculties;
CREATE POLICY "read_faculties"
ON public.faculties
FOR SELECT
TO authenticated
USING (private.can_use_library());

DROP POLICY IF EXISTS "read_programs" ON public.programs;
CREATE POLICY "read_programs"
ON public.programs
FOR SELECT
TO authenticated
USING (private.can_use_library());

DROP POLICY IF EXISTS "read_program_options" ON public.program_options;
CREATE POLICY "read_program_options"
ON public.program_options
FOR SELECT
TO authenticated
USING (private.can_use_library());

DROP POLICY IF EXISTS "read_levels" ON public.academic_levels;
CREATE POLICY "read_levels"
ON public.academic_levels
FOR SELECT
TO authenticated
USING (private.can_use_library());

DROP POLICY IF EXISTS "read_subjects" ON public.subjects;
CREATE POLICY "read_subjects"
ON public.subjects
FOR SELECT
TO authenticated
USING (private.can_use_library());

DROP POLICY IF EXISTS "read_academic_years" ON public.academic_years;
CREATE POLICY "read_academic_years"
ON public.academic_years
FOR SELECT
TO authenticated
USING (private.can_use_library());

DROP POLICY IF EXISTS "read_document_categories" ON public.document_categories;
CREATE POLICY "read_document_categories"
ON public.document_categories
FOR SELECT
TO authenticated
USING (private.can_use_library());

-- documents : étudiants (visibles) + admins (tout)
DROP POLICY IF EXISTS "student_read_documents" ON public.documents;
CREATE POLICY "student_read_documents"
ON public.documents
FOR SELECT
TO authenticated
USING (
    private.can_use_library()
    AND is_published = true
    AND (
        visibility::text = 'GLOBAL'
        OR (
            visibility::text = 'PROGRAM'
            AND access_program_id = (SELECT program_id FROM public.profiles WHERE id = auth.uid())
        )
    )
);

DROP POLICY IF EXISTS "admin_read_documents" ON public.documents;
CREATE POLICY "admin_read_documents"
ON public.documents
FOR SELECT
TO authenticated
USING (private.is_admin());

-- favorites : strictement personnel
DROP POLICY IF EXISTS "user_select_favorites" ON public.favorites;
CREATE POLICY "user_select_favorites"
ON public.favorites
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_insert_favorites" ON public.favorites;
CREATE POLICY "user_insert_favorites"
ON public.favorites
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND private.can_access_document(document_id)
);

DROP POLICY IF EXISTS "user_delete_favorites" ON public.favorites;
CREATE POLICY "user_delete_favorites"
ON public.favorites
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 4) Durcissement des privilèges (écritures côté serveur via service_role)
-- ----------------------------------------------------------------------------

-- Retirer DML aux rôles clients sur toutes les tables applicatives actuelles
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Protection de la table de suivi des migrations
REVOKE ALL PRIVILEGES ON TABLE public._prisma_migrations FROM anon, authenticated;

-- Les futures tables créées par les migrations (rôle postgres) ne doivent pas
-- recouvrir ces privilèges par défaut.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM authenticated;

-- Rétablir uniquement les privilèges de lecture nécessaires (filtrés par RLS)
GRANT SELECT ON TABLE public.documents               TO authenticated;
GRANT SELECT ON TABLE public.faculties               TO authenticated;
GRANT SELECT ON TABLE public.programs                TO authenticated;
GRANT SELECT ON TABLE public.program_options         TO authenticated;
GRANT SELECT ON TABLE public.academic_levels         TO authenticated;
GRANT SELECT ON TABLE public.subjects                TO authenticated;
GRANT SELECT ON TABLE public.academic_years          TO authenticated;
GRANT SELECT ON TABLE public.document_categories     TO authenticated;
GRANT SELECT ON TABLE public.profiles                TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.favorites TO authenticated;

-- ----------------------------------------------------------------------------
-- 5) Supabase Storage : bucket privé + verrouillage des accès objets
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 'university-documents', 'university-documents', false, 52428800::bigint, ARRAY['application/pdf']
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'university-documents');

-- Aucun accès direct des rôles clients : les objets ne passent que par des URLs
-- signées générées côté serveur (service_role) après vérification des droits.
REVOKE ALL PRIVILEGES ON TABLE storage.objects FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE storage.buckets FROM anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6) Contraintes complémentaires (données cohérentes)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documents_file_size_positive') THEN
        ALTER TABLE public.documents
        ADD CONSTRAINT documents_file_size_positive CHECK (file_size > 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'academic_years_date_range') THEN
        ALTER TABLE public.academic_years
        ADD CONSTRAINT academic_years_date_range CHECK (end_date > start_date);
    END IF;
END
$$;

-- Unicité métier des matières sans option (NULLS DISTINCT contourne l'unique simple)
CREATE UNIQUE INDEX IF NOT EXISTS "subjects_program_level_slug_no_option_key"
ON public.subjects (program_id, level_id, slug)
WHERE option_id IS NULL;
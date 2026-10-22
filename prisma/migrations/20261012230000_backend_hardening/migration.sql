-- ============================================================================
-- Backend hardening : table d'audit admin + helper is_superadmin
-- + contraintes CHECK manquantes + planification quotidienne de
-- deactivate_inactive_students (pg_cron si disponible).
--
-- Règles :
--   * admin_action_logs n'expose aucune policy RLS : écriture 100% serveur
--     (service_role), les rôles clients n'ont aucun privilège dessus.
--   * is_superadmin() complète la famille private.* pour les policies et la
--     logique serveur.
--   * Les contraintes visibilité/download comptés rendent la donnée cohérente
--     même en cas d'insertion directe.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Table d'audit admin (modèle Prisma AdminActionLog)
-- ----------------------------------------------------------------------------
CREATE TABLE "admin_action_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "target_type" VARCHAR(40),
    "target_id" TEXT,
    "details" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_action_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_action_logs_actor_id_created_at_idx" ON "admin_action_logs"("actor_id", "created_at");
CREATE INDEX "admin_action_logs_target_type_target_id_idx" ON "admin_action_logs"("target_type", "target_id");

ALTER TABLE "admin_action_logs" ADD CONSTRAINT "admin_action_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Aucun accès des rôles clients (y compris SELECT) : table réservée au serveur.
REVOKE ALL PRIVILEGES ON TABLE public.admin_action_logs FROM anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2) Helper RLS private.is_superadmin()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.is_superadmin()
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
          AND role::text = 'SUPERADMIN'
    );
$$;

GRANT EXECUTE ON FUNCTION private.is_superadmin() TO authenticated;

-- ----------------------------------------------------------------------------
-- 3) Contraintes CHECK manquantes (intégrité des documents et compteur)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documents_download_count_non_negative') THEN
        ALTER TABLE public.documents
        ADD CONSTRAINT documents_download_count_non_negative CHECK (download_count >= 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documents_visibility_access_program') THEN
        ALTER TABLE public.documents
        ADD CONSTRAINT documents_visibility_access_program CHECK (
            (visibility::text = 'GLOBAL'  AND access_program_id IS NULL)
            OR (visibility::text = 'PROGRAM' AND access_program_id IS NOT NULL)
        );
    END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- 4) Planification quotidienne de la passivation (pg_cron, 02:00 UTC)
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'deactivate-inactive-students-daily') THEN
        PERFORM cron.unschedule('deactivate-inactive-students-daily');
    END IF;
END
$$;

SELECT cron.schedule(
    'deactivate-inactive-students-daily',
    '0 2 * * *',
    'SELECT public.deactivate_inactive_students(6)'
);
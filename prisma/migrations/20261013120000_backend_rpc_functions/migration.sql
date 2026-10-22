-- ============================================================================
-- Backend : fonctions RPC utilisées par les services (téléchargement, inactivité)
--
-- Règles appliquées :
--   * increment_download_count : incrément ATOMIQUE côté PostgreSQL (+1)
--     avec contrôle d'accès explicite (private.can_access_document).
--     SECURITY DEFINER car le DML a été retiré à authenticated : on refait donc
--     nous-mêmes la vérification des droits AVANT d'écrire.
--   * deactivate_inactive_students : passivation des étudiants inactifs
--     (> INACTIVITY_MONTHS), appelable par une tâche planifiée (pg_cron) ou un
--     Job Supabase. Retourne le nombre d'étudiants désactivés.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Incrément atomique du compteur de téléchargements
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_download_count(p_document_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_new_count integer;
BEGIN
  -- Contrôle d'accès obligatoire (RLS contournée par SECURITY DEFINER).
  IF NOT private.can_access_document(p_document_id) THEN
    RETURN NULL;
  END IF;

  UPDATE public.documents
  SET download_count = download_count + 1
  WHERE id = p_document_id
  RETURNING download_count INTO v_new_count;

  RETURN v_new_count;
END;
$$;

-- Visible par les clients authentifiés (uniquement via rpc(), pas de DML direct).
GRANT EXECUTE ON FUNCTION public.increment_download_count(uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- 2) Passivation des étudiants inactifs (tâche planifiée, 1×/jour)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.deactivate_inactive_students(p_inactivity_months integer DEFAULT 6)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.profiles
  SET status = 'INACTIVE',
      updated_at = now()
  WHERE role::text = 'STUDENT'
    AND status::text = 'ACTIVE'
    AND last_activity_at < now() - make_interval(months => p_inactivity_months);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Réservé au serveur (service_role) : les clients ne déclenchent pas ce job.
GRANT EXECUTE ON FUNCTION public.deactivate_inactive_students(integer) TO service_role;
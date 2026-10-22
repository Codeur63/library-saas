-- ============================================================================
-- Recherche : index GIN trigrammes (pg_trgm)
--
-- La recherche de la bibliothèque utilise ILIKE '%terme%' sur le titre, la
-- description, le nom de fichier d'origine et le nom de la matière. Un motif
-- non ancré (commençant par %) n'est pas exploitable par un index B-tree :
-- sans index dédié, chaque recherche déclenche un parcours complet.
--
-- Les index trigrammes rendent ces recherches indexables (motifs d'au moins
-- 3 caractères). Ils n'altèrent aucune contrainte ni policy RLS.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS documents_title_trgm_idx
    ON public.documents USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS documents_description_trgm_idx
    ON public.documents USING gin (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS documents_original_file_name_trgm_idx
    ON public.documents USING gin (original_file_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS subjects_name_trgm_idx
    ON public.subjects USING gin (name gin_trgm_ops);

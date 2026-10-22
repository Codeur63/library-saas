-- ----------------------------------------------------------------------------
-- Storage : autoriser les miniatures PNG (première page des PDF).
-- Les couvertures sont générées côté serveur (bucket privé, service_role) et
-- écrites dans le même bucket sous le préfixe "thumbnails/". Le type MIME
-- "image/png" doit donc être autorisé, en plus des documents existants.
-- Idempotent : l'union dédupliquée ne modifie rien si déjà présent.
-- ----------------------------------------------------------------------------
UPDATE storage.buckets
SET allowed_mime_types = (
    SELECT array_agg(DISTINCT mime ORDER BY mime)
    FROM unnest(COALESCE(allowed_mime_types, ARRAY[]::text[]) || ARRAY['image/png']) AS mime
)
WHERE id = 'university-documents';

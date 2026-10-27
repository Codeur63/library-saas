# ADR-0005 — Stockage privé et URLs signées

- Statut : Accepté
- Date : 2026-10-27

## Contexte

Les documents et miniatures sont stockés dans Supabase Storage. Ils ne doivent
pas être accessibles par simple URL publique.

## Décision

- Bucket `university-documents` **privé**.
- Accès serveur via `SUPABASE_SERVICE_ROLE_KEY`, chargé uniquement côté serveur
  (`server-only`).
- Diffusion via **URLs signées courtes** :
  - aperçu : 300 secondes ;
  - téléchargement : 60 secondes, avec `Content-Disposition: attachment`.
- Les fichiers ne transitent jamais en mémoire applicative pour le
  téléchargement : le client est redirigé vers Storage.
- Les miniatures sont stockées sous `thumbnails/<documentId>.png`.

## Alternatives considérées

1. Bucket public : simple mais expose tous les fichiers.
2. Proxy applicatif complet : contrôle total, mais coût mémoire/CPU et bande
   passante inutile.

## Conséquences

- Toute fuite d’URL signée est limitée dans le temps.
- Les politiques Storage doivent rester alignées avec le bucket privé.
- La suppression d’un document doit rester cohérente entre Prisma et Storage.

## Suivi

- Vérifier les MIME et la limite de taille du bucket.
- Tester la restauration conjointe base + Storage.

# ADR-0006 — Cache Next/OpenNext et invalidation

- Statut : Accepté
- Date : 2026-10-27

## Contexte

Les référentiels et agrégats de bibliothèque sont mémoïsés via
`unstable_cache` (`src/server/cache.ts`) avec des tags d’invalidation.
OpenNext sur Cloudflare nécessite un cache incrémental pour un comportement
complet.

## Décision

1. Utiliser `unstable_cache` avec des tags centralisés
   (`library-overview`, `reference-catalog`, `dashboard-stats`).
2. Conserver le helper tolérant qui retombe sur l’exécution directe quand le
   store incrémental n’est pas disponible.
3. Invalider les tags après les écritures métier (`revalidateTag`).
4. Activer à terme le **cache incrémental R2** dans `open-next.config.ts`.

## Alternatives considérées

1. Pas de cache : plus simple, mais requêtes répétées sur les référentiels.
2. Cache mémoire custom : rapide mais incohérent entre isolates.

## Conséquences

- Sans cache incrémental, les performances restent correctes mais les lectures
  retombent sur la base.
- Les invalidations sont best-effort hors contexte Next.
- Le cache R2 est un suivi de production, pas un bloquant fonctionnel.

## Suivi

- Activer et tester `r2IncrementalCache`.
- Mesurer le taux de hit et la latence des pages catalogue.

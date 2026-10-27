# ADR-0008 — CI et barrières qualité

- Statut : Accepté
- Date : 2026-10-27

## Contexte

Le runbook citait une CI et un workflow `integration.yml` qui n’existaient pas
dans le dépôt. Les vérifications étaient donc manuelles.

## Décision

- GitHub Actions exécute à chaque push sur `main` et à chaque pull request :
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
  - `npm audit --audit-level=high`
  - `npm run build`
  - `npx opennextjs-cloudflare build`
- Le build CI utilise des variables factices : il ne dépend ni d’une base ni
  d’un projet Supabase réels.
- Les scripts destructifs (`verify:backend`, `verify:rls`, `smoke`) restent
  **manuels sur staging**, avec les secrets de staging.
- Node.js est fixé via `.nvmrc` (22 LTS) et `engines` (`>=20.19.0`).

## Alternatives considérées

1. Aucune CI : rejeté, trop de régressions possibles.
2. CI avec vraie base de test : plus complète, mais coûteuse et lente à ce
   stade ; les tests d’intégration restent manuels.

## Conséquences

- Toute PR doit passer les barrières avant merge.
- L’audit dépendances est vérifié à chaque run.
- Le build OpenNext est validé avant déploiement.

## Suivi

- Ajouter des tests d’intégration automatisés sur un environnement de staging.
- Ajouter un workflow manuel `workflow_dispatch` pour les vérifications
  destructives si nécessaire.

# ADR-0002 — Accès aux données : Prisma et RLS en défense en profondeur

- Statut : Accepté
- Date : 2026-10-27

## Contexte

Les données métier sont dans PostgreSQL (Supabase). Le dépôt contient :

- un client Prisma généré (`generated/prisma`) utilisé par les services ;
- des politiques RLS sur les tables métier ;
- une logique TypeScript de visibilité (`src/server/access-control.ts`) ;
- un script `verify:rls` qui teste l’accès direct via le client Supabase.

Le runtime applicatif utilise `DATABASE_URL` (rôle `postgres` du pooler
Supabase). Ce rôle contourne RLS.

## Décision

1. **Prisma est la voie d’accès principale** du serveur Next.js.
2. **La logique TypeScript est l’autorité applicative** pour les lectures et
   écritures : `buildDocumentsWhere`, `canAccessDocument`, services et DTO.
3. **RLS reste activée** comme défense en profondeur pour tout accès direct via
   Supabase (client navigateur, scripts, futurs consommateurs) et pour le
   Storage.
4. Toute nouvelle requête Prisma doit passer par les helpers d’accès existants.
5. La clé `service_role` reste strictement côté serveur (`server-only`).
6. Les visiteurs non authentifiés utilisent un viewer public explicite
   (`PUBLIC_VIEWER`) qui ne voit que les documents publiés `GLOBAL`.

## Alternatives considérées

1. **Tout faire via le client Supabase authentifié** pour que RLS soit
   l’unique autorité : plus de défense en profondeur, mais plus de latence, de
   duplication et de limites pour les agrégats.
2. **Désactiver RLS** : rejeté, réduit la défense en profondeur du Storage et
   des accès directs.

## Conséquences

- Prisma contourne RLS : une erreur dans `access-control.ts` ne sera pas
  rattrapée par la base. Les tests de parité et la revue de code sont
  indispensables.
- Les tests `verify:rls` valident le chemin Supabase direct, pas le chemin
  Prisma. Ils restent utiles mais ne suffisent pas.
- Le catalogue public est une décision produit qui doit rester alignée avec
  `PUBLIC_VIEWER` et les filtres Prisma.
- Ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY` ni un client Prisma au
  navigateur.

## Suivi

- Ajouter des tests d’intégration sur les services et le catalogue public.
- Maintenir la parité entre `can_access_document` (SQL) et
  `canAccessDocument` (TS).
- Vérifier la cohérence des règles à chaque évolution RLS.

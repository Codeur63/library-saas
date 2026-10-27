# ADR-0003 — Rate limiting partagé et limites Workers

- Statut : Accepté
- Date : 2026-10-27

## Contexte

Les routes sensibles (connexion, téléchargement, upload) sont protégées par un
limiteur de débit (`src/server/rate-limit.ts`). Deux backends existent :

- Redis via `ioredis` lorsque `REDIS_URL` est défini ;
- mémoire locale par instance sinon.

Sur Cloudflare Workers, chaque isolate possède sa propre mémoire et son propre
cycle de vie. Une connexion TCP longue (ioredis) ne peut pas être partagée entre
requêtes/isolates comme sur un serveur Node classique.

## Décision

1. **En local et en mono-instance**, le fallback mémoire est acceptable.
2. **En production Cloudflare**, le rate limiting doit utiliser un backend
   partagé. La cible recommandée est un **Redis HTTP** (Upstash REST) ou un
   **Durable Object**.
3. `ioredis` reste supporté pour un déploiement Node, mais **ne doit pas être
   considéré comme la solution de production Workers** tant que son cycle de
   connexion n’a pas été validé en charge réelle.
4. Tant que le backend partagé n’est pas en place, le go-live public est
   conditionné à une acceptation explicite du risque (quotas par isolate).
5. La clé client doit préférer `CF-Connecting-IP` sur Cloudflare, avec repli sur
   `X-Forwarded-For` / `X-Real-IP`.

## Alternatives considérées

1. **ioredis TCP** : simple côté code, mais socket long, reconnexions et
   comportement par isolate à valider.
2. **Upstash Redis REST** : compatible Workers, pas de socket longue, ajout
   d’un client HTTP et de deux secrets.
3. **Durable Object** : natif Cloudflare, forte cohérence, mais développe un
   service supplémentaire.
4. **Cloudflare Rate Limiting / WAF** : complémentaire, mais moins précis pour
   des quotas métier par matricule/IP.

## Conséquences

- Le code actuel reste fonctionnel mais ne garantit pas un quota global en
  production Workers.
- Les alertes « Redis indisponible » et le circuit breaker restent utiles.
- La décision finale (Upstash vs Durable Object) doit être prise avant
  l’ouverture publique.

## Suivi

- Choisir et implémenter le backend partagé.
- Ajouter des tests de charge/limite sur Workers.
- Documenter les quotas et la clé d’identification dans le runbook.

# ADR-0007 — Observabilité, logs et secrets

- Statut : Accepté
- Date : 2026-10-27

## Contexte

L’application doit être exploitable en production : logs corrélés, erreurs 5xx
alertables, secrets hors du dépôt et configuration vérifiée au démarrage.

## Décision

- Logs **JSON sur stdout/stderr** (`src/server/logger.ts`), avec `requestId`,
  `level`, `service` et contexte.
- `ERROR_WEBHOOK_URL` (optionnel) reçoit les erreurs 5xx en best-effort.
- Observabilité Cloudflare **activée** dans `wrangler.jsonc` (logs, traces,
  issues) avec `redact_query_string: true`.
- Secrets fournis par Cloudflare (`wrangler secret put`) ou le gestionnaire de
  la plateforme. Aucun secret dans Git.
- `NEXT_PUBLIC_*` fournies au build ; les secrets serveur au runtime.
- `assertProductionConfig()` bloque les configurations critiques au démarrage
  (URL non HTTPS, mot de passe de démo, etc.).

## Alternatives considérées

1. Logs non structurés : plus simples, mais difficiles à corréler.
2. Sentry complet : utile, mais l’ADR retient un webhook générique pour rester
   indépendant du fournisseur.

## Conséquences

- Les logs doivent être consultés dans l’observabilité Cloudflare ou un
  agrégateur externe.
- Un changement de secret impose un redéploiement ou une mise à jour runtime
  selon le type de variable.
- Les alertes 5xx ne sont pas actives tant que `ERROR_WEBHOOK_URL` n’est pas
  configuré.

## Suivi

- Configurer `ERROR_WEBHOOK_URL` en production.
- Vérifier la rétention et le coût des logs/traces.
- Tester une alerte de bout en bout.

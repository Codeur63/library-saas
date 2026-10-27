# Exploitation — Upac Library

Runbook de mise en production, supervision, sauvegardes et gestion d’incident.
À relire avant chaque déploiement majeur.

Cible de production : **Cloudflare Workers + OpenNext** (voir
[ADR-0001](adr/0001-hosting-cloudflare-workers.md)). Les décisions
d’architecture sont indexées dans [docs/adr](adr/README.md).

---

## 1. Prérequis

| Composant | Exigence |
|---|---|
| Node.js | **22 LTS** (minimum 20.19 ; voir `.nvmrc`) |
| Base | PostgreSQL Supabase + extension `pg_trgm`, migrations appliquées |
| Stockage | Bucket **privé** `university-documents` |
| Cloudflare | Compte Workers, `wrangler` (devDependency), domaine + TLS |
| Redis | Backend partagé à prévoir (voir § 6 et ADR-0003) |
| Réseau | Cloudflare fournit `CF-Connecting-IP` (prioritaire dans `clientIp`) |

Le serveur refuse de démarrer en production si la configuration est invalide
(`src/instrumentation.ts` → `assertProductionConfig()`).

## 2. Variables d’environnement

Deux catégories, à ne pas confondre sur Cloudflare :

- **Build** : injectées lors de `opennextjs-cloudflare build` et figées dans le
  bundle (`NEXT_PUBLIC_*`). Elles ne peuvent pas être changées sans rebuild.
- **Runtime** : lues par le Worker à l’exécution et fournies via
  `wrangler secret put` (ou le dashboard Cloudflare).

### Obligatoires

| Variable | Type | Rôle |
|---|---|---|
| `DATABASE_URL` | runtime | Connexion Prisma (pooler, port 6543) |
| `DIRECT_URL` | migrations | Connexion directe (port 5432), jamais dans le Worker |
| `NEXT_PUBLIC_SUPABASE_URL` | build | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | build | Clé publiable (anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | runtime | **Secret serveur** (Admin API, Storage) |
| `NEXT_PUBLIC_SITE_URL` | build | URL publique **https** |

### Recommandées / selon l’usage

| Variable | Défaut | Rôle |
|---|---|---|
| `REDIS_URL` | — | Rate-limit partagé (`redis://` ou `rediss://`) ; voir § 6 |
| `ERROR_WEBHOOK_URL` | — | Alerting erreurs 5xx (https) |
| `CRON_SECRET` | — | Active `/api/cron/*` (≥ 32 caractères) |
| `DATABASE_POOL_MAX` | `2` | Connexions Prisma par instance/isolate (1–2 sur Workers) |
| `MAX_UPLOAD_SIZE_MB` | `50` | Plafond d’upload (≤ 500) |
| `DOCUMENT_STORAGE_BUCKET` | `university-documents` | Bucket privé |
| `INACTIVITY_MONTHS` | `6` | Passivation automatique |
| `LOG_LEVEL` | `info` en prod | `debug` / `info` / `warn` / `error` |
| `DEFAULT_STUDENT_PASSWORD` | — | Seed du compte étudiant de démo |
| `SUPERADMIN_PASSWORD` | — | Scripts de vérification uniquement |
| `SEED_DEMO_STUDENT` | `true` | Mettre `false` en production |
| `ALLOW_INSECURE_SITE_URL` | `false` | Uniquement pour `next start` local |

Les identifiants de déploiement (`CLOUDFLARE_API_TOKEN`,
`CLOUDFLARE_ACCOUNT_ID`) appartiennent à la CI/au poste de déploiement, pas au
runtime de l’application.

Ne jamais committer `.env`. Utiliser le gestionnaire de secrets de la plateforme.

```bash
# Secrets runtime Cloudflare (exemples)
npx wrangler secret put DATABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put CRON_SECRET
npx wrangler secret put ERROR_WEBHOOK_URL
npx wrangler secret list
```

Pour les `NEXT_PUBLIC_*`, les exporter dans l’environnement de build (CI) avant
`opennextjs-cloudflare build`.

## 3. Déploiement

Les migrations s’exécutent depuis un poste/CI de confiance, avec `DIRECT_URL`
(port 5432). Le Worker ne les exécute jamais.

```bash
npm ci
npx prisma generate
npx prisma migrate status          # doit être « up to date »
npx prisma migrate deploy
npm run lint
npm run typecheck
npm test
npm audit --audit-level=high
npx opennextjs-cloudflare build
npx opennextjs-cloudflare deploy
```

- Vérifier que les `NEXT_PUBLIC_*` sont définies **avant** le build.
- Vérifier que les secrets runtime existent : `npx wrangler secret list`.
- En local : `npm run preview` pour tester le Worker avant déploiement.

Après déploiement :

```bash
curl -fsS https://<domaine>/api/health
# {"status":"ok","db":"up",...,"requestId":"..."}
```

En cas d’échec 503, consulter l’observabilité Cloudflare et l’état Supabase
avant de relancer. Un déploiement ne doit jamais être validé sans
`/api/health` à `ok`.

### Rollback

Cloudflare conserve les versions du Worker. En cas de régression :

1. Identifier la dernière version saine (dashboard Workers → Deployments).
2. Redéployer cette version (rollback) sans rejouer de migration destructive.
3. Vérifier `/api/health`, une connexion et un téléchargement.
4. Si la migration est en cause, restaurer une sauvegarde DB (voir § 8) avant
   tout nouveau déploiement.

## 4. Vérifications avant mise en ligne

```bash
npm run lint
npm run typecheck
npm test
npm run verify:backend     # services (nécessite une base de test)
npm run verify:rls         # politiques RLS (comptes de test)
npm run smoke              # API + Storage (serveur local démarré)
npm audit --audit-level=high
npx opennextjs-cloudflare build
```

⚠️ `verify:*` et `smoke` **modifient** des comptes/documents de test
(réinitialisation de mot de passe, `must_change_password`, upload temporaire).
Ne jamais les exécuter contre la production.

La CI (`.github/workflows/ci.yml`) exécute automatiquement lint, typecheck,
tests, audit et builds Next/OpenNext avec des variables factices. Les scripts
`verify:backend`, `verify:rls` et `smoke` restent **manuels sur staging**, avec
les secrets de staging (aucun workflow `integration.yml` n’est fourni).

## 5. Supervision

### Santé

- `GET /api/health` : `200` si la base répond, `503` sinon.
- Chaque réponse porte `x-request-id` (repris dans les logs et les erreurs).

### Logs et traces

Logs JSON sur stdout/stderr, une ligne par événement :

```json
{"time":"...","level":"error","service":"upac-library","message":"Erreur serveur","requestId":"...","scope":"api","error":{...}}
```

- L’observabilité Cloudflare est **activée** (`wrangler.jsonc`) : logs,
  traces et issues, avec `redact_query_string: true`.
- Consulter le dashboard Cloudflare (Workers → Observability) ou exporter vers
  un agrégateur (Loki, Datadog…).
- `ERROR_WEBHOOK_URL` reçoit les erreurs 5xx en best-effort (Sentry, Slack…).
- Ne jamais logger de mot de passe, token ou clé : les erreurs sont sérialisées
  sans variables d’environnement.

### Alertes minimales

| Alerte | Seuil suggéré |
|---|---|
| Taux de 5xx | > 1 % sur 5 min |
| `/api/health` | 2 échecs consécutifs |
| Latence p95 API | > 2 s sur 10 min |
| Connexions Postgres | > 80 % du pool |
| Redis indisponible | 1 événement |
| Échecs de connexion | pic anormal (brute-force) |
| Espace disque / Storage | > 80 % |

## 6. Rate limiting

- Backend Redis si `REDIS_URL` est défini : clés `upac:rl:*`, script atomique.
- Sans Redis (ou panne) : repli mémoire **par isolate** + circuit breaker 30 s.
- Quotas : connexion (matricule/IP), téléchargement (utilisateur/IP), upload
  (administrateur/IP). Voir `RATE_LIMITS` dans `src/server/rate-limit.ts`.
- Sur Workers, `clientIp` privilégie `CF-Connecting-IP` (non falsifiable), puis
  `X-Forwarded-For` / `X-Real-IP` en repli.
- **Limite connue** : `ioredis` ouvre une connexion TCP longue, peu adaptée au
  cycle de vie des isolates Workers. Un backend partagé HTTP (Upstash REST) ou
  un Durable Object doit être mis en place avant une ouverture publique à fort
  trafic. Voir [ADR-0003](adr/0003-rate-limiting.md).

## 7. Tâches planifiées

- `pg_cron` : job `deactivate-inactive-students-daily`, `0 2 * * *`.
- Repli HTTP : `GET /api/cron/deactivate-inactive-students` avec
  `Authorization: Bearer $CRON_SECRET`. Sans secret : `503` (fail-closed).
- Vérifier après incident :

```sql
select jobid, jobname, schedule, active from cron.job;
select * from cron.job_run_details order by start_time desc limit 20;
```

## 8. Sauvegardes et restauration

### Base de données

- Activer les sauvegardes automatiques Supabase (et PITR si disponible).
- Export manuel avant migration risquée :

```bash
pg_dump "$DIRECT_URL" \
  --format=custom --no-owner --no-acl \
  --file="upac-$(date +%Y%m%d-%H%M).dump"
```

- Restauration vers une base **neuve** (jamais directement sur la prod) :

```bash
createdb upac_restore
pg_restore --clean --if-exists --no-owner --no-acl \
  -d "postgresql://.../upac_restore" upac-YYYYMMDD-HHMM.dump
```

- Contrôles post-restauration : `prisma migrate status`, `/api/health`,
  `verify:rls`, comptages `documents` / `profiles` / `favorites`.

### Stockage

- Sauvegarder le bucket `university-documents` (Supabase Storage ou export S3).
- Tester la restauration d’un fichier et d’une URL signée.
- Les métadonnées Prisma et les objets Storage doivent rester cohérents :
  comparer `documents.storage_path` aux objets présents.

### Objectifs

- RPO cible : ≤ 24 h (≤ 5 min avec PITR).
- RTO cible : ≤ 2 h.
- Tester une restauration **au moins une fois par trimestre**.

## 9. Rotation des secrets

Sur Cloudflare, utiliser `npx wrangler secret put <NOM>` (ou le dashboard) puis
redéployer. Les `NEXT_PUBLIC_*` ne sont pas des secrets mais nécessitent un
rebuild pour changer.

| Secret | Procédure |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard Supabase → nouvelle clé → `wrangler secret put` → redéployer → révoquer l’ancienne |
| `CRON_SECRET` | `openssl rand -hex 32` → `wrangler secret put` **et** mise à jour du cron appelant |
| `DATABASE_URL` / mot de passe DB | Rotation Supabase → `wrangler secret put` → redéployer |
| `REDIS_URL` | Rotation côté Redis → `wrangler secret put` → redéployer |
| Comptes bootstrap | Changer via l’UI ou l’Admin API, puis mettre à jour les secrets de test |

Après rotation : redéployer, vérifier `/api/health`, une connexion réelle et un
téléchargement.

## 10. Gestion d’incident

1. **Qualifier** : heure, route, `requestId`, taux d’erreur, composant suspect.
2. **Contenir** : désactiver la fonctionnalité concernée (ex. upload) ou
   revenir à la version précédente si le déploiement est en cause.
3. **Diagnostiquer** : logs filtrés par `requestId`, `/api/health`, statut
   Supabase (DB/Auth/Storage), Redis, pool Prisma.
4. **Corriger** et **vérifier** avec `smoke` + `verify:rls`.
5. **Capitaliser** : cause racine, action préventive, mise à jour du runbook.

### Cas fréquents

| Symptôme | Premiers contrôles |
|---|---|
| 5xx massifs | Health, logs `requestId`, dernière release, DB/Storage |
| `/api/health` 503 | Supabase, `DATABASE_URL`, pool, réseau |
| Téléchargements en échec | Bucket, politiques Storage, expiration des URLs signées |
| Uploads en échec | Taille, extension/signature, quota, Storage |
| Connexions en échec | Supabase Auth, clés, statut du compte, rate-limit |
| Redis down | Repli mémoire par isolate ; restaurer Redis puis surveiller (ADR-0003) |
| Fichier suspect | Désactiver l’upload, retirer l’objet, auditer `admin_logs`, prévenir |
| Fuite de secret | Révoquer/rotationner immédiatement, chercher les usages, notifier |

## 11. Maintenance

- Mettre à jour Next.js et les dépendances **au moins une fois par mois** ;
  `npm audit --audit-level=high` doit rester vert (0 vulnérabilité).
- Ne jamais utiliser `prisma migrate dev` contre la production : SQL revu +
  `prisma migrate deploy`.
- Toute modification RLS doit être suivie de `verify:rls`.
- Surveiller la croissance des documents et la rétention des logs.
- Conserver les journaux d’audit (`admin_logs`) selon la politique de
  l’université.

## 12. Checklist go-live

Checklist détaillée et à jour : [`docs/production-checklist.md`](production-checklist.md).

- [ ] Next.js ≥ 16.4.2, `npm audit` à 0 vulnérabilité
- [ ] CI verte (lint, typecheck, tests, audit, builds Next/OpenNext)
- [ ] Secrets runtime Cloudflare créés (`wrangler secret list`)
- [ ] `NEXT_PUBLIC_*` définies au build ; `NEXT_PUBLIC_SITE_URL` en https
- [ ] `DATABASE_POOL_MAX` à 1–2 ; `REDIS_URL` ou backend partagé décidé
- [ ] `ERROR_WEBHOOK_URL` configuré ; observabilité Cloudflare active
- [ ] `CRON_SECRET` ≥ 32 caractères (ou `pg_cron` vérifié)
- [ ] Mots de passe bootstrap changés ; `SEED_DEMO_STUDENT=false` en production
- [ ] Migrations appliquées, `/api/health` à `ok` sur le Worker déployé
- [ ] Sauvegarde DB + Storage réalisée et restauration testée
- [ ] Alertes 5xx / health / latence / Redis actives
- [ ] `verify:backend`, `verify:rls`, `smoke` verts sur staging

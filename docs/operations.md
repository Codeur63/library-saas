# Exploitation — Upac Library

Runbook de mise en production, supervision, sauvegardes et gestion d’incident.
À relire avant chaque déploiement majeur.

---

## 1. Prérequis

| Composant | Exigence |
|---|---|
| Node.js | **20.9+** (Next 16) |
| Base | PostgreSQL Supabase + extension `pg_trgm`, migrations appliquées |
| Stockage | Bucket **privé** `university-documents` |
| Redis | Recommandé (rate-limit partagé entre instances) |
| Reverse proxy | Doit **écraser** `X-Forwarded-For` avec l’IP réelle du client |

Le serveur refuse de démarrer en production si la configuration est invalide
(`src/instrumentation.ts` → `assertProductionConfig()`).

## 2. Variables d’environnement

### Obligatoires

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Connexion Prisma (pooler, port 6543) |
| `DIRECT_URL` | Connexion directe (migrations, port 5432) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clé publiable (anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret serveur** (Admin API, Storage) |
| `NEXT_PUBLIC_SITE_URL` | URL publique **https** |

### Recommandées / selon l’usage

| Variable | Défaut | Rôle |
|---|---|---|
| `REDIS_URL` | — | Rate-limit partagé (`redis://` ou `rediss://`) |
| `ERROR_WEBHOOK_URL` | — | Alerting erreurs 5xx (https) |
| `CRON_SECRET` | — | Active `/api/cron/*` (≥ 32 caractères) |
| `DATABASE_POOL_MAX` | `10` | Connexions Prisma par instance |
| `MAX_UPLOAD_SIZE_MB` | `50` | Plafond d’upload (≤ 500) |
| `DOCUMENT_STORAGE_BUCKET` | `university-documents` | Bucket privé |
| `INACTIVITY_MONTHS` | `6` | Passivation automatique |
| `LOG_LEVEL` | `info` en prod | `debug` / `info` / `warn` / `error` |
| `DEFAULT_STUDENT_PASSWORD` | — | Seed du compte étudiant de démo |
| `SUPERADMIN_PASSWORD` | — | Scripts de vérification uniquement |
| `SEED_DEMO_STUDENT` | `true` | Mettre `false` en production |
| `ALLOW_INSECURE_SITE_URL` | `false` | Uniquement pour `next start` local |

Ne jamais committer `.env`. Utiliser le gestionnaire de secrets de la plateforme.

## 3. Déploiement

```bash
npm ci
npx prisma migrate deploy
npx prisma generate
npm run build
npm start
```

Après démarrage :

```bash
curl -fsS https://<domaine>/api/health
# {"status":"ok","db":"up",...,"requestId":"..."}
```

En cas d’échec 503, consulter les logs (JSON) et l’état Supabase avant de
relancer. Un déploiement ne doit jamais être validé sans `/api/health` à `ok`.

## 4. Vérifications avant mise en ligne

```bash
npm run lint
npm run typecheck
npm test
npm run verify:backend     # services (nécessite une base de test)
npm run verify:rls         # politiques RLS (comptes de test)
npm run smoke              # API + Storage (serveur local démarré)
npm audit --omit=dev --audit-level=high
```

⚠️ `verify:*` et `smoke` **modifient** des comptes/documents de test
(réinitialisation de mot de passe, `must_change_password`, upload temporaire).
Ne jamais les exécuter contre la production.

Les mêmes vérifications sont disponibles dans
`.github/workflows/integration.yml` (exécution manuelle avec secrets).

## 5. Supervision

### Santé

- `GET /api/health` : `200` si la base répond, `503` sinon.
- Chaque réponse porte `x-request-id` (repris dans les logs et les erreurs).

### Logs

Logs JSON sur stdout/stderr, une ligne par événement :

```json
{"time":"...","level":"error","service":"upac-library","message":"Erreur serveur","requestId":"...","scope":"api","error":{...}}
```

- Agréger stdout/stderr (Loki, Datadog, CloudWatch…).
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
- Sans Redis (ou panne) : repli mémoire par instance + circuit breaker 30 s.
- Quotas : connexion (matricule/IP), téléchargement (utilisateur/IP), upload
  (administrateur/IP). Voir `RATE_LIMITS` dans `src/server/rate-limit.ts`.
- Le proxy doit fournir `X-Forwarded-For` de confiance, sinon un client peut
  falsifier son IP.

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

| Secret | Procédure |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard Supabase → nouvelle clé → mettre à jour l’env → redéployer → révoquer l’ancienne |
| `CRON_SECRET` | `openssl rand -hex 32` → mettre à jour l’env **et** le cron appelant |
| `DATABASE_URL` / mot de passe DB | Rotation Supabase → mettre à jour l’env → redéployer |
| `REDIS_URL` | Rotation côté Redis → mettre à jour l’env → redéployer |
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
| Redis down | Repli mémoire automatique ; restaurer Redis puis surveiller |
| Fichier suspect | Désactiver l’upload, retirer l’objet, auditer `admin_logs`, prévenir |
| Fuite de secret | Révoquer/rotationner immédiatement, chercher les usages, notifier |

## 11. Maintenance

- Mettre à jour Next.js et les dépendances **au moins une fois par mois** ;
  `npm audit --omit=dev --audit-level=high` doit rester vert.
- Ne jamais utiliser `prisma migrate dev` contre la production : SQL revu +
  `prisma migrate deploy`.
- Toute modification RLS doit être suivie de `verify:rls`.
- Surveiller la croissance des documents et la rétention des logs.
- Conserver les journaux d’audit (`admin_logs`) selon la politique de
  l’université.

## 12. Checklist go-live

Checklist détaillée et à jour : [`docs/production-checklist.md`](production-checklist.md).

- [ ] Next.js ≥ 16.4.2, `npm audit --omit=dev` sans vulnérabilité high/critical
- [ ] `NEXT_PUBLIC_SITE_URL` en https, `REDIS_URL` et `ERROR_WEBHOOK_URL` configurés
- [ ] `CRON_SECRET` ≥ 32 caractères (ou `pg_cron` vérifié)
- [ ] Mots de passe bootstrap changés ; `SEED_DEMO_STUDENT=false` en production
- [ ] Migrations appliquées, `/api/health` à `ok`
- [ ] Sauvegarde DB + Storage réalisée et restauration testée
- [ ] Alertes 5xx / health / latence / Redis actives
- [ ] `verify:backend`, `verify:rls`, `smoke` verts sur l’environnement de staging

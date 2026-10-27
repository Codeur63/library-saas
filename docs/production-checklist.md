# Checklist de mise en production — Upac Library

> État de référence : 27 octobre 2026. Cocher chaque case avant l’ouverture
> publique. Les commandes de vérification destructives (`verify:*`, `smoke`) sont
> à exécuter **sur staging uniquement**.

## 0. Décision d’architecture

- [x] Hébergement choisi : **Cloudflare Workers + OpenNext** ([ADR-0001](adr/0001-hosting-cloudflare-workers.md)).
- [x] Accès données : Prisma + RLS en défense en profondeur ([ADR-0002](adr/0002-data-access-prisma-rls.md)).
- [x] Catalogue public, téléchargement authentifié ([ADR-0004](adr/0004-public-catalog.md)).
- [x] Stockage privé + URLs signées ([ADR-0005](adr/0005-storage-signed-urls.md)).
- [ ] Rate limiting partagé décidé/implémenté (ADR-0003) : Upstash REST, Durable Object ou risque accepté par écrit.
- [ ] Domaine de production et certificat TLS prêts (Cloudflare).
- [ ] `CF-Connecting-IP` vérifié en production (prioritaire dans `clientIp`).

## 1. Bloquants actuels

- [x] Compte démo `STU2026001` (`stu2026001@upac.local`) supprimé de `auth.users` et `profiles`.
- [ ] `NEXT_PUBLIC_SITE_URL` défini en **https** (sinon le démarrage échoue).
- [ ] `LOG_LEVEL=info` en production (le `.env` local est en `debug`).
- [ ] `SEED_DEMO_STUDENT=false` dans l’environnement de production.
- [ ] `ALLOW_INSECURE_SITE_URL` absent ou `false`.
- [ ] Backend de rate-limit partagé configuré (ou risque par isolate accepté).
- [ ] `ERROR_WEBHOOK_URL` configuré pour l’alerting 5xx.
- [ ] Email réel pour le superadmin (remplacer `superadmin@upac.local`).
- [ ] Code commité et poussé ; CI verte ; scripts d’intégration exécutés sur staging.
- [ ] Observabilité Cloudflare active (logs, traces, issues).
- [ ] Sauvegardes Supabase/PITR activées et restauration testée.
- [ ] Alertes supervision actives (5xx, health, latence, Redis).

## 2. Variables d’environnement

### Build (figées dans le bundle)

- [ ] `NEXT_PUBLIC_SUPABASE_URL` définie avant `opennextjs-cloudflare build`.
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` définie au build.
- [ ] `NEXT_PUBLIC_SITE_URL=https://<domaine>` défini au build.

### Runtime (secrets Cloudflare)

- [ ] `DATABASE_URL` : pooler Supabase, port **6543**, `?pgbouncer=true` (`wrangler secret put`).
- [ ] `SUPABASE_SERVICE_ROLE_KEY` : secret serveur, jamais exposé au client.
- [ ] `DIRECT_URL` : disponible sur le poste/CI de migration (pas dans le Worker).
- [ ] `REDIS_URL` ou backend partagé équivalent (voir ADR-0003).
- [ ] `ERROR_WEBHOOK_URL` en https.
- [ ] `CRON_SECRET` ≥ 32 caractères (et configuré côté appelant).
- [ ] `DATABASE_POOL_MAX` à **1–2** pour les isolates Workers.
- [ ] `MAX_UPLOAD_SIZE_MB` ≤ limite du bucket (50 Mo actuellement).
- [ ] `INACTIVITY_MONTHS` validé avec l’administration.
- [ ] `LOG_LEVEL=info`.
- [ ] `SEED_DEMO_STUDENT=false`.

```bash
npx wrangler secret list   # vérifier la présence, jamais les valeurs
```

### À ne pas mettre en production

- [ ] `SUPERADMIN_PASSWORD` et `DEFAULT_STUDENT_PASSWORD` absents (secrets de seed/vérification uniquement).
- [ ] `ALLOW_INSECURE_SITE_URL` absent.
- [ ] `.env` non commité ; secrets stockés dans le gestionnaire de la plateforme.

Contrôle de présence sans afficher les valeurs :

```bash
node --env-file=.env -e "
for (const k of ['DATABASE_URL','DIRECT_URL','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','SUPABASE_SERVICE_ROLE_KEY','NEXT_PUBLIC_SITE_URL','CRON_SECRET'])
  console.log(k, process.env[k] ? 'set' : 'MISSING');
"
```

## 3. Supabase

- [ ] **Auth → URL Configuration** : Site URL = `https://<domaine>` ; Redirect URLs de production ajoutées.
- [ ] Fournisseur email/SMTP configuré si réinitialisation de mot de passe nécessaire.
- [ ] Superadmin avec une adresse email réelle et `must_change_password=true`.
- [ ] Bucket `university-documents` **privé**, limite 50 Mo, MIME `application/pdf` et `image/png`.
- [ ] Politiques Storage vérifiées (téléchargement via URL signée uniquement).
- [ ] RLS active sur les tables métier ; `verify:rls` vert sur staging.
- [ ] Job `pg_cron` `deactivate-inactive-students-daily` actif (`0 2 * * *`).
- [ ] Sauvegardes automatiques/PITR activées.
- [ ] Pooler Supabase utilisé pour `DATABASE_URL` (pas de connexions directes depuis le runtime).

Contrôle :

```sql
select jobid, jobname, schedule, active from cron.job;
select status, start_time from cron.job_run_details order by start_time desc limit 5;
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'university-documents';
```

## 4. Données

- [x] Compte étudiant de démonstration supprimé.
- [ ] Aucun document de test (`Memoire`/`Reseau` à valider comme contenus réels).
- [ ] Aucun favori, upload ou log de test restant.
- [ ] Comptes réels créés par le secrétariat (étudiants, administrateurs).
- [ ] Catalogue initial importé ou publié.
- [ ] `admin_action_logs` conservé comme journal d’audit.

## 5. Code et CI

- [ ] `git status` propre ; aucun secret dans le diff.
- [ ] Commit sur `main` et push.
- [ ] CI GitHub verte (`.github/workflows/ci.yml`) : lint, typecheck, tests, audit, builds Next/OpenNext.
- [ ] Scripts d’intégration (`verify:backend`, `verify:rls`, `smoke`) exécutés manuellement sur staging.
- [ ] `npm audit --audit-level=high` = 0 vulnérabilité.
- [ ] Build de production reproductible (`npm ci && npm run build`).
- [ ] Build Cloudflare reproductible (`npx opennextjs-cloudflare build`).
- [ ] Version/tag de release créé.

## 6. Déploiement (Cloudflare Workers)

```bash
npm ci
npx prisma migrate status      # doit indiquer « up to date »
npx prisma migrate deploy      # avec DIRECT_URL, depuis un poste/CI de confiance
npx prisma generate
npm run lint && npm run typecheck && npm test
npx opennextjs-cloudflare build
npx opennextjs-cloudflare deploy
```

- [ ] Node.js 22 LTS (minimum 20.19 ; `.nvmrc`).
- [ ] `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` disponibles pour le déploiement.
- [ ] Migrations appliquées (8 migrations actuellement).
- [ ] Build Next et OpenNext terminés sans erreur.
- [ ] Secrets runtime créés (`wrangler secret list`).
- [ ] `GET /api/health` retourne `200` avec `"db":"up"` sur le Worker déployé.
- [ ] En-têtes de sécurité présents : CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`.
- [ ] Redirection HTTP → HTTPS et domaine canonique opérationnels (Cloudflare).
- [ ] Logs/traces visibles dans l’observabilité Cloudflare.
- [ ] Version Worker notée pour un rollback rapide.

## 7. Vérifications post-déploiement

- [ ] Visiteur anonyme : accueil, `/bibliotheque`, `/filieres` et fiche `GLOBAL` accessibles.
- [ ] Visiteur anonyme : aucun document `PROGRAM`, aucun téléchargement/aperçu.
- [ ] Connexion superadmin → changement de mot de passe imposé.
- [ ] Connexion d’un étudiant réel.
- [ ] Recherche, filtres, pagination et fiche document.
- [ ] Téléchargement : redirection 302 vers une URL signée, fichier accessible.
- [ ] Favoris : ajout/retrait persistants.
- [ ] Upload admin : PDF/PNG valides acceptés ; type/taille invalides refusés.
- [ ] Étudiant non autorisé : accès dashboard/upload refusé.
- [ ] Rate-limit connexion/téléchargement/upload actif ; `CF-Connecting-IP` utilisé.
- [ ] `/api/cron/deactivate-inactive-students` : `503` sans secret, `200` avec.
- [ ] `/sitemap.xml` et `/robots.txt` accessibles.
- [ ] Pages 404 et erreurs serveur correctes.
- [ ] Affichage mobile et navigation clavier (lien « Aller au contenu »).
- [ ] Aucune erreur 5xx dans l’observabilité sur le parcours de recette.

## 8. Supervision et exploitation

- [ ] Observabilité Cloudflare active : logs, traces, issues, `redact_query_string`.
- [ ] `ERROR_WEBHOOK_URL` reçoit bien une alerte de test.
- [ ] Alertes : 5xx > 1 %, health en échec, latence p95, Redis indisponible.
- [ ] Surveillance des sauvegardes et de l’espace Storage.
- [ ] Astreinte et procédure d’incident connues (`docs/operations.md`).
- [ ] Antivirus externe : risque résiduel accepté (validation magic bytes seulement).

## 9. Rollback

- [ ] Version Worker précédente identifiée et redéployable (dashboard Cloudflare).
- [ ] Sauvegarde DB récente disponible avant migration.
- [ ] Procédure de restauration testée (base neuve, jamais directement en prod).
- [ ] Plan de retour DNS/TLS et de communication interne.

## 10. Go / No-Go

- [ ] Tous les bloquants de la section 1 sont levés.
- [ ] Limite connue du rate-limit par isolate levée ou risque accepté par écrit (ADR-0003).
- [ ] Recette fonctionnelle validée par la bibliothèque.
- [ ] Responsable technique et direction : accord explicite de mise en production.

Une fois cette checklist complète, le déploiement peut être déclaré prêt.

# Checklist de mise en production — Upac Library

> État de référence : 20 octobre 2026. Cocher chaque case avant l’ouverture
> publique. Les commandes de vérification destructives (`verify:*`, `smoke`) sont
> à exécuter **sur staging uniquement**.

## 0. Décision d’architecture

- [ ] Type d’hébergement choisi : instance Node unique, plusieurs instances ou serverless.
- [ ] Si plusieurs instances ou serverless : `REDIS_URL` configuré (le rate-limit mémoire n’est pas partagé).
- [ ] Domaine de production et certificat TLS prêts.
- [ ] Reverse proxy configuré pour **écraser** `X-Forwarded-For` avec l’IP réelle du client.

## 1. Bloquants actuels

- [x] Compte démo `STU2026001` (`stu2026001@upac.local`) supprimé de `auth.users` et `profiles`.
- [ ] `NEXT_PUBLIC_SITE_URL` défini en **https** (sinon le démarrage échoue).
- [ ] `LOG_LEVEL=info` en production (le `.env` local est en `debug`).
- [ ] `SEED_DEMO_STUDENT=false` dans l’environnement de production.
- [ ] `ALLOW_INSECURE_SITE_URL` absent ou `false`.
- [ ] `REDIS_URL` configuré si architecture multi-instances/serverless.
- [ ] `ERROR_WEBHOOK_URL` configuré pour l’alerting 5xx.
- [ ] Email réel pour le superadmin (remplacer `superadmin@upac.local`).
- [ ] Code commité et poussé ; CI verte ; workflow d’intégration exécuté.
- [ ] Sauvegardes Supabase/PITR activées et restauration testée.
- [ ] Alertes supervision actives (5xx, health, latence, Redis).

## 2. Variables d’environnement

### Obligatoires

- [ ] `DATABASE_URL` : pooler Supabase, port **6543**, `?pgbouncer=true`.
- [ ] `DIRECT_URL` : connexion directe, port **5432** (migrations uniquement).
- [ ] `NEXT_PUBLIC_SUPABASE_URL`.
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (secret serveur, jamais exposé au client).
- [ ] `NEXT_PUBLIC_SITE_URL=https://<domaine>`.

### Recommandées / selon l’usage

- [ ] `REDIS_URL` (`redis://` ou `rediss://`) si multi-instances.
- [ ] `ERROR_WEBHOOK_URL` en https.
- [ ] `CRON_SECRET` ≥ 32 caractères (et configuré côté appelant).
- [ ] `DATABASE_POOL_MAX` adapté au nombre d’instances.
- [ ] `MAX_UPLOAD_SIZE_MB` ≤ limite du bucket (50 Mo actuellement).
- [ ] `INACTIVITY_MONTHS` validé avec l’administration.
- [ ] `LOG_LEVEL=info`.
- [ ] `SEED_DEMO_STUDENT=false`.

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
- [ ] CI GitHub verte : lint, typecheck, tests, audit, build.
- [ ] Workflow `integration.yml` exécuté avec les secrets de staging.
- [ ] `npm audit --omit=dev --audit-level=high` = 0 vulnérabilité.
- [ ] Build de production reproductible (`npm ci && npm run build`).
- [ ] Version/tag de release créé.

## 6. Déploiement

```bash
npm ci
npx prisma migrate status      # doit indiquer « up to date »
npx prisma migrate deploy
npx prisma generate
npm run build
NODE_ENV=production npm start
```

- [ ] Node.js ≥ 20.9 (LTS recommandé).
- [ ] Migrations appliquées (8 migrations actuellement).
- [ ] Build terminé sans erreur.
- [ ] `GET /api/health` retourne `200` avec `"db":"up"`.
- [ ] En-têtes de sécurité présents : CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`.
- [ ] Redirection HTTP → HTTPS et domaine canonique opérationnels.
- [ ] Logs JSON visibles dans l’agrégateur.

## 7. Vérifications post-déploiement

- [ ] Connexion superadmin → changement de mot de passe imposé.
- [ ] Connexion d’un étudiant réel.
- [ ] Recherche, filtres, pagination et fiche document.
- [ ] Téléchargement : redirection 302 vers une URL signée, fichier accessible.
- [ ] Favoris : ajout/retrait persistants.
- [ ] Upload admin : PDF/PNG valides acceptés ; type/taille invalides refusés.
- [ ] Étudiant non autorisé : accès dashboard/upload refusé.
- [ ] Rate-limit connexion/téléchargement/upload actif.
- [ ] `/api/cron/deactivate-inactive-students` : `503` sans secret, `200` avec.
- [ ] Pages 404 et erreurs serveur correctes.
- [ ] Affichage mobile et navigation clavier (lien « Aller au contenu »).
- [ ] Aucune erreur 5xx dans les logs sur le parcours de recette.

## 8. Supervision et exploitation

- [ ] Logs centralisés (stdout/stderr).
- [ ] `ERROR_WEBHOOK_URL` reçoit bien une alerte de test.
- [ ] Alertes : 5xx > 1 %, health en échec, latence p95, Redis indisponible.
- [ ] Surveillance des sauvegardes et de l’espace Storage.
- [ ] Astreinte et procédure d’incident connues (`docs/operations.md`).
- [ ] Antivirus externe : risque résiduel accepté (validation magic bytes seulement).

## 9. Rollback

- [ ] Release précédente conservée et redéployable.
- [ ] Sauvegarde DB récente disponible avant migration.
- [ ] Procédure de restauration testée (base neuve, jamais directement en prod).
- [ ] Plan de retour DNS/TLS et de communication interne.

## 10. Go / No-Go

- [ ] Tous les bloquants de la section 1 sont levés.
- [ ] Recette fonctionnelle validée par la bibliothèque.
- [ ] Responsable technique et direction : accord explicite de mise en production.

Une fois cette checklist complète, le déploiement peut être déclaré prêt.

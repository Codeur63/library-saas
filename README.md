# Upac Library

Bibliothèque numérique universitaire : catalogue public, gestion de documents,
comptes étudiants/administrateurs, favoris et téléchargements authentifiés.

Stack : **Next.js 16** (App Router, Server Actions, Turbopack), **React 19**,
**TypeScript**, **Tailwind CSS**, **Supabase** (Auth, PostgreSQL, Storage),
**Prisma 7**, **Cloudflare Workers + OpenNext**.

## Démarrage

Prérequis : Node.js **22 LTS** (minimum 20.19), npm, un projet Supabase et les
migrations appliquées.

```bash
cp .env.example .env   # renseigner les valeurs
npm install
npx prisma migrate deploy
npx prisma generate
npm run dev
```

Application : <http://localhost:3000>

Le catalogue (`/`, `/bibliotheque`, `/filieres`, `/documents/[id]`) est public.
Les favoris, l’upload, le dashboard, l’aperçu PDF et le téléchargement exigent
une session.

## Architecture

| Domaine | Emplacement |
|---|---|
| Pages et routes API | `src/app` |
| Composants et fonctionnalités | `src/features`, `src/components` |
| Services métier | `src/server/services` |
| Autorisations | `src/server/access-control.ts` |
| Rate limiting | `src/server/rate-limit.ts` |
| Logs / erreurs | `src/server/logger.ts`, `src/server/errors.ts` |
| Validation d’environnement | `src/lib/env.ts`, `src/lib/env-public.ts` |
| Client Prisma | `src/lib/prisma.ts` |
| Middleware | `src/proxy.ts` |
| Schéma et migrations | `prisma/`, `prisma.config.ts` |
| Déploiement Cloudflare | `wrangler.jsonc`, `open-next.config.ts` |

## Variables d’environnement

Voir [`.env.example`](.env.example) pour la liste commentée.

- **Build** : `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`.
  Elles sont figées au build.
- **Runtime (secrets)** : `DATABASE_URL`, `DIRECT_URL` (migrations),
  `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `ERROR_WEBHOOK_URL`,
  `REDIS_URL`.
- `DIRECT_URL` n’est utilisée que par les migrations, jamais par le Worker.
- `DATABASE_POOL_MAX` doit rester bas sur Workers (1–2).

En production Cloudflare, les secrets se configurent avec :

```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put DATABASE_URL
npx wrangler secret put CRON_SECRET
# etc.
```

## Scripts

```bash
npm run dev            # serveur de développement
npm run build          # build Next.js
npm run lint           # ESLint
npm run typecheck      # next typegen + tsc
npm test               # tests unitaires (Vitest)
npm run verify:backend # services (base de test)
npm run verify:rls     # politiques RLS directes
npm run smoke          # API + Storage (serveur démarré)
npm run preview        # build + preview Cloudflare local
npm run deploy         # build + déploiement Cloudflare
```

`verify:*` et `smoke` modifient des données de test : **staging uniquement**.

## Déploiement (Cloudflare Workers)

La cible est documentée dans [ADR-0001](docs/adr/0001-hosting-cloudflare-workers.md).

```bash
npm ci
npx prisma migrate deploy        # avec DIRECT_URL
npm run lint && npm run typecheck && npm test
npm audit --audit-level=high
npx opennextjs-cloudflare build
npx opennextjs-cloudflare deploy
curl -fsS https://<domaine>/api/health
```

Prérequis : `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID` dans
l’environnement de déploiement (ou `wrangler login` en local). Les migrations
s’exécutent depuis un poste/CI de confiance, jamais depuis le Worker.

> Le middleware Node (`src/proxy.ts`) est encore signalé comme expérimental par
> OpenNext. Le garder minimal et vérifier les routes protégées après chaque
> montée de version.

## Qualité et CI

GitHub Actions exécute sur `main` et les pull requests :
lint, typecheck, tests, audit dépendances et build Next/OpenNext
(`.github/workflows/ci.yml`). Les vérifications d’intégration restent manuelles
sur staging.

## Documentation

- [ADRs](docs/adr/README.md) : décisions d’architecture.
- [Runbook d’exploitation](docs/operations.md) : configuration, déploiement,
  supervision, sauvegardes, incidents.
- [Checklist de mise en production](docs/production-checklist.md).

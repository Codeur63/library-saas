# Upac Library

Bibliothèque numérique universitaire (Next.js 16, Supabase, Prisma, Tailwind).

## Démarrage

```bash
cp .env.example .env   # renseigner les valeurs
npm install
npx prisma migrate deploy
npx prisma generate
npm run dev
```

Application : <http://localhost:3000>

## Vérifications

```bash
npm run lint
npm run typecheck
npm test
npm run verify:backend   # services (base de test)
npm run verify:rls       # politiques RLS
npm run smoke            # API + Storage (serveur démarré)
```

## Exploitation

Runbook complet : [docs/operations.md](docs/operations.md) (configuration,
supervision, sauvegardes, rotation des secrets, incidents, go-live).

Checklist de mise en production : [docs/production-checklist.md](docs/production-checklist.md).

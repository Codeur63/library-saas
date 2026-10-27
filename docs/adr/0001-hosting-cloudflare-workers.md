# ADR-0001 — Hébergement sur Cloudflare Workers avec OpenNext

- Statut : Accepté
- Date : 2026-10-27

## Contexte

L’application est une application Next.js 16 avec rendu serveur, Server Actions,
routes API et accès PostgreSQL (Supabase). Le dépôt contient déjà :

- `open-next.config.ts` et `wrangler.jsonc` ;
- les scripts `preview`, `deploy`, `upload` et `cf-typegen` basés sur
  `@opennextjs/cloudflare` ;
- `initOpenNextCloudflareForDev()` dans `next.config.mjs` ;
- `.open-next/` et `.wrangler/` dans `.gitignore` ;
- un historique de déploiements Cloudflare.

Les documents d’exploitation décrivaient pourtant un serveur Node classique
(`npm start` + reverse proxy), ce qui rendait la cible ambiguë.

## Décision

La cible de production est **Cloudflare Workers**, avec le runtime Node.js
fourni par `nodejs_compat` et le build **OpenNext Cloudflare**.

- Build : `npx opennextjs-cloudflare build`
- Déploiement : `npx opennextjs-cloudflare deploy`
- Configuration : `wrangler.jsonc`
- Node.js local/CI : 22 LTS (minimum 20.19)
- Version de compatibilité Workers : `2026-10-26`
- Secrets : `wrangler secret put` ou dashboard Cloudflare, jamais dans le dépôt
- Migrations Prisma : exécutées depuis un poste/CI de confiance avec
  `DIRECT_URL`, jamais depuis le Worker

## Alternatives considérées

1. **Serveur Node (VM/container)** : plus simple pour le middleware et les
   sockets Redis, mais ops, scaling et TLS à maintenir.
2. **Vercel** : excellent support Next.js, mais coût et dépendance à un
   fournisseur différent de l’infrastructure déjà en place.
3. **Supabase Edge Functions** : pas adapté à une application Next.js complète.

## Conséquences

- Le middleware Node (`src/proxy.ts`) est supporté par OpenNext mais encore
  marqué **expérimental** par Cloudflare/OpenNext. Il doit rester minimal et
  être surveillé après chaque montée de version.
- Les `NEXT_PUBLIC_*` sont figées au build : elles doivent être présentes lors
  du `opennextjs-cloudflare build`, pas seulement comme secrets runtime.
- Les connexions PostgreSQL doivent rester limitées (`DATABASE_POOL_MAX` faible)
  pour éviter la saturation du pooler Supabase.
- Les connexions TCP longues (Redis/ioredis) ne sont pas un modèle naturel sur
  Workers. Voir ADR-0003.
- Le cache incrémental OpenNext n’est pas encore activé (R2). Voir ADR-0006.
- La journalisation doit passer par l’observabilité Cloudflare. Voir ADR-0007.

## Suivi

- Vérifier `/api/health` après chaque déploiement Workers.
- Réduire `DATABASE_POOL_MAX` à 1–2 en production.
- Tester le middleware après chaque montée de version de Next/OpenNext.
- Documenter le rollback via les versions de Worker Cloudflare.

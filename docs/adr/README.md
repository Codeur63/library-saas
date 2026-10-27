# Architecture Decision Records

Ce dossier conserve les décisions d’architecture structurantes de Upac Library.
Chaque ADR est immuable : une décision qui évolue est remplacée par un nouvel
ADR qui référence l’ancien.

## Index

| ADR | Sujet | Statut |
|---|---|---|
| [0001](0001-hosting-cloudflare-workers.md) | Hébergement : Cloudflare Workers + OpenNext | Accepté |
| [0002](0002-data-access-prisma-rls.md) | Accès aux données : Prisma + RLS en défense en profondeur | Accepté |
| [0003](0003-rate-limiting.md) | Rate limiting partagé et limites Workers | Accepté |
| [0004](0004-public-catalog.md) | Catalogue public, téléchargement authentifié | Accepté |
| [0005](0005-storage-signed-urls.md) | Stockage privé et URLs signées | Accepté |
| [0006](0006-caching.md) | Cache Next/OpenNext et invalidation | Accepté |
| [0007](0007-observability-secrets.md) | Observabilité, logs et secrets | Accepté |
| [0008](0008-ci-quality-gates.md) | CI et barrières qualité | Accepté |

## Format

```markdown
# ADR-000N — Titre

- Statut : Proposé | Accepté | Remplacé par ADR-XXXX | Abandonné
- Date : AAAA-MM-JJ

## Contexte
## Décision
## Alternatives considérées
## Conséquences
## Suivi
```

# ADR-0004 — Catalogue public, téléchargement authentifié

- Statut : Accepté
- Date : 2026-10-27

## Contexte

La bibliothèque était entièrement réservée aux comptes connectés. Le produit
souhaite permettre la consultation du catalogue sans connexion tout en
conservant un contrôle sur les fichiers.

## Décision

- `/`, `/bibliotheque`, `/filieres` et `/documents/[id]` sont accessibles sans
  session.
- Un visiteur non authentifié ne voit que les documents **publiés** en
  visibilité `GLOBAL`.
- Les documents `PROGRAM` restent réservés aux comptes autorisés.
- Le **téléchargement**, l’**aperçu PDF** et les **favoris** restent réservés
  aux utilisateurs authentifiés.
- Les couvertures des documents `GLOBAL` publiés peuvent être servies
  publiquement ; les autres restent privées.
- `/favoris`, `/upload` et `/dashboard` restent protégés.

## Alternatives considérées

1. Catalogue entièrement privé : nécessite une connexion dès l’accueil.
2. Catalogue public + téléchargement public : plus simple, mais expose les
   fichiers et complique le suivi/les quotas.
3. Catalogue public + téléchargement authentifié : retenu.

## Conséquences

- `sitemap.xml` peut référencer les documents `GLOBAL` publiés.
- Le catalogue est exposé au scraping : prévoir rate limiting et surveillance.
- Les règles RLS directes restent plus strictes que le rendu serveur : le
  catalogue public passe par Prisma, pas par le client Supabase anonyme.
- La page document doit afficher une invitation de connexion pour l’aperçu et
  le téléchargement.

## Suivi

- Ajouter des tests d’intégration « visiteur anonyme ».
- Vérifier les quotas et les logs de scraping.
- Réévaluer si des contenus `PROGRAM` doivent devenir publics.

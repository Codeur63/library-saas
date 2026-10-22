import { cache } from "react";

type CacheFn = <F extends (...args: never[]) => unknown>(fn: F) => F;

// React `cache()` n'existe que dans le build React *server* fourni par Next.js.
// Sous les scripts de vérification (vite-node avec le react stable), on retombe
// sur l'identité : aucune mémoïsation, mais aucune régression fonctionnelle.
const reactCache = (typeof cache === "function" ? cache : undefined) as CacheFn | undefined;

/**
 * Mémoïse une fonction pour la durée d'une requête (rendu RSC / Server Action).
 * Permet de dédupliquer les accès répétés (auth, lecture document) au sein d'un
 * même rendu. No-op hors contexte Next.
 */
export function requestCache<F extends (...args: never[]) => unknown>(fn: F): F {
  return reactCache ? reactCache(fn) : fn;
}

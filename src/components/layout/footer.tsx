import Link from "next/link";

import { ROUTES } from "@/constants/routes";

const FOOTER_LINKS = [
  { label: "Bibliothèque", href: ROUTES.bibliotheque },
  { label: "Filières", href: ROUTES.filieres },
  { label: "Publier un document", href: ROUTES.upload },
  { label: "Mes favoris", href: ROUTES.favoris },
];

export default function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-8 sm:px-6">
        <nav aria-label="Liens du pied de page">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-col gap-2 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-text-muted">
            Université Protestante d’Afrique Centrale — Bibliothèque numérique
          </p>
          <p className="text-xs text-text-muted">© {new Date().getFullYear()} Upac Library</p>
        </div>
      </div>
    </footer>
  );
}
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import Breadcrumb from "@/components/layout/breadcrumb";
import { ROUTES } from "@/constants/routes";
import FavoritesList from "@/features/favorites/components/favorites-list";
import { getCurrentUser } from "@/server/current-user";
import { listFavorites } from "@/server/services/favorites.service";

export const metadata: Metadata = {
  title: "Mes favoris — Upac Library",
  description:
    "Retrouvez les documents que vous avez mis en favoris dans la bibliothèque numérique de l'UPAC.",
};

export default async function FavoritesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`${ROUTES.login}?next=${encodeURIComponent(ROUTES.favoris)}`);
  }

  const page = await listFavorites({ page: 1, pageSize: 100 });

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6">
      <Breadcrumb items={[{ label: "Accueil", href: ROUTES.home }, { label: "Mes favoris" }]} />

      <section className="mt-6 space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Mes favoris</h1>
          <p className="max-w-[65ch] text-base text-text-secondary">
            Vos documents favoris, pour y revenir en un clic.
          </p>
        </header>

        <FavoritesList documents={page.items.map((item) => item.document)} />
      </section>
    </div>
  );
}

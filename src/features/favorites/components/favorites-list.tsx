import Link from "next/link";

import EmptyState from "@/components/feedback/empty-state";
import { ROUTES } from "@/constants/routes";
import DocumentRow from "@/features/documents/components/document-row";
import type { LibraryDocument } from "@/types/library";

export default function FavoritesList({ documents }: { documents: LibraryDocument[] }) {
  if (documents.length === 0) {
    return (
      <EmptyState
        title="Aucun favori pour le moment"
        description="Ajoutez des documents à vos favoris pour les retrouver facilement ici."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-text-muted" role="status">
        {documents.length} {documents.length > 1 ? "documents favoris" : "document favori"}
      </p>
      <div>
        {documents.map((document) => (
          <DocumentRow key={document.id} document={document} />
        ))}
      </div>
      <p className="mt-4 text-sm text-text-muted">
        Vous cherchez d’autres ressources ?{" "}
        <Link
          href={ROUTES.bibliotheque}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Parcourir la bibliothèque
        </Link>
      </p>
    </div>
  );
}

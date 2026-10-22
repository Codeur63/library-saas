import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";

const DEFAULT_TITLE = "Aucun document disponible pour ces critères.";
const DEFAULT_DESCRIPTION =
  "Essayez d’élargir votre recherche ou de réinitialiser les filtres.";

export default function EmptyState({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  onReset,
}: {
  title?: string;
  description?: string;
  onReset?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <SearchX size={32} aria-hidden className="text-text-muted" />
      <p className="text-base font-medium text-foreground">{title}</p>
      <p className="max-w-[60ch] text-sm text-text-muted">{description}</p>
      {onReset && (
        <Button variant="outline" size="sm" onClick={onReset}>
          Réinitialiser les filtres
        </Button>
      )}
    </div>
  );
}
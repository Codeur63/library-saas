import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center" role="alert">
      <AlertTriangle size={32} aria-hidden className="text-warning" />
      <p className="text-base font-medium text-foreground">
        Impossible de charger les documents.
      </p>
      <p className="max-w-[60ch] text-sm text-text-muted">
        Une erreur est survenue. Vérifiez votre connexion puis réessayez.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Réessayer
      </Button>
    </div>
  );
}
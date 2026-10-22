"use client";

import { FileText } from "lucide-react";
import { useState } from "react";

import DocumentCover from "@/features/documents/components/document-cover";
import { cn } from "@/lib/utils";
import type { LibraryDocument } from "@/types/library";

function isPdf(document: LibraryDocument): boolean {
  return document.mimeType === "application/pdf" || document.fileExtension.toLowerCase() === "pdf";
}

/**
 * Vignette sobre utilisée en mode compact (cartes) lorsqu'aucun aperçu réel
 * n'est disponible : un aplat neutre + le type de fichier, lisible à petite
 * taille (contrairement à la couverture détaillée).
 */
function CompactFallback({ document, className }: { document: LibraryDocument; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1 bg-surface text-text-muted",
        className
      )}
      aria-hidden
    >
      <FileText size={16} />
      <span className="text-[9px] font-semibold uppercase tracking-wide">
        {document.fileExtension}
      </span>
    </div>
  );
}

/**
 * Couverture de document : affiche la première page réelle (PDF, servie par
 * /api/documents/[id]/cover) et retombe sur une vignette adaptée au format ou
 * en cas d'échec de chargement.
 */
export default function DocumentCoverImage({
  document,
  className,
  compact = false,
}: {
  document: LibraryDocument;
  className?: string;
  compact?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (!isPdf(document) || failed) {
    return compact ? (
      <CompactFallback document={document} className={className} />
    ) : (
      <DocumentCover document={document} uid={document.id} className={className} />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/documents/${document.id}/cover`}
      alt={compact ? "" : `Première page du document : ${document.title}`}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn("block bg-surface object-cover object-top", className)}
    />
  );
}

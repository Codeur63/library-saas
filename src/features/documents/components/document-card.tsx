import Link from "next/link";

import { documentRoute } from "@/constants/routes";
import DocumentCoverImage from "@/features/documents/components/document-cover-image";
import DownloadButton from "@/features/documents/components/download-button";
import DownloadCount from "@/features/documents/components/download-count";
import FavoriteButton from "@/features/documents/components/favorite-button";
import { formatBytes } from "@/utils/format";
import type { LibraryDocument } from "@/types/library";

export default function DocumentCard({ document }: { document: LibraryDocument }) {
  return (
    <article className="group flex h-full flex-col rounded-lg border border-border bg-white transition-colors hover:border-border-strong">
      <div className="flex gap-3.5 p-3.5">
        <Link
          href={documentRoute(document.id)}
          tabIndex={-1}
          aria-hidden
          className="w-16 shrink-0 self-start overflow-hidden rounded-md border border-border bg-surface"
        >
          <DocumentCoverImage document={document} compact className="aspect-[3/4] w-full" />
        </Link>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <span className="truncate text-[11px] font-medium uppercase tracking-wide text-text-muted">
              {document.category.name}
            </span>
            <FavoriteButton documentId={document.id} className="h-7 w-7 shrink-0" />
          </div>

          <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            <Link href={documentRoute(document.id)} className="underline-offset-4 hover:underline">
              {document.title}
            </Link>
          </h3>

          <p className="mt-1.5 truncate text-xs text-text-secondary">
            {document.subject.program.name} · {document.subject.level.code}
          </p>
          <p className="mt-0.5 truncate text-xs text-text-muted">{document.subject.name}</p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/70 px-3.5 py-2.5">
        <span className="flex min-w-0 items-center gap-2 text-[11px] text-text-muted">
          <span className="truncate">
            {document.fileExtension.toUpperCase()} · {formatBytes(document.fileSize)}
          </span>
          <DownloadCount count={document.downloadCount} compact />
        </span>

        <DownloadButton
          documentId={document.id}
          fileName={document.originalFileName}
          variant="secondary"
          size="sm"
          icon
          className="h-8 shrink-0 px-2.5 text-xs"
        />
      </div>
    </article>
  );
}

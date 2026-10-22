"use client";

import Link from "next/link";
import { FileText } from "lucide-react";

import DownloadButton from "@/features/documents/components/download-button";
import DownloadCount from "@/features/documents/components/download-count";
import FavoriteButton from "@/features/documents/components/favorite-button";
import { documentRoute } from "@/constants/routes";
import { formatBytes, formatFrenchDate } from "@/utils/format";
import type { LibraryDocument } from "@/types/library";

export default function DocumentRow({ document }: { document: LibraryDocument }) {
  return (
    <article className="flex flex-col gap-4 border-b border-border py-5 last:border-b-0 sm:flex-row sm:items-center sm:gap-6">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-text-muted"
        aria-hidden
      >
        <FileText size={20} />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-semibold text-foreground">
          <Link href={documentRoute(document.id)} className="underline-offset-4 hover:underline">
            {document.title}
          </Link>
        </h3>
        <p className="mt-1 text-sm text-text-secondary">
          {document.subject.program.name} · {document.subject.level.code} ·{" "}
          {document.subject.name} · {document.category.name}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
          <span>
            {document.fileExtension.toUpperCase()} · {formatBytes(document.fileSize)} · ajouté le{" "}
            {formatFrenchDate(document.createdAt, true)}
          </span>
          <DownloadCount count={document.downloadCount} />
        </p>
      </div>

      <div className="flex items-center gap-3 sm:flex-col sm:items-stretch lg:flex-row lg:items-center lg:gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={documentRoute(document.id)}
            className="text-sm font-medium text-text-secondary underline-offset-4 hover:text-foreground hover:underline"
          >
            Consulter
          </Link>
          <FavoriteButton documentId={document.id} className="h-9 w-9" />
        </div>
        <DownloadButton
          className="w-full sm:w-auto"
          documentId={document.id}
          fileName={document.originalFileName}
        />
      </div>
    </article>
  );
}

"use client";

import Link from "next/link";
import { FileUp, Loader2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { documentRoute } from "@/constants/routes";
import { useSession } from "@/features/auth/components/session-provider";
import DownloadCount from "@/features/documents/components/download-count";
import { deleteDocumentAction, listMyDocumentsAction } from "@/server/actions/documents.actions";
import type { LibraryDocument } from "@/types/library";

export default function UploadsList() {
  const { profile, initialized } = useSession();
  const isAdmin = profile?.role === "ADMIN" || profile?.role === "SUPERADMIN";
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listMyDocumentsAction({ page: 1, pageSize: 20, sort: "newest" });
    setDocuments(result.ok ? result.data.items : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void load();
    } else {
      setLoading(false);
    }
  }, [isAdmin, load]);

  const handleRemove = async (id: string) => {
    if (removingId) return;
    setRemovingId(id);
    const result = await deleteDocumentAction(id);
    if (result.ok) {
      setDocuments((current) => current.filter((document) => document.id !== id));
    }
    setRemovingId(null);
  };

  if (!initialized || !isAdmin) return null;
  if (loading) return null;
  if (documents.length === 0) return null;

  return (
    <section aria-label="Vos documents publiés">
      <div className="mb-4 flex items-center gap-2">
        <FileUp size={16} aria-hidden className="text-primary" />
        <h2 className="text-base font-semibold text-foreground">
          Vos publications ({documents.length})
        </h2>
      </div>
      <ul className="divide-y divide-border rounded-lg border border-border bg-white">
        {documents.map((document) => (
          <li
            key={document.id}
            className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-6"
          >
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold text-foreground">
                <Link href={documentRoute(document.id)} className="underline-offset-4 hover:underline">
                  {document.title}
                </Link>
              </h3>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                <span>
                  {document.subject.program.name} · {document.subject.level.code} ·{" "}
                  {document.subject.name} · {document.category.name}
                </span>
                <DownloadCount count={document.downloadCount} />
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={documentRoute(document.id)}
                className="text-sm font-medium text-text-secondary underline-offset-4 hover:text-foreground hover:underline"
              >
                Consulter
              </Link>
              <button
                type="button"
                onClick={() => void handleRemove(document.id)}
                disabled={removingId === document.id}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-text-muted transition-colors hover:border-destructive hover:text-destructive disabled:opacity-50"
                aria-label={`Supprimer ${document.title}`}
              >
                {removingId === document.id ? (
                  <Loader2 size={15} aria-hidden className="animate-spin" />
                ) : (
                  <Trash2 size={15} aria-hidden />
                )}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

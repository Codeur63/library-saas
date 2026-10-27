import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";

import { ROUTES, documentRoute } from "@/constants/routes";

import DocumentRow from "@/features/documents/components/document-row";
import DocumentCoverImage from "@/features/documents/components/document-cover-image";
import DownloadButton from "@/features/documents/components/download-button";
import DownloadCount from "@/features/documents/components/download-count";
import FavoriteButton from "@/features/documents/components/favorite-button";
import { getCurrentUser } from "@/server/current-user";
import { getDocument, getDocumentSignedUrl, listDocuments } from "@/server/services/documents.service";
import { AppError } from "@/server/errors";
import { formatBytes, formatFrenchDate } from "@/utils/format";

interface DocumentPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: DocumentPageProps): Promise<Metadata> {
  try {
    const { id } = await params;
    const document = await getDocument(id);
    return {
      title: `${document.title} — Upac Library`,
      description: document.description ?? undefined,
    };
  } catch {
    return { title: "Document — Upac Library" };
  }
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const user = await getCurrentUser();
  const { id } = await params;
  let document;
  try {
    document = await getDocument(id, async () => user);
  } catch (error) {
    if (error instanceof AppError) notFound();
    throw error;
  }

  const [relatedPage, signed] = await Promise.all([
    listDocuments(
      {
        programId: document.subject.program.id,
        page: 1,
        pageSize: 6,
        sort: "newest",
      },
      async () => user
    ),
    user ? getDocumentSignedUrl(document.id).catch(() => null) : Promise.resolve(null),
  ]);

  const related = relatedPage.items.filter((item) => item.id !== document.id);
  const signedUrl = signed?.signedUrl ?? null;

  const meta: { label: string; value: string }[] = [
    { label: "Filière", value: document.subject.program.name },
    { label: "Niveau", value: document.subject.level.code },
    { label: "Matière", value: document.subject.name },
    { label: "Type", value: document.category.name },
    { label: "Format", value: document.fileExtension.toUpperCase() },
    { label: "Taille", value: formatBytes(document.fileSize) },
    { label: "Ajouté le", value: formatFrenchDate(document.createdAt, true) },
  ];

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6">
      <section>
        <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="relative w-36 shrink-0 overflow-hidden rounded-lg border border-border shadow-sm sm:w-40">
              <DocumentCoverImage document={document} className="aspect-[3/4] w-full" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground">
                  {document.category.name}
                </span>
                <span className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground">
                  {document.fileExtension.toUpperCase()}
                </span>
              </div>
              <h1 className="mt-4 max-w-[75ch] text-3xl font-semibold tracking-tight sm:text-4xl">
                {document.title}
              </h1>
              <p className="mt-3">
                <DownloadCount count={document.downloadCount} className="text-xs text-text-muted" />
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:flex-col lg:flex-row">
            <FavoriteButton documentId={document.id} />
            <DownloadButton
              label="Télécharger"
              className="w-full sm:w-auto"
              documentId={document.id}
              fileName={document.originalFileName}
            />
          </div>
        </header>

        <div className="mt-6 overflow-hidden rounded-lg border border-border-strong bg-surface">
          <div className="flex items-center gap-3 border-b border-border bg-white px-4 py-2.5 sm:px-6">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-text-muted"
              aria-hidden
            >
              <FileText size={15} />
            </span>
            <p className="truncate text-sm font-medium text-foreground">
              {document.title}
              <span className="ml-2 font-normal text-text-muted">
                · {document.fileExtension.toUpperCase()} · {formatBytes(document.fileSize)}
              </span>
            </p>
          </div>
          {signedUrl ? (
            <iframe
              src={signedUrl}
              title={`Aperçu — ${document.title}`}
              loading="lazy"
              className="h-[70vh] w-full"
            />
          ) : (
            <p className="px-4 py-16 text-center text-sm text-text-secondary">
              {user ? (
                "Aperçu indisponible. Vous pouvez télécharger le document."
              ) : (
                <>
                  Connectez-vous pour prévisualiser et télécharger ce document.{" "}
                  <Link
                    href={`${ROUTES.login}?next=${encodeURIComponent(documentRoute(document.id))}`}
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Se connecter
                  </Link>
                </>
              )}
            </p>
          )}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Informations sur le document
        </h2>
        <p className="mt-4 max-w-[75ch] text-base leading-relaxed text-text-secondary">
          {document.description ?? "Aucune description fournie."}
        </p>

        <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 lg:grid-cols-4">
          {meta.map((item) => (
            <div key={item.label} className="bg-background p-4">
              <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
                {item.label}
              </dt>
              <dd className="mt-1 text-sm font-medium text-foreground">{item.value}</dd>
            </div>
          ))}
          <div className="bg-background p-4">
            <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-muted">
              Téléchargements
            </dt>
            <dd className="mt-1 flex items-center text-sm font-medium text-foreground">
              <DownloadCount count={document.downloadCount} />
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Autres documents de {document.subject.program.name}
        </h2>
        {related.length > 0 ? (
          <div className="mt-2">
            {related.map((item) => (
              <DocumentRow key={item.id} document={item} />
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-lg border border-border bg-surface px-4 py-6 text-sm text-text-secondary">
            Aucune autre ressource pour le moment dans cette filière.
          </p>
        )}
      </section>
    </div>
  );
}

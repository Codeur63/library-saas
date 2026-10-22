"use server";

import { toErrorResult, type ActionResult } from "@/server/errors";
import {
  deleteDocument,
  getDocument,
  getDocumentSignedUrl,
  listDocuments,
  listMyDocuments,
  updateDocument,
} from "@/server/services/documents.service";
import { getCatalog, getStudentCatalog } from "@/server/services/catalog.service";
import {
  UpdateDocumentInputSchema,
  documentQuerySchema,
  type DocumentQueryInput,
  type UpdateDocumentInput,
} from "@/server/dto";
import type { LibraryDocument, Paginated } from "@/types/library";

export async function listDocumentsAction(
  query: DocumentQueryInput
): Promise<ActionResult<Paginated<LibraryDocument>>> {
  try {
    const parsed = documentQuerySchema.parse(query);
    const result = await listDocuments(parsed);
    return { ok: true, data: result };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function listMyDocumentsAction(
  query: DocumentQueryInput
): Promise<ActionResult<Paginated<LibraryDocument>>> {
  try {
    const parsed = documentQuerySchema.parse(query);
    const result = await listMyDocuments(parsed);
    return { ok: true, data: result };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function getDocumentAction(id: string): Promise<ActionResult<unknown>> {
  try {
    const document = await getDocument(id);
    return { ok: true, data: document };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function updateDocumentAction(
  id: string,
  input: UpdateDocumentInput
): Promise<ActionResult<unknown>> {
  try {
    const parsed = UpdateDocumentInputSchema.parse(input);
    const result = await updateDocument(id, parsed);
    return { ok: true, data: result };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function deleteDocumentAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const result = await deleteDocument(id);
    return { ok: true, data: result };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function getDocumentSignedUrlAction(id: string): Promise<ActionResult<unknown>> {
  try {
    const result = await getDocumentSignedUrl(id);
    return { ok: true, data: result };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function getCatalogAction(): Promise<ActionResult<unknown>> {
  try {
    const catalog = await getCatalog();
    return { ok: true, data: catalog };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function getStudentCatalogAction(): Promise<ActionResult<unknown>> {
  try {
    const catalog = await getStudentCatalog();
    return { ok: true, data: catalog };
  } catch (error) {
    return toErrorResult(error);
  }
}


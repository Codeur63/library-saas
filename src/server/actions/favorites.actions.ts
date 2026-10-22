"use server";

import { toErrorResult, type ActionResult } from "@/server/errors";
import {
  addFavorite,
  getFavoriteIds,
  listFavorites,
  removeFavorite,
} from "@/server/services/favorites.service";
import {
  FavoriteInputSchema,
  favoriteQuerySchema,
  type FavoriteQueryInput,
} from "@/server/dto";
import type { FavoriteListItem, Paginated } from "@/types/library";

export async function listFavoritesAction(
  query: FavoriteQueryInput
): Promise<ActionResult<Paginated<FavoriteListItem>>> {
  try {
    const parsed = favoriteQuerySchema.parse(query);
    const result = await listFavorites(parsed);
    return { ok: true, data: result };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function addFavoriteAction(documentId: string): Promise<ActionResult<{ documentId: string }>> {
  try {
    const parsed = FavoriteInputSchema.parse({ documentId });
    const result = await addFavorite(parsed.documentId);
    return { ok: true, data: result };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function removeFavoriteAction(documentId: string): Promise<ActionResult<{ documentId: string }>> {
  try {
    const parsed = FavoriteInputSchema.parse({ documentId });
    const result = await removeFavorite(parsed.documentId);
    return { ok: true, data: result };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function getFavoriteIdsAction(): Promise<ActionResult<string[]>> {
  try {
    const ids = await getFavoriteIds();
    return { ok: true, data: ids };
  } catch (error) {
    return toErrorResult(error);
  }
}
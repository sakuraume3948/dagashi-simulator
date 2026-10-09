"use server";

import {
  getAllFavoriteCounts,
  getMyFavoriteIds,
  toggleFavorite as toggleFavoriteDb,
  type FavoriteState,
} from "@/lib/server/favorites";
import {
  getExistingAnonId,
  getOrCreateAnonId,
  getIpHash,
} from "@/lib/server/visitor";

/**
 * 画面の初回表示時にお気に入り情報（全体の登録数と自分の登録一覧）を取得する。
 */
export async function fetchFavoriteState(): Promise<FavoriteState> {
  const [counts, anonId] = await Promise.all([
    getAllFavoriteCounts(),
    getExistingAnonId(),
  ]);
  const myFavorites = await getMyFavoriteIds(anonId);

  return {
    counts,
    myFavorites,
  };
}

/**
 * お気に入りの登録・解除を切り替える。
 */
export async function toggleFavoriteAction(
  dagashiId: string,
): Promise<{ success: boolean; favorited: boolean }> {
  const anonId = await getOrCreateAnonId();
  const ipHash = await getIpHash(anonId);

  return await toggleFavoriteDb(anonId, dagashiId, ipHash);
}


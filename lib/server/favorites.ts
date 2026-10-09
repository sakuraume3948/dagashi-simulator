import { prisma } from "./prisma";
import { DAGASHI_DATA } from "@/lib/data";

// 実在する商品IDのセット（不正なIDの登録を防ぐバリデーション用）
const VALID_DAGASHI_IDS = new Set(DAGASHI_DATA.map((d) => d.id));

export type FavoriteState = {
  /** 各商品の登録数（IPユニーク数）。未登録の商品はキーが存在しないか0 */
  counts: Record<string, number>;
  /** 自分が登録している商品IDのリスト */
  myFavorites: string[];
};

/**
 * 全商品のユニーク登録数（COUNT(DISTINCT ipHash)）を取得する。
 */
export async function getAllFavoriteCounts(): Promise<Record<string, number>> {
  try {
    const rows = await prisma.$queryRaw<
      Array<{ dagashiId: string; count: number }>
    >`
      SELECT "dagashiId", COUNT(DISTINCT "ipHash")::int as count
      FROM "Favorite"
      GROUP BY "dagashiId"
    `;

    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.dagashiId] = Number(row.count);
    }
    return counts;
  } catch (error) {
    console.error("Failed to fetch favorite counts:", error);
    return {};
  }
}

/**
 * 指定した匿名IDが登録している商品ID一覧を取得する。
 */
export async function getMyFavoriteIds(
  anonId: string | null,
): Promise<string[]> {
  if (!anonId) return [];

  try {
    const list = await prisma.favorite.findMany({
      where: { anonId },
      select: { dagashiId: true },
    });
    return list.map((f) => f.dagashiId);
  } catch (error) {
    console.error("Failed to fetch user favorites:", error);
    return [];
  }
}

/**
 * お気に入りの登録・解除を切り替える。
 */
export async function toggleFavorite(
  anonId: string,
  dagashiId: string,
  ipHash: string,
): Promise<{ favorited: boolean; success: boolean }> {
  // バリデーション：実在しない商品IDは拒否
  if (!VALID_DAGASHI_IDS.has(dagashiId)) {
    return { favorited: false, success: false };
  }

  try {
    const existing = await prisma.favorite.findUnique({
      where: {
        anonId_dagashiId: {
          anonId,
          dagashiId,
        },
      },
    });

    if (existing) {
      // 登録解除
      await prisma.favorite.delete({
        where: {
          anonId_dagashiId: {
            anonId,
            dagashiId,
          },
        },
      });
      return { favorited: false, success: true };
    } else {
      // 新規登録
      await prisma.favorite.create({
        data: {
          anonId,
          dagashiId,
          ipHash,
        },
      });
      return { favorited: true, success: true };
    }
  } catch (error) {
    console.error("Failed to toggle favorite:", error);
    return { favorited: false, success: false };
  }
}


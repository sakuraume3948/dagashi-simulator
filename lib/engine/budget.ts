import type { Rng } from "../random";
import type { BudgetOptions, CartLine, CartResult, Dagashi } from "../types";

/**
 * 停止性の保険。
 * 全商品の価格が1以上なので remaining は毎回必ず減少し、本来この上限には達しない。
 * 万一データが壊れた（価格0の商品が混入した等）場合に無限ループを防ぐためのもの。
 */
const MAX_ITERATIONS = 10000;

/**
 * シリーズ上限を数えるときのキー。
 * seriesId を持たない単独商品は、自分のIDを使って「1人だけのシリーズ」として扱う。
 * こうしないと、商品上限を無制限にしたときに
 * 単独商品だけ無限に買えてしまい、シリーズ商品との間で挙動がちぐはぐになる。
 */
function seriesKeyOf(item: Dagashi): string {
  return item.seriesId ?? item.id;
}

/**
 * 指定した予算内で、駄菓子屋でカゴに入れるようにランダムに買い物をする。
 *
 * ★重み付けは一切しない（一様ランダム）。それでも安い駄菓子が自然に多く入る:
 *   1. 残り予算が減るほど高い商品が候補から脱落する
 *      → 安い商品ほど「候補に残っている期間」が長い
 *   2. 安い商品は1回の予算消費が小さいので、買い物の回数自体が多くなる
 *      （500円 ÷ 10円 = 50回 vs 500円 ÷ 150円 = 3回）
 *   この「価格の壁」が重み付けの代わりに働くので、実際の駄菓子屋の体験と一致する。
 *
 * ★予算超過は「チェックして弾く」のではなく構造的に起こせない。
 *   候補を抽出する時点で price <= remaining のものしか対象にしないため。
 *
 * 純粋関数。データも乱数も引数で受け取り、document には一切触れない。
 * （document はブラウザにしか存在せず、Vitest は Node 上で動くため）
 *
 * budget は 0 以上の整数を想定する。それ以外は正規化して扱う。
 */
export function selectByBudget(
  items: Dagashi[],
  budget: number,
  options: BudgetOptions,
  rng: Rng,
): CartResult {
  const { maxPerItem, maxPerSeries, categories } = options;

  // カテゴリ絞り込み。空配列は「全カテゴリ」を意味する。
  const pool =
    categories.length === 0
      ? items
      : items.filter((it) => categories.includes(it.category));

  const qtyById = new Map<string, number>();
  const qtyBySeries = new Map<string, number>();
  const order: Dagashi[] = []; // 最初に選ばれた順を保ち、表示順を安定させる
  let remaining = Math.max(0, Math.floor(budget));

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const affordable = pool.filter((it) => {
      if (it.price > remaining) return false; // ★これが予算超過を不可能にする
      if (maxPerItem > 0 && (qtyById.get(it.id) ?? 0) >= maxPerItem) return false;
      if (maxPerSeries > 0 && (qtyBySeries.get(seriesKeyOf(it)) ?? 0) >= maxPerSeries) {
        return false;
      }
      return true;
    });

    if (affordable.length === 0) break;

    const picked = rng.pick(affordable);
    const prev = qtyById.get(picked.id) ?? 0;
    if (prev === 0) order.push(picked);
    qtyById.set(picked.id, prev + 1);

    const key = seriesKeyOf(picked);
    qtyBySeries.set(key, (qtyBySeries.get(key) ?? 0) + 1);

    remaining -= picked.price;
  }

  const lines: CartLine[] = order.map((item) => {
    const qty = qtyById.get(item.id) ?? 0;
    return { item, qty, subtotal: item.price * qty };
  });

  return {
    lines,
    totalPrice: lines.reduce((sum, l) => sum + l.subtotal, 0),
    totalCount: lines.reduce((sum, l) => sum + l.qty, 0),
    change: remaining,
  };
}

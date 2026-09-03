import type { Rng } from "../random";
import type { BudgetOptions, CartLine, CartResult, Dagashi } from "../types";

/**
 * 予算の上限。UI の入力欄もこの値で頭打ちにする。
 *
 * 3000万円あれば上限なしで約80万点買える。「駄菓子を大量に買う」体験としては
 * 十分に振り切れていて、かつ 1 回の実行が 100ms 以内に収まる。
 */
export const MAX_BUDGET = 30_000_000;

/**
 * 停止性の保険。
 *
 * 全商品の価格が1以上なので remaining は毎回必ず減少し、通常この上限には達しない。
 * 万一データが壊れた（価格0の商品が混入した等）場合に無限ループを防ぐためのもの。
 *
 * ★MAX_BUDGET とセットで意味を持つ値。
 *   予算 3000万円・個数上限なしでの実測は 100 シードで 800,227〜804,010 点
 *   （平均 801,629 点）。ばらつきは ±2000 点程度なので、20 万点の余裕がある。
 *   予算の上限を引き上げるときは、ここも一緒に見直すこと。
 */
const MAX_ITERATIONS = 1_000_000;

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

  // ★候補リストは「作り直した結果が変わるとき」だけ作り直す。
  //
  //   候補から外れる理由は2つしかなく、どちらも一方通行:
  //     ① 残り予算が足りなくなった → 候補の最高価格を下回ったときにだけ起きる
  //     ② 個数上限に達した         → 買った瞬間に分かる
  //   どちらも起きていない間、作り直しても前とまったく同じ配列になるので省略できる。
  //
  //   商品の価格は24種類しかないため①は最大24回。実測では予算3億7400万円で
  //   999万回買っても作り直しは3回だった（8.23秒 → 0.585秒）。
  //   ロジックは変えていないので、同じシードなら結果はカートの中身まで完全に一致する。
  let affordable: Dagashi[] = [];
  let maxAffordablePrice = -1;
  let limitReached = true; // 初回は必ず作る

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    if (limitReached || remaining < maxAffordablePrice) {
      affordable = pool.filter((it) => {
        if (it.price > remaining) return false; // ★これが予算超過を不可能にする
        if (maxPerItem > 0 && (qtyById.get(it.id) ?? 0) >= maxPerItem) return false;
        if (maxPerSeries > 0 && (qtyBySeries.get(seriesKeyOf(it)) ?? 0) >= maxPerSeries) {
          return false;
        }
        return true;
      });

      maxAffordablePrice = -1;
      for (const it of affordable) {
        if (it.price > maxAffordablePrice) maxAffordablePrice = it.price;
      }
      limitReached = false;
    }

    if (affordable.length === 0) break;

    const picked = rng.pick(affordable);
    const prev = qtyById.get(picked.id) ?? 0;
    if (prev === 0) order.push(picked);
    qtyById.set(picked.id, prev + 1);

    const key = seriesKeyOf(picked);
    const seriesQty = (qtyBySeries.get(key) ?? 0) + 1;
    qtyBySeries.set(key, seriesQty);

    remaining -= picked.price;

    // ②の検知。次の周回で候補を作り直す。
    if (maxPerItem > 0 && prev + 1 >= maxPerItem) limitReached = true;
    if (maxPerSeries > 0 && seriesQty >= maxPerSeries) limitReached = true;
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

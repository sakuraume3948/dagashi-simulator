import type { Rng } from "../random";
import type { Dagashi, GachaOptions, GachaResult } from "../types";

/**
 * ガチャの手応えの調整はこの数字ひとつ。大きいほど高額商品が出にくくなる。
 *
 * 想定する価格分布での排出率:
 *   価格帯      k=1     k=2(採用)   k=2.5
 *   10〜20円    62%     86%         91%
 *   30〜50円    22%     12%         7.9%
 *   60〜100円   10%     2.0%        0.9%
 *   101〜150円  5.5%    0.43%       0.16%
 *
 * k=2 だと最高額帯が約0.4%、10連で1回以上出る確率が約4%。
 * 「たまに出るから引き続けたくなる」バランス。実際に引いて手応えが違えば
 * この数字を書き換えるだけで調整できる。
 */
export const GACHA_EXPONENT = 2;

/**
 * 1商品あたりのガチャ重み。
 *
 * item.weight が入っていればそれを優先する。
 * → レア度システムを実装しなくても「この商品だけ極端に出にくくする」が今から可能。
 * 将来レア度システムを入れる場合も、ここと抽選部分を差し替えるだけで済む。
 */
export function gachaWeightOf(item: Dagashi): number {
  return item.weight ?? 1 / Math.pow(item.price, GACHA_EXPONENT);
}

/**
 * 各商品の理論排出率を返す（合計が 1 になる）。
 * テストでの検証と、UI での確率表示の両方に使う。
 */
export function gachaProbabilities(items: Dagashi[]): Map<string, number> {
  const weights = items.map(gachaWeightOf);
  const total = weights.reduce((s, w) => s + w, 0);
  return new Map(items.map((it, i) => [it.id, weights[i] / total]));
}

/**
 * ガチャを count 回引く。1連と10連は count の違いだけ。重複排出あり。
 *
 * 確定枠・天井は入れていない（単純に count 回引く）。
 * options は将来それらを足すための受け皿として今から受け取っておく。
 *
 * 純粋関数。データも乱数も引数で受け取り、document には触れない。
 */
export function pullGacha(
  items: Dagashi[],
  count: number,
  rng: Rng,
  options?: GachaOptions,
): GachaResult {
  void options; // 今は未使用。将来の確定枠・天井の受け皿。

  if (items.length === 0) {
    throw new Error("pullGacha: 駄菓子データが空です");
  }
  if (!Number.isInteger(count) || count < 0) {
    throw new Error(`pullGacha: count は0以上の整数である必要があります (${count})`);
  }

  // 重みは抽選のたびに計算し直さず、一度だけ求めて使い回す。
  // （10万回の検証テストで Math.pow が数百万回走るのを避けるため）
  const weights = items.map(gachaWeightOf);

  const results: Dagashi[] = [];
  for (let i = 0; i < count; i++) {
    results.push(rng.pickWeighted(items, weights));
  }

  return {
    items: results,
    totalPrice: results.reduce((sum, it) => sum + it.price, 0),
  };
}

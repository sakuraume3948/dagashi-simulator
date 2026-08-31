/**
 * シード指定可能な擬似乱数。
 *
 * エンジンが Math.random() を直接使うと結果が毎回変わり、
 * 「排出率が理論値と一致するか」を検証できなくなる。
 * 乱数を引数で渡せるようにすることで、テストではシードを固定して
 * 再現可能にし、本番では Date.now() を種にしてランダムにする。
 */

export type Rng = {
  /** 0 以上 1 未満の実数。 */
  next(): number;
  /** 一様ランダムに1つ選ぶ。 */
  pick<T>(items: T[]): T;
  /**
   * 重み付きで1つ選ぶ。
   * weights は items と同じ長さの、事前に計算済みの重み配列。
   * （毎回 weightOf を呼ぶ設計だと10万回の抽選で数百万回の計算が発生するため、
   *   呼び出し側で一度だけ計算した配列を渡す形にしている）
   */
  pickWeighted<T>(items: T[], weights: number[]): T;
};

/** mulberry32。短くて分布が良く、シードから完全に決定的。 */
export function createRng(seed: number = Date.now()): Rng {
  let a = seed >>> 0;

  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,

    pick<T>(items: T[]): T {
      if (items.length === 0) {
        throw new Error("pick: 空の配列からは選べません");
      }
      return items[Math.floor(next() * items.length)];
    },

    pickWeighted<T>(items: T[], weights: number[]): T {
      if (items.length === 0) {
        throw new Error("pickWeighted: 空の配列からは選べません");
      }
      if (items.length !== weights.length) {
        throw new Error(
          `pickWeighted: items(${items.length}) と weights(${weights.length}) の長さが違います`,
        );
      }

      let total = 0;
      for (const w of weights) {
        if (!Number.isFinite(w) || w <= 0) {
          throw new Error(`pickWeighted: 重みは正の有限数である必要があります (${w})`);
        }
        total += w;
      }

      let r = next() * total;
      for (let i = 0; i < items.length; i++) {
        r -= weights[i];
        if (r < 0) return items[i];
      }
      // 浮動小数の丸め誤差で最後まで抜けた場合の保険。
      return items[items.length - 1];
    },
  };
}

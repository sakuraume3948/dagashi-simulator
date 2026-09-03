import { describe, expect, it } from "vitest";
import { GACHA_EXPONENT, gachaProbabilities, gachaWeights, pullGacha } from "../gacha";
import { createRng } from "../../random";
import { DAGASHI_DATA } from "../../data";
import type { Dagashi } from "../../types";

/** テスト専用の最小データを作るヘルパー。 */
function fake(
  id: string,
  price: number,
  weight: number | null = null,
  seriesId: string | null = null,
): Dagashi {
  return {
    id,
    name: id,
    maker: "test",
    price,
    category: "スナック",
    unit: "1個",
    seriesId,
    rarity: null,
    weight,
    imageUrl: null,
    sourceUrl: null,
    source: "inokuchi",
    sourceId: null,
    fetchedAt: null,
  };
}

const N = 100_000;

describe("pullGacha の排出率", () => {
  it("1. 10万回引いた実測排出率が 1/price^2 の理論値と一致する", () => {
    const rng = createRng(12345);
    const { items } = pullGacha(DAGASHI_DATA, N, rng);

    const observed = new Map<string, number>();
    for (const it of items) observed.set(it.id, (observed.get(it.id) ?? 0) + 1);

    const theoretical = gachaProbabilities(DAGASHI_DATA);

    for (const item of DAGASHI_DATA) {
      const actual = (observed.get(item.id) ?? 0) / N;
      const expected = theoretical.get(item.id)!;
      // n=10万での標準誤差は最大でも約0.001。0.005 は十分な余裕を持った許容幅。
      expect(Math.abs(actual - expected)).toBeLessThan(0.005);
    }
  });

  it("2. 手計算できる2件のデータ(10円 / 100円)で理論値 99% : 1% と一致する", () => {
    // 重みは 1/10^2 = 0.01 と 1/100^2 = 0.0001 → 比は 100 : 1
    // → 100/101 = 99.01% と 1/101 = 0.99%
    const items = [fake("cheap", 10), fake("pricey", 100)];
    const rng = createRng(777);
    const result = pullGacha(items, N, rng);

    const cheapRate = result.items.filter((i) => i.id === "cheap").length / N;

    expect(cheapRate).toBeGreaterThan(0.985);
    expect(cheapRate).toBeLessThan(0.995);
  });

  it("3. 同じシードなら完全に同じ結果になる（再現性）", () => {
    const a = pullGacha(DAGASHI_DATA, 50, createRng(42));
    const b = pullGacha(DAGASHI_DATA, 50, createRng(42));

    expect(a.items.map((i) => i.id)).toEqual(b.items.map((i) => i.id));
    expect(a.totalPrice).toBe(b.totalPrice);
  });

  it("3b. シードが違えば結果は変わる", () => {
    const a = pullGacha(DAGASHI_DATA, 50, createRng(1));
    const b = pullGacha(DAGASHI_DATA, 50, createRng(2));

    expect(a.items.map((i) => i.id)).not.toEqual(b.items.map((i) => i.id));
  });
});

describe("pullGacha の基本動作", () => {
  it("4. count=10 で必ず10件返る（1連は1件）", () => {
    expect(pullGacha(DAGASHI_DATA, 10, createRng(1)).items).toHaveLength(10);
    expect(pullGacha(DAGASHI_DATA, 1, createRng(1)).items).toHaveLength(1);
    expect(pullGacha(DAGASHI_DATA, 0, createRng(1)).items).toHaveLength(0);
  });

  it("4b. totalPrice が排出された商品の価格の合計と一致する", () => {
    const result = pullGacha(DAGASHI_DATA, 10, createRng(99));
    const sum = result.items.reduce((s, i) => s + i.price, 0);
    expect(result.totalPrice).toBe(sum);
  });

  it("4c. 空データや不正な count はエラーになる", () => {
    expect(() => pullGacha([], 10, createRng(1))).toThrow();
    expect(() => pullGacha(DAGASHI_DATA, -1, createRng(1))).toThrow();
    expect(() => pullGacha(DAGASHI_DATA, 1.5, createRng(1))).toThrow();
  });
});

describe("重みの決まり方", () => {
  it("5. weight が明示された商品は価格ベースより優先される", () => {
    const auto = fake("auto", 10); // weight = 1/100 = 0.01
    const manual = fake("manual", 10, 0.0001); // 同じ価格だが手動で100分の1に

    const [autoW, manualW] = gachaWeights([auto, manual]);
    expect(autoW).toBeCloseTo(0.01, 10);
    expect(manualW).toBe(0.0001);

    // 実際の排出にも効くこと
    const rng = createRng(2024);
    const { items } = pullGacha([auto, manual], 10_000, rng);
    const manualRate = items.filter((i) => i.id === "manual").length / 10_000;
    expect(manualRate).toBeLessThan(0.03); // 理論値は約 0.99%
  });

  it("5b. GACHA_EXPONENT が価格差を増幅している", () => {
    expect(GACHA_EXPONENT).toBe(2);
    // 10円と100円の重み比は price^2 の比、すなわち 100:1 になる
    const [wa, wb] = gachaWeights([fake("a", 10), fake("b", 100)]);
    expect(wa / wb).toBeCloseTo(100, 5);
  });

  it("5c. 理論排出率の合計は 1 になる", () => {
    const probs = gachaProbabilities(DAGASHI_DATA);
    const sum = [...probs.values()].reduce((s, p) => s + p, 0);
    expect(sum).toBeCloseTo(1, 10);
  });
});

describe("シリーズ（味違い）の重み補正", () => {
  /** 指定件数のフレーバーを持つシリーズを作る。 */
  function series(prefix: string, price: number, count: number): Dagashi[] {
    return Array.from({ length: count }, (_, i) =>
      fake(`${prefix}-${i}`, price, null, prefix),
    );
  }

  it("18. シリーズ内の重みは件数で割られる", () => {
    const items = [...series("umaibo", 10, 4), fake("solo", 10)];
    const [w0, , , , soloW] = gachaWeights(items);

    // 単独商品は 1/10^2 = 0.01、シリーズは4件なので 0.01/4 = 0.0025
    expect(soloW).toBeCloseTo(0.01, 10);
    expect(w0).toBeCloseTo(0.0025, 10);
  });

  it("19. ★フレーバーを増やしてもシリーズ全体の出現率は変わらない", () => {
    const rateOf = (count: number) => {
      const items = [...series("umaibo", 10, count), fake("solo", 100)];
      const probs = gachaProbabilities(items);
      return [...probs.entries()]
        .filter(([id]) => id.startsWith("umaibo"))
        .reduce((sum, [, p]) => sum + p, 0);
    };

    // 3種でも20種でも100種でも、うまい棒シリーズ全体の確率は同じ
    expect(rateOf(3)).toBeCloseTo(rateOf(20), 10);
    expect(rateOf(3)).toBeCloseTo(rateOf(100), 10);
  });

  it("19b. 補正が無ければ確率は歪む（対比）", () => {
    // seriesId を付けない＝補正されない場合、件数を増やすと確率が上がってしまう
    const rateOf = (count: number) => {
      const items = [
        ...Array.from({ length: count }, (_, i) => fake(`umaibo-${i}`, 10)),
        fake("solo", 100),
      ];
      const probs = gachaProbabilities(items);
      return [...probs.entries()]
        .filter(([id]) => id.startsWith("umaibo"))
        .reduce((sum, [, p]) => sum + p, 0);
    };

    expect(rateOf(20)).toBeGreaterThan(rateOf(3));
  });

  it("20. seriesId が null の商品は補正を受けない", () => {
    const items = [...series("umaibo", 10, 5), fake("solo", 10)];
    const [, , , , , soloW] = gachaWeights(items);
    expect(soloW).toBeCloseTo(1 / 100, 10);
  });

  it("21. weight の手動指定はシリーズ補正より優先される", () => {
    const items = [
      fake("umaibo-a", 10, 0.5, "umaibo"), // 手動指定あり
      fake("umaibo-b", 10, null, "umaibo"), // 補正される
      fake("umaibo-c", 10, null, "umaibo"),
    ];
    const [a, b] = gachaWeights(items);

    expect(a).toBe(0.5); // 3で割られない
    expect(b).toBeCloseTo(0.01 / 3, 10);
  });

  it("22. 実データでシリーズ内の重みが件数で割られている", () => {
    // ★シリーズ内の価格が揃っている必要はない。
    //   実データのうまい棒には 12円（クリスマス味）15円（通常）25円（プレミアム）が
    //   混在する。そのため「1件ぶん × 件数 = 合計」は成立しない。
    //   検証すべきなのは「各商品が、単独だった場合の重みの 1/件数 になっているか」。
    const seriesIds = [...new Set(DAGASHI_DATA.map((d) => d.seriesId).filter((s) => s !== null))];
    expect(seriesIds.length).toBeGreaterThan(0);

    const weights = gachaWeights(DAGASHI_DATA);
    const indexById = new Map(DAGASHI_DATA.map((d, i) => [d.id, i]));

    for (const seriesId of seriesIds) {
      const members = DAGASHI_DATA.filter((d) => d.seriesId === seriesId);

      for (const item of members) {
        const actual = weights[indexById.get(item.id)!];
        const asSingle = 1 / Math.pow(item.price, GACHA_EXPONENT); // 単独だった場合の重み
        expect(actual, `${item.name} の重みが件数で割られていない`).toBeCloseTo(
          asSingle / members.length,
          12,
        );
      }
    }
  });

  it("22b. 価格が混在するシリーズでも、単独商品との関係が保たれる", () => {
    // 同じシリーズに違う価格が入っていても、各商品は「その価格の単独商品 ÷ 件数」になる
    const items = [
      fake("s-a", 10, null, "mixed"),
      fake("s-b", 20, null, "mixed"),
      fake("s-c", 50, null, "mixed"),
      fake("solo10", 10),
      fake("solo20", 20),
    ];
    const [a, b, c, solo10, solo20] = gachaWeights(items);

    expect(a).toBeCloseTo(solo10 / 3, 12);
    expect(b).toBeCloseTo(solo20 / 3, 12);
    expect(c).toBeCloseTo(1 / 50 ** 2 / 3, 12);
  });
});

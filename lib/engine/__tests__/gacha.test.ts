import { describe, expect, it } from "vitest";
import { GACHA_EXPONENT, gachaProbabilities, gachaWeightOf, pullGacha } from "../gacha";
import { createRng } from "../../random";
import { DAGASHI_DATA } from "../../data";
import type { Dagashi } from "../../types";

/** テスト専用の最小データを作るヘルパー。 */
function fake(id: string, price: number, weight: number | null = null): Dagashi {
  return {
    id,
    name: id,
    maker: "test",
    price,
    category: "スナック",
    unit: "1個",
    rarity: null,
    weight,
    imageUrl: null,
    sourceUrl: null,
    source: "dummy",
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

    expect(gachaWeightOf(auto)).toBeCloseTo(0.01, 10);
    expect(gachaWeightOf(manual)).toBe(0.0001);

    // 実際の排出にも効くこと
    const rng = createRng(2024);
    const { items } = pullGacha([auto, manual], 10_000, rng);
    const manualRate = items.filter((i) => i.id === "manual").length / 10_000;
    expect(manualRate).toBeLessThan(0.03); // 理論値は約 0.99%
  });

  it("5b. GACHA_EXPONENT が価格差を増幅している", () => {
    expect(GACHA_EXPONENT).toBe(2);
    // 10円と100円の重み比は price^2 の比、すなわち 100:1 になる
    expect(gachaWeightOf(fake("a", 10)) / gachaWeightOf(fake("b", 100))).toBeCloseTo(100, 5);
  });

  it("5c. 理論排出率の合計は 1 になる", () => {
    const probs = gachaProbabilities(DAGASHI_DATA);
    const sum = [...probs.values()].reduce((s, p) => s + p, 0);
    expect(sum).toBeCloseTo(1, 10);
  });
});

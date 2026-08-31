import { describe, expect, it } from "vitest";
import { DAGASHI_DATA } from "../data";
import { getAllDagashi } from "../repository";
import { CATEGORIES } from "../types";

describe("駄菓子マスタの整合性", () => {
  it("13. id が一意である", () => {
    const ids = DAGASHI_DATA.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("14. price が1以上の整数である", () => {
    for (const d of DAGASHI_DATA) {
      expect(Number.isInteger(d.price), `${d.name} の価格が整数でない`).toBe(true);
      expect(d.price, `${d.name} の価格が1未満`).toBeGreaterThanOrEqual(1);
    }
  });

  it("14b. 名前・メーカー・単位が空でない", () => {
    for (const d of DAGASHI_DATA) {
      expect(d.name.length).toBeGreaterThan(0);
      expect(d.maker.length).toBeGreaterThan(0);
      expect(d.unit.length).toBeGreaterThan(0);
    }
  });

  it("15. category が定義済みカテゴリのいずれかである", () => {
    for (const d of DAGASHI_DATA) {
      expect(CATEGORIES).toContain(d.category);
    }
  });
});

describe("ガチャと予算モードが成立する前提", () => {
  /** ガチャの重みに差を出すため、価格帯が散っている必要がある。 */
  const TIERS = [
    { label: "10〜20円", min: 10, max: 20 },
    { label: "30〜50円", min: 30, max: 50 },
    { label: "60〜100円", min: 60, max: 100 },
    { label: "101〜150円", min: 101, max: 150 },
  ];

  it("16. 4つの価格帯すべてに商品が存在する", () => {
    for (const tier of TIERS) {
      const count = DAGASHI_DATA.filter(
        (d) => d.price >= tier.min && d.price <= tier.max,
      ).length;
      expect(count, `価格帯 ${tier.label} の商品が無い`).toBeGreaterThan(0);
    }
  });

  it("17. 全カテゴリが3件以上の商品を持つ（絞り込んでも寂しくならない）", () => {
    for (const category of CATEGORIES) {
      const count = DAGASHI_DATA.filter((d) => d.category === category).length;
      expect(count, `カテゴリ「${category}」が ${count} 件しかない`).toBeGreaterThanOrEqual(3);
    }
  });

  it("17b. 将来用フィールドは今は未設定である", () => {
    for (const d of DAGASHI_DATA) {
      expect(d.rarity).toBeNull();
      expect(d.source).toBe("dummy");
    }
  });
});

describe("repository", () => {
  it("getAllDagashi は非同期でマスタを返す（DB移行時に呼び出し側を変えないため）", async () => {
    const result = getAllDagashi();
    expect(result).toBeInstanceOf(Promise);
    expect(await result).toEqual(DAGASHI_DATA);
  });
});

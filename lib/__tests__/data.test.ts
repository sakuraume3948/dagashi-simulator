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

  it("14b. 商品名が空でない（maker / unit は取得できない情報源があるため必須にしない）", () => {
    for (const d of DAGASHI_DATA) {
      expect(d.name.length).toBeGreaterThan(0);
      // maker / unit は null か、null でないなら空文字であってはならない
      if (d.maker !== null) expect(d.maker.length).toBeGreaterThan(0);
      if (d.unit !== null) expect(d.unit.length).toBeGreaterThan(0);
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

  it("17. 商品があるカテゴリは3件以上持つ（絞り込んでも寂しくならない）", () => {
    for (const category of CATEGORIES) {
      const count = DAGASHI_DATA.filter((d) => d.category === category).length;
      // 0件のカテゴリは許容する（UIで選んでも空になるだけ）。
      // 中途半端に1〜2件しかない状態を防ぐのがこのテストの目的。
      if (count === 0) continue;
      expect(count, `カテゴリ「${category}」が ${count} 件しかない`).toBeGreaterThanOrEqual(3);
    }
  });

  it("17b. 将来用フィールドは今は未設定である", () => {
    for (const d of DAGASHI_DATA) {
      expect(d.rarity).toBeNull();
      expect(d.weight).toBeNull();
      expect(d.imageUrl).toBeNull();
    }
  });
});

describe("取得元の情報", () => {
  it("17c. source が定義済みの取得元である", () => {
    const sources = ["inokuchi", "yahoo", "rakuten", "overrides"];
    for (const d of DAGASHI_DATA) {
      expect(sources, `${d.name} の source が未定義の値`).toContain(d.source);
    }
  });

  it("17d. 自動取得の商品は取得日時を持つ（値上げ追跡のため）", () => {
    for (const d of DAGASHI_DATA) {
      if (d.source === "overrides") continue; // 手で決めた価格に取得日時は無い
      expect(d.fetchedAt, `${d.name} に取得日時が無い`).not.toBeNull();
      expect(Number.isNaN(Date.parse(d.fetchedAt!))).toBe(false);
    }
  });

  it("17e. JANコードは8桁か13桁で、検査数字を通る", () => {
    // ★商品名の曖昧検索で拾うため誤った値が混ざりやすい。
    //   桁数と検査数字は機械的に検証できるので、壊れた値が
    //   lib/data.ts に入り込んでいないことをここで担保する。
    const checkDigitOf = (digits: string): number => {
      const body = [...digits.slice(0, -1)].map(Number);
      let sum = 0;
      for (let i = 0; i < body.length; i++) {
        sum += body[i] * ((body.length - i) % 2 === 1 ? 3 : 1);
      }
      return (10 - (sum % 10)) % 10;
    };

    for (const d of DAGASHI_DATA) {
      if (d.sourceId === null) continue;
      expect([8, 13], `${d.name} のJANの桁数が不正: ${d.sourceId}`).toContain(
        d.sourceId.length,
      );
      expect(d.sourceId, `${d.name} のJANに数字以外が入っている`).toMatch(/^[0-9]+$/);
      expect(
        checkDigitOf(d.sourceId),
        `${d.name} のJANが検査数字を通らない: ${d.sourceId}`,
      ).toBe(Number(d.sourceId[d.sourceId.length - 1]));
      // 日本の事業者コードは 45 / 49 で始まる
      expect(d.sourceId.slice(0, 2), `${d.name} のJANが日本以外`).toMatch(/^4[59]$/);
    }
  });

  it("17f. 同じJANが2つの商品に付いていない", () => {
    const jans = DAGASHI_DATA.map((d) => d.sourceId).filter((j) => j !== null);
    expect(new Set(jans).size, "JANが重複している").toBe(jans.length);
  });
});

describe("repository", () => {
  it("getAllDagashi は非同期でマスタを返す（DB移行時に呼び出し側を変えないため）", async () => {
    const result = getAllDagashi();
    expect(result).toBeInstanceOf(Promise);
    expect(await result).toEqual(DAGASHI_DATA);
  });
});

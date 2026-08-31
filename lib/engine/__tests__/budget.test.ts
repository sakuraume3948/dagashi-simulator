import { describe, expect, it } from "vitest";
import { selectByBudget } from "../budget";
import { createRng } from "../../random";
import { DAGASHI_DATA } from "../../data";
import { CATEGORIES } from "../../types";
import type { BudgetOptions } from "../../types";

const ALL: BudgetOptions = { maxPerItem: 3, categories: [] };
const CHEAPEST = Math.min(...DAGASHI_DATA.map((d) => d.price));

describe("予算を絶対に超えない", () => {
  it("6. 予算100/300/500/1000円で各1000回試行し、一度も超過しない", () => {
    for (const budget of [100, 300, 500, 1000]) {
      for (let seed = 0; seed < 1000; seed++) {
        const r = selectByBudget(DAGASHI_DATA, budget, ALL, createRng(seed));
        expect(r.totalPrice).toBeLessThanOrEqual(budget);
      }
    }
  });

  it("8. 個数上限が無制限(0)でも予算を超えない", () => {
    const unlimited: BudgetOptions = { maxPerItem: 0, categories: [] };
    for (let seed = 0; seed < 500; seed++) {
      const r = selectByBudget(DAGASHI_DATA, 500, unlimited, createRng(seed));
      expect(r.totalPrice).toBeLessThanOrEqual(500);
    }
  });

  it("11. totalPrice + change === budget が常に成立する", () => {
    for (const budget of [0, 7, 10, 137, 500, 1000]) {
      for (let seed = 0; seed < 200; seed++) {
        const r = selectByBudget(DAGASHI_DATA, budget, ALL, createRng(seed));
        expect(r.totalPrice + r.change).toBe(budget);
      }
    }
  });

  it("11b. lines の小計と合計・個数が一致する", () => {
    const r = selectByBudget(DAGASHI_DATA, 500, ALL, createRng(3));
    expect(r.totalPrice).toBe(r.lines.reduce((s, l) => s + l.subtotal, 0));
    expect(r.totalCount).toBe(r.lines.reduce((s, l) => s + l.qty, 0));
    for (const l of r.lines) {
      expect(l.subtotal).toBe(l.item.price * l.qty);
    }
  });
});

describe("オプションが守られる", () => {
  it("7. maxPerItem=2 のとき、どの商品も3個以上入らない", () => {
    const opts: BudgetOptions = { maxPerItem: 2, categories: [] };
    for (let seed = 0; seed < 500; seed++) {
      const r = selectByBudget(DAGASHI_DATA, 1000, opts, createRng(seed));
      for (const l of r.lines) expect(l.qty).toBeLessThanOrEqual(2);
    }
  });

  it("7b. lines に同じ商品が2行現れない", () => {
    for (let seed = 0; seed < 200; seed++) {
      const r = selectByBudget(DAGASHI_DATA, 1000, ALL, createRng(seed));
      const ids = r.lines.map((l) => l.item.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("9. カテゴリを1つだけ指定したとき、他カテゴリが混入しない", () => {
    for (const category of CATEGORIES) {
      const opts: BudgetOptions = { maxPerItem: 3, categories: [category] };
      for (let seed = 0; seed < 50; seed++) {
        const r = selectByBudget(DAGASHI_DATA, 500, opts, createRng(seed));
        for (const l of r.lines) expect(l.item.category).toBe(category);
      }
      // 各カテゴリで実際に何か買えること（空振りしない）
      const r = selectByBudget(DAGASHI_DATA, 500, opts, createRng(1));
      expect(r.totalCount).toBeGreaterThan(0);
    }
  });

  it("9b. カテゴリ空配列は全カテゴリを意味する", () => {
    const r = selectByBudget(DAGASHI_DATA, 100_000, ALL, createRng(1));
    const used = new Set(r.lines.map((l) => l.item.category));
    expect(used.size).toBe(CATEGORIES.length);
  });
});

describe("境界ケース", () => {
  it("10a. 予算0円なら何も買えない", () => {
    const r = selectByBudget(DAGASHI_DATA, 0, ALL, createRng(1));
    expect(r.lines).toHaveLength(0);
    expect(r.totalPrice).toBe(0);
    expect(r.change).toBe(0);
  });

  it("10b. 最安値未満の予算なら何も買えない", () => {
    const r = selectByBudget(DAGASHI_DATA, CHEAPEST - 1, ALL, createRng(1));
    expect(r.lines).toHaveLength(0);
    expect(r.change).toBe(CHEAPEST - 1);
  });

  it("10c. 巨大な予算では全商品が個数上限に達して停止する", () => {
    const r = selectByBudget(DAGASHI_DATA, 1_000_000, ALL, createRng(1));
    expect(r.lines).toHaveLength(DAGASHI_DATA.length);
    expect(r.totalCount).toBe(DAGASHI_DATA.length * 3);
  });

  it("10d. カテゴリ指定の結果が0件なら何も買えない", () => {
    // 「飲料」の最安は20円。10円しか無ければ買えない。
    const opts: BudgetOptions = { maxPerItem: 3, categories: ["飲料"] };
    const r = selectByBudget(DAGASHI_DATA, 10, opts, createRng(1));
    expect(r.lines).toHaveLength(0);
  });
});

describe("体験の妥当性", () => {
  it("12. 予算500円での平均購入点数が妥当な範囲に収まる", () => {
    let total = 0;
    const trials = 1000;
    for (let seed = 0; seed < trials; seed++) {
      total += selectByBudget(DAGASHI_DATA, 500, ALL, createRng(seed)).totalCount;
    }
    const avg = total / trials;
    console.log(`  → 予算500円の平均購入点数: ${avg.toFixed(2)}点`);
    // 数点しか買えない/数十点も入る、といった体験の破綻を検出する
    expect(avg).toBeGreaterThan(5);
    expect(avg).toBeLessThan(30);
  });

  it("12b. 安い駄菓子の方が自然に多く入る（重み付けなしでも成立する）", () => {
    let cheap = 0;
    let pricey = 0;
    for (let seed = 0; seed < 500; seed++) {
      const r = selectByBudget(DAGASHI_DATA, 500, ALL, createRng(seed));
      for (const l of r.lines) {
        if (l.item.price <= 20) cheap += l.qty;
        else if (l.item.price >= 100) pricey += l.qty;
      }
    }
    console.log(`  → 20円以下: ${cheap}個 / 100円以上: ${pricey}個`);
    expect(cheap).toBeGreaterThan(pricey);
  });
});

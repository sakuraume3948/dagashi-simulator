import { describe, expect, it } from "vitest";
import { selectByBudget } from "../budget";
import { createRng } from "../../random";
import { DAGASHI_DATA } from "../../data";
import { CATEGORIES } from "../../types";
import type { BudgetOptions } from "../../types";

const ALL: BudgetOptions = { maxPerItem: 3, maxPerSeries: 0, categories: [] };
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
    const unlimited: BudgetOptions = { maxPerItem: 0, maxPerSeries: 0, categories: [] };
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
    const opts: BudgetOptions = { maxPerItem: 2, maxPerSeries: 0, categories: [] };
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
      const opts: BudgetOptions = { maxPerItem: 3, maxPerSeries: 0, categories: [category] };
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
    // 「チョコ」の最安は25円。10円しか無ければ買えない。
    const opts: BudgetOptions = { maxPerItem: 3, maxPerSeries: 0, categories: ["チョコ"] };
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

describe("シリーズ上限", () => {
  const UMAIBO = DAGASHI_DATA.filter((d) => d.seriesId === "umaibo");

  /**
   * データに実在するシリーズIDを検算に使う。
   * 存在しないIDを渡すと seriesCount が常に 0 を返し、
   * 「0 <= 上限」で必ず通る何も検証しないテストになるため。
   */
  const SERIES_IDS = [...new Set(DAGASHI_DATA.map((d) => d.seriesId).filter((s) => s !== null))];

  /** 結果からシリーズ単位の合計個数を数える。 */
  function seriesCount(result: { lines: { item: (typeof DAGASHI_DATA)[number]; qty: number }[] }, seriesId: string) {
    return result.lines
      .filter((l) => l.item.seriesId === seriesId)
      .reduce((sum, l) => sum + l.qty, 0);
  }

  it("23. シリーズ上限3のとき、どのシリーズも味を問わず合計3本まで", () => {
    expect(SERIES_IDS.length).toBeGreaterThan(1); // 検算するシリーズが実在すること
    const opts: BudgetOptions = { maxPerItem: 3, maxPerSeries: 3, categories: [] };
    for (let seed = 0; seed < 300; seed++) {
      const r = selectByBudget(DAGASHI_DATA, 2000, opts, createRng(seed));
      for (const seriesId of SERIES_IDS) {
        expect(seriesCount(r, seriesId), `シリーズ ${seriesId} が上限を超えた`).toBeLessThanOrEqual(3);
      }
    }
  });

  it("24. シリーズ上限が無い(0)なら、味ごとに商品上限まで買える", () => {
    const opts: BudgetOptions = { maxPerItem: 3, maxPerSeries: 0, categories: [] };
    // うまい棒は16種あるので 16 × 3 = 48本。巨大予算なら必ず上限まで届く
    const r = selectByBudget(DAGASHI_DATA, 1_000_000, opts, createRng(1));
    expect(seriesCount(r, "umaibo")).toBe(UMAIBO.length * 3);
  });

  it("25. 単独商品も「1人だけのシリーズ」として上限が効く", () => {
    // 商品上限は無制限だが、シリーズ上限2 → 単独商品も2個までになる
    const opts: BudgetOptions = { maxPerItem: 0, maxPerSeries: 2, categories: [] };
    for (let seed = 0; seed < 200; seed++) {
      const r = selectByBudget(DAGASHI_DATA, 2000, opts, createRng(seed));
      for (const line of r.lines) {
        if (line.item.seriesId === null) {
          expect(line.qty).toBeLessThanOrEqual(2);
        }
      }
      expect(seriesCount(r, "umaibo")).toBeLessThanOrEqual(2);
    }
  });

  it("26. シリーズ上限を足しても予算は超えない", () => {
    const opts: BudgetOptions = { maxPerItem: 2, maxPerSeries: 3, categories: [] };
    for (const budget of [100, 500, 1000]) {
      for (let seed = 0; seed < 300; seed++) {
        const r = selectByBudget(DAGASHI_DATA, budget, opts, createRng(seed));
        expect(r.totalPrice).toBeLessThanOrEqual(budget);
        expect(r.totalPrice + r.change).toBe(budget);
      }
    }
  });

  it("27. 商品上限とシリーズ上限は同時に効く（厳しい方が勝つ）", () => {
    const opts: BudgetOptions = { maxPerItem: 2, maxPerSeries: 3, categories: [] };
    const r = selectByBudget(DAGASHI_DATA, 1_000_000, opts, createRng(7));

    // 各味は2本まで
    for (const line of r.lines) expect(line.qty).toBeLessThanOrEqual(2);
    // うまい棒は3種あるが、シリーズ合計は3本まで（2×3=6ではない）
    expect(seriesCount(r, "umaibo")).toBe(3);
  });
});

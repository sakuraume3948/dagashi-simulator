"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DagashiCard } from "@/components/dagashi-card";
import { selectByBudget } from "@/lib/engine/budget";
import { createRng } from "@/lib/random";
import { CATEGORIES } from "@/lib/types";
import type { CartResult, Category, Dagashi } from "@/lib/types";
import { cn } from "@/lib/utils";

const PRESETS = [100, 300, 500, 1000];
/** 0 は無制限を意味する。 */
const ITEM_LIMIT_PRESETS = [1, 2, 3, 5, 0];
const SERIES_LIMIT_PRESETS = [1, 2, 3, 5, 10, 0];

export function BudgetMode({ items }: { items: Dagashi[] }) {
  const [budget, setBudget] = useState(500);
  const [maxPerItem, setMaxPerItem] = useState(3);
  const [maxPerSeries, setMaxPerSeries] = useState(0);
  const [categories, setCategories] = useState<Category[]>([...CATEGORIES]);
  const [result, setResult] = useState<CartResult | null>(null);

  // 全カテゴリが選択されている場合はエンジンに空配列を渡す（＝全カテゴリの意味）
  const effectiveCategories =
    categories.length === CATEGORIES.length ? [] : categories;

  /**
   * 商品上限を変える。
   * シリーズ上限がそれを下回ると、シリーズ側が先に効いて商品上限が
   * 意味を持たなくなるので、シリーズ上限を引き上げて追従させる。
   * （0 = 無制限は常に上限として成立するので調整不要）
   */
  function changeItemLimit(value: number) {
    setMaxPerItem(value);
    if (value > 0 && maxPerSeries > 0 && value > maxPerSeries) {
      setMaxPerSeries(value);
    }
  }

  /** シリーズ上限を下げたときは、逆に商品上限を引き下げて追従させる。 */
  function changeSeriesLimit(value: number) {
    setMaxPerSeries(value);
    if (value > 0 && maxPerItem > 0 && maxPerItem > value) {
      setMaxPerItem(value);
    }
  }

  function toggleCategory(category: Category, checked: boolean) {
    setCategories((prev) =>
      checked ? [...prev, category] : prev.filter((c) => c !== category),
    );
  }

  function handleRun() {
    // 乱数の種はクリック時に決める。エンジン自身は Math.random を触らない。
    const rng = createRng();
    setResult(
      selectByBudget(
        items,
        budget,
        { maxPerItem, maxPerSeries, categories: effectiveCategories },
        rng,
      ),
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5 rounded-xl border bg-card p-5">
        {/* 予算 */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="budget">予算</Label>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Input
                id="budget"
                type="number"
                min={0}
                step={10}
                value={budget}
                onChange={(e) => setBudget(Math.max(0, Number(e.target.value) || 0))}
                className="w-28 tabular-nums"
              />
              <span className="text-sm text-muted-foreground">円</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <Button
                  key={p}
                  type="button"
                  variant={budget === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBudget(p)}
                >
                  {p}円
                </Button>
              ))}
            </div>
          </div>
        </div>

        <LimitField
          id="max-per-item"
          label="同じ商品（味単位）の個数上限"
          hint="「うまい棒 めんたい味」のように、味ごとに数えます。"
          value={maxPerItem}
          presets={ITEM_LIMIT_PRESETS}
          onChange={changeItemLimit}
        />

        <LimitField
          id="max-per-series"
          label="同じシリーズ（味を問わない）の個数上限"
          hint="「うまい棒」全体で数えます。味違いのない商品は、それ自体で1シリーズとして扱います。"
          value={maxPerSeries}
          presets={SERIES_LIMIT_PRESETS}
          onChange={changeSeriesLimit}
        />

        {/* カテゴリ */}
        <div className="flex flex-col gap-2">
          <Label>カテゴリ</Label>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {CATEGORIES.map((category) => (
              <div key={category} className="flex items-center gap-2">
                <Checkbox
                  id={`cat-${category}`}
                  checked={categories.includes(category)}
                  onCheckedChange={(checked) => toggleCategory(category, checked === true)}
                />
                <Label htmlFor={`cat-${category}`} className="text-sm font-normal">
                  {category}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Button
          type="button"
          size="lg"
          onClick={handleRun}
          disabled={categories.length === 0}
          className="self-start"
        >
          🛒 駄菓子を選ぶ
        </Button>
        {categories.length === 0 && (
          <p className="text-sm text-destructive">カテゴリを1つ以上選んでください。</p>
        )}
      </div>

      {result && <BudgetResult result={result} budget={budget} />}
    </div>
  );
}

/** 個数上限の入力欄。数値の直接入力とプリセットボタンの両方を受け付ける。 */
function LimitField({
  id,
  label,
  hint,
  value,
  presets,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: number;
  presets: number[];
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Input
            id={id}
            type="number"
            min={0}
            value={value}
            onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
            className="w-24 tabular-nums"
          />
          <span className="text-sm text-muted-foreground">
            {value === 0 ? "個（無制限）" : "個"}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((n) => (
            <Button
              key={n}
              type="button"
              variant={value === n ? "default" : "outline"}
              size="sm"
              onClick={() => onChange(n)}
            >
              {n === 0 ? "無制限" : `${n}個`}
            </Button>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function BudgetResult({ result, budget }: { result: CartResult; budget: number }) {
  if (result.lines.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <p className="text-4xl">😢</p>
        <p className="mt-2 font-medium">この条件で買えるものがありません</p>
        <p className="mt-1 text-sm text-muted-foreground">
          予算を増やすか、カテゴリの絞り込みを緩めてください。
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border bg-card p-4">
        <Stat label="点数" value={`${result.totalCount}点`} />
        <Stat label="合計" value={`${result.totalPrice}円`} />
        <Stat
          label="おつり"
          value={`${result.change}円`}
          className={cn(result.change === 0 && "text-emerald-600 dark:text-emerald-400")}
        />
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          予算 {budget}円
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {result.lines.map((line) => (
          <DagashiCard key={line.item.id} item={line.item} qty={line.qty} />
        ))}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-lg font-semibold tabular-nums", className)}>{value}</span>
    </div>
  );
}

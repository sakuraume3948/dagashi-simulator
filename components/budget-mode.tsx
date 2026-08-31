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
const MAX_PER_ITEM_CHOICES = [1, 2, 3, 5, 0];

export function BudgetMode({ items }: { items: Dagashi[] }) {
  const [budget, setBudget] = useState(500);
  const [maxPerItem, setMaxPerItem] = useState(3);
  const [categories, setCategories] = useState<Category[]>([...CATEGORIES]);
  const [result, setResult] = useState<CartResult | null>(null);

  // 全カテゴリが選択されている場合はエンジンに空配列を渡す（＝全カテゴリの意味）
  const effectiveCategories =
    categories.length === CATEGORIES.length ? [] : categories;

  function toggleCategory(category: Category, checked: boolean) {
    setCategories((prev) =>
      checked ? [...prev, category] : prev.filter((c) => c !== category),
    );
  }

  function handleRun() {
    // 乱数の種はクリック時に決める。エンジン自身は Math.random を触らない。
    const rng = createRng();
    setResult(selectByBudget(items, budget, { maxPerItem, categories: effectiveCategories }, rng));
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

        {/* 個数上限 */}
        <div className="flex flex-col gap-2">
          <Label>同じ駄菓子の個数上限</Label>
          <div className="flex flex-wrap gap-1.5">
            {MAX_PER_ITEM_CHOICES.map((n) => (
              <Button
                key={n}
                type="button"
                variant={maxPerItem === n ? "default" : "outline"}
                size="sm"
                onClick={() => setMaxPerItem(n)}
              >
                {n === 0 ? "無制限" : `${n}個まで`}
              </Button>
            ))}
          </div>
        </div>

        {/* カテゴリ */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label>カテゴリ</Label>
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCategories([...CATEGORIES])}
              >
                全部選ぶ
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCategories([])}
              >
                全部外す
              </Button>
            </div>
          </div>
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
        <Stat label="種類" value={`${result.lines.length}種`} />
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

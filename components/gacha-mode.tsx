"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DagashiCard } from "@/components/dagashi-card";
import { gachaProbabilities, pullGacha } from "@/lib/engine/gacha";
import { createRng } from "@/lib/random";
import type { Dagashi, GachaResult } from "@/lib/types";

/** 排出率の内訳表示用。カードの枠色と同じ区切り。 */
const TIERS = [
  { label: "〜20円", test: (p: number) => p <= 20, dot: "bg-neutral-400" },
  { label: "30〜50円", test: (p: number) => p > 20 && p <= 50, dot: "bg-blue-400" },
  { label: "60〜100円", test: (p: number) => p > 50 && p <= 100, dot: "bg-purple-500" },
  { label: "101円〜", test: (p: number) => p > 100, dot: "bg-amber-400" },
];

export function GachaMode({ items }: { items: Dagashi[] }) {
  const [result, setResult] = useState<GachaResult | null>(null);

  // 価格帯ごとの理論排出率。データが変わらない限り再計算不要。
  const tierRates = useMemo(() => {
    const probs = gachaProbabilities(items);
    return TIERS.map((tier) => ({
      ...tier,
      rate: items
        .filter((it) => tier.test(it.price))
        .reduce((sum, it) => sum + (probs.get(it.id) ?? 0), 0),
    }));
  }, [items]);

  function pull(count: number) {
    // 乱数の種はクリック時に決める。エンジン自身は Math.random を触らない。
    setResult(pullGacha(items, count, createRng()));
  }

  const best = result?.items.reduce<Dagashi | null>(
    (max, it) => (max === null || it.price > max.price ? it : max),
    null,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-5">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="lg" variant="outline" onClick={() => pull(1)}>
            1連
          </Button>
          <Button type="button" size="lg" onClick={() => pull(10)}>
            ✨ 10連
          </Button>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-muted-foreground">
            排出率（重み = 1 ÷ 価格²。高い駄菓子ほど出にくい）
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {tierRates.map((tier) => (
              <span key={tier.label} className="flex items-center gap-1.5 text-xs">
                <span className={`size-2 rounded-full ${tier.dot}`} />
                <span className="text-muted-foreground">{tier.label}</span>
                <span className="font-semibold tabular-nums">
                  {(tier.rate * 100).toFixed(2)}%
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {result && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border bg-card p-4">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">排出数</span>
              <span className="text-lg font-semibold tabular-nums">
                {result.items.length}個
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">全部買うと</span>
              <span className="text-lg font-semibold tabular-nums">
                {result.totalPrice}円
              </span>
            </div>
            {best && (
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">最高額</span>
                <span className="text-lg font-semibold">
                  {best.price > 100 && "🎉 "}
                  {best.name}
                  <span className="ml-1 tabular-nums text-muted-foreground">
                    {best.price}円
                  </span>
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {result.items.map((item, i) => (
              <DagashiCard key={`${item.id}-${i}`} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

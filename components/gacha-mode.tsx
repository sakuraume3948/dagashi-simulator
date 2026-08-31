"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DagashiCard } from "@/components/dagashi-card";
import { pullGacha } from "@/lib/engine/gacha";
import { createRng } from "@/lib/random";
import type { Dagashi, GachaResult } from "@/lib/types";

export function GachaMode({ items }: { items: Dagashi[] }) {
  const [result, setResult] = useState<GachaResult | null>(null);

  function pull(count: number) {
    // 乱数の種はクリック時に決める。エンジン自身は Math.random を触らない。
    setResult(pullGacha(items, count, createRng()));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2 rounded-xl border bg-card p-5">
        <Button type="button" size="lg" variant="outline" onClick={() => pull(1)}>
          1連
        </Button>
        <Button type="button" size="lg" onClick={() => pull(10)}>
          ✨ 10連
        </Button>
      </div>

      {result && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border bg-card p-4">
            <span className="text-xs text-muted-foreground">全部買うと</span>
            <p className="text-lg font-semibold tabular-nums">{result.totalPrice}円</p>
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

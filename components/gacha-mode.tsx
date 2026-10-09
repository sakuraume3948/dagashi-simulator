"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DagashiCard } from "@/components/dagashi-card";
import { pullGacha } from "@/lib/engine/gacha";
import { createRng } from "@/lib/random";
import type { Dagashi, GachaResult } from "@/lib/types";

export function GachaMode({ items }: { items: Dagashi[] }) {
  const [result, setResult] = useState<GachaResult | null>(null);
  const [selectedCount, setSelectedCount] = useState<number>(10);

  function pull() {
    // 乱数の種はクリック時に決める。エンジン自身は Math.random を触らない。
    setResult(pullGacha(items, selectedCount, createRng()));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5 rounded-xl border bg-card p-5">
        <div className="flex flex-col gap-2">
          <Label>回数</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="lg"
              variant={selectedCount === 1 ? "default" : "outline"}
              onClick={() => setSelectedCount(1)}
            >
              1連
            </Button>
            <Button
              type="button"
              size="lg"
              variant={selectedCount === 10 ? "default" : "outline"}
              onClick={() => setSelectedCount(10)}
            >
              10連
            </Button>
          </div>
        </div>

        <div>
          <Button type="button" size="lg" onClick={pull}>
            ガチャる
          </Button>
        </div>
      </div>

      {result && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border bg-card p-4">
            <span className="text-xs text-muted-foreground">全部買うと</span>
            <p className="text-lg font-semibold tabular-nums">
              {result.totalPrice}円
            </p>
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
